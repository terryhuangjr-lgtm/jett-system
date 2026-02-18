from analyzer.bet_scorer import BetScorer
import sqlite3

DB_PATH = '/home/clawd/clawd/data/sports_betting.db'

print("Testing Bet Scorer...\n")

scorer = BetScorer(DB_PATH)

# Get a game to analyze
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("SELECT game_id FROM games LIMIT 1")
game = cursor.fetchone()

if not game:
    print("❌ No games found. Run test_collectors.py first.")
    exit(1)

game_id = game[0]

# Score the game
analysis = scorer.score_game(game_id)

if analysis:
    print(f"\n{'='*60}")
    print(f"GAME ANALYSIS")
    print(f"{'='*60}")

    game = analysis['game']
    print(f"\n{game['away_team']} @ {game['home_team']}")
    print(f"Date: {game['game_date']} {game['game_time']}")

    print(f"\n{'='*60}")
    print(f"SCORING BREAKDOWN")
    print(f"{'='*60}")

    for factor, data in analysis['scores'].items():
        print(f"\n{factor.upper()}:")
        print(f"  Score: {data['score']:+.1f}")
        print(f"  {data['explanation']}")

    print(f"\n{'='*60}")
    print(f"COMPOSITE SCORE")
    print(f"{'='*60}")

    comp = analysis['composite']
    print(f"Confidence: {comp['confidence']:.1f}/10 ({comp['interpretation']})")

    print(f"\n{'='*60}")
    print(f"RECOMMENDATION")
    print(f"{'='*60}")

    rec = analysis['recommendation']

    if rec['recommended']:
        print(f"\n✅ BET RECOMMENDED")
        print(f"\nBet: {rec['bet_selection']}")
        print(f"Confidence: {rec['confidence']:.1f}/10")
        print(f"Expected Value: +{rec['expected_value']}%")
        print(f"Risk: {rec['risk_level'].upper()}")
        print(f"Recommended Bet: ${rec['recommended_bet_amount']:.2f}")

        print(f"\nReasoning:")
        for i, reason in enumerate(rec['reasoning'], 1):
            print(f"  {i}. {reason}")

        print(f"\nConcerns:")
        for concern in rec['concerns']:
            print(f"  ⚠️  {concern}")
    else:
        print(f"\n❌ NO BET RECOMMENDED")
        print(f"Reason: {rec['reason']}")

    print(f"\n{'='*60}\n")

    print("✅ Scorer test complete!")
else:
    print("❌ Failed to analyze game")
