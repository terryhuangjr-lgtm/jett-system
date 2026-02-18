import sqlite3
import random

class OddsCollector:
    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)

    def collect_odds(self, game_id):
        """
        Collect betting lines
        Using placeholder data for now - will add real API later
        """
        # Generate realistic odds
        spread = round(random.uniform(-10, 10) * 2) / 2  # -10 to +10, half points
        total = round(random.uniform(210, 230) * 2) / 2

        # Moneyline based on spread
        if spread > 0:
            home_ml = int(spread * -20)  # Rough conversion
            away_ml = int(spread * 15)
        else:
            home_ml = int(abs(spread) * 15)
            away_ml = int(abs(spread) * -20)

        odds = {
            'game_id': game_id,
            'home_spread': spread,
            'away_spread': -spread,
            'home_ml': home_ml,
            'away_ml': away_ml,
            'total': total
        }

        self._save_odds(odds)
        return odds

    def _save_odds(self, odds):
        """Save odds to database"""
        cursor = self.conn.cursor()

        cursor.execute('''
            INSERT INTO betting_lines (
                game_id, home_spread, away_spread,
                home_ml, away_ml, total
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            odds['game_id'],
            odds['home_spread'],
            odds['away_spread'],
            odds['home_ml'],
            odds['away_ml'],
            odds['total']
        ))

        self.conn.commit()
