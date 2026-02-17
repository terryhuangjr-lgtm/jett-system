#!/usr/bin/env python3
"""
Usage Dashboard - Monitor LLM usage and cost savings
Simple CLI tool for viewing usage statistics
"""

import sys
from usage_tracker import UsageTracker, format_cost, print_stats_summary
from datetime import datetime


def print_header(title: str):
    """Print formatted header."""
    print("\n" + "="*70)
    print(f" {title}")
    print("="*70)


def show_today():
    """Show today's usage."""
    tracker = UsageTracker()
    stats = tracker.get_stats(days=1)

    print_header("📊 TODAY'S USAGE")
    print_stats_summary(stats)


def show_week():
    """Show this week's usage."""
    tracker = UsageTracker()
    stats = tracker.get_stats(days=7)

    print_header("📊 THIS WEEK'S USAGE (Last 7 Days)")
    print_stats_summary(stats)


def show_month():
    """Show this month's usage."""
    tracker = UsageTracker()
    stats = tracker.get_stats(days=30)

    print_header("📊 THIS MONTH'S USAGE (Last 30 Days)")
    print_stats_summary(stats)


def show_recent(limit: int = 10):
    """Show recent requests."""
    tracker = UsageTracker()
    recent = tracker.get_recent_usage(limit=limit)

    print_header(f"📝 RECENT REQUESTS (Last {limit})")
    print()

    if not recent:
        print("  No recent usage data")
        return

    for i, entry in enumerate(recent, 1):
        timestamp = entry['timestamp'][:19].replace('T', ' ')
        provider = entry['provider'].upper()
        prompt = entry['prompt'][:60] if entry['prompt'] else 'N/A'

        print(f"{i}. [{timestamp}] {provider}")
        print(f"   Prompt: {prompt}...")
        print(f"   Cost: {format_cost(entry['cost_usd'])} | Savings: {format_cost(entry['savings_usd'])}")
        print(f"   Time: {entry['time_ms']:.0f}ms | Complexity: {entry['complexity_score']:.2f}")
        print()


def show_daily_breakdown(days: int = 7):
    """Show daily breakdown."""
    tracker = UsageTracker()
    daily = tracker.get_daily_summary(days=days)

    print_header(f"📅 DAILY BREAKDOWN (Last {days} Days)")
    print()

    if not daily:
        print("  No usage data for this period")
        return

    # Group by date
    by_date = {}
    for row in daily:
        date = row['date']
        if date not in by_date:
            by_date[date] = {'ollama': 0, 'claude': 0, 'cost': 0.0, 'savings': 0.0}

        provider = row['provider']
        by_date[date][provider] = row['count']
        by_date[date]['cost'] += row['cost'] or 0.0
        by_date[date]['savings'] += row['savings'] or 0.0

    # Print table
    print(f"{'Date':<12} {'Local':>8} {'API':>8} {'Cost':>12} {'Savings':>12}")
    print("-"*60)

    for date in sorted(by_date.keys(), reverse=True):
        data = by_date[date]
        local_count = data['ollama']
        api_count = data['claude']
        cost = format_cost(data['cost'])
        savings = format_cost(data['savings'])

        print(f"{date:<12} {local_count:>8} {api_count:>8} {cost:>12} {savings:>12}")


def show_routing_analysis():
    """Show routing decision analysis."""
    tracker = UsageTracker()
    analysis = tracker.get_routing_accuracy(days=7)

    print_header("🎯 ROUTING ANALYSIS (Last 7 Days)")
    print()

    decisions = analysis['routing_decisions']

    if not decisions:
        print("  No routing data available")
        return

    print(f"{'Routing Reason':<50} {'Provider':<10} {'Count':>8} {'Complexity':>12}")
    print("-"*85)

    for decision in decisions:
        reason = decision['routing_reason'][:48]
        provider = decision['provider'].upper()
        count = decision['count']
        complexity = f"{decision['avg_complexity']:.2f}"

        print(f"{reason:<50} {provider:<10} {count:>8} {complexity:>12}")


def show_comparison():
    """Show cost comparison with/without routing."""
    tracker = UsageTracker()
    stats = tracker.get_stats(days=30)

    print_header("💰 COST COMPARISON (Last 30 Days)")
    print()

    if stats['total_requests'] == 0:
        print("  No usage data to compare")
        return

    actual_cost = stats['total_cost']
    cost_avoided = stats['cost_avoided']
    total_if_all_api = actual_cost + stats['total_savings']

    print(f"Scenario Analysis:")
    print()
    print(f"1. ALL requests to Claude API:")
    print(f"   Cost: {format_cost(total_if_all_api)}")
    print()
    print(f"2. CURRENT routing (local + API):")
    print(f"   Cost: {format_cost(actual_cost)}")
    print()
    print(f"💰 You SAVED: {format_cost(stats['total_savings'])} ({stats['savings_percentage']:.1f}%)")
    print()
    print(f"Request Breakdown:")
    print(f"  Total: {stats['total_requests']}")
    print(f"  Local (free): {stats['providers'].get('ollama', {}).get('count', 0)} ({stats['local_percentage']:.1f}%)")
    print(f"  API (paid): {stats['providers'].get('claude', {}).get('count', 0)}")
    print()

    # Project annual savings
    if stats['period_days'] > 0:
        daily_avg_savings = stats['total_savings'] / stats['period_days']
        annual_savings = daily_avg_savings * 365

        print(f"Projected Annual Savings: {format_cost(annual_savings)}")


def show_summary():
    """Show comprehensive summary."""
    tracker = UsageTracker()

    # Get stats for different periods
    today = tracker.get_stats(days=1)
    week = tracker.get_stats(days=7)
    month = tracker.get_stats(days=30)

    print_header("📊 COMPREHENSIVE SUMMARY")
    print()

    periods = [
        ("Today", today),
        ("This Week", week),
        ("This Month", month)
    ]

    print(f"{'Period':<15} {'Requests':>10} {'Cost':>12} {'Savings':>12} {'Local %':>10}")
    print("-"*70)

    for period_name, stats in periods:
        requests = stats['total_requests']
        cost = format_cost(stats['total_cost'])
        savings = format_cost(stats['total_savings'])
        local_pct = f"{stats['local_percentage']:.1f}%"

        print(f"{period_name:<15} {requests:>10} {cost:>12} {savings:>12} {local_pct:>10}")

    print()

    # Show month details
    if month['total_requests'] > 0:
        print(f"This Month Details:")
        print(f"  Savings Rate: {month['savings_percentage']:.1f}%")
        print(f"  Avg Time: {month['providers'].get('ollama', {}).get('avg_time_ms', 0):.0f}ms (local)")

        daily_avg = month['total_requests'] / min(month['period_days'], 30)
        print(f"  Daily Avg: {daily_avg:.1f} requests")


def print_menu():
    """Print menu options."""
    print("\n" + "="*70)
    print(" LLM USAGE DASHBOARD")
    print("="*70)
    print()
    print("Commands:")
    print("  today       Show today's usage")
    print("  week        Show this week's usage")
    print("  month       Show this month's usage")
    print("  recent      Show recent requests")
    print("  daily       Show daily breakdown")
    print("  routing     Show routing analysis")
    print("  compare     Show cost comparison")
    print("  summary     Show comprehensive summary")
    print("  help        Show this menu")
    print("  exit        Exit dashboard")
    print()
    print("="*70)


def main():
    """Main dashboard function."""

    if len(sys.argv) > 1:
        # Command-line mode
        command = sys.argv[1].lower()

        commands = {
            'today': show_today,
            'week': show_week,
            'month': show_month,
            'recent': show_recent,
            'daily': show_daily_breakdown,
            'routing': show_routing_analysis,
            'compare': show_comparison,
            'summary': show_summary,
            'help': print_menu
        }

        if command in commands:
            commands[command]()
        else:
            print(f"Unknown command: {command}")
            print("Run 'python usage_dashboard.py help' for options")

    else:
        # Interactive mode
        print_menu()

        while True:
            try:
                cmd = input("\nEnter command (or 'help'): ").strip().lower()

                if cmd == 'exit' or cmd == 'quit':
                    print("\nGoodbye!")
                    break
                elif cmd == 'today':
                    show_today()
                elif cmd == 'week':
                    show_week()
                elif cmd == 'month':
                    show_month()
                elif cmd == 'recent':
                    show_recent()
                elif cmd == 'daily':
                    show_daily_breakdown()
                elif cmd == 'routing':
                    show_routing_analysis()
                elif cmd == 'compare':
                    show_comparison()
                elif cmd == 'summary':
                    show_summary()
                elif cmd == 'help':
                    print_menu()
                elif cmd == '':
                    continue
                else:
                    print(f"Unknown command: {cmd}")
                    print("Type 'help' for available commands")

            except KeyboardInterrupt:
                print("\n\nGoodbye!")
                break
            except EOFError:
                print("\n\nGoodbye!")
                break


if __name__ == "__main__":
    main()
