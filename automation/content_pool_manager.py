#!/usr/bin/env python3
"""
Content Pool Manager - Smart Content Selection for 21M Tweet Generation

This module manages the content pool intelligently:
- Selects diverse, non-recent content for Claude
- Tracks usage to prevent repetition
- Balances categories (contracts, stories, quotes, history)
- Scores content based on quality, recency, and performance
- Enables content recycling after cooldown period

Usage:
    from content_pool_manager import ContentPoolManager, select_content_for_claude
    
    pool = ContentPoolManager()
    content, context = pool.select_for_generation('sports', btc_price=67200)
"""

import sys
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import json

# Add parent directory to path for imports
parent_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, parent_dir)
from jett_db import get_db

# Constants
COOLDOWN_DAYS = 7  # Content can't be used again within this many days
RECYCLE_DAYS = 30  # After this long, content can be reused
MIN_CONTENT_COUNT = 5  # Minimum content needed for diverse selection


@dataclass
class ContentItem:
    """Represents a content item from the database"""
    id: int
    topic: str
    category: str
    content: str
    quality_score: int
    source: Optional[str]
    created_date: str
    last_used: Optional[str]
    usage_count: int = 0


class ContentPoolManager:
    """
    Manages the content pool for intelligent selection.
    
    Features:
    - Smart filtering (skip recent, skip overused)
    - Category balancing (diverse content)
    - Performance-aware scoring
    - Content recycling
    """
    
    def __init__(self):
        self.db = get_db()
        self.categories = ['contract', 'story', 'quote', 'history', 'principle']
    
    def get_available_content(self, content_type: str = 'all') -> List[ContentItem]:
        """
        Get all available content from database.
        
        Args:
            content_type: 'bitcoin', 'sports', or 'all'
            
        Returns:
            List of ContentItem objects
        """
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            if content_type == 'all':
                cursor.execute("""
                    SELECT id, topic, category, content, quality_score, source,
                           created_date, last_used, usage_count
                    FROM content_ideas
                    ORDER BY created_date DESC
                    LIMIT 100
                """)
            elif content_type == 'bitcoin':
                cursor.execute("""
                    SELECT id, topic, category, content, quality_score, source,
                           created_date, last_used, usage_count
                    FROM content_ideas
                    WHERE category LIKE '%bitcoin%'
                    ORDER BY created_date DESC
                    LIMIT 50
                """)
            else:  # sports
                cursor.execute("""
                    SELECT id, topic, category, content, quality_score, source,
                           created_date, last_used, usage_count
                    FROM content_ideas
                    WHERE (category LIKE '%sport%' OR category LIKE '%21m-sports%' OR category = 'contracts')
                    ORDER BY created_date DESC
                    LIMIT 50
                """)
            
            rows = cursor.fetchall()
            
            return [
                ContentItem(
                    id=row['id'],
                    topic=row['topic'],
                    category=row['category'],
                    content=row['content'],
                    quality_score=row['quality_score'],
                    source=row['source'],
                    created_date=row['created_date'],
                    last_used=row['last_used'],
                    usage_count=row['usage_count']
                )
                for row in rows
            ]
    
    def get_recent_topics(self, days: int = COOLDOWN_DAYS) -> set:
        """Get set of topics used in the last N days."""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT DISTINCT topic FROM content_usage_log
                WHERE used_at > ?
            """, (cutoff,))
            
            return {row['topic'] for row in cursor.fetchall()}
    
    def get_recent_posts_summary(self, days: int = 14) -> List[Dict]:
        """Get summary of what was posted recently."""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT topic, category, used_at, engagement_score
                FROM content_usage_log
                WHERE used_at > ?
                ORDER BY used_at DESC
                LIMIT 20
            """, (cutoff,))
            
            return [
                {
                    'topic': row['topic'],
                    'category': row['category'],
                    'date': row['used_at'][:10],
                    'engagement': row['engagement_score'] or 0
                }
                for row in cursor.fetchall()
            ]
    
    def get_category_usage_today(self, category: str) -> int:
        """Count how many times this category was used today."""
        today = datetime.now().strftime('%Y-%m-%d')
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) as count FROM content_usage_log
                WHERE category LIKE ?
                AND used_at LIKE ?
            """, (f'%{category}%', f'{today}%'))
            
            return cursor.fetchone()['count']
    
    def get_usage_count(self, content_id: int) -> int:
        """Get total usage count for a content item."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT usage_count FROM content_ideas WHERE id = ?
            """, (content_id,))
            
            row = cursor.fetchone()
            return row['usage_count'] if row else 0
    
    def calculate_selection_score(self, content: ContentItem, context: Dict) -> float:
        """
        Calculate how likely this content is to be selected.
        Higher score = more likely to be selected.
        """
        score = 0.0
        
        # Base: quality score (0-10) weighted heavily
        score += content.quality_score * 10
        
        # Recency penalty (older content = less relevant)
        try:
            created = datetime.fromisoformat(content.created_date)
            days_old = (datetime.now() - created).days
            score -= days_old * 2  # -2 points per day old
        except:
            pass
        
        # Recency bonus if never used
        if not content.last_used:
            score += 30  # Never used bonus
        else:
            try:
                last_used = datetime.fromisoformat(content.last_used)
                days_since_used = (datetime.now() - last_used).days
                # Linear increase for time since last use, capped
                score += min(days_since_used * 5, 50)
            except:
                pass
        
        # Usage count penalty (don't over-use)
        score -= content.usage_count * 5
        
        # Category balance bonus
        category_usage = self.get_category_usage_today(content.category)
        if category_usage == 0:
            score += 35  # Fill empty category
        elif category_usage == 1:
            score += 15  # Room for more
        
        # BTC context bonus
        btc_trend = context.get('btc_trend', 'neutral')
        btc_price = context.get('btc_price', 0)
        
        if 'contract' in content.category.lower():
            if btc_trend == 'up':
                score += 12  # Contracts look better when BTC up
            elif btc_trend == 'down':
                score += 8   # Fiat debasement angle works when BTC down
        
        if 'history' in content.category.lower() or 'bitcoin_history' in content.category.lower():
            score += 5  # Historical content is always relevant
        
        return score
    
    def select_for_generation(
        self,
        content_type: str = 'all',
        btc_price: float = 0,
        btc_trend: str = 'neutral',
        min_items: int = 3,
        max_items: int = 5
    ) -> Tuple[List[ContentItem], Dict]:
        """
        Main entry point - select diverse content for Claude to generate tweets.
        
        Args:
            content_type: 'bitcoin', 'sports', or 'all'
            btc_price: Current BTC price for context
            btc_trend: 'up', 'down', or 'neutral'
            min_items: Minimum content items to return
            max_items: Maximum content items to return
            
        Returns:
            Tuple of (selected_content_list, context_dict)
        """
        # Get available content
        all_content = self.get_available_content(content_type)
        
        if not all_content:
            return [], {'error': 'No content available'}
        
        # Get context
        recent_topics = self.get_recent_topics(COOLDOWN_DAYS)
        recent_posts = self.get_recent_posts_summary(14)
        recent_categories = self._get_category_counts_recent()
        
        # Normalize recent topics for matching (strip suffixes like " - HIGH", " - LOW")
        normalized_recent = set()
        for topic in recent_topics:
            base = topic.rsplit(' - ', 1)[0]  # Strip " - HIGH/LOW" suffix
            normalized_recent.add(base)
        
        context = {
            'btc_price': btc_price,
            'btc_trend': btc_trend,
            'recent_topics': list(recent_topics)[:10],
            'recent_posts': recent_posts,
            'recent_categories': recent_categories,
            'total_available': len(all_content)
        }
        
        # Filter out recent topics (both exact and base match)
        filtered = [
            c for c in all_content
            if c.topic not in recent_topics and c.topic not in normalized_recent
        ]
        
        if not filtered:
            # If all content is recent, allow recycling after extended cooldown
            filtered = [
                c for c in all_content
                if self._can_recycle(c)
            ]
            context['recycled'] = True
        
        # Score and sort all filtered content
        scored = [
            (item, self.calculate_selection_score(item, context))
            for item in filtered
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        
        # Select diverse content across categories
        selected = self._select_diverse(
            [s[0] for s in scored],
            target_per_category={'contract': 1, 'story': 1, 'quote': 1, 'history': 1, 'principle': 1},
            max_total=max_items
        )
        
        # If not enough diverse, fill with highest scoring
        while len(selected) < min_items and len(scored) > len(selected):
            # Find next highest scoring not already selected
            for item, score in scored:
                if item not in selected:
                    selected.append(item)
                    break
        
        return selected, context
    
    def _select_diverse(
        self,
        content: List[ContentItem],
        target_per_category: Dict[str, int],
        max_total: int
    ) -> List[ContentItem]:
        """Select content to balance categories."""
        selected = []
        remaining = {k: v for k, v in target_per_category.items()}
        
        # First pass: try to fill each category
        for cat, needed in remaining.items():
            if needed <= 0:
                continue
            for item in content:
                if item.category.lower() in cat or cat in item.category.lower():
                    if item not in selected:
                        selected.append(item)
                        needed -= 1
                        if needed == 0:
                            break
        
        # If we still have room, add highest scoring regardless of category
        for item in content:
            if item not in selected:
                selected.append(item)
                if len(selected) >= max_total:
                    break
        
        return selected
    
    def _get_category_counts_recent(self) -> Dict[str, int]:
        """Get counts of categories used recently."""
        cutoff = (datetime.now() - timedelta(days=14)).isoformat()
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT category, COUNT(*) as count
                FROM content_usage_log
                WHERE used_at > ?
                GROUP BY category
            """, (cutoff,))
            
            return {row['category']: row['count'] for row in cursor.fetchall()}
    
    def _can_recycle(self, content: ContentItem) -> bool:
        """Check if content can be recycled after cooldown."""
        if not content.last_used:
            return True
        
        try:
            last_used = datetime.fromisoformat(content.last_used)
            days_since = (datetime.now() - last_used).days
            return days_since >= RECYCLE_DAYS
        except:
            return True
    
    def mark_used(
        self,
        content_id: int,
        topic: str,
        category: str,
        tweet_ids: List[str],
        platform: str = 'x'
    ) -> bool:
        """
        Mark content as used in generation.
        
        Args:
            content_id: Database ID of content used
            topic: Topic name
            category: Content category
            tweet_ids: List of tweet IDs posted
            platform: Platform (default 'x')
            
        Returns:
            True if successful
        """
        now = datetime.now().isoformat()
        
        try:
            with self.db.get_connection() as conn:
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
                    (content_id, topic, category, tweet_ids, platform, used_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (content_id, topic, category, json.dumps(tweet_ids), platform, now))
                
                return True
        except Exception as e:
            print(f"Error marking content as used: {e}")
            return False
    
    def get_pool_stats(self) -> Dict:
        """Get statistics about the content pool."""
        all_content = self.get_available_content('all')
        bitcoin = self.get_available_content('bitcoin')
        sports = self.get_available_content('sports')
        
        recent_topics = self.get_recent_topics(COOLDOWN_DAYS)
        recent_posts = self.get_recent_posts_summary(7)
        
        return {
            'total_available': len(all_content),
            'bitcoin_available': len(bitcoin),
            'sports_available': len(sports),
            'recent_topics_count': len(recent_topics),
            'recent_posts_7d': len(recent_posts),
            'categories_used_recently': self._get_category_counts_recent()
        }
    
    def recycle_old_content(self, days: int = RECYCLE_DAYS) -> int:
        """
        Reset 'last_used' on old content to allow recycling.
        
        Args:
            days: Reset content older than this many days
            
        Returns:
            Number of items recycled
        """
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE content_ideas
                SET last_used = NULL
                WHERE last_used < ?
            """, (cutoff,))
            
            return cursor.rowcount


def select_content_for_claude(
    content_type: str,
    btc_price: float = 0,
    btc_trend: str = 'neutral'
) -> Tuple[List[Dict], Dict]:
    """
    Convenience function - select content for Claude tweet generation.
    
    Args:
        content_type: 'bitcoin' or 'sports'
        btc_price: Current BTC price
        btc_trend: 'up', 'down', or 'neutral'
        
    Returns:
        Tuple of (content_list_for_claude, context_dict)
    """
    pool = ContentPoolManager()
    
    selected, context = pool.select_for_generation(
        content_type=content_type,
        btc_price=btc_price,
        btc_trend=btc_trend,
        min_items=3,
        max_items=5
    )
    
    # Format for Claude
    content_for_claude = []
    for item in selected:
        content_for_claude.append({
            'id': item.id,
            'topic': item.topic,
            'category': item.category,
            'content': item.content,
            'source': item.source,
            'quality_score': item.quality_score
        })
    
    return content_for_claude, context


def init_usage_log_table():
    """Initialize the content_usage_log table if it doesn't exist."""
    db = get_db()
    
    with db.get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS content_usage_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content_id INTEGER,
                topic TEXT,
                category TEXT,
                tweet_ids TEXT,
                platform TEXT DEFAULT 'x',
                used_at TEXT,
                engagement_score REAL,
                FOREIGN KEY (content_id) REFERENCES content_ideas(id)
            )
        """)
        
        # Create index for recent queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_usage_recent
            ON content_usage_log(used_at DESC)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_usage_topic
            ON content_usage_log(topic)
        """)
        
        print("✓ content_usage_log table initialized")


def update_engagement_score(usage_log_id: int, score: float) -> bool:
    """
    Update engagement score for a usage log entry.
    
    Args:
        usage_log_id: ID from content_usage_log
        score: Engagement score (likes + retweets * 2 + replies * 3)
        
    Returns:
        True if successful
    """
    try:
        with get_db().get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE content_usage_log
                SET engagement_score = ?
                WHERE id = ?
            """, (score, usage_log_id))
            return True
    except Exception as e:
        print(f"Error updating engagement: {e}")
        return False


# CLI interface
if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Content Pool Manager')
    parser.add_argument('--init', action='help', help='Initialize usage log table')
    parser.add_argument('--stats', action='store_true', help='Show pool statistics')
    parser.add_argument('--recycle', type=int, metavar='DAYS', help='Recycle content older than DAYS')
    parser.add_argument('--select', choices=['bitcoin', 'sports'], help='Select content for generation')
    parser.add_argument('--mark-used', metavar='FILE', help='Mark content from file as used')
    parser.add_argument('--btc-price', type=float, default=0, help='Current BTC price')
    parser.add_argument('--btc-trend', choices=['up', 'down', 'neutral'], default='neutral')
    
    args = parser.parse_args()
    
    pool = ContentPoolManager()
    
    if args.stats:
      stats = pool.get_pool_stats()
      print("\n📊 Content Pool Statistics")
      print("=" * 40)
      for k, v in stats.items():
          print(f"  {k}: {v}")
    
    elif args.recycle:
      count = pool.recycle_old_content(args.recycle)
      print(f"♻️  Recycled {count} content items")
    
    elif args.mark_used:
      import json
      try:
        with open(args.mark_used, 'r') as f:
          data = json.load(f)
        
        metadata = data.get('metadata', {})
        content_ids = metadata.get('content_ids', [])
        topics = metadata.get('topics', [])
        categories = metadata.get('categories', [])
        
        # Filter out None/null values
        valid_ids = [cid for cid in content_ids if cid is not None]
        
        if valid_ids and topics:
          for i, cid in enumerate(content_ids):
            if cid is None:
              continue
            topic = topics[i] if i < len(topics) and topics[i] else 'unknown'
            category = categories[i] if i < len(categories) and categories[i] else 'unknown'
            pool.mark_used(cid, topic, category, [])
          print(f"✅ Marked {len(valid_ids)} items as used (7-day cooldown started)")
        else:
          print("ℹ️ No pool content to mark - content was generated from research file, not pool")
      except Exception as e:
        print(f"❌ Error marking content as used: {e}")
    
    elif args.select:
        import json
        
        content, context = pool.select_for_generation(
            content_type=args.select,
            btc_price=args.btc_price,
            btc_trend=args.btc_trend
        )
        
        # Output JSON for programmatic use
        output = {
            'content': [
                {
                    'id': c.id,
                    'topic': c.topic,
                    'category': c.category,
                    'quality_score': c.quality_score,
                    'content': c.content[:500] if c.content else None
                }
                for c in content
            ],
            'context': context
        }
        
        print(json.dumps(output, indent=2))
    
    else:
        parser.print_help()
