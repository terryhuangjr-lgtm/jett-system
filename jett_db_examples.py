#!/usr/bin/env python3
"""
Jett Database - Quick Examples
Common usage patterns for Jett's knowledge base
"""

from jett_db import get_db
import json


def example_1_find_high_value_nil_deals():
    """Example 1: Find high-value NIL deals."""
    print("\n" + "="*60)
    print("EXAMPLE 1: Find High-Value NIL Deals (>$2M)")
    print("="*60)

    db = get_db()

    athletes = db.search_athletes(
        deal_type="NIL",
        min_value=2000000
    )

    print(f"\nFound {len(athletes)} high-value NIL deals:\n")
    for athlete in athletes:
        print(f"💰 {athlete['name']}")
        print(f"   Sport: {athlete['sport']}")
        print(f"   Team: {athlete['team']}")
        print(f"   Value: ${athlete['contract_value']:,.0f}")
        print(f"   Details: {athlete['key_details']}")
        print()


def example_2_content_pipeline():
    """Example 2: Manage content pipeline."""
    print("\n" + "="*60)
    print("EXAMPLE 2: Content Pipeline Management")
    print("="*60)

    db = get_db()

    # Get all pending content
    pending = db.get_pending_content()
    print(f"\n📝 Pending Content Items: {len(pending)}\n")

    for content in pending:
        print(f"  • {content['topic']}")
        print(f"    Category: {content['category']}")
        print(f"    Status: {content['status']}")
        if content['scheduled_date']:
            print(f"    Scheduled: {content['scheduled_date']}")
        print()

    # Get drafts only
    drafts = db.get_content_by_status("draft")
    print(f"✏️  Draft items ready for review: {len(drafts)}")


def example_3_search_research():
    """Example 3: Search research findings."""
    print("\n" + "="*60)
    print("EXAMPLE 3: Search Research Findings")
    print("="*60)

    db = get_db()

    # Search for NIL-related research
    results = db.search_research(query="NIL")

    print(f"\n🔍 Found {len(results)} research items on 'NIL':\n")
    for research in results:
        print(f"  📊 {research['topic']}")
        print(f"     Category: {research['category']}")
        print(f"     Findings: {research['findings'][:150]}...")
        if research['sources']:
            print(f"     Sources: {len(research['sources'])} reference(s)")
        if research['tags']:
            print(f"     Tags: {', '.join(research['tags'])}")
        print()


def example_4_task_management():
    """Example 4: Task management."""
    print("\n" + "="*60)
    print("EXAMPLE 4: Task Management")
    print("="*60)

    db = get_db()

    # Get high-priority tasks
    high_priority = db.get_tasks_by_priority("high")
    print(f"\n🔥 High Priority Tasks: {len(high_priority)}\n")

    for task in high_priority:
        if task['status'] != 'completed':
            print(f"  • {task['description']}")
            print(f"    Category: {task['category']}")
            print(f"    Status: {task['status']}")
            if task['notes']:
                print(f"    Notes: {task['notes']}")
            print()

    # Get all pending tasks
    pending = db.get_tasks_by_status("pending")
    print(f"📋 Total pending tasks: {len(pending)}")


def example_5_sport_specific_query():
    """Example 5: Sport-specific queries."""
    print("\n" + "="*60)
    print("EXAMPLE 5: Sport-Specific Analysis")
    print("="*60)

    db = get_db()

    sports = ["Basketball", "Football", "Baseball"]

    for sport in sports:
        athletes = db.search_athletes(sport=sport)
        if athletes:
            total_value = sum(a['contract_value'] or 0 for a in athletes)
            avg_value = total_value / len(athletes)

            print(f"\n🏀 {sport}:")
            print(f"   Athletes: {len(athletes)}")
            print(f"   Total Contract Value: ${total_value:,.0f}")
            print(f"   Average Value: ${avg_value:,.0f}")

            # Show top athlete
            top_athlete = max(athletes, key=lambda x: x['contract_value'] or 0)
            print(f"   Top Earner: {top_athlete['name']} (${top_athlete['contract_value']:,.0f})")


def example_6_add_new_data():
    """Example 6: Adding new data."""
    print("\n" + "="*60)
    print("EXAMPLE 6: Adding New Data")
    print("="*60)

    db = get_db()

    print("\n📝 Adding new content idea...\n")

    # Add a content idea
    content_id = db.add_content_idea(
        topic="Top 10 NIL Athletes of 2024",
        category="21m-sports",
        content="Comprehensive list of highest-earning NIL athletes...",
        status="draft",
        platform="twitter"
    )

    print(f"✓ Created content idea with ID: {content_id}")

    print("\n📋 Adding new task...\n")

    # Add a task
    task_id = db.add_task(
        description="Interview Shedeur Sanders for podcast",
        category="content",
        priority="high",
        notes="Reach out through Colorado athletics department"
    )

    print(f"✓ Created task with ID: {task_id}")

    print("\n📊 Adding research finding...\n")

    # Add research
    research_id = db.add_research(
        topic="Women's Basketball NIL Growth",
        category="sports-business",
        findings="Women's basketball NIL deals grew 300% in 2024, led by Caitlin Clark effect",
        sources=["https://example.com/report"],
        tags=["NIL", "womens-basketball", "growth"]
    )

    print(f"✓ Created research entry with ID: {research_id}")


def example_7_database_stats():
    """Example 7: Get comprehensive stats."""
    print("\n" + "="*60)
    print("EXAMPLE 7: Database Statistics")
    print("="*60)

    db = get_db()

    stats = db.get_stats()

    print("\n📊 Current Database State:\n")
    print(f"  Athletes:")
    print(f"    Total: {stats['total_athletes']}")
    print(f"    Sports: {stats['total_sports']}")
    print()
    print(f"  Content:")
    print(f"    Total: {stats['total_content']}")
    print(f"    Drafts: {stats['draft_content']}")
    print(f"    Published: {stats['published_content']}")
    print()
    print(f"  Research:")
    print(f"    Total: {stats['total_research']}")
    print()
    print(f"  Tasks:")
    print(f"    Pending: {stats['pending_tasks']}")
    print(f"    Completed: {stats['completed_tasks']}")


def run_all_examples():
    """Run all examples."""
    print("\n" + "="*70)
    print(" "*15 + "JETT DATABASE - USAGE EXAMPLES")
    print("="*70)

    example_1_find_high_value_nil_deals()
    example_2_content_pipeline()
    example_3_search_research()
    example_4_task_management()
    example_5_sport_specific_query()
    example_6_add_new_data()
    example_7_database_stats()

    print("\n" + "="*70)
    print("✓ All examples completed!")
    print("="*70)
    print()


if __name__ == "__main__":
    run_all_examples()
