#!/usr/bin/env python3
"""
Bet Tracker - Records betting outcomes and measures prediction accuracy
"""

import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path('/home/clawd/clawd/data/betting_results.db')

def init_db():
    """Initialize bet results database"""
    db = sqlite3.connect(DB_PATH)
    cursor = db.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bet_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id TEXT UNIQUE,
            game_date DATE,
            home_team TEXT,
            away_team TEXT,
            bet_selection TEXT,
            confidence_score REAL,
            expected_value REAL,
            bet_type TEXT,
            line REAL,
            actual_result TEXT,
            win_loss TEXT,
            placed_at TIMESTAMP,
            game_completed_at TIMESTAMP
        )
    ''')
    
    db.commit()
    db.close()

class BetTracker:
    def __init__(self):
        init_db()
        self.db_path = DB_PATH
    
    def record_bet(self, game_id, home_team, away_team, bet_selection, 
                   confidence, ev, bet_type, line):
        """Record a bet recommendation"""
        db = sqlite3.connect(self.db_path)
        cursor = db.cursor()
        
        try:
            cursor.execute('''
                INSERT OR IGNORE INTO bet_results (
                    game_id, game_date, home_team, away_team, bet_selection,
                    confidence_score, expected_value, bet_type, line, placed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                game_id, datetime.now().date(), home_team, away_team, bet_selection,
                confidence, ev, bet_type, line, datetime.now()
            ))
            db.commit()
            bet_id = cursor.lastrowid
        except:
            bet_id = None
        finally:
            db.close()
        
        return bet_id
    
    def record_result(self, game_id, actual_result, win_loss):
        """Record the actual game result"""
        db = sqlite3.connect(self.db_path)
        cursor = db.cursor()
        
        cursor.execute('''
            UPDATE bet_results SET
                actual_result = ?,
                win_loss = ?,
                game_completed_at = ?
            WHERE game_id = ?
        ''', (actual_result, win_loss, datetime.now(), game_id))
        
        db.commit()
        db.close()
    
    def get_stats(self):
        """Calculate accuracy statistics"""
        db = sqlite3.connect(self.db_path)
        cursor = db.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM bet_results WHERE win_loss IS NOT NULL')
        total = cursor.fetchone()[0]
        
        if total == 0:
            db.close()
            return None
        
        cursor.execute("SELECT COUNT(*) FROM bet_results WHERE win_loss = 'win'")
        wins = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM bet_results WHERE win_loss = 'loss'")
        losses = cursor.fetchone()[0]
        
        cursor.execute("SELECT AVG(confidence_score) FROM bet_results WHERE win_loss = 'win'")
        avg_conf_win = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT AVG(confidence_score) FROM bet_results WHERE win_loss = 'loss'")
        avg_conf_loss = cursor.fetchone()[0] or 0
        
        db.close()
        
        return {
            'total': total,
            'wins': wins,
            'losses': losses,
            'win_rate': (wins/total*100) if total > 0 else 0,
            'avg_confidence_wins': avg_conf_win,
            'avg_confidence_losses': avg_conf_loss
        }
    
    def print_report(self):
        """Print formatted accuracy report"""
        stats = self.get_stats()
        
        print("\n" + "="*50)
        print("BETTING ACCURACY REPORT")
        print("="*50)
        
        if not stats or stats['total'] == 0:
            print("\nNo completed bets yet.")
            return
        
        print(f"\nOverall Performance:")
        print(f"  Total Bets: {stats['total']}")
        print(f"  Wins: {stats['wins']} | Losses: {stats['losses']}")
        print(f"  Win Rate: {stats['win_rate']:.1f}%")
        
        print(f"\nConfidence Correlation:")
        print(f"  Avg Confidence (Wins): {stats['avg_confidence_wins']:.1f}")
        print(f"  Avg Confidence (Losses): {stats['avg_confidence_losses']:.1f}")
        
        if stats['avg_confidence_wins'] > stats['avg_confidence_losses']:
            print("  → Higher confidence bets winning more often ✓")
        else:
            print("  → Confidence not correlating with outcomes")
        
        print()

if __name__ == '__main__':
    tracker = BetTracker()
    tracker.print_report()
