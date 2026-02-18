#!/usr/bin/env python3
"""
Simple helper to mark content as used - avoids shell escaping issues
"""
import sys
import os
import json
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from jett_db import get_db

def mark_used(content_id, topic, category, tweet_ids):
    """Mark content as used."""
    db = get_db()
    now = datetime.now().isoformat()

    # Parse tweet_ids
    if isinstance(tweet_ids, str):
        try:
            tweet_ids = json.loads(tweet_ids)
        except:
            tweet_ids = [tweet_ids]

    with db.get_connection() as conn:
        cursor = conn.cursor()

        # Update content_ideas
        cursor.execute("""
            UPDATE content_ideas
            SET last_used = ?, usage_count = usage_count + 1
            WHERE id = ?
        """, (now, content_id))

        # Add to usage log
        cursor.execute("""
            INSERT INTO content_usage_log
            (content_id, topic, category, tweet_ids, platform, used_at, engagement_score)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (content_id, topic, category, json.dumps(tweet_ids), 'x', now, 0.0))

    return True

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--id', type=int, required=True)
    parser.add_argument('--topic', required=True)
    parser.add_argument('--category', required=True)
    parser.add_argument('--tweets', required=True)

    args = parser.parse_args()

    if mark_used(args.id, args.topic, args.category, args.tweets):
        print(f"Marked content {args.id} as used")
    else:
        print("Failed to mark content as used")
        sys.exit(1)
