#!/usr/bin/env python3
"""
Analyze tonight's NBA games and show recommendations
"""

import sqlite3
from analyzer.bet_scorer import BetScorer
import config

DB_PATH = config.DB_PATH

print("\n" + "="*70)
print("🏀 TONIGHT'S NBA BETTING ANALYSIS")
print("="*70 + "\n")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
scorer = BetScorer(DB_PATH)

# Get tonight's games
cursor.execute("""
    SELECT game_id, away_team, home_team, game_time
    FROM games
    WHERE game_id LIKE 'test_%'
    AND status = 'scheduled'
    ORDER BY game_time
""")

games = cursor.fetchall()

if not games:
    print("❌ No games found. Run: python3 test_tonights_games.py")
    exit(1)

print(f"Analyzing {len(games)} games...\n")

recommendations = []

for game_id, away_team, home_team, game_time in games:
    print(f"🔍 {away_team} @ {home_team} ({game_time})")

    try:
        analysis = scorer.score_game(game_id)

        if analysis:
            conf = analysis['composite']['confidence']
            rec = analysis['recommendation']

            print(f"   Confidence: {conf:.1f}/10")

            if rec['recommended']:
                print(f"   ✅ {rec['bet_selection']}")
                print(f"   EV: +{rec['expected_value']:.1f}%")
                recommendations.append({
                    'game': f"{away_team} @ {home_team}",
                    'time': game_time,
                    'pick': rec['bet_selection'],
                    'confidence': conf,
                    'ev': rec['expected_value'],
                    'bet_amount': rec['recommended_bet_amount'],
                    'risk': rec['risk_level'],
                    'reasoning': rec['reasoning']
                })
            else:
                print(f"   ❌ Pass - {rec.get('reason', 'Below threshold')}")
        else:
            print(f"   ⚠️  Analysis failed")

    except Exception as e:
        print(f"   ❌ Error: {e}")

    print()

# Summary
print("="*70)
print("📊 TONIGHT'S RECOMMENDATIONS")
print("="*70 + "\n")

if recommendations:
    # Sort by confidence
    recommendations.sort(key=lambda x: x['confidence'], reverse=True)

    for i, rec in enumerate(recommendations, 1):
        print(f"{i}. {rec['game']} | {rec['time']}")
        print(f"   🎯 PICK: {rec['pick']}")
        print(f"   🔥 Confidence: {rec['confidence']:.1f}/10")
        print(f"   💰 Expected Value: +{rec['ev']:.1f}%")
        print(f"   💵 Bet: ${rec['bet_amount']:.2f}")
        print(f"   ⚠️  Risk: {rec['risk'].upper()}")
        print(f"   Why:")
        for reason in rec['reasoning'][:3]:
            print(f"      • {reason}")
        print()

    print(f"TOTAL BETS: {len(recommendations)}")
    print(f"TOTAL STAKE: ${sum(r['bet_amount'] for r in recommendations):.2f}")
    print()

    # Best pick
    best = recommendations[0]
    print("="*70)
    print("⭐ BEST PICK OF THE NIGHT")
    print("="*70)
    print(f"\n{best['game']} | {best['time']}")
    print(f"🎯 {best['pick']}")
    print(f"🔥 {best['confidence']:.1f}/10 confidence")
    print(f"💵 Bet ${best['bet_amount']:.2f} to win ${best['bet_amount'] * 0.909:.2f}")
    print()

else:
    print("❌ NO QUALIFYING BETS TONIGHT")
    print("All games failed to meet confidence threshold.")
    print("Better to pass than force a bet!")
    print()

print("="*70 + "\n")

conn.close()
