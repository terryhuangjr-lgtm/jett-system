#!/usr/bin/env python3
"""
Telegram notifier using clawdbot
Migrated from Slack on 2026-03-07
"""

import subprocess
import os
from datetime import datetime

CLAWDBOT = '/home/clawd/.nvm/versions/node/v22.22.0/bin/clawdbot'
TELEGRAM_USER = '5867308866'  # Terry's Telegram ID

def send_via_clawdbot(message, target=None):
    """Send message to Telegram via clawdbot"""
    try:
        if target is None:
            target = TELEGRAM_USER
        
        escaped = message.replace('"', '\\"').replace('`', '\\`')
        result = subprocess.run(
            [CLAWDBOT, 'message', 'send',
             '--channel', 'telegram',
             '--target', target,
             '--message', escaped,
             '--json'],
            capture_output=True,
            text=True,
            timeout=15
        )
        if result.returncode == 0:
            print(f"✅ Posted to Telegram via clawdbot (target: {target})")
            return True
        else:
            print(f"❌ clawdbot error: {result.stderr[:200]}")
            return False
    except Exception as e:
        print(f"❌ Failed to send via clawdbot: {e}")
        return False


class TelegramNotifier:
    """Posts to Telegram using clawdbot"""

    def __init__(self, target=None):
        """Initialize with optional target override (default: TELEGRAM_USER)"""
        self.target = target or TELEGRAM_USER

    def post_message(self, text, target=None):
        """Post message to Slack (optionally override target)"""
        return send_via_clawdbot(text, target=target or self.target)

    def send_scout_report(self, watch_list, total_games):
        message = f"🔍 *SCOUT REPORT*\n\n"
        message += f"Analyzed {total_games} NBA games | {len(watch_list)} worth watching\n\n"

        if watch_list:
            for i, item in enumerate(watch_list[:3], 1):
                game = item['game']
                message += f"{i}. *{game['away_team']} @ {game['home_team']}* ({game['game_time']})\n"
                message += f"   Early confidence: {item['confidence']:.1f}/10\n"
                if item.get('early_lean'):
                    message += f"   Early lean: {item['early_lean']}\n"
                message += "\n"
        else:
            message += "_No games met the watch threshold today_\n"

        message += f"\n_Scout run completed at {datetime.now().strftime('%I:%M %p')}_"
        return self.post_message(message)

    def send_final_pick(self, daily_pick, alternatives):
        if not daily_pick:
            message = "🎯 *FINAL MODE: No Qualifying Bets*\n\n"
            message += "Analyzed watch list but no games met confidence threshold.\n"
            message += "✅ Better to pass than force a bet!"
            return self.post_message(message)

        book_line = ""
        if 'analysis' in daily_pick and daily_pick['analysis']:
            comp = daily_pick['analysis'].get('composite', {})
            book_spread = comp.get('book_spread', 0)
            if book_spread:
                home = daily_pick['home_team']
                if book_spread < 0:
                    book_line = f" (📊 Book: {home} {book_spread:+.1f})"
                elif book_spread > 0:
                    book_line = f" (📊 Book: {home} +{book_spread:.1f})"
                else:
                    book_line = " (📊 Book: Pick'em)"

        message = f"🏀 *DAILY PICK*\n\n"
        message += f"*{daily_pick['away_team']} @ {daily_pick['home_team']}* | {daily_pick['game_time']}\n\n"
        message += f"🎯 *BET: {daily_pick['bet_selection']}*{book_line}\n"
        message += f"🔥 Confidence: {daily_pick['confidence']:.1f}/10\n"
        message += f"💰 Expected Value: +{daily_pick['expected_value']:.1f}%\n"
        message += f"💵 Recommended Bet: ${daily_pick['recommended_bet']:.2f}\n"
        message += f"⚠️  Risk: {daily_pick['risk_level'].title()}\n\n"

        message += "*Why This Bet:*\n"
        for reason in daily_pick['reasoning'][:3]:
            message += f"• {reason}\n"

        if alternatives:
            message += f"\n_Also considered {len(alternatives)} other games_"

        message += f"\n\n💡 Paper trading mode - Review before placing"
        return self.post_message(message)

    def send_test_message(self):
        message = "🏀 *Sports Betting System Test*\n\n"
        message += "✅ Connected to Telegram via clawdbot\n"
        message += f"System ready! Time: {datetime.now().strftime('%I:%M %p')}"
        return self.post_message(message)


if __name__ == '__main__':
    import sys
    notifier = TelegramNotifier()
    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        notifier.send_test_message()
    else:
        print("Usage: python3 clawdbot_notifier.py test")
