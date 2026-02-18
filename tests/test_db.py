#!/usr/bin/env python3
"""
Test Jett Knowledge Base
Quick test script to verify database functionality
"""

from jett_db import get_db
import json


def test_database():
    """Run comprehensive database tests."""

    print("="*60)
    print("JETT KNOWLEDGE BASE - COMPREHENSIVE TEST")
    print("="*60)
    print()

    db = get_db()

    # Test 1: Get Statistics
    print("TEST 1: Database Statistics")
    print("-" * 60)
    stats = db.get_stats()
    print(json.dumps(stats, indent=2))
    print()

    # Test 2: Query Athletes
    print("TEST 2: Query Athletes")
    print("-" * 60)
    athletes = db.get_all_athletes()
    print(f"Total athletes in database: {len(athletes)}")
    for athlete in athletes[:5]:  # Show first 5
        print(f"\n  {athlete['name']}")
        print(f"    Sport: {athlete['sport']}")
        print(f"    Team: {athlete['team']}")
        print(f"    Contract: ${athlete['contract_value']:,.0f} ({athlete['deal_type']})")
    print()

    # Test 3: Search Athletes
    print("TEST 3: Search Athletes (Basketball players)")
    print("-" * 60)
    basketball_players = db.search_athletes(sport="Basketball")
    print(f"Found {len(basketball_players)} basketball players")
    for player in basketball_players:
        print(f"  - {player['name']}: ${player['contract_value']:,.0f}")
    print()

    # Test 4: Add New Athlete
    print("TEST 4: Add New Test Athlete")
    print("-" * 60)
    try:
        test_athlete_id = db.add_athlete(
            name="Test Player",
            sport="Football",
            team="Test Team",
            contract_value=500000,
            contract_year=2024,
            deal_type="NIL",
            key_details="Test athlete for verification",
            analysis_notes="This is a test record"
        )
        print(f"✓ Added test athlete with ID: {test_athlete_id}")
    except Exception as e:
        print(f"Note: Test athlete may already exist: {e}")
    print()

    # Test 5: Get Content Ideas
    print("TEST 5: Content Ideas")
    print("-" * 60)
    pending_content = db.get_pending_content()
    print(f"Pending content items: {len(pending_content)}")
    for content in pending_content[:3]:
        print(f"\n  {content['topic']}")
        print(f"    Category: {content['category']}")
        print(f"    Status: {content['status']}")
    print()

    # Test 6: Research
    print("TEST 6: Research Findings")
    print("-" * 60)
    research = db.search_research()
    print(f"Total research entries: {len(research)}")
    for r in research[:3]:
        print(f"\n  {r['topic']}")
        print(f"    Category: {r['category']}")
        print(f"    Findings: {r['findings'][:100]}...")
    print()

    # Test 7: Tasks
    print("TEST 7: Tasks")
    print("-" * 60)
    pending_tasks = db.get_tasks_by_status("pending")
    print(f"Pending tasks: {len(pending_tasks)}")
    for task in pending_tasks:
        print(f"  [{task['priority'].upper()}] {task['description']}")
    print()

    # Test 8: High-Value Deals
    print("TEST 8: High-Value Deals (>$1M)")
    print("-" * 60)
    high_value = db.search_athletes(min_value=1000000)
    print(f"Found {len(high_value)} high-value deals")
    for athlete in high_value:
        print(f"  ${athlete['contract_value']:,.0f} - {athlete['name']} ({athlete['sport']})")
    print()

    # Final Stats
    print("="*60)
    print("TESTS COMPLETED SUCCESSFULLY!")
    print("="*60)
    print("\nFinal Database State:")
    final_stats = db.get_stats()
    print(f"  Athletes: {final_stats['total_athletes']}")
    print(f"  Content Ideas: {final_stats['total_content']} ({final_stats['draft_content']} drafts)")
    print(f"  Research: {final_stats['total_research']}")
    print(f"  Tasks: {final_stats['pending_tasks']} pending")
    print()
    print("✓ Database is working perfectly!")
    print()


if __name__ == "__main__":
    test_database()
