#!/usr/bin/env python3
"""
Create realistic test data for tonight's NBA games and run analysis
"""

import sqlite3
from datetime import datetime, timedelta
import random

DB_PATH = '/home/clawd/clawd/data/sports_betting.db'

print("\n" + "="*70)
print("🏀 TONIGHT'S NBA GAMES - TEST ANALYSIS")
print("="*70 + "\n")

# Connect to database
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Clear old test games
cursor.execute("DELETE FROM games WHERE game_id LIKE 'test_%'")
cursor.execute("DELETE FROM betting_lines WHERE game_id LIKE 'test_%'")
cursor.execute("DELETE FROM watch_list WHERE game_id LIKE 'test_%'")
conn.commit()

# Tonight's actual NBA games (Monday, Feb 10, 2026)
tonight = datetime.now().date()
games_tonight = [
    {
        'away': 'Boston Celtics',
        'home': 'Milwaukee Bucks',
        'time': '19:30',
        'away_record': (37, 13),  # W-L
        'home_record': (32, 18),
        'spread': -3.5  # Bucks favored
    },
    {
        'away': 'Los Angeles Lakers',
        'home': 'Phoenix Suns',
        'time': '20:00',
        'away_record': (28, 22),
        'home_record': (30, 20),
        'spread': -4.0  # Suns favored
    },
    {
        'away': 'Denver Nuggets',
        'home': 'Dallas Mavericks',
        'time': '20:30',
        'away_record': (35, 15),
        'home_record': (31, 19),
        'spread': -2.5  # Nuggets favored
    },
    {
        'away': 'Miami Heat',
        'home': 'Atlanta Hawks',
        'time': '19:00',
        'away_record': (25, 25),
        'home_record': (22, 28),
        'spread': +1.5  # Heat favored (on road!)
    }
]

print("Creating tonight's game data...\n")

for i, game in enumerate(games_tonight, 1):
    game_id = f"test_{tonight.strftime('%Y%m%d')}_{game['away'].replace(' ', '_')}_{game['home'].replace(' ', '_')}"

    # Insert game
    cursor.execute('''
        INSERT INTO games
        (game_id, sport, game_date, game_time, home_team, away_team, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (game_id, 'nba', tonight, game['time'], game['home'], game['away'], 'scheduled'))

    # Create team stats
    for team, record in [(game['home'], game['home_record']), (game['away'], game['away_record'])]:
        wins, losses = record
        total = wins + losses

        cursor.execute('''
            INSERT OR REPLACE INTO team_stats (
                team_name, sport, season, wins, losses,
                home_wins, home_losses, away_wins, away_losses,
                last_10_wins, avg_points_scored, avg_points_allowed,
                point_differential
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            team, 'nba', '2025-26',
            wins, losses,
            int(wins * 0.6), int(losses * 0.4),
            int(wins * 0.4), int(losses * 0.6),
            random.randint(4, 8),
            round(random.uniform(108, 118), 1),
            round(random.uniform(108, 118), 1),
            round((wins - losses) / total * 10, 1)
        ))

    # Create betting line
    spread = game['spread']
    cursor.execute('''
        INSERT INTO betting_lines (
            game_id, home_spread, away_spread,
            home_ml, away_ml, total
        ) VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        game_id,
        -spread if spread < 0 else spread,
        spread if spread < 0 else -spread,
        int(spread * -20) if spread < 0 else int(spread * 15),
        int(spread * 15) if spread < 0 else int(spread * -20),
        round(random.uniform(215, 230), 1)
    ))

    print(f"{i}. {game['away']} @ {game['home']}")
    print(f"   Time: {game['time']}")
    print(f"   Records: {game['away']} ({wins}-{losses}) vs {game['home']} ({game['home_record'][0]}-{game['home_record'][1]})")
    print(f"   Line: {game['home']} {spread:+.1f}")
    print()

conn.commit()
conn.close()

print(f"✅ Created {len(games_tonight)} games\n")
print("="*70)
print("Running analysis...\n")
