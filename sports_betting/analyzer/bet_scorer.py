import sqlite3
from datetime import datetime, timedelta

class BetScorer:
    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)

        # Corrected weights per Claude's recommendations
        self.weights = {
            'team_quality': 0.40,  # Most important - foundation
            'recent_form': 0.20,   # Momentum matters
            'home_court': 0.15,
            'injury_impact': 0.15,  # Important but not #1
            'rest_advantage': 0.10   # New factor
        }

    def score_game(self, game_id):
        """Analyze a game and generate betting recommendation"""
        game = self._get_game(game_id)
        if not game:
            return None

        home_team = game['home_team']
        away_team = game['away_team']

        print(f"\n🔍 Analyzing: {away_team} @ {home_team}")

        # Calculate all factor scores
        scores = {}
        scores['team_quality'] = self._score_team_power(home_team, away_team)
        scores['recent_form'] = self._score_recent_form(home_team, away_team)
        scores['home_court'] = self._score_home_court(home_team)
        scores['injury_impact'] = self._score_injury_impact(home_team, away_team)
        scores['rest_advantage'] = self._score_rest_advantage(home_team, away_team, game['game_date'])
        scores['line_value'] = self._score_line_value(game_id)

        # Calculate power ratings and recommendation
        composite = self._calculate_composite(scores, game)
        recommendation = self._generate_recommendation(game, scores, composite)

        return {
            'game': game,
            'scores': scores,
            'composite': composite,
            'recommendation': recommendation
        }

    def _get_game(self, game_id):
        """Get game details from database"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT game_id, sport, game_date, game_time, home_team, away_team
            FROM games WHERE game_id = ?
        ''', (game_id,))

        row = cursor.fetchone()
        if row:
            return {
                'game_id': row[0],
                'sport': row[1],
                'game_date': row[2],
                'game_time': row[3],
                'home_team': row[4],
                'away_team': row[5]
            }
        return None

    def _get_team_stats(self, team_name):
        """Get team statistics from database"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT wins, losses, home_wins, home_losses,
                   away_wins, away_losses, last_10_wins,
                   avg_points_scored, avg_points_allowed, point_differential
            FROM team_stats
            WHERE team_name = ?
            ORDER BY last_updated DESC LIMIT 1
        ''', (team_name,))

        row = cursor.fetchone()
        if row:
            total_games = row[0] + row[1]
            return {
                'wins': row[0],
                'losses': row[1],
                'win_pct': row[0] / total_games if total_games > 0 else 0.5,
                'home_wins': row[2],
                'home_losses': row[3],
                'away_wins': row[4],
                'away_losses': row[5],
                'last_10_wins': row[6],
                'avg_points_scored': row[7],
                'avg_points_allowed': row[8],
                'point_differential': row[9],
                'net_rating': (row[7] - row[8]) / 10  # Calculate from points
            }

        return {
            'wins': 30, 'losses': 30, 'win_pct': 0.5,
            'home_wins': 18, 'home_losses': 12,
            'away_wins': 12, 'away_losses': 18,
            'last_10_wins': 5,
            'avg_points_scored': 110.0,
            'avg_points_allowed': 110.0,
            'point_differential': 0.0,
            'net_rating': 0.0
        }

    def _score_team_power(self, home_team, away_team):
        """
        Calculate power rating 0-100 for each team.
        This fixes the 'pick'em clustering' problem.
        """
        home_stats = self._get_team_stats(home_team)
        away_stats = self._get_team_stats(away_team)

        def calc_power(stats):
            # Win percentage base (league avg = 50)
            win_pct = stats['win_pct']
            base_power = 50 + (win_pct - 0.5) * 40

            # Point differential adjustment
            pt_diff_adj = stats['point_differential'] * 2

            # Recent form momentum (hot teams get boost)
            l10_pct = stats['last_10_wins'] / 10
            form_adj = (l10_pct - win_pct) * 15

            # Net rating
            net_adj = stats.get('net_rating', 0) * 1.5

            power = base_power + pt_diff_adj + form_adj + net_adj
            return max(20, min(80, power))

        home_power = calc_power(home_stats)
        away_power = calc_power(away_stats)

        power_diff = home_power - away_power

        return {
            'score': round(power_diff, 2),
            'home_power': round(home_power, 1),
            'away_power': round(away_power, 1),
            'explanation': f"Power ratings: {home_team} {home_power:.0f}, {away_team} {away_power:.0f}"
        }

    def _score_recent_form(self, home_team, away_team):
        """Compare recent performance (-10 to +10)"""
        home_stats = self._get_team_stats(home_team)
        away_stats = self._get_team_stats(away_team)

        home_l10_pct = home_stats['last_10_wins'] / 10
        away_l10_pct = away_stats['last_10_wins'] / 10

        form_diff = (home_l10_pct - away_l10_pct) * 20
        form_diff = max(-10, min(10, form_diff))

        return {
            'score': round(form_diff, 2),
            'home_l10': f"{home_stats['last_10_wins']}-{10-home_stats['last_10_wins']}",
            'away_l10': f"{away_stats['last_10_wins']}-{10-away_stats['last_10_wins']}",
            'explanation': f"Recent form: {home_team} {home_l10_pct:.0%}, {away_team} {away_l10_pct:.0%}"
        }

    def _score_home_court(self, home_team):
        """Quantify home court advantage (0 to +10)"""
        stats = self._get_team_stats(home_team)

        home_games = stats['home_wins'] + stats['home_losses']
        away_games = stats['away_wins'] + stats['away_losses']

        if home_games > 0 and away_games > 0:
            home_win_pct = stats['home_wins'] / home_games
            away_win_pct = stats['away_wins'] / away_games
            hca_diff = (home_win_pct - away_win_pct) * 20
        else:
            hca_diff = 3

        score = max(0, min(10, hca_diff))

        return {
            'score': round(score, 2),
            'home_record': f"{stats['home_wins']}-{stats['home_losses']}",
            'explanation': f"Home court advantage: +{score:.1f} points"
        }

    def _score_injury_impact(self, home_team, away_team):
        """Assess injury impact (-10 to +10)"""
        cursor = self.conn.cursor()

        cursor.execute('''
            SELECT COALESCE(SUM(COALESCE(impact_score, 5.0)), 0) as total_impact
            FROM player_stats
            WHERE team_name = ? AND injury_status IN ('out', 'suspended')
        ''', (home_team,))
        home_out = cursor.fetchone()[0] or 0

        cursor.execute('''
            SELECT COALESCE(SUM(COALESCE(impact_score, 5.0)), 0) as total_impact
            FROM player_stats
            WHERE team_name = ? AND injury_status IN ('out', 'suspended')
        ''', (away_team,))
        away_out = cursor.fetchone()[0] or 0

        # Positive = home team more hurt
        impact_diff = (home_out - away_out) / 5
        score = max(-10, min(10, impact_diff))

        # Get key injured players
        cursor.execute('''
            SELECT player_name, injury_status, COALESCE(impact_score, 5.0)
            FROM player_stats
            WHERE team_name = ? AND injury_status IN ('out', 'suspended')
            ORDER BY COALESCE(impact_score, 5.0) DESC LIMIT 3
        ''', (home_team,))
        home_injured = [f"{r[0]}({r[2]:.0f})" for r in cursor.fetchall()]

        cursor.execute('''
            SELECT player_name, injury_status, COALESCE(impact_score, 5.0)
            FROM player_stats
            WHERE team_name = ? AND injury_status IN ('out', 'suspended')
            ORDER BY COALESCE(impact_score, 5.0) DESC LIMIT 3
        ''', (away_team,))
        away_injured = [f"{r[0]}({r[2]:.0f})" for r in cursor.fetchall()]

        factors = []
        if home_injured:
            factors.append(f"{home_team} out: {', '.join(home_injured)}")
        if away_injured:
            factors.append(f"{away_team} out: {', '.join(away_injured)}")
        if not factors:
            factors.append("No key injuries")

        return {
            'score': round(score, 2),
            'home_impact': round(home_out, 1),
            'away_impact': round(away_out, 1),
            'factors': factors,
            'explanation': f"Injury gap: {score:+.1f} pts ({home_team} -{away_team})"
        }

    def _score_rest_advantage(self, home_team, away_team, game_date):
        """
        Calculate rest advantage (-5 to +5)
        Positive = home team has rest advantage
        """
        cursor = self.conn.cursor()

        if isinstance(game_date, str):
            game_date = datetime.strptime(game_date, '%Y-%m-%d').date()

        # Get days since last game for home team
        cursor.execute('''
            SELECT game_date FROM games
            WHERE (home_team = ? OR away_team = ?)
            AND game_date < ?
            ORDER BY game_date DESC LIMIT 1
        ''', (home_team, home_team, game_date))
        row = cursor.fetchone()

        if row:
            last_game = row[0]
            if isinstance(last_game, str):
                last_game = datetime.strptime(last_game, '%Y-%m-%d').date()
            home_days_rest = (game_date - last_game).days
        else:
            home_days_rest = 2

        # Get days since last game for away team
        cursor.execute('''
            SELECT game_date FROM games
            WHERE (home_team = ? OR away_team = ?)
            AND game_date < ?
            ORDER BY game_date DESC LIMIT 1
        ''', (away_team, away_team, game_date))
        row = cursor.fetchone()

        if row:
            last_game = row[0]
            if isinstance(last_game, str):
                last_game = datetime.strptime(last_game, '%Y-%m-%d').date()
            away_days_rest = (game_date - last_game).days
        else:
            away_days_rest = 2

        # Back-to-back penalty
        if home_days_rest == 1:
            home_days_rest -= 2
        if away_days_rest == 1:
            away_days_rest -= 2

        rest_diff = (home_days_rest - away_days_rest) * 1.5
        score = max(-5, min(5, rest_diff))

        return {
            'score': round(score, 2),
            'home_rest': home_days_rest,
            'away_rest': away_days_rest,
            'explanation': f"Rest: {home_team} {home_days_rest}d, {away_team} {away_days_rest}d"
        }

    def _score_line_value(self, game_id):
        """Get the current betting line"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT home_spread, total, home_ml, away_ml
            FROM betting_lines
            WHERE game_id = ? AND timestamp IS NOT NULL
            ORDER BY timestamp DESC LIMIT 1
        ''', (game_id,))

        line = cursor.fetchone()
        if not line:
            return {'actual_spread': 0, 'total': 0, 'home_ml': None, 'away_ml': None}

        return {
            'actual_spread': line[0],
            'total': line[1],
            'home_ml': line[2],
            'away_ml': line[3]
        }

    def _calculate_composite(self, scores, game):
        """
        Calculate power ratings and generate recommendation.
        Uses 0-100 power scale to avoid pick'em clustering.
        """
        home_team = game['home_team']
        away_team = game['away_team']

        # Power ratings (0-100 scale)
        home_power = scores['team_quality']['home_power']
        away_power = scores['team_quality']['away_power']

        # Adjustments
        home_adj = (
            scores['recent_form']['score'] * 0.5 +
            scores['home_court']['score'] +
            scores['injury_impact']['score'] * -1 +
            scores['rest_advantage']['score']
        )

        away_adj = (
            scores['recent_form']['score'] * -0.5 +
            scores['injury_impact']['score'] +
            scores['rest_advantage']['score'] * -1
        )

        home_adjusted = max(20, min(80, home_power + home_adj))
        away_adjusted = max(20, min(80, away_power + away_adj))

        # Model spread (scaled to realistic NBA spreads)
        model_spread = (home_adjusted - away_adjusted) * 0.5

        book_spread = scores['line_value']['actual_spread']

        # Edge = how much model disagrees with book
        edge = model_spread - book_spread

        # Dynamic confidence
        power_gap = abs(home_adjusted - away_adjusted)

        if power_gap > 15:
            conf_adj = 1.5
        elif power_gap < 5:
            conf_adj = -1.0
        else:
            conf_adj = 0

        confidence = min(10, 5.0 + abs(edge) * 0.8 + conf_adj)
        confidence = max(0, confidence)

        # Determine predicted winner
        predicted_winner = home_team if model_spread > 0 else away_team

        # Dynamic edge threshold based on confidence
        if confidence >= 8.5:
            min_edge = 2.0
        elif confidence >= 7.0:
            min_edge = 3.0
        else:
            min_edge = 4.0

        recommended = abs(edge) >= min_edge

        # Determine bet
        bet_on = None
        if recommended:
            if edge < 0:
                # Model likes HOME more than book
                bet_on = f"{home_team} {book_spread:+.1f}"
            else:
                # Model likes AWAY more than book
                bet_on = f"{away_team} {-book_spread:+.1f}"

        return {
            'home_power': round(home_power, 1),
            'away_power': round(away_power, 1),
            'home_adjusted': round(home_adjusted, 1),
            'away_adjusted': round(away_adjusted, 1),
            'model_spread': round(model_spread, 1),
            'book_spread': book_spread,
            'edge': round(edge, 1),
            'confidence': round(confidence, 1),
            'interpretation': self._interpret_confidence(confidence),
            'predicted_winner': predicted_winner,
            'recommended': recommended,
            'bet_on': bet_on,
            'min_edge': min_edge
        }

    def _interpret_confidence(self, confidence):
        """Human-readable confidence level"""
        if confidence >= 8.5:
            return "Very Strong"
        elif confidence >= 7.0:
            return "Strong"
        elif confidence >= 6.0:
            return "Good"
        elif confidence >= 5.0:
            return "Slight Edge"
        else:
            return "Pass"

    def _generate_recommendation(self, game, scores, composite):
        """Create final betting recommendation"""
        confidence = composite['confidence']
        edge = composite['edge']
        book_spread = composite['book_spread']
        home_team = game['home_team']
        away_team = game['away_team']

        cursor = self.conn.cursor()
        cursor.execute("SELECT value FROM system_config WHERE key = 'min_confidence'")
        min_conf = float(cursor.fetchone()[0])

        if confidence < min_conf:
            return {
                'recommended': False,
                'reason': f"Confidence {confidence:.1f} below threshold {min_conf}"
            }

        # Get moneyline odds
        home_ml = scores['line_value']['home_ml']
        away_ml = scores['line_value']['away_ml']

        # Calculate expected value
        expected_value = round(abs(edge) * 3, 1)

        # Determine bet selection
        if composite['recommended']:
            bet_type = 'spread'
            bet_selection = composite['bet_on']
        elif home_ml and away_ml:
            # Moneyline fallback
            home_implied = 100 / (home_ml + 100) if home_ml > 0 else (-home_ml) / (-home_ml + 100)
            model_prob = 0.5 - (composite['model_spread'] / 20)
            home_edge = model_prob - home_implied

            if home_edge > 0.05:
                bet_type = 'moneyline'
                bet_selection = f"{home_team} ML ({home_ml:+d})"
                expected_value = round(home_edge * 100, 1)
            else:
                return {'recommended': False, 'reason': 'No clear betting edge'}
        else:
            return {'recommended': False, 'reason': 'No betting lines available'}

        # Calculate bet size
        cursor.execute("SELECT value FROM system_config WHERE key = 'max_bet_amount'")
        max_bet = float(cursor.fetchone()[0])
        kelly_pct = (abs(edge) / 10) * 0.25
        recommended_bet = max(5, min(round(max_bet * kelly_pct, 2), max_bet))

        # Build reasoning
        reasoning = []
        for factor, score_data in scores.items():
            if abs(score_data.get('score', 0)) >= 2:
                reasoning.append(score_data.get('explanation', factor))

        risk = 'low' if confidence >= 8 else 'medium' if confidence >= 7 else 'high'

        # Determine which team we're betting on
        if composite['recommended']:
            if composite['edge'] < 0:
                side = composite['bet_on'].split()[0]  # Home team
            else:
                side = composite['bet_on'].split()[0]  # Away team
        else:
            side = None

        return {
            'recommended': True,
            'bet_type': bet_type,
            'bet_selection': bet_selection,
            'side': side,
            'confidence': confidence,
            'expected_value': expected_value,
            'risk_level': risk,
            'max_bet_amount': max_bet,
            'recommended_bet_amount': recommended_bet,
            'reasoning': reasoning[:4],
            'concerns': ['Monitor injury reports before placing bet']
        }
