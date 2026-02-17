#!/usr/bin/env python3
"""
Integration for posting sports betting results to Slack #sportsbetting channel
"""

import requests
import json
import sqlite3
from datetime import datetime
from notifiers.slack_notifier import SlackNotifier
import config

SLACK_WEBHOOK_URL = config.SLACK_WEBHOOK_URL

class DashboardIntegration:
    def __init__(self):
        self.db_path = config.DB_PATH
        self.slack = SlackNotifier(SLACK_WEBHOOK_URL)

    def post_task(self, task_type, title, description, status="pending", metadata=None):
        """Send event notification to Slack #sportsbetting channel"""
        emoji = {
            "sports_betting_scout": "🔍",
            "sports_betting_final": "🎯",
            "sports_betting_result": "📊",
            "sports_betting_stats": "📈",
            "test": "🏀"
        }.get(task_type, "📝")

        message = {
            "text": f"{emoji} Sports Betting Update",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*{emoji} {title}*\n\n{description}"
                    }
                }
            ]
        }

        if metadata:
            metadata_text = json.dumps(metadata, indent=2, default=str)[:500]
            message["blocks"].append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"```\n{metadata_text}\n```"
                }
            })

        return self.slack._send_to_slack(message)

    def post_scout_results(self, watch_list, total_games):
        """Post scout mode results to Slack"""
        emoji = "🔍" if watch_list else "✅"

        description = f"Analyzed {total_games} games, identified {len(watch_list)} worth watching\n\n"
        if watch_list:
            games_text = "\n".join([
                f"• {item['game']['away_team']} @ {item['game']['home_team']} - {item['confidence']:.1f}/10"
                for item in watch_list[:5]
            ])
            description += games_text
        else:
            description += "No games worth watching today."

        return self.post_task(
            task_type="sports_betting_scout",
            title=f"🔍 Scout Mode: {len(watch_list)} games to watch",
            description=description,
            status="completed",
            metadata={
                "mode": "scout",
                "total_games": total_games,
                "watch_list_count": len(watch_list)
            }
        )

    def post_final_pick(self, daily_pick, alternatives):
        """Post final mode pick to Slack"""
        if not daily_pick:
            return self.post_task(
                task_type="sports_betting_final",
                title="🎯 Daily Pick: No qualifying bets",
                description="Analyzed watch list but no games met confidence threshold.\n\n✅ Better to pass than force a bet!",
                status="completed",
                metadata={"mode": "final", "has_pick": False}
            )

        pick_text = f"""
*Game:* {daily_pick['away_team']} @ {daily_pick['home_team']}
*Time:* {daily_pick['game_time']}
*BET:* {daily_pick['bet_selection']}
*Confidence:* {daily_pick['confidence']:.1f}/10
*Expected Value:* +{daily_pick['expected_value']:.1f}%
*Risk:* {daily_pick['risk_level'].upper()}

*Why:*
{chr(10).join(f'• {r}' for r in daily_pick['reasoning'][:3])}
""".strip()

        return self.post_task(
            task_type="sports_betting_final",
            title=f"🎯 Daily Pick: {daily_pick['bet_selection']}",
            description=pick_text,
            status="pending",
            metadata={
                "mode": "final",
                "has_pick": True,
                "game_id": daily_pick['game_id'],
                "confidence": daily_pick['confidence'],
                "bet_amount": daily_pick['recommended_bet']
            }
        )

    def post_bet_result(self, game_id, result, profit):
        """Post bet result after game completes"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT br.bet_selection, br.confidence_score, br.recommended_bet_amount
            FROM bet_recommendations br
            WHERE br.game_id = ? AND br.is_daily_pick = 1
            ORDER BY br.recommended_at DESC LIMIT 1
        """, (game_id,))

        rec = cursor.fetchone()
        conn.close()

        if not rec:
            return None

        bet_selection, confidence, amount = rec

        emoji = "✅" if result == "win" else "❌" if result == "loss" else "➖"

        return self.post_task(
            task_type="sports_betting_result",
            title=f"{emoji} Bet Result: {result.upper()}",
            description=f"""
*BET:* {bet_selection}
*Confidence:* {confidence:.1f}/10
*Amount:* ${amount:.2f}
*Profit/Loss:* ${profit:+.2f}
""".strip(),
            status="completed",
            metadata={
                "game_id": game_id,
                "result": result,
                "profit": profit,
                "bet_amount": amount
            }
        )

    def get_dashboard_tasks(self, task_type=None):
        """Disabled - no longer fetches from dashboard"""
        return []

    def update_dashboard_stats(self):
        """Post current season stats to Slack"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses,
                SUM(profit_loss) as total_profit
            FROM bet_results
            WHERE placed_by = 'terry'
        """)

        row = cursor.fetchone()
        conn.close()

        if row and row[0] > 0:
            total, wins, losses, profit = row
            win_rate = (wins / (wins + losses) * 100) if (wins + losses) > 0 else 0

            return self.post_task(
                task_type="sports_betting_stats",
                title=f"📊 Season Stats: {wins}-{losses} ({win_rate:.1f}%)",
                description=f"""
*Record:* {wins}-{losses}-{total - wins - losses}
*Win Rate:* {win_rate:.1f}%
*Total Profit:* ${profit:+.2f}
*Total Bets:* {total}
""".strip(),
                status="completed",
                metadata={
                    "wins": wins,
                    "losses": losses,
                    "total": total,
                    "profit": profit,
                    "win_rate": win_rate
                }
            )

        return None

    def send_slack_message(self, message):
        """Send arbitrary message to Slack"""
        return self.slack._send_to_slack(message)

if __name__ == "__main__":
    import sys

    dashboard = DashboardIntegration()

    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 dashboard_integration.py stats          # Post current stats")
        print("  python3 dashboard_integration.py test           # Test Slack connection")
        exit(1)

    command = sys.argv[1]

    if command == "stats":
        dashboard.update_dashboard_stats()

    elif command == "test":
        result = dashboard.post_task(
            task_type="test",
            title="🏀 Sports Betting System Test",
            description="Testing Slack integration - system is back online!",
            status="completed"
        )
        if result:
            print("✅ Slack integration working!")
        else:
            print("❌ Slack not responding")
