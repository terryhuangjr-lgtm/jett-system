#!/usr/bin/env python3
"""
Query verified content from database for 21M content generation.
"""

import sys
import sqlite3
import json

def query_content(content_type, limit=10):
    """Query content from database based on type."""
    conn = sqlite3.connect('/home/clawd/clawd/data/jett_knowledge.db')
    cursor = conn.cursor()
    
    if content_type == 'sports':
        # Sports/athlete content - prefer content with sources
        cursor.execute('''
            SELECT topic, content, category, quality_score, source
            FROM content_ideas 
            WHERE status = 'draft' 
            AND (category LIKE '%21m-sports%' OR category LIKE '%sports%' OR category LIKE '%contract%' OR category LIKE '%athlete%')
            AND topic IS NOT NULL AND content IS NOT NULL AND length(content) > 50
            AND (source IS NOT NULL AND source != '')
            ORDER BY quality_score DESC, created_date DESC
            LIMIT ?
        ''', (limit,))
    else:
        # Bitcoin content
        cursor.execute('''
            SELECT topic, content, category, quality_score, source
            FROM content_ideas 
            WHERE status = 'draft'
            AND (category LIKE '%bitcoin%' OR category LIKE '%btc%' OR category LIKE '%crypto%' OR category LIKE '%sound_money%' OR category LIKE '%quotes%' OR category LIKE '%adoption%')
            AND topic IS NOT NULL AND content IS NOT NULL AND length(content) > 50
            ORDER BY quality_score DESC, created_date DESC
            LIMIT ?
        ''', (limit,))
    
    results = cursor.fetchall()
    conn.close()
    
    # Return as JSON
    content = []
    for row in results:
        content.append({
            'topic': row[0],
            'content': row[1],
            'category': row[2],
            'quality_score': row[3],
            'source': row[4] or ''
        })
    
    print(json.dumps(content))

if __name__ == '__main__':
    content_type = sys.argv[1] if len(sys.argv) > 1 else 'bitcoin'
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    query_content(content_type, limit)
