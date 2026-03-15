#!/usr/bin/env python3
"""
Demo Orchestrator - Shows full report with existing test data
Does not regenerate stats to maintain consistency
"""

import sqlite3
from datetime import datetime
from collectors.injury_collector import InjuryCollector
from analyzer.bet_scorer import BetScorer

# Temporarily lower confidence threshold for demo
DB_PATH = '/home/clawd/clawd/data/sports_betting.db'

print(f"\n{'='*70}")
print(f"🏀 SPORTS BETTING RESEARCH SYSTEM - DEMO")
print(f"{'='*70}")
print(f"Started: {datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')}\n")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Get games
cursor.execute("SELECT game_id, game_date, game_time, home_team, away_team FROM games WHERE status = 'scheduled'")
games = cursor.fetchall()

print(f"📅 Found {len(games)} games to analyze\n")

if not games:
    print("❌ No games found. Run create_test_data.py first.")
    exit(1)

# Lower confidence threshold for demo
cursor.execute("UPDATE system_config SET value = '6.0' WHERE key = 'min_confidence'")
conn.commit()

# Analyze games
scorer = BetScorer(DB_PATH)
recommendations = []

print("🧮 Analyzing games...\n")
for game in games:
    game_id = game[0]
    analysis = scorer.score_game(game_id)

    if analysis and analysis['recommendation']['recommended']:
        rec = analysis['recommendation']
        recommendations.append({
            'game_id': game_id,
            'game_date': game[1],
            'game_time': game[2],
            'home_team': game[3],
            'away_team': game[4],
            'bet_type': rec['bet_type'],
            'bet_selection': rec['bet_selection'],
            'confidence': rec['confidence'],
            'expected_value': rec['expected_value'],
            'risk_level': rec['risk_level'],
            'recommended_bet': rec['recommended_bet_amount'],
            'max_bet': rec['max_bet_amount'],
            'reasoning': rec['reasoning'],
            'concerns': rec['concerns'],
            'analysis': analysis
        })

print(f"   ✅ Generated {len(recommendations)} recommendations\n")

# Display report
print(f"{'='*70}")
print(f"📊 BETTING ANALYSIS REPORT")
print(f"{'='*70}\n")

cursor.execute("SELECT value FROM system_config WHERE key = 'paper_trading'")
paper_trading = cursor.fetchone()[0]

print(f"Games Analyzed: {len(games)}")
print(f"Recommendations Generated: {len(recommendations)}")
print(f"Paper Trading: {paper_trading}")
print()

if recommendations:
    # Show daily pick
    daily_pick = recommendations[0]

    print(f"{'='*70}")
    print("🌟 DAILY PICK")
    print(f"{'='*70}\n")

    print(f"🏀 {daily_pick['away_team']} @ {daily_pick['home_team']}")
    print(f"⏰ {daily_pick['game_time']}")
    print()

    print(f"{'─'*70}")
    print(f"🎯 BET: {daily_pick['bet_selection']}")
    print(f"{'─'*70}\n")

    # Confidence visualization
    conf = daily_pick['confidence']
    bars = '█' * int(conf) + '░' * (10 - int(conf))
    print(f"📊 Confidence: {conf:.1f}/10  [{bars}]")
    print(f"   {daily_pick['analysis']['composite']['interpretation']}")
    print()

    print(f"💰 Expected Value: +{daily_pick['expected_value']:.1f}%")
    print(f"⚠️  Risk Level: {daily_pick['risk_level'].upper()}")
    print()

    print(f"💵 Recommended Bet: ${daily_pick['recommended_bet']:.2f}")
    print(f"   (Max: ${daily_pick['max_bet']:.2f})")
    print()

    print("✅ WHY THIS BET:")
    for i, reason in enumerate(daily_pick['reasoning'], 1):
        print(f"   {i}. {reason}")
    print()

    if daily_pick['concerns']:
        print("⚠️  WATCH OUT FOR:")
        for concern in daily_pick['concerns']:
            print(f"   • {concern}")
        print()

    # Scoring breakdown
    print(f"{'─'*70}")
    print("📈 SCORING BREAKDOWN")
    print(f"{'─'*70}\n")

    scores = daily_pick['analysis']['scores']
    for factor, data in scores.items():
        score_val = data['score']
        bar_len = int(abs(score_val))
        bar_char = '█' if score_val >= 0 else '▓'
        bar = bar_char * bar_len

        print(f"{factor.replace('_', ' ').title():20} {score_val:+6.1f}  {bar}")
    print()

    # Save to database
    cursor.execute('''
        INSERT INTO bet_recommendations (
            game_id, bet_type, bet_selection, confidence_score,
            expected_value, risk_level, max_bet_amount,
            recommended_bet_amount, primary_reasoning, concerns,
            is_daily_pick, recommended_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        daily_pick['game_id'],
        daily_pick['bet_type'],
        daily_pick['bet_selection'],
        daily_pick['confidence'],
        daily_pick['expected_value'],
        daily_pick['risk_level'],
        daily_pick['max_bet'],
        daily_pick['recommended_bet'],
        '\n'.join(daily_pick['reasoning']),
        '\n'.join(daily_pick['concerns']),
        1,
        datetime.now()
    ))
    conn.commit()

    print("\n💾 Recommendation saved to database")

else:
    print("❌ NO QUALIFYING BETS TODAY")
    print("All games failed to meet minimum confidence threshold.")

# Reset confidence threshold
cursor.execute("UPDATE system_config SET value = '7.0' WHERE key = 'min_confidence'")
conn.commit()

print(f"\n{'='*70}")
print(f"✅ ANALYSIS COMPLETE")
print(f"Finished: {datetime.now().strftime('%Y-%m-%d %I:%M:%S %p')}")
print(f"{'='*70}\n")

conn.close()
