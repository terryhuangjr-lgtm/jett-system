#!/usr/bin/env python3
import os
import sqlite3
import sys

def check_system():
    print("\n" + "="*60)
    print("SYSTEM HEALTH CHECK")
    print("="*60 + "\n")

    all_good = True

    # Check database
    print("1. Checking database...")
    db_path = '/home/clawd/clawd/data/sports_betting.db'
    if os.path.exists(db_path):
        print("   ✅ Database exists")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        required = ['games', 'team_stats', 'bet_recommendations', 'bet_results']
        missing = [t for t in required if t not in tables]
        if missing:
            print(f"   ❌ Missing tables: {missing}")
            all_good = False
        else:
            print(f"   ✅ All tables present ({len(tables)} total)")
        conn.close()
    else:
        print("   ❌ Database not found")
        all_good = False

    # Check files
    print("\n2. Checking files...")
    required_files = [
        'orchestrator.py',
        'config.py',
        'collectors/game_collector.py',
        'analyzer/bet_scorer.py',
        'notifiers/slack_notifier.py',
        'analytics/performance_tracker.py',
        'log_result.py',
        'show_stats.py'
    ]

    base = '/home/clawd/clawd/sports_betting'
    for f in required_files:
        if os.path.exists(os.path.join(base, f)):
            print(f"   ✅ {f}")
        else:
            print(f"   ❌ {f} missing")
            all_good = False

    # Check dependencies
    print("\n3. Checking dependencies...")
    try:
        import requests
        print("   ✅ requests")
    except ImportError:
        print("   ❌ requests missing")
        all_good = False

    try:
        from bs4 import BeautifulSoup
        print("   ✅ beautifulsoup4")
    except ImportError:
        print("   ⚠️  beautifulsoup4 missing (optional for testing)")

    # Check config
    print("\n4. Checking configuration...")
    try:
        sys.path.insert(0, base)
        import config
        if config.SLACK_WEBHOOK_URL and 'YOUR' not in config.SLACK_WEBHOOK_URL:
            print("   ✅ Slack configured")
        else:
            print("   ⚠️  Slack needs setup (optional)")
        print(f"   ✅ Max bet: ${config.MAX_BET_AMOUNT}")
        print(f"   ✅ Paper trading: {config.PAPER_TRADING}")
        print(f"   ✅ Min confidence: {config.MIN_CONFIDENCE}")
    except Exception as e:
        print(f"   ❌ Config error: {e}")
        all_good = False

    # Check cron
    print("\n5. Checking cron job...")
    import subprocess
    try:
        result = subprocess.run(['crontab', '-l'], capture_output=True, text=True)
        if 'orchestrator.py' in result.stdout:
            print("   ✅ Cron job configured")
            # Show the cron entry
            for line in result.stdout.split('\n'):
                if 'orchestrator.py' in line:
                    print(f"   📅 {line.strip()}")
        else:
            print("   ⚠️  Cron not set up (run setup_cron.sh)")
    except:
        print("   ⚠️  Could not check cron")

    # Check logs directory
    print("\n6. Checking logs directory...")
    logs_dir = os.path.join(base, 'logs')
    if os.path.exists(logs_dir):
        print("   ✅ Logs directory exists")
        log_files = os.listdir(logs_dir)
        if log_files:
            print(f"   ✅ {len(log_files)} log files found")
        else:
            print("   ℹ️  No log files yet")
    else:
        print("   ⚠️  Logs directory missing")
        os.makedirs(logs_dir)
        print("   ✅ Created logs directory")

    # Check recent activity
    print("\n7. Checking recent activity...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM games")
        games_count = cursor.fetchone()[0]
        print(f"   ℹ️  Games in database: {games_count}")

        cursor.execute("SELECT COUNT(*) FROM bet_recommendations")
        recs_count = cursor.fetchone()[0]
        print(f"   ℹ️  Recommendations: {recs_count}")

        cursor.execute("SELECT COUNT(*) FROM bet_results WHERE placed_by = 'terry'")
        results_count = cursor.fetchone()[0]
        print(f"   ℹ️  Logged results: {results_count}")

        if recs_count > 0:
            cursor.execute("SELECT recommended_at FROM bet_recommendations ORDER BY recommended_at DESC LIMIT 1")
            last_rec = cursor.fetchone()[0]
            print(f"   ℹ️  Last recommendation: {last_rec}")

        conn.close()
    except Exception as e:
        print(f"   ⚠️  Could not check activity: {e}")

    print("\n" + "="*60)
    if all_good:
        print("✅ SYSTEM READY")
        print("\nTo run manually: python3 orchestrator.py")
        print("To view stats: python3 show_stats.py")
        print("To log results: python3 log_result.py")
    else:
        print("⚠️  SETUP INCOMPLETE - Fix errors above")
    print("="*60 + "\n")

if __name__ == '__main__':
    check_system()
