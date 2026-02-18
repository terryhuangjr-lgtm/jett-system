#!/usr/bin/env python3
"""
Quick CLI tool to log bet results

Usage:
  python3 log_result.py [game_id] [win/loss/push]

Example:
  python3 log_result.py nba_20260210_Lakers_Warriors win
"""

import sys
import sqlite3
from datetime import datetime
import config
from dashboard_integration import DashboardIntegration

def log_result(game_id, result):
    """Log the result of a bet"""

    if result not in ['win', 'loss', 'push']:
        print(f"❌ Invalid result: {result}")
        print("   Must be: win, loss, or push")
        return

    conn = sqlite3.connect(config.DB_PATH)
    cursor = conn.cursor()

    # Get the recommendation for this game
    cursor.execute('''
        SELECT id, bet_type, bet_selection, recommended_bet_amount
        FROM bet_recommendations
        WHERE game_id = ? AND is_daily_pick = 1
        ORDER BY recommended_at DESC
        LIMIT 1
    ''', (game_id,))

    rec = cursor.fetchone()

    if not rec:
        print(f"❌ No recommendation found for game: {game_id}")
        print("   Check game_id is correct")
        return

    rec_id, bet_type, selection, amount = rec

    # Calculate profit/loss
    if result == 'win':
        # Standard -110 odds = risk $11 to win $10
        profit = round(amount * 0.909, 2)
    elif result == 'loss':
        profit = -amount
    else:  # push
        profit = 0

    # Check if result already logged
    cursor.execute('''
        SELECT id FROM bet_results
        WHERE game_id = ? AND placed_by = 'terry'
    ''', (game_id,))

    if cursor.fetchone():
        print(f"⚠️  Result already logged for {game_id}")
        print("   Delete from database first if you need to update")
        return

    # Insert result
    cursor.execute('''
        INSERT INTO bet_results (
            recommendation_id, game_id, bet_type, bet_selection,
            odds, bet_amount, placed_at, placed_by, result, profit_loss
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        rec_id, game_id, bet_type, selection,
        -110, amount, datetime.now(), 'terry', result, profit
    ))

    conn.commit()

    # Show summary
    print(f"\n✅ Result logged successfully!")
    print(f"   Bet: {selection}")
    print(f"   Result: {result.upper()}")
    print(f"   Amount: ${amount:.2f}")
    print(f"   Profit/Loss: ${profit:+.2f}")

    # Show updated stats
    cursor.execute('''
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
            SUM(profit_loss) as total_profit
        FROM bet_results
        WHERE placed_by = 'terry'
    ''')

    row = cursor.fetchone()
    total, wins, total_profit = row

    print(f"\n📊 Season Stats:")
    print(f"   Record: {wins}-{total-wins}")
    print(f"   Total P/L: ${total_profit:+.2f}")

    # Post to dashboard
    dashboard = DashboardIntegration()
    dashboard.post_bet_result(game_id, result, profit)

    conn.close()

def show_pending_bets():
    """Show bets that need results logged"""
    conn = sqlite3.connect(config.DB_PATH)
    cursor = conn.cursor()

    # Find recommendations without results
    cursor.execute('''
        SELECT
            br.game_id,
            br.bet_selection,
            br.recommended_at
        FROM bet_recommendations br
        LEFT JOIN bet_results r ON br.game_id = r.game_id
        WHERE br.is_daily_pick = 1
        AND r.id IS NULL
        AND br.recommended_at >= date('now', '-7 days')
        ORDER BY br.recommended_at DESC
    ''')

    pending = cursor.fetchall()

    if pending:
        print("\n📋 Pending Results:\n")
        for game_id, selection, date in pending:
            print(f"   {game_id}")
            print(f"   {selection}")
            print(f"   Recommended: {date}")
            print()
    else:
        print("\n✅ No pending results to log")

    conn.close()

if __name__ == '__main__':
    if len(sys.argv) == 1:
        # No arguments - show pending bets
        show_pending_bets()
        print("\nUsage: python3 log_result.py [game_id] [win/loss/push]")
    elif len(sys.argv) == 3:
        # Log a result
        game_id = sys.argv[1]
        result = sys.argv[2].lower()
        log_result(game_id, result)
    else:
        print("Usage: python3 log_result.py [game_id] [win/loss/push]")
        print("\nOr run without arguments to see pending bets")
