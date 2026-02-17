#!/usr/bin/env python3
"""
Test performance tracking with sample data
"""

import sqlite3
from datetime import datetime, timedelta
import config
from analytics.performance_tracker import PerformanceTracker

DB_PATH = config.DB_PATH

print("Setting up test data...\n")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Create some sample bet results
sample_bets = [
    ('nba_test_1', 'Lakers -5.5', 'win', 10.0, 9.09),
    ('nba_test_2', 'Warriors +3.5', 'loss', 10.0, -10.0),
    ('nba_test_3', 'Celtics -7.5', 'win', 10.0, 9.09),
    ('nba_test_4', 'Heat +4.5', 'win', 10.0, 9.09),
    ('nba_test_5', 'Knicks -2.5', 'loss', 10.0, -10.0),
]

print("Inserting sample results...")
for i, (game_id, selection, result, amount, profit) in enumerate(sample_bets):
    placed_at = datetime.now() - timedelta(days=len(sample_bets)-i)

    cursor.execute('''
        INSERT INTO bet_results (
            game_id, bet_type, bet_selection, odds,
            bet_amount, placed_at, placed_by, result, profit_loss
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (game_id, 'spread', selection, -110, amount, placed_at, 'terry', result, profit))

conn.commit()
print(f"✅ Inserted {len(sample_bets)} sample bets\n")

# Test tracker
print("Testing PerformanceTracker...\n")

tracker = PerformanceTracker(DB_PATH)

# Test season stats
season = tracker.get_season_stats()
if season:
    print("✅ Season stats working")
    print(f"   Record: {season['record']}")
    print(f"   ROI: {season['roi']}%\n")

# Test recent form
recent = tracker.get_recent_form(5)
if recent:
    print("✅ Recent form working")
    print(f"   Last 5: {recent['record']}\n")

# Test weekly report
weekly = tracker.get_weekly_report()
if weekly:
    print("✅ Weekly report working")
    print(f"   This week: {weekly['record']}\n")

print("Testing complete!\n")
print("Run 'python3 show_stats.py' to see full stats display")
print("Run 'python3 log_result.py' to see pending bets\n")

# Cleanup option
print("To remove test data:")
print("  sqlite3 ~/clawd/data/sports_betting.db")
print("  DELETE FROM bet_results WHERE game_id LIKE 'nba_test_%';")
