# Phase 2: Data Collectors - Installation Notes

## Status: Files Created ✓

All collector files have been created successfully:
- `collectors/game_collector.py` - Scrapes ESPN for NBA games
- `collectors/stats_collector.py` - Collects team statistics
- `collectors/injury_collector.py` - Collects injury reports
- `collectors/odds_collector.py` - Collects betting odds
- `test_collectors.py` - Test script

## Dependency Issue

**Missing:** `python3-bs4` (BeautifulSoup4)
**Available:** `python3-requests` ✓

### To Complete Installation:

Run this command to install beautifulsoup4:
```bash
sudo apt-get install -y python3-bs4
```

Or run the installation script:
```bash
~/clawd/sports_betting/install_dependencies.sh
```

### After Installing Dependencies:

Test the collectors:
```bash
cd ~/clawd/sports_betting
python3 test_collectors.py
```

Verify data in database:
```bash
python3 -c "import sqlite3; conn = sqlite3.connect('/home/clawd/clawd/data/sports_betting.db'); cursor = conn.cursor(); cursor.execute('SELECT * FROM games LIMIT 3'); print(cursor.fetchall())"
```

## Note
The stats and injury collectors currently use placeholder data. Game collector will scrape real ESPN data once beautifulsoup4 is installed.
