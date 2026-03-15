import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import sqlite3

class GameCollector:
    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)

    def collect_nba_games(self, days_ahead=2):
        """Scrape upcoming NBA games from ESPN with retries"""
        games = []

        for day_offset in range(days_ahead):
            date = datetime.now() + timedelta(days=day_offset)
            date_str = date.strftime('%Y%m%d')

            url = f'https://www.espn.com/nba/scoreboard/_/date/{date_str}'

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }

            # Try up to 2 times with increasing timeout
            for attempt in range(2):
                try:
                    timeout = 15 if attempt == 1 else 10  # Longer timeout on retry
                    response = requests.get(url, headers=headers, timeout=timeout)
                    soup = BeautifulSoup(response.content, 'html.parser')

                    # Find game containers
                    game_elements = soup.find_all('section', class_='Scoreboard')

                    for game_el in game_elements:
                        game_data = self._parse_game(game_el, date)
                        if game_data:
                            games.append(game_data)
                            self._save_game(game_data)

                    break  # Success, exit retry loop

                except Exception as e:
                    if attempt < 1:
                        print(f"Attempt {attempt + 1} failed for {date_str}: {e}, retrying...")
                    else:
                        print(f"Error collecting games for {date_str}: {e}")

        return games

    def _parse_game(self, element, date):
        """Extract game details from HTML"""
        try:
            # Get team names
            teams = element.find_all('div', class_='ScoreCell__TeamName')

            # Get game time
            time_el = element.find('span', class_='ScoreCell__Time')

            if len(teams) >= 2:
                away_team = teams[0].text.strip()
                home_team = teams[1].text.strip()
                game_time = time_el.text.strip() if time_el else 'TBD'

                game_id = f"nba_{date.strftime('%Y%m%d')}_{away_team}_{home_team}".replace(' ', '_')

                return {
                    'game_id': game_id,
                    'sport': 'nba',
                    'game_date': date.date(),
                    'game_time': game_time,
                    'home_team': home_team,
                    'away_team': away_team,
                    'status': 'scheduled'
                }
        except Exception as e:
            print(f"Error parsing game: {e}")
            return None

    def _save_game(self, game_data):
        """Save game to database"""
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO games
            (game_id, sport, game_date, game_time, home_team, away_team, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            game_data['game_id'],
            game_data['sport'],
            game_data['game_date'],
            game_data['game_time'],
            game_data['home_team'],
            game_data['away_team'],
            game_data['status']
        ))
        self.conn.commit()
        print(f"  Saved: {game_data['away_team']} @ {game_data['home_team']}")
