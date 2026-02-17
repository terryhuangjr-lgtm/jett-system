import sqlite3
from datetime import datetime, timedelta

class PerformanceTracker:
    """
    Tracks and analyzes betting performance
    """

    def __init__(self, db_path):
        self.conn = sqlite3.connect(db_path)

    def get_season_stats(self):
        """Get overall season performance"""
        cursor = self.conn.cursor()

        cursor.execute('''
            SELECT
                COUNT(*) as total_bets,
                SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses,
                SUM(CASE WHEN result = 'push' THEN 1 ELSE 0 END) as pushes,
                SUM(bet_amount) as total_wagered,
                SUM(profit_loss) as net_profit
            FROM bet_results
            WHERE placed_by = 'terry'
        ''')

        row = cursor.fetchone()

        if not row or row[0] == 0:
            return None

        total, wins, losses, pushes, wagered, profit = row

        win_rate = (wins / (wins + losses) * 100) if (wins + losses) > 0 else 0
        roi = (profit / wagered * 100) if wagered > 0 else 0

        return {
            'total_bets': total,
            'wins': wins,
            'losses': losses,
            'pushes': pushes,
            'record': f"{wins}-{losses}-{pushes}",
            'win_rate': round(win_rate, 1),
            'total_wagered': round(wagered, 2),
            'net_profit': round(profit, 2),
            'roi': round(roi, 1)
        }

    def get_recent_form(self, limit=10):
        """Get last N bets"""
        cursor = self.conn.cursor()

        cursor.execute('''
            SELECT
                bet_selection,
                result,
                profit_loss,
                placed_at
            FROM bet_results
            WHERE placed_by = 'terry'
            ORDER BY placed_at DESC
            LIMIT ?
        ''', (limit,))

        bets = []
        for row in cursor.fetchall():
            bets.append({
                'bet': row[0],
                'result': row[1],
                'profit': round(row[2], 2),
                'date': row[3]
            })

        if not bets:
            return None

        wins = sum(1 for b in bets if b['result'] == 'win')
        losses = sum(1 for b in bets if b['result'] == 'loss')

        return {
            'record': f"{wins}-{losses}",
            'bets': bets
        }

    def get_weekly_report(self):
        """Generate weekly performance summary"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)

        cursor = self.conn.cursor()

        cursor.execute('''
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses,
                SUM(bet_amount) as wagered,
                SUM(profit_loss) as profit
            FROM bet_results
            WHERE placed_at BETWEEN ? AND ?
            AND placed_by = 'terry'
        ''', (start_date, end_date))

        row = cursor.fetchone()

        if not row or row[0] == 0:
            return None

        total, wins, losses, wagered, profit = row

        win_rate = (wins / (wins + losses) * 100) if (wins + losses) > 0 else 0
        roi = (profit / wagered * 100) if wagered > 0 else 0

        return {
            'period': f"{start_date.strftime('%m/%d')} - {end_date.strftime('%m/%d')}",
            'record': f"{wins}-{losses}",
            'win_rate': round(win_rate, 1),
            'total_wagered': round(wagered, 2),
            'net_profit': round(profit, 2),
            'roi': round(roi, 1)
        }

    def get_stats_by_confidence(self):
        """Performance breakdown by confidence level"""
        cursor = self.conn.cursor()

        cursor.execute('''
            SELECT
                CASE
                    WHEN br.confidence_score >= 8 THEN 'High (8-10)'
                    WHEN br.confidence_score >= 7 THEN 'Medium (7-8)'
                    ELSE 'Low (<7)'
                END as tier,
                COUNT(*) as count,
                SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END) as wins,
                SUM(r.profit_loss) as profit
            FROM bet_results r
            JOIN bet_recommendations br ON r.recommendation_id = br.id
            WHERE r.placed_by = 'terry'
            GROUP BY tier
        ''')

        stats = {}
        for row in cursor.fetchall():
            tier, count, wins, profit = row
            win_rate = (wins / count * 100) if count > 0 else 0

            stats[tier] = {
                'count': count,
                'record': f"{wins}-{count-wins}",
                'win_rate': round(win_rate, 1),
                'profit': round(profit, 2)
            }

        return stats if stats else None
