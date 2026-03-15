import requests
from datetime import datetime
import sqlite3
import sys
sys.path.insert(0, '/home/clawd/clawd/sports_betting')
from per_cache import get_per, LEAGUE_AVG_PER


class PlayerStatsCollector:
    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        
        # League average PER
        self.LEAGUE_AVG_PER = 15.0

    def collect_player_stats(self, sport='nba'):
        """Calculate player impact based on PER ratings"""
        return self._estimate_impacts()

    def _estimate_impacts(self):
        """Calculate player importance using PER data"""
        
        cursor = self.conn.cursor()
        
        cursor.execute('''
            SELECT player_name, team_name, position, injury_status
            FROM player_stats
            WHERE injury_status IN ('out', 'doubtful', 'questionable', 'suspended')
            AND team_name NOT IN ('Team Name', '', 'Unknown')
        ''')
        
        injured = cursor.fetchall()
        print(f'  Found {len(injured)} injured players')
        
        stats = []
        
        for player, team, position, status in injured:
            # Get real PER from cache
            per, source = get_per(player)
            
            # Team context
            cursor.execute('''
                SELECT wins, losses FROM team_stats
                WHERE team_name = ? AND sport = 'nba'
                ORDER BY last_updated DESC LIMIT 1
            ''', (team,))
            
            team_data = cursor.fetchone()
            
            if team_data and team_data[1]:
                wins, losses = team_data
                win_pct = wins / (wins + losses) if (wins + losses) > 0 else 0.5
            else:
                win_pct = 0.5
            
            # Minutes estimate
            mpg = self._get_mpg(player, position)
            
            # Status multiplier
            if status == 'out':
                status_mult = 1.0
            elif status == 'doubtful':
                status_mult = 0.7
            elif status == 'questionable':
                status_mult = 0.3
            else:
                status_mult = 0.1
            
            # PER contribution (above league average)
            # PER 35+ (Jokic) = max contribution, PER 15 (avg) = 0
            league_avg = 15.0
            per_above_avg = per - league_avg
            per_score = min(6, max(0, per_above_avg / 3.5))
            
            # Minutes contribution (max 2.5 points)
            mpg_score = min(2.5, mpg / 15)
            
            # Starter bonus
            is_starter = 1 if position in ['PG', 'SG', 'SF', 'PF', 'C'] else 0
            starter_score = 0.5 if is_starter else 0
            
            # Team strength multiplier
            team_mult = 0.9 + (win_pct * 0.2)
            
            # Calculate final impact
            raw_impact = per_score + mpg_score + starter_score
            impact_score = round(min(10, raw_impact * team_mult * status_mult), 2)
            
            # Estimate PPG from PER
            ppg_est = round(per * 1.1, 1)
            
            stat = {
                'player_name': player,
                'team_name': team,
                'position': position or 'Unknown',
                'ppg': ppg_est,
                'mpg': mpg,
                'per': per,
                'per_league_avg': league_avg,
                'per_above_avg': round(per - league_avg, 1),
                'is_starter': is_starter,
                'impact_score': impact_score,
                'status': status,
                'updated_at': datetime.now().isoformat()
            }
            
            stats.append(stat)
            self._save_player_stat(stat)
            
            avg_marker = '=' if per == league_avg else '+' if per > league_avg else '-'
            print(f"  {player}: {impact_score}/10 impact (PER {per} {avg_marker}{per - league_avg:+.1f} from avg)")
        
        print(f"  ✓ Calculated {len(stats)} player impacts")
        return stats

    def _get_mpg(self, player, position):
        """Minutes per game estimates"""
        player_lower = player.lower()
        
        stars = ['luka', 'giannis', 'jokic', 'tatum', 'curry', 'durant', 'lebron', 'shai', 'embiid', 'wemby']
        if any(n in player_lower for n in stars):
            return 35
        if any(n in player_lower for n in ['mitchell', 'edwards', 'brunson', 'butler', 'booker', 'haliburton']):
            return 33
        
        pos_mpg = {'PG': 28, 'SG': 27, 'SF': 27, 'PF': 26, 'C': 26, 'G': 27, 'F': 26, 'Unknown': 20}
        return pos_mpg.get(position, 25)

    def _save_player_stat(self, stat):
        """Save or update player stat"""
        cursor = self.conn.cursor()
        
        cursor.execute('SELECT id FROM player_stats WHERE player_name = ? AND team_name = ?',
            (stat['player_name'], stat['team_name']))
        
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute('''
                UPDATE player_stats SET
                    position = ?, ppg = ?, mpg = ?, per = ?,
                    is_starter = ?, impact_score = ?, last_updated = ?
                WHERE id = ?
            ''', (stat['position'], stat['ppg'], stat['mpg'], stat['per'],
                  stat['is_starter'], stat['impact_score'], stat['updated_at'], existing[0]))
        else:
            cursor.execute('''
                INSERT INTO player_stats (player_name, team_name, position, ppg, mpg, per,
                    is_starter, impact_score, injury_status, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (stat['player_name'], stat['team_name'], stat['position'], stat['ppg'],
                  stat['mpg'], stat['per'], stat['is_starter'], stat['impact_score'],
                  stat.get('status', 'questionable'), stat['updated_at']))
        
        self.conn.commit()

    def get_player_impact(self, team_name):
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT 
                COALESCE(SUM(CASE WHEN injury_status IN ('out', 'suspended') THEN impact_score ELSE 0 END), 0) as out,
                COALESCE(SUM(CASE WHEN injury_status = 'questionable' THEN impact_score * 0.5 ELSE 0 END), 0) as ques
            FROM player_stats WHERE team_name = ? AND impact_score IS NOT NULL
        ''', (team_name,))
        row = cursor.fetchone()
        return {'total': row[0] + row[1], 'out_impact': row[0], 'questionable_impact': row[1]}

    def get_injured_players_with_impact(self, team_name):
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT player_name, injury_status, ppg, mpg, per, impact_score
            FROM player_stats WHERE team_name = ? AND impact_score IS NOT NULL
            ORDER BY impact_score DESC
        ''', (team_name,))
        return [{'player': r[0], 'status': r[1], 'ppg': r[2], 'mpg': r[3], 'per': r[4], 'impact': r[5]} for r in cursor.fetchall()]

    def close(self):
        self.conn.close()


if __name__ == "__main__":
    collector = PlayerStatsCollector('/home/clawd/clawd/data/sports_betting.db')
    stats = collector.collect_player_stats()
    
    print("\n=== IMPACT VS LEAGUE AVERAGE ===")
    print("League avg PER = 15.0")
    print("PER above avg = more impact when injured\n")
    
    for s in sorted(stats, key=lambda x: x['impact_score'], reverse=True)[:10]:
        avg_marker = '=' if s['per'] == collector.LEAGUE_AVG_PER else '+' if s['per'] > collector.LEAGUE_AVG_PER else '-'
        print(f"  {s['player_name']}: {s['impact_score']}/10 (PER {s['per']} {avg_marker}{s['per'] - 15:.1f})")
    
    collector.close()
