#!/usr/bin/env python3
"""
Fix Duplicate Content in Knowledge Database

Problem: Research tasks are creating duplicate entries with the same topic,
causing the same content to be deployed multiple times.

Solution:
1. Find all duplicate topics
2. Mark duplicates as published (keep highest quality as draft)
3. Report on fixed entries
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from jett_db import get_db
from collections import defaultdict

def find_duplicates():
    """Find all duplicate topics in the database."""
    db = get_db()

    with db.get_connection() as conn:
        cursor = conn.cursor()

        # Get all content with same topic (excluding priority suffixes)
        cursor.execute("""
            SELECT id, topic, status, quality_score, created_date, published_date, category
            FROM content_ideas
            WHERE status IN ('draft', 'published')
            ORDER BY topic, quality_score DESC, created_date ASC
        """)

        # Group by normalized topic (remove priority suffixes)
        topics = defaultdict(list)
        for row in cursor.fetchall():
            # Normalize topic by removing priority suffixes
            normalized_topic = row['topic'].replace(' - LOW', '').replace(' - HIGH', '').replace(' - MEDIUM', '')
            topics[normalized_topic].append(dict(row))

        # Find topics with multiple entries
        duplicates = {topic: entries for topic, entries in topics.items() if len(entries) > 1}

        return duplicates

def fix_duplicates(dry_run=True):
    """Fix duplicate content by marking extras as published."""
    db = get_db()

    duplicates = find_duplicates()

    if not duplicates:
        print("✅ No duplicates found!")
        return

    print(f"Found {len(duplicates)} topics with duplicates:\n")

    total_fixed = 0

    for topic, entries in duplicates.items():
        print(f"📋 {topic}")
        print(f"   {len(entries)} entries:")

        # Sort by: published status (published first), then quality, then date
        entries.sort(key=lambda x: (
            0 if x['status'] == 'published' else 1,  # Published entries first
            -x['quality_score'],  # Higher quality first
            x['created_date']  # Older entries first
        ))

        # Keep the first one (best quality or already published)
        keep_entry = entries[0]
        mark_as_published = entries[1:]  # Rest should be marked as published

        for entry in entries:
            status_marker = "✓ KEEP" if entry['id'] == keep_entry['id'] else "→ MARK PUBLISHED"
            pub_date = entry['published_date'][:19] if entry['published_date'] else "never"
            print(f"      ID {entry['id']}: score={entry['quality_score']}, status={entry['status']}, published={pub_date} {status_marker}")

        # Mark duplicates as published
        if not dry_run:
            for entry in mark_as_published:
                if entry['status'] != 'published':
                    success = db.mark_content_published(entry['id'])
                    if success:
                        total_fixed += 1
        else:
            total_fixed += len([e for e in mark_as_published if e['status'] != 'published'])

        print()

    if dry_run:
        print(f"\n🔍 DRY RUN: Would mark {total_fixed} duplicate entries as published")
        print("   Run with --apply to actually fix the duplicates")
    else:
        print(f"\n✅ Fixed {total_fixed} duplicate entries!")
        print("   They will no longer be selected for content generation")

def show_stats():
    """Show content statistics."""
    db = get_db()

    with db.get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as count FROM content_ideas WHERE status = 'draft'")
        draft_count = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM content_ideas WHERE status = 'published'")
        published_count = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM content_ideas WHERE status LIKE 'draft-%'")
        draft_priority_count = cursor.fetchone()['count']

        print("\n📊 Content Statistics:")
        print(f"   Draft: {draft_count}")
        print(f"   Published: {published_count}")
        print(f"   Draft (with priority): {draft_priority_count}")

if __name__ == '__main__':
    import sys

    dry_run = '--apply' not in sys.argv

    print("🔧 Duplicate Content Fixer\n")
    print("=" * 70)

    if dry_run:
        print("Running in DRY RUN mode (no changes will be made)")
        print("Use --apply to actually fix duplicates\n")
    else:
        print("APPLYING FIXES (this will modify the database)\n")

    show_stats()
    print()

    fix_duplicates(dry_run=dry_run)

    if not dry_run:
        print()
        show_stats()
