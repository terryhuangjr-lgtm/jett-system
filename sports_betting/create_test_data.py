#!/usr/bin/env python3
"""Create test data for scorer testing"""

import sqlite3
from datetime import datetime, timedelta

DB_PATH = '/home/clawd/clawd/data/sports_betting.db'

print("Creating test data...")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Create a test game
game_date = (datetime.now() + timedelta(days=1)).date()
game_id = f"nba_{game_date.strftime('%Y%m%d')}_Lakers_Warriors"

cursor.execute('''
    INSERT OR REPLACE INTO games
    (game_id, sport, game_date, game_time, home_team, away_team, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
''', (game_id, 'nba', game_date, '19:30', 'Golden State Warriors', 'Los Angeles Lakers', 'scheduled'))

print(f"  ✓ Created game: Lakers @ Warriors")

# Create team stats for both teams
teams_data = [
    {
        'team_name': 'Golden State Warriors',
        'wins': 42, 'losses': 18,
        'home_wins': 26, 'home_losses': 5,
        'away_wins': 16, 'away_losses': 13,
        'last_10_wins': 7,
        'avg_points_scored': 116.5,
        'avg_points_allowed': 110.2,
        'point_differential': 6.3
    },
    {
        'team_name': 'Los Angeles Lakers',
        'wins': 35, 'losses': 25,
        'home_wins': 22, 'home_losses': 9,
        'away_wins': 13, 'away_losses': 16,
        'last_10_wins': 5,
        'avg_points_scored': 112.8,
        'avg_points_allowed': 111.5,
        'point_differential': 1.3
    }
]

for team in teams_data:
    cursor.execute('''
        INSERT OR REPLACE INTO team_stats (
            team_name, sport, season, wins, losses,
            home_wins, home_losses, away_wins, away_losses,
            last_10_wins, avg_points_scored, avg_points_allowed,
            point_differential
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        team['team_name'], 'nba', '2025-26',
        team['wins'], team['losses'],
        team['home_wins'], team['home_losses'],
        team['away_wins'], team['away_losses'],
        team['last_10_wins'],
        team['avg_points_scored'],
        team['avg_points_allowed'],
        team['point_differential']
    ))
    print(f"  ✓ Created stats for {team['team_name']}")

# Create some injuries
cursor.execute('''
    INSERT OR REPLACE INTO player_stats (
        player_name, team_name, position,
        injury_status, injury_description
    ) VALUES (?, ?, ?, ?, ?)
''', ('LeBron James', 'Los Angeles Lakers', 'F', 'questionable', 'Ankle soreness'))

print(f"  ✓ Created injury report")

# Create betting line
cursor.execute('''
    INSERT INTO betting_lines (
        game_id, home_spread, away_spread,
        home_ml, away_ml, total
    ) VALUES (?, ?, ?, ?, ?, ?)
''', (game_id, -4.5, 4.5, -180, 160, 225.5))

print(f"  ✓ Created betting line (Warriors -4.5)")

conn.commit()
conn.close()

print("\n✅ Test data created successfully!")
print(f"Game ID: {game_id}")
