#!/usr/bin/env python3
"""
Add Performance Indexes to Jett Knowledge Database

Adds missing indexes for common query patterns to improve performance
"""

import sqlite3
import os

DB_PATH = '/home/clawd/clawd/data/jett_knowledge.db'

print('\n🚀 Adding performance indexes to database...\n')

if not os.path.exists(DB_PATH):
    print(f'❌ Database not found at {DB_PATH}')
    exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Check what indexes already exist
cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
existing_indexes = {row[0] for row in cursor.fetchall()}
print(f'📋 Found {len(existing_indexes)} existing indexes\n')

indexes_to_add = [
    # Quality score index (used in filtering)
    ("idx_content_quality_score", "CREATE INDEX IF NOT EXISTS idx_content_quality_score ON content_ideas(quality_score)"),

    # Composite index for common query pattern: category + status + quality_score
    # This covers the exact query pattern in generator (filter by category, status='draft', quality_score >= 7)
    ("idx_content_composite", "CREATE INDEX IF NOT EXISTS idx_content_composite ON content_ideas(category, status, quality_score DESC)"),

    # Source index for filtering by source (used in research scripts)
    ("idx_content_source", "CREATE INDEX IF NOT EXISTS idx_content_source ON content_ideas(source)"),

    # Created date index for sorting recent content
    ("idx_content_created_desc", "CREATE INDEX IF NOT EXISTS idx_content_created_desc ON content_ideas(created_date DESC)"),
]

added = 0
skipped = 0

for index_name, sql in indexes_to_add:
    if index_name in existing_indexes:
        print(f'⏭️  Skipping {index_name} (already exists)')
        skipped += 1
    else:
        print(f'➕ Adding {index_name}...')
        cursor.execute(sql)
        added += 1

conn.commit()
conn.close()

print(f'\n✅ Done!')
print(f'   Added: {added} new indexes')
print(f'   Skipped: {skipped} existing indexes')
print(f'\n💡 These indexes will speed up:')
print(f'   - Content filtering by category and quality')
print(f'   - Draft content queries')
print(f'   - Source-based lookups')
print(f'   - Recent content sorting\n')
