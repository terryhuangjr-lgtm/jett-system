#!/usr/bin/env python3
"""
Sports Betting Research System - Two-Stage Orchestrator

Scout Mode (10 AM): Morning screening of games
Final Mode (4 PM): Deep analysis with latest injury/line data
"""

import sqlite3
import argparse
from datetime import datetime
from collectors.game_collector import GameCollector
from collectors.stats_collector import StatsCollector
from collectors.injury_collector import InjuryCollector
from collectors.player_stats_collector import PlayerStatsCollector
from collectors.odds_collector import OddsCollector
from collectors.news_monitor import NewsMonitor
from analyzer.bet_scorer import BetScorer
from notifiers.slack_notifier_bot import SlackNotifier
from dashboard_integration import DashboardIntegration
import config
from bet_tracker import BetTracker

class BettingOrchestrator:
    def __init__(self):
        self.db_path = '/home/clawd/clawd/data/sports_betting.db'
        self.conn = sqlite3.connect(self.db_path)

        # Initialize all components
        self.game_collector = GameCollector(self.db_path)
        self.stats_collector = StatsCollector(self.db_path)
        self.injury_collector = InjuryCollector(self.db_path)
        self.player_stats_collector = PlayerStatsCollector(self.db_path)
        self.news_monitor = NewsMonitor(self.db_path)
        self.odds_collector = OddsCollector(self.db_path)
        self.scorer = BetScorer(self.db_path)
        self.notifier = SlackNotifier()  # Uses bot token, not webhook
        self.dashboard = DashboardIntegration()
        self.bet_tracker = BetTracker()

        # Load config
        self.config = self._load_config()

    def run_analysis(self, mode='full'):
        """Execute analysis based on mode"""

        if mode in ['scout', 'full']:
            print(f"\n{'='*70}")
            print(f"🔍 SCOUT MODE - Morning Game Preview (10 AM)")
            print(f"{'='*70}")
            print(f"Started: {datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')}\n")
            self._run_scout_mode()

        if mode in ['final', 'full']:
            print(f"\n{'='*70}")
            print(f"🎯 FINAL MODE - Pre-Game Analysis")
            print(f"{'='*70}")
            print(f"Started: {datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')}\n")
            self._run_final_mode()

    def _run_scout_mode(self):
        """Morning scout: Quick screening of today's games"""

        try:
            # Step 1: Collect games
            print("📅 Step 1: Collecting upcoming games...")
            games = self._collect_games()
            print(f"   ✅ Found {len(games)} games\n")

            if not games:
                print("   ⚠️  No games found for scouting")
                return

            # Step 2: Update team statistics
            print("📊 Step 2: Updating team statistics...")
            self._update_team_stats(games)
            print(f"   ✅ Updated stats\n")

            # Step 3: Collect injuries
            print("🏥 Step 3: Collecting injury reports...")
            self._collect_injuries()
            print(f"   ✅ Tracked injuries\n")

            # Step 3b: Monitor news for suspensions/fights
            print("📰 Step 3b: Checking news for suspensions/fights...")
            game_ids = [g['game_id'] for g in games]
            news_items = self._check_game_news(game_ids)
            if news_items:
                print(f"   ⚠️ Found {len(news_items)} relevant news items\n")

            # Step 4: Collect betting lines
            print("💰 Step 4: Collecting betting lines...")
            self._collect_odds(games)
            print(f"   ✅ Lines collected\n")

            # Step 5: Quick analysis - lower threshold for scouting
            print("🧮 Step 5: Scouting games...")
            watch_list = []

            for game in games:
                try:
                    analysis = self.scorer.score_game(game['game_id'])

                    if analysis and analysis['composite']['confidence'] >= 6.5:
                        watch_list.append({
                            'game': game,
                            'confidence': analysis['composite']['confidence'],
                            'early_lean': analysis['recommendation'].get('bet_selection', 'TBD'),
                            'reasoning': analysis['recommendation'].get('reasoning', [])
                        })

                except Exception as e:
                    print(f"   ⚠️  Error scouting {game['game_id']}: {e}")

            print(f"   ✅ Found {len(watch_list)} games to watch\n")

            # Step 6: Send scout report
            print("📄 Step 6: Sending scout report...")
            self._send_scout_report(watch_list, len(games))
            self.dashboard.post_scout_results(watch_list, len(games))

            # Step 7: Save watch list
            print("💾 Step 7: Saving watch list...")
            self._save_watch_list(watch_list)
            print("   ✅ Watch list saved\n")

            print(f"{'='*70}")
            print(f"✅ SCOUT MODE COMPLETE")
            print(f"Finished: {datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')}")
            print(f"{'='*70}\n")

        except Exception as e:
            print(f"\n❌ ERROR in scout mode: {e}")
            import traceback
            traceback.print_exc()

    def _run_final_mode(self):
        """Afternoon final: Deep analysis with latest data"""

        try:
            # Step 1: Get watch list from morning
            print("📋 Step 1: Loading watch list...")
            watch_list = self._get_watch_list()

            if not watch_list:
                print("   ⚠️  No games in watch list - run scout mode first")
                return

            print(f"   ✅ {len(watch_list)} games to analyze\n")

            # Step 2: Re-collect fresh data
            print("🔄 Step 2: Updating with latest data...")
            games = [item['game'] for item in watch_list]
            self._update_team_stats(games)
            print("   ✅ Fresh team stats")

            self._collect_injuries()  # Fresh injury reports!
            print("   ✅ Latest injury reports")

            # Step 2b: Check news for suspensions
            print("📰 Step 2b: Checking news for suspensions...")
            game_ids = [g['game_id'] for g in games]
            news_items = self._check_game_news(game_ids)
            if news_items:
                print(f"   ⚠️ Found {len(news_items)} relevant news items")
            else:
                print("   ✅ No suspensions/fights detected")

            self._collect_odds(games)  # Latest lines!
            print("   ✅ Updated betting lines\n")

            # Step 3: Full analysis with updated data
            print("🧮 Step 3: Analyzing games with latest data...")
            recommendations = []

            for item in watch_list:
                game = item['game']
                try:
                    analysis = self.scorer.score_game(game['game_id'])

                    if analysis and analysis['recommendation']['recommended']:
                        rec = self._format_recommendation(game, analysis)
                        rec['morning_confidence'] = item['confidence']
                        recommendations.append(rec)

                except Exception as e:
                    print(f"   ⚠️  Error analyzing {game['game_id']}: {e}")

            print(f"   ✅ Generated {len(recommendations)} recommendations\n")

            # Sort by confidence
            recommendations.sort(key=lambda x: x['confidence'], reverse=True)

            # Step 4: Select daily pick
            print("🎯 Step 4: Selecting daily pick...")
            daily_pick = self._select_daily_pick(recommendations)

            if daily_pick:
                print(f"   ✅ Daily pick selected\n")
                
                # Record the bet for tracking
                self._record_bet_for_tracking(daily_pick)
                
                # Record the bet for tracking
                self._record_bet_for_tracking(daily_pick)
            else:
                print(f"   ⚠️  No qualifying bets found\n")

            # Step 5: Display and send
            print("📄 Step 5: Generating report...\n")

            stats = {
                'season_record': self._get_season_record(),
                'recent_form': self._get_recent_form()
            }

            self._send_final_report(daily_pick, recommendations, stats)
            self.dashboard.post_final_pick(daily_pick, recommendations)
            self._display_report(daily_pick, recommendations, [item['game'] for item in watch_list])

            # Step 6: Save recommendations
            print("\n💾 Step 6: Saving to database...")
            self._save_recommendations(recommendations)
            print("   ✅ All data saved\n")

            print(f"{'='*70}")
            print(f"✅ FINAL MODE COMPLETE")
            print(f"Finished: {datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')}")
            print(f"{'='*70}\n")

        except Exception as e:
            print(f"\n❌ ERROR in final mode: {e}")
            import traceback
            traceback.print_exc()

    def _save_watch_list(self, watch_list):
        """Save morning watch list"""
        cursor = self.conn.cursor()

        # Clear old watch list
        cursor.execute("DELETE FROM watch_list WHERE date < DATE('now')")

        for item in watch_list:
            cursor.execute('''
                INSERT OR REPLACE INTO watch_list (game_id, date, confidence)
                VALUES (?, DATE('now'), ?)
            ''', (item['game']['game_id'], item['confidence']))

        self.conn.commit()
        print(f"   ✅ Saved {len(watch_list)} games to watch list")

    def _get_watch_list(self):
        """Get today's watch list"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT w.game_id, g.home_team, g.away_team, g.game_date, g.game_time, w.confidence
            FROM watch_list w
            JOIN games g ON w.game_id = g.game_id
            WHERE w.date = DATE('now')
        ''')

        watch_list = []
        for row in cursor.fetchall():
            watch_list.append({
                'game': {
                    'game_id': row[0],
                    'home_team': row[1],
                    'away_team': row[2],
                    'game_date': row[3],
                    'game_time': row[4]
                },
                'confidence': row[5]
            })

        return watch_list

    def _send_scout_report(self, watch_list, total_games):
        """Send morning scout report to Slack"""
        try:
            self.notifier.send_scout_report(watch_list, total_games)
            print("   ✅ Scout report sent to Slack")
        except Exception as e:
            print(f"   ⚠️  Could not send scout report: {e}")

    def _send_final_report(self, daily_pick, recommendations, stats):
        """Send afternoon final report"""
        try:
            alternatives = recommendations[1:] if len(recommendations) > 1 else []
            self.notifier.send_final_pick(daily_pick, alternatives)
            print("   ✅ Final report sent to Slack")
        except Exception as e:
            print(f"   ⚠️  Could not send final report: {e}")

    def _load_config(self):
        """Load system configuration"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT key, value FROM system_config')

        config = {}
        for row in cursor.fetchall():
            config[row[0]] = row[1]

        return config

    def _collect_games(self):
        """Collect upcoming games"""
        enabled_sports = self.config['enabled_sports'].split(',')
        all_games = []

        for sport in enabled_sports:
            sport = sport.strip()
            if sport == 'nba':
                games = self.game_collector.collect_nba_games(days_ahead=2)
                all_games.extend(games)

        return all_games

    def _update_team_stats(self, games):
        """Update statistics for all teams"""
        teams = set()
        for game in games:
            teams.add(game['home_team'])
            teams.add(game['away_team'])

        for team in teams:
            self.stats_collector.collect_team_stats(team)

    def _collect_injuries(self):
        """Collect injury reports and calculate player impacts"""
        enabled_sports = self.config['enabled_sports'].split(',')
        all_injuries = []

        for sport in enabled_sports:
            sport = sport.strip()
            injuries = self.injury_collector.collect_injuries(sport)
            all_injuries.extend(injuries)

        # Calculate player impact scores for injured players
        print("📊 Step 3b: Calculating player impact scores...")
        self.player_stats_collector.collect_player_stats()
        print("   ✅ Player impacts calculated\n")

        return all_injuries

    def _check_game_news(self, game_ids):
        """Check for suspensions, fights, and other news for games"""
        news_items = self.news_monitor.check_games_for_suspensions(game_ids)
        return news_items

    def _get_injury_impact(self, home_team, away_team):
        """Get injury impact score including suspensions"""
        return self.news_monitor.score_injury_impact(home_team, away_team)

    def _collect_odds(self, games):
        """Collect betting lines for all games"""
        for game in games:
            self.odds_collector.collect_odds(game['game_id'])

    def _format_recommendation(self, game, analysis):
        """Format recommendation for storage and display"""
        rec = analysis['recommendation']
        comp = analysis['composite']

        if not rec['recommended']:
            return {
                'game_id': game['game_id'],
                'game_date': game['game_date'],
                'game_time': game['game_time'],
                'home_team': game['home_team'],
                'away_team': game['away_team'],
                'bet_type': None,
                'bet_selection': None,
                'side': None,
                'confidence': comp['confidence'],
                'expected_value': None,
                'risk_level': None,
                'recommended_bet': None,
                'max_bet': None,
                'reasoning': [],
                'concerns': [],
                'analysis': analysis
            }

        return {
            'game_id': game['game_id'],
            'game_date': game['game_date'],
            'game_time': game['game_time'],
            'home_team': game['home_team'],
            'away_team': game['away_team'],
            'bet_type': rec.get('bet_type'),
            'bet_selection': rec.get('bet_selection'),
            'side': rec.get('side'),
            'confidence': rec['confidence'],
            'expected_value': rec.get('expected_value'),
            'risk_level': rec.get('risk_level'),
            'recommended_bet': rec.get('recommended_bet_amount'),
            'max_bet': rec.get('max_bet_amount'),
            'reasoning': rec.get('reasoning', []),
            'concerns': rec.get('concerns', []),
            'analysis': analysis
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

        # Show confidence change if morning data available
        if 'morning_confidence' in pick:
            morning = pick['morning_confidence']
            change = conf - morning
            if change >= 0:
                print(f"📈 Updated from morning: {morning:.1f} → {conf:.1f} (+{change:.1f})")
            else:
                print(f"📉 Updated from morning: {morning:.1f} → {conf:.1f} ({change:.1f})")
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
            score_val = data.get('score')
            if score_val is None:
                continue
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

    def _get_season_record(self):
        """Get overall season performance"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses
            FROM bet_results
            WHERE placed_by = 'terry'
        ''')

        row = cursor.fetchone()
        if row and row[0] > 0:
            total, wins, losses = row
            win_rate = (wins / (wins + losses) * 100) if (wins + losses) > 0 else 0
            return f"{wins}-{losses} ({win_rate:.1f}%)"

        return "0-0 (New Season)"

    def _get_recent_form(self):
        """Get last 10 bets"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT result
            FROM bet_results
            WHERE placed_by = 'terry'
            ORDER BY placed_at DESC
            LIMIT 10
        ''')

        results = [row[0] for row in cursor.fetchall()]
        if not results:
            return "No bets yet"

        wins = sum(1 for r in results if r == 'win')
        losses = sum(1 for r in results if r == 'loss')
        return f"{wins}-{losses} L10"

    def _record_bet_for_tracking(self, pick):
        """Record bet to bet_tracker for accuracy tracking"""
        try:
            if pick and self.config.get('paper_trading'):
                bet_selection = pick.get('bet_selection', '')
                line = None
                if '-' in bet_selection:
                    try:
                        line = float(bet_selection.split('-')[1].split()[0])
                    except:
                        pass
                
                self.bet_tracker.record_bet(
                    game_id=pick['game_id'],
                    home_team=pick['home_team'],
                    away_team=pick['away_team'],
                    bet_selection=bet_selection,
                    confidence=pick['confidence'],
                    ev=pick.get('expected_value', 0),
                    bet_type=pick.get('bet_type', 'spread'),
                    line=line
                )
                print(f"   ✅ Bet recorded for tracking: {bet_selection} (conf: {pick['confidence']})")
        except Exception as e:
            print(f"   ⚠️ Could not record bet: {e}")

# Entry point
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Sports Betting Analysis System')
    parser.add_argument('--mode', choices=['scout', 'final', 'full'],
                       default='full', help='Analysis mode: scout (morning), final (afternoon), or full (both)')
    args = parser.parse_args()

    orchestrator = BettingOrchestrator()
    orchestrator.run_analysis(mode=args.mode)
