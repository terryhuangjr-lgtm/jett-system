#!/usr/bin/env python3
"""
Extend content_ideas table to support quality scoring and source tracking
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'jett_knowledge.db')

def extend_schema():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(content_ideas)")
        columns = [row[1] for row in cursor.fetchall()]

        if 'quality_score' not in columns:
            print("Adding quality_score column...")
            cursor.execute("ALTER TABLE content_ideas ADD COLUMN quality_score INTEGER DEFAULT 7")
            print("✓ Added quality_score")
        else:
            print("quality_score column already exists")

        if 'source' not in columns:
            print("Adding source column...")
            cursor.execute("ALTER TABLE content_ideas ADD COLUMN source TEXT")
            print("✓ Added source")
        else:
            print("source column already exists")

        conn.commit()
        print("\n✅ Schema extended successfully!")

    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    extend_schema()
