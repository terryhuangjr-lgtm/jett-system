#!/usr/bin/env python3
"""
Fix Database Categories

Updates incorrectly categorized Bitcoin content from '21m-sports' to proper categories
"""

import sys
import os
import sqlite3

# Database path
db_path = '/home/clawd/clawd/data/jett_knowledge.db'

print('\n🔧 Fixing database categories...\n')

# Connect directly
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all content with wrong categories
wrong_category = cursor.execute(
    "SELECT id, topic, category FROM content_ideas WHERE category = '21m-sports' AND topic LIKE '%Bitcoin%'"
).fetchall()

fixed = 0

for row in wrong_category:
    content_id, topic, old_category = row

    # Determine new category
    if 'Bitcoin Quote' in topic:
        new_category = 'bitcoin_quotes'
    elif 'Bitcoin History' in topic:
        new_category = 'bitcoin_history'
    else:
        new_category = 'bitcoin'

    print(f'Fixing: "{topic[:60]}..."')
    print(f'  {old_category} → {new_category}')

    # Update
    cursor.execute(
        "UPDATE content_ideas SET category = ? WHERE id = ?",
        (new_category, content_id)
    )
    fixed += 1

conn.commit()
conn.close()

print(f'\n✅ Fixed {fixed} entries\n')
