#!/usr/bin/env python3
"""
Add eBay deals table to jett_knowledge.db
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'jett_knowledge.db')

def add_ebay_table():
    """Create ebay_deals table and indexes."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ebay_deals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          card_name TEXT NOT NULL,
          listing_url TEXT,
          current_price REAL,
          market_value REAL,
          discount_percent REAL,
          deal_score REAL,
          seller_name TEXT,
          seller_feedback REAL,
          photo_count INTEGER,
          listing_age_days INTEGER,
          date_found TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'new',
          notes TEXT
        )
    """)

    # Create indexes
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_ebay_deals_score
        ON ebay_deals(deal_score DESC)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_ebay_deals_status
        ON ebay_deals(status)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_ebay_deals_date
        ON ebay_deals(date_found DESC)
    """)

    conn.commit()
    conn.close()

    print("✅ ebay_deals table created successfully!")
    print(f"📂 Database: {DB_PATH}")

if __name__ == "__main__":
    add_ebay_table()
