import sqlite3
import random

class StatsCollector:
    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)

    def collect_team_stats(self, team_name, sport='nba'):
        """
        Collect team statistics
        For now using placeholder data - will enhance later
        """
        # Generate realistic placeholder stats
        wins = random.randint(25, 45)
        losses = random.randint(15, 35)

        stats = {
            'team_name': team_name,
            'sport': sport,
            'season': '2025-26',
            'wins': wins,
            'losses': losses,
            'home_wins': int(wins * 0.6),
            'home_losses': int(losses * 0.4),
            'away_wins': int(wins * 0.4),
            'away_losses': int(losses * 0.6),
            'last_10_wins': random.randint(4, 8),
            'avg_points_scored': round(random.uniform(105, 120), 1),
            'avg_points_allowed': round(random.uniform(105, 120), 1),
            'point_differential': round(random.uniform(-8, 8), 1)
        }

        self._save_team_stats(stats)
        return stats

    def _save_team_stats(self, stats):
        """Save team stats to database"""
        cursor = self.conn.cursor()

        # Check if stats exist
        cursor.execute('''
            SELECT id FROM team_stats
            WHERE team_name = ? AND season = ?
        ''', (stats['team_name'], stats['season']))

        existing = cursor.fetchone()

        if existing:
            # Update
            cursor.execute('''
                UPDATE team_stats SET
                    wins = ?, losses = ?,
                    home_wins = ?, home_losses = ?,
                    away_wins = ?, away_losses = ?,
                    last_10_wins = ?,
                    avg_points_scored = ?,
                    avg_points_allowed = ?,
                    point_differential = ?,
                    last_updated = CURRENT_TIMESTAMP
                WHERE team_name = ? AND season = ?
            ''', (
                stats['wins'], stats['losses'],
                stats['home_wins'], stats['home_losses'],
                stats['away_wins'], stats['away_losses'],
                stats['last_10_wins'],
                stats['avg_points_scored'],
                stats['avg_points_allowed'],
                stats['point_differential'],
                stats['team_name'], stats['season']
            ))
        else:
            # Insert
            cursor.execute('''
                INSERT INTO team_stats (
                    team_name, sport, season, wins, losses,
                    home_wins, home_losses, away_wins, away_losses,
                    last_10_wins, avg_points_scored, avg_points_allowed,
                    point_differential
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                stats['team_name'], stats['sport'], stats['season'],
                stats['wins'], stats['losses'],
                stats['home_wins'], stats['home_losses'],
                stats['away_wins'], stats['away_losses'],
                stats['last_10_wins'],
                stats['avg_points_scored'],
                stats['avg_points_allowed'],
                stats['point_differential']
            ))

        self.conn.commit()
