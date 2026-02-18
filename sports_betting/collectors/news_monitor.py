import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import sqlite3
import json
import time


class NewsMonitor:
    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.nba_teams = {
            'Hawks': 'ATL', 'Celtics': 'BOS', 'Nets': 'BKN', 'Hornets': 'CHA',
            'Bulls': 'CHI', 'Cavaliers': 'CLE', 'Mavericks': 'DAL', 'Nuggets': 'DEN',
            'Pistons': 'DET', 'Warriors': 'GSW', 'Rockets': 'HOU', 'Pacers': 'IND',
            'Clippers': 'LAC', 'Lakers': 'LAL', 'Grizzlies': 'MEM', 'Heat': 'MIA',
            'Bucks': 'MIL', 'Timberwolves': 'MIN', 'Pelicans': 'NOP', 'Knicks': 'NYK',
            'Thunder': 'OKC', 'Magic': 'ORL', '76ers': 'PHI', 'Suns': 'PHX',
            'Trail Blazers': 'POR', 'Kings': 'SAC', 'Spurs': 'SAS', 'Raptors': 'TOR',
            'Jazz': 'UTA', 'Wizards': 'WAS'
        }

    def check_team_news(self, team_name, days_back=3):
        """
        Check for recent news about a team
        Looks for: suspensions, fights, trades, injuries, disciplinary actions
        """
        news_items = []
        
        # Try RSS feeds first (faster, free)
        try:
            rss_news = self._check_rss_feeds(team_name)
            news_items.extend(rss_news)
        except Exception as e:
            print(f"  ⚠️ RSS check failed: {e}")
        
        return news_items

    def _check_rss_feeds(self, team_name):
        """Check team news via RSS feeds"""
        news_items = []
        
        rss_urls = [
            f"https://www.espn.com/espn/rss/nba/news",
            "https://www.nba.com/rss.xml",
        ]
        
        keywords = ['suspend', 'suspended', 'suspension', 'fight', 'disciplinary', 'punished', 'fined']
        
        for url in rss_urls:
            try:
                headers = {'User-Agent': 'Mozilla/5.0'}
                response = requests.get(url, headers=headers, timeout=10)
                soup = BeautifulSoup(response.content, 'xml')
                
                for item in soup.find_all('item')[:20]:
                    title = item.title.text.lower() if item.title else ''
                    description = item.description.text.lower() if item.description else ''
                    
                    if team_name.lower() in title.lower():
                        if any(kw in title for kw in keywords):
                            news_items.append({
                                'team': team_name,
                                'headline': item.title.text.strip()[:200],
                                'found_at': datetime.now().isoformat()
                            })
                            
                time.sleep(1)
                
            except Exception:
                continue
        
        return news_items

    def check_games_for_suspensions(self, game_ids):
        """Check both teams in upcoming games for suspensions/news"""
        cursor = self.conn.cursor()
        all_news = []
        
        for game_id in game_ids:
            cursor.execute('SELECT home_team, away_team FROM games WHERE game_id = ?', (game_id,))
            row = cursor.fetchone()
            
            if row:
                home, away = row
                print(f"\n  Checking news for: {home} vs {away}")
                
                home_news = self.check_team_news(home)
                away_news = self.check_team_news(away)
                
                if home_news:
                    print(f"    ⚠️ {home}: {len(home_news)} relevant news items found")
                    self._save_news(home_news)
                    all_news.extend(home_news)
                
                if away_news:
                    print(f"    ⚠️ {away}: {len(away_news)} relevant news items found")
                    self._save_news(away_news)
                    all_news.extend(away_news)
        
        return all_news

    def _save_news(self, news_items):
        """Save news items to database"""
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS team_news (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_name TEXT,
                headline TEXT,
                found_at TEXT,
                processed INTEGER DEFAULT 0
            )
        ''')
        
        for item in news_items:
            cursor.execute('''
                INSERT INTO team_news (team_name, headline, found_at)
                VALUES (?, ?, ?)
            ''', (item['team'], item['headline'], item['found_at']))
        
        self.conn.commit()

    def get_suspensions_for_team(self, team_name):
        """Get any suspension/fight news for a team"""
        cursor = self.conn.cursor()
        cursor.execute('''
            SELECT player_name, injury_description FROM player_stats
            WHERE team_name = ? AND (injury_status = 'suspended' OR injury_description LIKE '%suspend%' OR injury_description LIKE '%fight%' OR injury_description LIKE '%suspension%')
            LIMIT 5
        ''', (team_name,))
        
        rows = cursor.fetchall()
        return [{'player': r[0], 'reason': r[1]} for r in rows]

    def score_injury_impact(self, home_team, away_team):
        """
        Calculate injury impact score based on collected data
        Returns: dict with scores and key factors
        """
        cursor = self.conn.cursor()
        
        cursor.execute('''
            SELECT COUNT(*) FROM player_stats
            WHERE team_name = ? AND injury_status IN ('out', 'doubtful')
        ''', (home_team,))
        home_out = cursor.fetchone()[0]
        
        cursor.execute('''
            SELECT COUNT(*) FROM player_stats
            WHERE team_name = ? AND injury_status IN ('out', 'doubtful')
        ''', (away_team,))
        away_out = cursor.fetchone()[0]
        
        cursor.execute('''
            SELECT COUNT(*) FROM player_stats
            WHERE team_name = ? AND injury_status = 'questionable'
        ''', (home_team,))
        home_questionable = cursor.fetchone()[0]
        
        cursor.execute('''
            SELECT COUNT(*) FROM player_stats
            WHERE team_name = ? AND injury_status = 'questionable'
        ''', (away_team,))
        away_questionable = cursor.fetchone()[0]
        
        cursor.execute('''
            SELECT COUNT(*) FROM player_stats
            WHERE team_name = ? AND injury_status = 'suspended'
        ''', (home_team,))
        home_suspended = cursor.fetchone()[0]
        
        cursor.execute('''
            SELECT COUNT(*) FROM player_stats
            WHERE team_name = ? AND injury_status = 'suspended'
        ''', (away_team,))
        away_suspended = cursor.fetchone()[0]
        
        total_home_out = home_out + home_questionable + home_suspended
        total_away_out = away_out + away_questionable + away_suspended
        
        injury_diff = (away_out - home_out) * 3
        suspension_diff = (away_suspended - home_suspended) * 5
        score = max(-10, min(10, injury_diff + suspension_diff))
        
        factors = []
        if home_out > 0:
            factors.append(f"{home_team}: {home_out} out")
        if away_out > 0:
            factors.append(f"{away_team}: {away_out} out")
        if home_suspended > 0:
            factors.append(f"{home_team}: {home_suspended} suspended")
        if away_suspended > 0:
            factors.append(f"{away_team}: {away_suspended} suspended")
        if home_questionable > 0:
            factors.append(f"{home_team}: {home_questionable} questionable")
        if away_questionable > 0:
            factors.append(f"{away_team}: {away_questionable} questionable")
        
        if not factors:
            factors.append("No significant injuries/suspensions")
        
        return {
            'score': round(score, 2),
            'home_out': total_home_out,
            'away_out': total_away_out,
            'home_suspended': home_suspended,
            'away_suspended': away_suspended,
            'factors': factors,
            'explanation': f"Injury impact: {home_team} {total_home_out}, {away_team} {total_away_out}"
        }

    def close(self):
        self.conn.close()


if __name__ == "__main__":
    monitor = NewsMonitor('/home/clawd/clawd/data/sports_betting.db')
    
    test_teams = ['Pistons', 'Raptors']
    for team in test_teams:
        news = monitor.check_team_news(team)
        print(f"\n{team}: {len(news)} news items")
    
    score = monitor.score_injury_impact('Pistons', 'Raptors')
    print(f"\nInjury Impact Score: {score}")
    
    monitor.close()
