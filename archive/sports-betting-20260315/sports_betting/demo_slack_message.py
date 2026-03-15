#!/usr/bin/env python3
"""
Demo - Show what the Slack message would look like
"""

from notifiers.slack_notifier import SlackNotifier
import json

print("\n" + "="*70)
print("🏀 SLACK MESSAGE PREVIEW")
print("="*70 + "\n")

# Create notifier with dummy URL
notifier = SlackNotifier("https://dummy.url")

# Create sample betting data
daily_pick = {
    'away_team': 'Los Angeles Lakers',
    'home_team': 'Golden State Warriors',
    'game_time': '19:30',
    'bet_selection': 'Golden State Warriors -4.5',
    'confidence': 7.4,
    'expected_value': 25.2,
    'risk_level': 'medium',
    'recommended_bet': 5.00,
    'reasoning': [
        'Recent form: Home 70.0%, Away 50.0%',
        'Home court advantage: 5.7 points',
        'Line value: +8.4 points'
    ],
    'concerns': [
        'Monitor injury reports before placing bet'
    ]
}

other_bets = [
    {
        'away_team': 'Boston Celtics',
        'home_team': 'Miami Heat',
        'bet_selection': 'Miami Heat -3.0',
        'confidence': 7.1
    }
]

stats = {
    'season_record': '12-8 (60.0%)',
    'recent_form': '7-3 L10'
}

# Build the message
message = notifier._build_daily_message(daily_pick, other_bets, stats)

print("MESSAGE STRUCTURE:")
print(json.dumps(message, indent=2))

print("\n" + "="*70)
print("SLACK MESSAGE WOULD SHOW:")
print("="*70 + "\n")

print("🏀 Daily Betting Analysis")
print(f"📅 Monday, February 10, 2026 | Season: 12-8 (60.0%) | Recent: 7-3 L10")
print("─" * 70)
print("\n🌟 DAILY PICK")
print("\n🏀 Los Angeles Lakers @ Golden State Warriors")
print("⏰ 19:30")
print("\n🎯 BET: Golden State Warriors -4.5")
print("\n🔥 Confidence: 7.4/10")
print("💰 Expected Value: +25.2%")
print("⚠️ Risk: Medium")
print("💵 Suggested Bet: $5.00")
print("\nWhy This Bet:")
print("✅ Recent form: Home 70.0%, Away 50.0%")
print("✅ Home court advantage: 5.7 points")
print("✅ Line value: +8.4 points")
print("\nWatch Out:")
print("⚠️ Monitor injury reports before placing bet")
print("\n─" * 70)
print("\n📋 Other Good Bets")
print("\n2. Boston Celtics @ Miami Heat")
print("   🎯 Miami Heat -3.0")
print("   🔥 Confidence: 7.1/10")
print("\n─" * 70)
print("💡 Paper trading mode: Track without real money | Review before placing any bets")

print("\n" + "="*70)
print("✅ This is what users will see in Slack!")
print("="*70 + "\n")

print("To send real messages:")
print("1. Set up Slack webhook (see instructions)")
print("2. Update config.py with webhook URL")
print("3. Run: python3 test_slack.py")
