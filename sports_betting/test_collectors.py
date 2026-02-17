from collectors.game_collector import GameCollector
from collectors.stats_collector import StatsCollector
from collectors.injury_collector import InjuryCollector
from collectors.odds_collector import OddsCollector

DB_PATH = '/home/clawd/clawd/data/sports_betting.db'

print("Testing collectors...")

# Test game collector
print("\n1. Testing GameCollector...")
game_collector = GameCollector(DB_PATH)
games = game_collector.collect_nba_games(days_ahead=2)
print(f"   Collected {len(games)} games")

# Test stats collector
print("\n2. Testing StatsCollector...")
stats_collector = StatsCollector(DB_PATH)
if games:
    for game in games[:2]:
        stats_collector.collect_team_stats(game['home_team'])
        stats_collector.collect_team_stats(game['away_team'])
    print("   Updated team stats")

# Test injury collector
print("\n3. Testing InjuryCollector...")
injury_collector = InjuryCollector(DB_PATH)
injuries = injury_collector.collect_injuries()
print(f"   Found {len(injuries)} injuries")

# Test odds collector
print("\n4. Testing OddsCollector...")
odds_collector = OddsCollector(DB_PATH)
if games:
    for game in games[:2]:
        odds_collector.collect_odds(game['game_id'])
    print("   Collected odds for games")

print("\n✅ All collectors tested successfully!")
