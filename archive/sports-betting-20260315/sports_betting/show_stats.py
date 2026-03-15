#!/usr/bin/env python3
"""
Display current betting performance stats
"""

from analytics.performance_tracker import PerformanceTracker
import config

def display_stats():
    """Show comprehensive performance stats"""

    tracker = PerformanceTracker(config.DB_PATH)

    print("\n" + "="*60)
    print("📊 BETTING PERFORMANCE STATS")
    print("="*60 + "\n")

    # Season stats
    season = tracker.get_season_stats()

    if season:
        print("SEASON OVERVIEW:")
        print(f"  Record: {season['record']} ({season['win_rate']}%)")
        print(f"  Total Wagered: ${season['total_wagered']:.2f}")
        print(f"  Net Profit: ${season['net_profit']:+.2f}")
        print(f"  ROI: {season['roi']:+.1f}%")
        print()
    else:
        print("SEASON OVERVIEW:")
        print("  No bets logged yet!")
        print()

    # Recent form
    recent = tracker.get_recent_form(10)

    if recent:
        print("RECENT FORM (Last 10):")
        print(f"  Record: {recent['record']}")
        print()

        for i, bet in enumerate(recent['bets'][:5], 1):
            result_emoji = "✅" if bet['result'] == 'win' else "❌"
            print(f"  {i}. {result_emoji} {bet['bet']} (${bet['profit']:+.2f})")
        print()

    # Weekly report
    weekly = tracker.get_weekly_report()

    if weekly:
        print("THIS WEEK:")
        print(f"  Period: {weekly['period']}")
        print(f"  Record: {weekly['record']} ({weekly['win_rate']}%)")
        print(f"  Profit: ${weekly['net_profit']:+.2f}")
        print()

    # Confidence breakdown
    conf_stats = tracker.get_stats_by_confidence()

    if conf_stats:
        print("BY CONFIDENCE LEVEL:")
        for tier, stats in conf_stats.items():
            print(f"  {tier}: {stats['record']} ({stats['win_rate']}%) | ${stats['profit']:+.2f}")
        print()

    print("="*60 + "\n")

if __name__ == '__main__':
    display_stats()
