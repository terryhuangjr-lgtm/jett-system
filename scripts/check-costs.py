#!/usr/bin/env python3
"""Quick token usage and cost checker"""

import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.expanduser("~/clawd/data/jett_knowledge.db")

def main():
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("📊 Token Usage & Costs (Last 7 Days)")
    print("=" * 42)
    print()

    # Daily breakdown
    print("Daily Breakdown:")
    cursor.execute("""
        SELECT
            DATE(timestamp) as date,
            provider,
            SUM(tokens) as tokens,
            ROUND(SUM(cost_usd), 4) as cost
        FROM usage_stats
        WHERE timestamp >= datetime('now', '-7 days')
        GROUP BY DATE(timestamp), provider
        ORDER BY date DESC, provider
    """)
    
    results = cursor.fetchall()
    if results:
        print(f"{'Date':<12} {'Provider':<10} {'Tokens':>10} {'Cost (USD)':>12}")
        print("-" * 46)
        for row in results:
            print(f"{row[0]:<12} {row[1]:<10} {row[2]:>10} ${row[3]:>11}")
    else:
        print("  No data for last 7 days")

    print()
    print("Weekly Total:")
    cursor.execute("""
        SELECT
            SUM(tokens) as total_tokens,
            ROUND(SUM(cost_usd), 2) as total_cost
        FROM usage_stats
        WHERE timestamp >= datetime('now', '-7 days')
    """)
    
    total = cursor.fetchone()
    if total and total[0]:
        print(f"  Tokens: {total[0]:,} | Cost: ${total[1]}")
    else:
        print("  No usage in last 7 days")

    print()
    print("Provider Breakdown (Last 7 Days):")
    cursor.execute("""
        SELECT
            provider,
            COUNT(*) as calls,
            SUM(tokens) as total_tokens,
            ROUND(SUM(cost_usd), 2) as total_cost
        FROM usage_stats
        WHERE timestamp >= datetime('now', '-7 days')
        GROUP BY provider
        ORDER BY total_cost DESC
    """)
    
    results = cursor.fetchall()
    if results:
        print(f"{'Provider':<10} {'Calls':>8} {'Tokens':>12} {'Cost (USD)':>12}")
        print("-" * 44)
        for row in results:
            print(f"{row[0]:<10} {row[1]:>8} {row[2]:>12} ${row[3]:>11}")
    else:
        print("  No data")

    conn.close()

    print()
    print("💡 Tip: Run 'cat ~/clawd/automation/SCRIPT-STATUS.json' to verify automation token usage")

if __name__ == "__main__":
    main()
