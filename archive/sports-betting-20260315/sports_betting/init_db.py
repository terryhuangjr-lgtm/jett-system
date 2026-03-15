#!/usr/bin/env python3
"""Initialize the sports betting database"""

import sqlite3
import os

# Paths
DB_PATH = os.path.expanduser("~/clawd/data/sports_betting.db")
SCHEMA_PATH = os.path.expanduser("~/clawd/sports_betting/schema.sql")

def init_database():
    """Create and initialize the database with schema"""
    # Read schema file
    with open(SCHEMA_PATH, 'r') as f:
        schema = f.read()

    # Create database and execute schema
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Execute the entire schema (SQLite supports multiple statements)
    cursor.executescript(schema)

    conn.commit()
    conn.close()

    print(f"Database initialized successfully at: {DB_PATH}")
    return True

def verify_tables():
    """Verify all tables were created"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = cursor.fetchall()

    print("\nTables created:")
    for table in tables:
        print(f"  - {table[0]}")

    # Check config
    print("\nSystem configuration:")
    cursor.execute("SELECT * FROM system_config;")
    configs = cursor.fetchall()
    for key, value, description in configs:
        print(f"  {key}: {value} ({description})")

    conn.close()

if __name__ == "__main__":
    init_database()
    verify_tables()
