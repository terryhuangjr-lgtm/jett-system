#!/usr/bin/env python3
"""
Slack notifier using Bot API (matches system pattern)
Uses SLACK_BOT_TOKEN like other automation scripts
"""

import json
import subprocess
import requests
from datetime import datetime

# Channel ID for #sportsbetting
SPORTSBETTING_CHANNEL = 'C0AECD13HJQ'

def get_secret(key):
    """Get secret using Node.js secrets manager"""
    try:
        result = subprocess.run(
            ['node', '-e', f"const {{getSecret}} = require('/home/clawd/clawd/lib/secrets-manager.js'); console.log(getSecret('{key}'));"],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except Exception as e:
        print(f"Error getting secret {key}: {e}")
        return None

class SlackNotifier:
    """Posts to Slack using Bot API"""
    
    def __init__(self):
        self.bot_token = get_secret('SLACK_BOT_TOKEN')
        self.channel_id = SPORTSBETTING_CHANNEL
        
    def post_message(self, text):
        """Post message to #sportsbetting"""
        if not self.bot_token:
            print("⚠️  No Slack bot token available")
            return False
            
        try:
            response = requests.post(
                'https://slack.com/api/chat.postMessage',
                headers={
                    'Authorization': f'Bearer {self.bot_token}',
                    'Content-Type': 'application/json'
                },
                json={
                    'channel': self.channel_id,
                    'text': text
                },
                timeout=10
            )
            
            result = response.json()
            if result.get('ok'):
                print("✅ Posted to #sportsbetting")
                return True
            else:
                print(f"❌ Slack error: {result.get('error')}")
                return False
                
        except Exception as e:
            print(f"❌ Failed to post to Slack: {e}")
            return False
    
    def send_scout_report(self, watch_list, total_games):
        """Send scout mode report"""
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
        """Send final mode pick"""
        if not daily_pick:
            message = "🎯 *FINAL MODE: No Qualifying Bets*\n\n"
            message += "Analyzed watch list but no games met confidence threshold.\n"
            message += "✅ Better to pass than force a bet!"
            return self.post_message(message)
        
        # Get book line
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
        """Send test message"""
        message = "🏀 *Sports Betting System Test*\n\n"
        message += "✅ Connected to #sportsbetting via Bot API\n"
        message += "System ready for tonight's 1 AM scout run!"
        return self.post_message(message)

if __name__ == '__main__':
    import sys
    notifier = SlackNotifier()
    
    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        notifier.send_test_message()
    else:
        print("Usage: python3 slack_notifier_bot.py test")
