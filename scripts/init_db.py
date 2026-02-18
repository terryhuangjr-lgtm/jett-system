#!/usr/bin/env python3
"""
Initialize Jett Knowledge Base Database
Creates tables, indexes, and sample data
"""

import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'jett_knowledge.db')


def init_database():
    """Initialize database with schema and indexes."""

    # Ensure data directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    # Check if database already exists
    if os.path.exists(DB_PATH):
        response = input(f"Database already exists at {DB_PATH}. Overwrite? (yes/no): ")
        if response.lower() != 'yes':
            print("Aborted.")
            return
        os.remove(DB_PATH)

    print(f"Creating database at: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ==================== CREATE TABLES ====================

    print("Creating tables...")

    # Athletes table
    cursor.execute("""
        CREATE TABLE athletes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            sport TEXT NOT NULL,
            team TEXT,
            contract_value REAL,
            contract_year INTEGER,
            deal_type TEXT,
            key_details TEXT,
            analysis_notes TEXT,
            last_updated TIMESTAMP NOT NULL,
            source_file TEXT
        )
    """)

    # Content ideas table
    cursor.execute("""
        CREATE TABLE content_ideas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL,
            category TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            content TEXT NOT NULL,
            created_date TIMESTAMP NOT NULL,
            scheduled_date TIMESTAMP,
            published_date TIMESTAMP,
            platform TEXT
        )
    """)

    # Research findings table
    cursor.execute("""
        CREATE TABLE research_findings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL,
            category TEXT NOT NULL,
            findings TEXT NOT NULL,
            sources TEXT,
            created_date TIMESTAMP NOT NULL,
            tags TEXT
        )
    """)

    # Tasks table
    cursor.execute("""
        CREATE TABLE tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            priority TEXT NOT NULL DEFAULT 'medium',
            status TEXT NOT NULL DEFAULT 'pending',
            created_date TIMESTAMP NOT NULL,
            completed_date TIMESTAMP,
            notes TEXT
        )
    """)

    print("✓ Tables created")

    # ==================== CREATE INDEXES ====================

    print("Creating indexes...")

    # Athletes indexes
    cursor.execute("CREATE INDEX idx_athletes_sport ON athletes(sport)")
    cursor.execute("CREATE INDEX idx_athletes_team ON athletes(team)")
    cursor.execute("CREATE INDEX idx_athletes_deal_type ON athletes(deal_type)")
    cursor.execute("CREATE INDEX idx_athletes_contract_value ON athletes(contract_value)")
    cursor.execute("CREATE INDEX idx_athletes_name_lower ON athletes(LOWER(name))")

    # Content ideas indexes
    cursor.execute("CREATE INDEX idx_content_category ON content_ideas(category)")
    cursor.execute("CREATE INDEX idx_content_status ON content_ideas(status)")
    cursor.execute("CREATE INDEX idx_content_platform ON content_ideas(platform)")
    cursor.execute("CREATE INDEX idx_content_scheduled_date ON content_ideas(scheduled_date)")

    # Research findings indexes
    cursor.execute("CREATE INDEX idx_research_category ON research_findings(category)")
    cursor.execute("CREATE INDEX idx_research_created_date ON research_findings(created_date)")

    # Tasks indexes
    cursor.execute("CREATE INDEX idx_tasks_status ON tasks(status)")
    cursor.execute("CREATE INDEX idx_tasks_priority ON tasks(priority)")
    cursor.execute("CREATE INDEX idx_tasks_category ON tasks(category)")
    cursor.execute("CREATE INDEX idx_tasks_created_date ON tasks(created_date)")

    print("✓ Indexes created")

    # ==================== INSERT SAMPLE DATA ====================

    print("Inserting sample data...")

    # Sample athletes
    sample_athletes = [
        ("Shedeur Sanders", "Football", "Colorado", 4000000, 2024, "NIL",
         "Top QB prospect, Colorado Buffaloes", "High-value NIL deal, potential NFL prospect",
         datetime.now().isoformat(), None),
        ("Caitlin Clark", "Basketball", "Indiana Fever", 28000000, 2024, "Professional",
         "WNBA #1 draft pick, Iowa star", "Record-breaking college career, huge endorsement potential",
         datetime.now().isoformat(), None),
        ("Bronny James", "Basketball", "Los Angeles Lakers", 7900000, 2024, "Professional",
         "LeBron James' son, Lakers", "Historic father-son duo in NBA",
         datetime.now().isoformat(), None),
    ]

    cursor.executemany("""
        INSERT INTO athletes (
            name, sport, team, contract_value, contract_year, deal_type,
            key_details, analysis_notes, last_updated, source_file
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sample_athletes)

    # Sample content ideas
    sample_content = [
        ("NIL Deal Trends 2024", "21m-sports", "draft",
         "Analysis of top NIL deals in college sports...",
         datetime.now().isoformat(), None, None, "twitter"),
        ("Caitlin Clark Impact", "21m-sports", "scheduled",
         "How Caitlin Clark changed women's basketball marketing...",
         datetime.now().isoformat(), "2024-03-15T10:00:00", None, "slack"),
    ]

    cursor.executemany("""
        INSERT INTO content_ideas (
            topic, category, status, content, created_date,
            scheduled_date, published_date, platform
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, sample_content)

    # Sample research
    sample_research = [
        ("NIL Market Size", "sports-business",
         "NIL market estimated at $1.7B in 2024, growing 30% YoY",
         '["https://example.com/nil-report"]',
         datetime.now().isoformat(),
         "NIL,market-size,2024"),
    ]

    cursor.executemany("""
        INSERT INTO research_findings (
            topic, category, findings, sources, created_date, tags
        ) VALUES (?, ?, ?, ?, ?, ?)
    """, sample_research)

    # Sample tasks
    sample_tasks = [
        ("Research top 10 NIL athletes", "research", "high", "pending",
         datetime.now().isoformat(), None, "Need current data for content piece"),
        ("Draft Twitter thread on Sanders", "content", "medium", "pending",
         datetime.now().isoformat(), None, "Focus on NIL deal structure"),
    ]

    cursor.executemany("""
        INSERT INTO tasks (
            description, category, priority, status,
            created_date, completed_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, sample_tasks)

    print("✓ Sample data inserted")

    # Commit and close
    conn.commit()
    conn.close()

    print(f"\n{'='*60}")
    print("✓ Database initialized successfully!")
    print(f"{'='*60}")
    print(f"\nDatabase location: {DB_PATH}")
    print(f"\nTables created:")
    print("  - athletes (3 sample records)")
    print("  - content_ideas (2 sample records)")
    print("  - research_findings (1 sample record)")
    print("  - tasks (2 sample records)")
    print(f"\nNext steps:")
    print("  1. Test database: python jett_db.py")
    print("  2. Import markdown files: python migrate_markdown.py")
    print("  3. Use in Python: from jett_db import get_db")
    print(f"\n{'='*60}")


if __name__ == "__main__":
    init_database()
