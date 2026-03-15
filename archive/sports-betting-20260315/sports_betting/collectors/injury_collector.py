import requests
from datetime import datetime, date
import sqlite3

TEAM_NAME_MAP = {
    'Atlanta Hawks': 'Hawks',
    'Boston Celtics': 'Celtics',
    'Brooklyn Nets': 'Nets',
    'Charlotte Hornets': 'Hornets',
    'Chicago Bulls': 'Bulls',
    'Cleveland Cavaliers': 'Cavaliers',
    'Dallas Mavericks': 'Mavericks',
    'Denver Nuggets': 'Nuggets',
    'Detroit Pistons': 'Pistons',
    'Golden State Warriors': 'Warriors',
    'Houston Rockets': 'Rockets',
    'Indiana Pacers': 'Pacers',
    'Los Angeles Clippers': 'Clippers',
    'Los Angeles Lakers': 'Lakers',
    'Memphis Grizzlies': 'Grizzlies',
    'Miami Heat': 'Heat',
    'Milwaukee Bucks': 'Bucks',
    'Minnesota Timberwolves': 'Timberwolves',
    'New Orleans Pelicans': 'Pelicans',
    'New York Knicks': 'Knicks',
    'Oklahoma City Thunder': 'Thunder',
    'Orlando Magic': 'Magic',
    'Philadelphia 76ers': '76ers',
    'Phoenix Suns': 'Suns',
    'Portland Trail Blazers': 'Trail Blazers',
    'Sacramento Kings': 'Kings',
    'San Antonio Spurs': 'Spurs',
    'Toronto Raptors': 'Raptors',
    'Utah Jazz': 'Jazz',
    'Washington Wizards': 'Wizards',
    'LA Clippers': 'Clippers',
    'LA Lakers': 'Lakers',
}

SUSPENSION_KEYWORDS = ['suspend', 'suspension', 'fight', 'discipline', 'brawl', 'ejected', 'ineligible']
STAR_PLAYERS = {
    'Nikola Jokic': 10.0, 'Giannis Antetokounmpo': 9.5, 'Luka Doncic': 9.5,
    'Shai Gilgeous-Alexander': 9.5, 'Jayson Tatum': 9.0, 'Joel Embiid': 9.0,
    'Stephen Curry': 8.5, 'Kevin Durant': 8.5, 'LeBron James': 8.5,
    'Damian Lillard': 8.0, 'Donovan Mitchell': 8.0, 'Anthony Edwards': 8.0,
    'Domantas Sabonis': 7.5, 'De\'Aaron Fox': 7.5, 'Jaylen Brown': 7.5,
    'Jalen Brunson': 7.5, 'Zion Williamson': 7.5, 'Bam Adebayo': 7.5,
    'Tyrese Haliburton': 7.0, 'Pascal Siakam': 7.0, 'Kyrie Irving': 7.0,
    'Bradley Beal': 6.5, 'Karl-Anthony Towns': 6.5, 'Paul George': 6.5,
    'Julius Randle': 6.0, 'Jimmy Butler': 6.5, 'LaMelo Ball': 6.5,
    'Trae Young': 6.5, 'Darius Garland': 6.0, 'Cade Cunningham': 6.5,
    'Chet Holmgren': 6.0, 'Anthony Davis': 7.5, 'Rudy Gobert': 5.5,
    'Alperen Sengun': 6.0, 'Victor Wembanyama': 7.5,
}

POSITION_IMPACT = {
    'C': 1.2, 'PG': 1.1, 'SF': 1.0, 'PF': 1.0, 'SG': 0.9
}


class InjuryCollector:
    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)

    def collect_injuries(self, sport='nba'):
        """Collect injury reports from ESPN API"""
        injuries = []
        
        try:
            injuries = self._scrape_espn_api()
        except Exception as e:
            print(f"  ⚠️ ESPN API scrape failed: {e}")
        
        return injuries

    def _scrape_espn_api(self):
        """Scrape injuries from ESPN API"""
        url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        data = response.json()
        
        injuries = []
        
        for team_data in data.get('injuries', []):
            full_team_name = team_data.get('displayName', '')
            team_name = TEAM_NAME_MAP.get(full_team_name, full_team_name)

            for inj in team_data.get('injuries', []):
                athlete = inj.get('athlete', {})
                full_name = athlete.get('fullName', athlete.get('displayName', 'Unknown'))
                position = athlete.get('position', {}).get('abbreviation', '')
                status = inj.get('status', 'questionable')
                comment = inj.get('longComment', inj.get('shortComment', ''))

                if full_name != 'Unknown':
                    injury_status = self._normalize_status(status, comment)
                    impact_score = self._calculate_impact_score(full_name, injury_status, position, comment)

                    injury = {
                        'player_name': full_name,
                        'team_name': team_name,
                        'position': position,
                        'injury_status': injury_status,
                        'injury_description': comment,
                        'impact_score': impact_score,
                        'last_updated': datetime.now().isoformat()
                    }
                    injuries.append(injury)
                    self._save_injury(injury)
        
        print(f"  ✓ Scraped {len(injuries)} injury records from ESPN")
        return injuries

    def _normalize_status(self, status, description=''):
        """Normalize status to standard values, detect suspensions from description"""
        status = status.lower().strip()
        desc_lower = description.lower()

        if any(kw in desc_lower for kw in SUSPENSION_KEYWORDS):
            return 'suspended'
        if 'out' in status:
            return 'out'
        elif 'doubtful' in status:
            return 'doubtful'
        elif 'questionable' in status:
            return 'questionable'
        elif 'probable' in status:
            return 'probable'
        elif 'day-to-day' in status or 'day to day' in status:
            return 'questionable'
        elif 'suspended' in status:
            return 'suspended'
        elif 'ineligible' in status:
            return 'suspended'
        else:
            return 'questionable'

    def _calculate_impact_score(self, player_name, status, position, description):
        """
        Calculate impact score (0-10) based on:
        1. Star rating (1-10 scale)
        2. Position importance
        3. Injury severity
        """
        base_score = STAR_PLAYERS.get(player_name, 3)

        if status in ('out', 'suspended'):
            severity = 1.0
        elif status == 'doubtful':
            severity = 0.75
        elif status == 'questionable':
            severity = 0.5
        else:
            severity = 0.25

        position_mult = POSITION_IMPACT.get(position, 1.0)

        desc_lower = description.lower()
        if any(kw in desc_lower for kw in ['achilles', 'acl', 'mcl', 'ligament', 'fracture', 'out for season', 'ruptured']):
            severity = 1.0

        score = base_score * severity * position_mult
        return min(10, max(1, round(score, 1)))

    def _save_injury(self, injury):
        """Save injury to database with deduplication by player+team"""
        cursor = self.conn.cursor()
        cursor.execute('''
            DELETE FROM player_stats WHERE player_name = ? AND team_name = ?
        ''', (injury['player_name'], injury['team_name']))
        cursor.execute('''
            INSERT INTO player_stats (
                player_name, team_name, position, injury_status, injury_description, impact_score, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            injury['player_name'],
            injury['team_name'],
            injury.get('position', ''),
            injury['injury_status'],
            injury.get('injury_description', ''),
            injury.get('impact_score', 5.0),
            injury['last_updated']
        ))
        self.conn.commit()

    def get_injuries_for_team(self, team_name):
        """Get all injuries for a specific team"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT * FROM player_stats 
            WHERE team_name = ? AND injury_status NOT IN ('healthy', 'active', NULL)
        ''', (team_name,))
        
        rows = cursor.fetchall()
        return [{'player_name': r[0], 'team_name': r[1], 'injury_status': r[3], 'description': r[4]} for r in rows]

    def close(self):
        self.conn.close()


if __name__ == "__main__":
    collector = InjuryCollector('/home/clawd/clawd/data/sports_betting.db')
    injuries = collector.collect_injuries()
    print(f"\nCollected {len(injuries)} injuries")
    
    # Check specific teams
    for team in ['Pistons', 'Raptors']:
        team_injuries = collector.get_injuries_for_team(team)
        print(f"\n{team}: {len(team_injuries)} injuries")
        for inj in team_injuries:
            print(f"  - {inj['player_name']}: {inj['injury_status']}")
    
    collector.close()
