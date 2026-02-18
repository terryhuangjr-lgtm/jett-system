#!/usr/bin/env python3
"""
Test Orchestrator - Works with existing test data
"""

import sqlite3
from datetime import datetime
from collectors.stats_collector import StatsCollector
from collectors.injury_collector import InjuryCollector
from collectors.odds_collector import OddsCollector
from analyzer.bet_scorer import BetScorer

class TestOrchestrator:
    def __init__(self):
        self.db_path = '/home/clawd/clawd/data/sports_betting.db'
        self.conn = sqlite3.connect(self.db_path)

        # Initialize components (skip game_collector for now)
        self.stats_collector = StatsCollector(self.db_path)
        self.injury_collector = InjuryCollector(self.db_path)
        self.odds_collector = OddsCollector(self.db_path)
        self.scorer = BetScorer(self.db_path)

        # Load config
        self.config = self._load_config()

    def run_nightly_analysis(self):
        """Execute complete nightly workflow"""
        print(f"\n{'='*70}")
        print(f"🏀 SPORTS BETTING RESEARCH SYSTEM - NIGHTLY ANALYSIS")
        print(f"{'='*70}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')}\n")

        try:
            # Step 1: Get existing games
            print("📅 Step 1: Loading games from database...")
            games = self._get_games()
            print(f"   ✅ Found {len(games)} games\n")

            if not games:
                print("   ⚠️  No games found. Run create_test_data.py first.")
                return

            # Step 2: Update team statistics
            print("📊 Step 2: Updating team statistics...")
            self._update_team_stats(games)
            print(f"   ✅ Updated stats for {len(set([g['home_team'] for g in games] + [g['away_team'] for g in games]))} teams\n")

            # Step 3: Collect injury reports
            print("🏥 Step 3: Collecting injury reports...")
            injuries = self._collect_injuries()
            print(f"   ✅ Tracked {len(injuries)} injuries\n")

            # Step 4: Verify betting lines exist
            print("💰 Step 4: Verifying betting lines...")
            self._verify_odds(games)
            print(f"   ✅ Lines verified for all games\n")

            # Step 5: Analyze each game
            print("🧮 Step 5: Analyzing games...")
            recommendations = self._analyze_games(games)
            print(f"   ✅ Generated {len(recommendations)} recommendations\n")

            # Step 6: Select daily pick
            print("🎯 Step 6: Selecting daily pick...")
            daily_pick = self._select_daily_pick(recommendations)

            if daily_pick:
                print(f"   ✅ Daily pick selected\n")
            else:
                print(f"   ⚠️  No qualifying bets found\n")

            # Step 7: Generate and display report
            print("📄 Step 7: Generating report...\n")
            self._display_report(daily_pick, recommendations, games)

            # Step 8: Save recommendations to database
            print("\n💾 Step 8: Saving to database...")
            self._save_recommendations(recommendations)
            print("   ✅ All data saved\n")

            print(f"{'='*70}")
            print(f"✅ ANALYSIS COMPLETE")
            print(f"Finished: {datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')}")
            print(f"{'='*70}\n")

        except Exception as e:
            print(f"\n❌ ERROR: {e}")
            import traceback
            traceback.print_exc()

    def _load_config(self):
        """Load system configuration"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT key, value FROM system_config')

        config = {}
        for row in cursor.fetchall():
            config[row[0]] = row[1]

        return config

    def _get_games(self):
        """Get games from database"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT game_id, sport, game_date, game_time, home_team, away_team, status
            FROM games WHERE status = 'scheduled'
        ''')

        games = []
        for row in cursor.fetchall():
            games.append({
                'game_id': row[0],
                'sport': row[1],
                'game_date': row[2],
                'game_time': row[3],
                'home_team': row[4],
                'away_team': row[5],
                'status': row[6]
            })

        return games

    def _update_team_stats(self, games):
        """Update statistics for all teams"""
        teams = set()
        for game in games:
            teams.add(game['home_team'])
            teams.add(game['away_team'])

        for team in teams:
            self.stats_collector.collect_team_stats(team)

    def _collect_injuries(self):
        """Collect injury reports"""
        injuries = self.injury_collector.collect_injuries()
        return injuries

    def _verify_odds(self, games):
        """Verify betting lines exist"""
        cursor = self.conn.cursor()
        for game in games:
            cursor.execute('''
                SELECT COUNT(*) FROM betting_lines WHERE game_id = ?
            ''', (game['game_id'],))
            count = cursor.fetchone()[0]
            if count == 0:
                # Create odds if missing
                self.odds_collector.collect_odds(game['game_id'])

    def _analyze_games(self, games):
        """Analyze each game and generate recommendations"""
        recommendations = []

        for game in games:
            try:
                analysis = self.scorer.score_game(game['game_id'])

                if analysis and analysis['recommendation']['recommended']:
                    rec = self._format_recommendation(game, analysis)
                    recommendations.append(rec)

            except Exception as e:
                print(f"   ⚠️  Error analyzing {game['game_id']}: {e}")

        # Sort by confidence (highest first)
        recommendations.sort(key=lambda x: x['confidence'], reverse=True)

        return recommendations

    def _format_recommendation(self, game, analysis):
        """Format recommendation for storage and display"""
        rec = analysis['recommendation']
        comp = analysis['composite']

        return {
            'game_id': game['game_id'],
            'game_date': game['game_date'],
            'game_time': game['game_time'],
            'home_team': game['home_team'],
            'away_team': game['away_team'],
            'bet_type': rec['bet_type'],
            'bet_selection': rec['bet_selection'],
            'side': rec['side'],
            'confidence': rec['confidence'],
            'expected_value': rec['expected_value'],
            'risk_level': rec['risk_level'],
            'recommended_bet': rec['recommended_bet_amount'],
            'max_bet': rec['max_bet_amount'],
            'reasoning': rec['reasoning'],
            'concerns': rec['concerns'],
            'analysis': analysis  # Full analysis for reference
        }

    def _select_daily_pick(self, recommendations):
        """Choose the best bet for today"""
        if not recommendations:
            return None

        # Highest confidence pick
        daily_pick = recommendations[0]
        daily_pick['is_daily_pick'] = True

        return daily_pick

    def _display_report(self, daily_pick, all_recommendations, all_games):
        """Display formatted report to console"""
        print(f"{'='*70}")
        print(f"📊 BETTING ANALYSIS REPORT")
        print(f"{'='*70}\n")

        # Summary stats
        print(f"Games Analyzed: {len(all_games)}")
        print(f"Recommendations Generated: {len(all_recommendations)}")
        print(f"Paper Trading: {self.config['paper_trading']}")
        print()

        if daily_pick:
            self._display_daily_pick(daily_pick)
        else:
            print("❌ NO QUALIFYING BETS TODAY")
            print("All games failed to meet minimum confidence threshold.")
            print("Better to pass than force a bet!\n")

        # Show other good bets
        if len(all_recommendations) > 1:
            print(f"\n{'='*70}")
            print("📋 OTHER GOOD BETS (Alternatives)")
            print(f"{'='*70}\n")

            for i, bet in enumerate(all_recommendations[1:4], 2):  # Show next 3
                print(f"{i}. {bet['away_team']} @ {bet['home_team']}")
                print(f"   🎯 {bet['bet_selection']}")
                print(f"   📈 Confidence: {bet['confidence']:.1f}/10 ({bet['analysis']['composite']['interpretation']})")
                print(f"   💰 EV: +{bet['expected_value']}%")
                print()

    def _display_daily_pick(self, pick):
        """Display the featured daily pick"""
        print(f"{'='*70}")
        print("🌟 DAILY PICK")
        print(f"{'='*70}\n")

        print(f"🏀 {pick['away_team']} @ {pick['home_team']}")
        print(f"⏰ {pick['game_time']}")
        print()

        print(f"{'─'*70}")
        print(f"🎯 BET: {pick['bet_selection']}")
        print(f"{'─'*70}\n")

        # Confidence visualization
        conf = pick['confidence']
        bars = '█' * int(conf) + '░' * (10 - int(conf))
        print(f"📊 Confidence: {conf:.1f}/10  [{bars}]")
        print(f"   {pick['analysis']['composite']['interpretation']}")
        print()

        print(f"💰 Expected Value: +{pick['expected_value']:.1f}%")
        print(f"⚠️  Risk Level: {pick['risk_level'].upper()}")
        print()

        print(f"💵 Recommended Bet: ${pick['recommended_bet']:.2f}")
        print(f"   (Max: ${pick['max_bet']:.2f})")
        print()

        print("✅ WHY THIS BET:")
        for i, reason in enumerate(pick['reasoning'], 1):
            print(f"   {i}. {reason}")
        print()

        if pick['concerns']:
            print("⚠️  WATCH OUT FOR:")
            for concern in pick['concerns']:
                print(f"   • {concern}")
            print()

        # Scoring breakdown
        print(f"{'─'*70}")
        print("📈 SCORING BREAKDOWN")
        print(f"{'─'*70}\n")

        scores = pick['analysis']['scores']
        for factor, data in scores.items():
            score_val = data['score']
            bar_len = int(abs(score_val))
            bar_char = '█' if score_val >= 0 else '▓'
            bar = bar_char * bar_len

            print(f"{factor.replace('_', ' ').title():20} {score_val:+6.1f}  {bar}")
        print()

    def _save_recommendations(self, recommendations):
        """Save all recommendations to database"""
        cursor = self.conn.cursor()

        for rec in recommendations:
            is_daily = rec.get('is_daily_pick', False)

            cursor.execute('''
                INSERT INTO bet_recommendations (
                    game_id, bet_type, bet_selection, confidence_score,
                    expected_value, risk_level, max_bet_amount,
                    recommended_bet_amount, primary_reasoning, concerns,
                    is_daily_pick, recommended_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                rec['game_id'],
                rec['bet_type'],
                rec['bet_selection'],
                rec['confidence'],
                rec['expected_value'],
                rec['risk_level'],
                rec['max_bet'],
                rec['recommended_bet'],
                '\n'.join(rec['reasoning']),
                '\n'.join(rec['concerns']),
                1 if is_daily else 0,
                datetime.now()
            ))

        self.conn.commit()

# Entry point
if __name__ == '__main__':
    orchestrator = TestOrchestrator()
    orchestrator.run_nightly_analysis()
