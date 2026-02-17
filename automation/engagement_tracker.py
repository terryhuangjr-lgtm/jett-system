#!/usr/bin/env python3
"""
Engagement Tracker - Track Tweet Performance for 21M Content

This module handles:
- Recording when tweets are deployed
- Tracking engagement metrics (likes, retweets, replies)
- Calculating engagement scores
- Updating content performance history
- Learning what content performs well

Usage:
    from engagement_tracker import EngagementTracker
    
    tracker = EngagementTracker()
    tracker.record_deployment(content_id, topic, category, tweet_id)
    tracker.update_engagement(tweet_id, likes=100, retweets=20, replies=5)
"""

import sys
import os
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass

# Add parent directory to path for imports
parent_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, parent_dir)
from jett_db import get_db


@dataclass
class TweetDeployment:
    """Represents a deployed tweet"""
    id: int
    content_id: int
    topic: str
    category: str
    tweet_id: str  # Twitter's ID
    platform: str
    deployed_at: str
    likes: int = 0
    retweets: int = 0
    replies: int = 0
    engagement_score: float = 0.0


class EngagementTracker:
    """
    Track tweet engagement and update content performance.
    
    Features:
    - Record tweet deployments
    - Fetch/record engagement metrics
    - Calculate engagement scores
    - Update content quality scores based on performance
    """
    
    def __init__(self):
        self.db = get_db()
    
    def record_deployment(
        self,
        content_id: int,
        topic: str,
        category: str,
        tweet_id: str,
        platform: str = 'x',
        metadata: Optional[Dict] = None
    ) -> int:
        """
        Record that a tweet was deployed.
        
        Args:
            content_id: ID from content_ideas table
            topic: Topic name
            category: Content category
            tweet_id: Twitter's tweet ID
            platform: Platform (default 'x')
            metadata: Optional additional data
            
        Returns:
            Deployment ID
        """
        now = datetime.now().isoformat()
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO tweet_deployments
                (content_id, topic, category, tweet_id, platform, deployed_at, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                content_id, topic, category, tweet_id, platform, now,
                str(metadata) if metadata else None
            ))
            
            deployment_id = cursor.lastrowid
            
            # Also add to content_usage_log for unified tracking
            cursor.execute("""
                INSERT INTO content_usage_log
                (content_id, topic, category, tweet_ids, platform, used_at, engagement_score)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (content_id, topic, category, tweet_id, platform, now, 0.0))
            
            return deployment_id
    
    def update_engagement(
        self,
        tweet_id: str,
        likes: int = 0,
        retweets: int = 0,
        replies: int = 0
    ) -> bool:
        """
        Update engagement metrics for a tweet.
        
        Args:
            tweet_id: Twitter's tweet ID
            likes: Number of likes
            retweets: Number of retweets
            replies: Number of replies
            
        Returns:
            True if successful
        """
        score = self._calculate_score(likes, retweets, replies)
        now = datetime.now().isoformat()
        
        try:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                
                # Update deployment
                cursor.execute("""
                    UPDATE tweet_deployments
                    SET likes = ?, retweets = ?, replies = ?, engagement_score = ?
                    WHERE tweet_id = ?
                """, (likes, retweets, replies, score, tweet_id))
                
                # Update usage log (match by tweet_id)
                cursor.execute("""
                    UPDATE content_usage_log
                    SET engagement_score = ?
                    WHERE tweet_ids LIKE ?
                """, (score, f'%{tweet_id}%'))
                
                return True
        except Exception as e:
            print(f"Error updating engagement: {e}")
            return False
    
    def _calculate_score(self, likes: int, retweets: int, replies: int) -> float:
        """
        Calculate engagement score.
        
        Weighting:
        - Likes: 1 point each
        - Retweets: 3 points each (higher value)
        - Replies: 2 points each (engagement)
        
        Returns:
            Total engagement score
        """
        return (likes * 1.0) + (retweets * 3.0) + (replies * 2.0)
    
    def get_best_performing_content(
        self,
        category: Optional[str] = None,
        days: int = 30,
        limit: int = 10
    ) -> List[Dict]:
        """
        Get best performing content based on engagement.
        
        Args:
            category: Filter by category
            days: Look back period
            limit: Maximum results
            
        Returns:
            List of best performing content
        """
        cutoff = (datetime.now() - datetime.timedelta(days=days)).isoformat()
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            if category:
                cursor.execute("""
                    SELECT topic, category, SUM(engagement_score) as total_score,
                           COUNT(*) as tweet_count, AVG(engagement_score) as avg_score
                    FROM content_usage_log
                    WHERE category LIKE ? AND used_at > ?
                    GROUP BY topic
                    ORDER BY total_score DESC
                    LIMIT ?
                """, (f'%{category}%', cutoff, limit))
            else:
                cursor.execute("""
                    SELECT topic, category, SUM(engagement_score) as total_score,
                           COUNT(*) as tweet_count, AVG(engagement_score) as avg_score
                    FROM content_usage_log
                    WHERE used_at > ?
                    GROUP BY topic
                    ORDER BY total_score DESC
                    LIMIT ?
                """, (cutoff, limit))
            
            return [
                {
                    'topic': row['topic'],
                    'category': row['category'],
                    'total_score': row['total_score'],
                    'tweet_count': row['tweet_count'],
                    'avg_score': row['avg_score']
                }
                for row in cursor.fetchall()
            ]
    
    def get_worst_performing_content(
        self,
        category: Optional[str] = None,
        days: int = 30,
        limit: int = 10
    ) -> List[Dict]:
        """
        Get worst performing content to learn from failures.
        
        Args:
            category: Filter by category
            days: Look back period
            limit: Maximum results
            
        Returns:
            List of worst performing content
        """
        cutoff = (datetime.now() - datetime.timedelta(days=days)).isoformat()
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            if category:
                cursor.execute("""
                    SELECT topic, category, SUM(engagement_score) as total_score,
                           COUNT(*) as tweet_count, AVG(engagement_score) as avg_score
                    FROM content_usage_log
                    WHERE category LIKE ? AND used_at > ?
                    GROUP BY topic
                    HAVING tweet_count >= 2
                    ORDER BY total_score ASC
                    LIMIT ?
                """, (f'%{category}%', cutoff, limit))
            else:
                cursor.execute("""
                    SELECT topic, category, SUM(engagement_score) as total_score,
                           COUNT(*) as tweet_count, AVG(engagement_score) as avg_score
                    FROM content_usage_log
                    WHERE used_at > ?
                    GROUP BY topic
                    HAVING tweet_count >= 2
                    ORDER BY total_score ASC
                    LIMIT ?
                """, (cutoff, limit))
            
            return [
                {
                    'topic': row['topic'],
                    'category': row['category'],
                    'total_score': row['total_score'],
                    'tweet_count': row['tweet_count'],
                    'avg_score': row['avg_score']
                }
                for row in cursor.fetchall()
            ]
    
    def adjust_content_quality(self, content_id: int, engagement_score: float) -> bool:
        """
        Adjust content quality score based on engagement.
        
        This allows the system to learn which content performs well.
        
        Args:
            content_id: ID from content_ideas
            engagement_score: Engagement score from deployment
            
        Returns:
            True if successful
        """
        try:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                
                # Calculate new quality score
                # Base score 7, adjustment +/- 2 based on engagement
                adjustment = 0
                if engagement_score > 100:
                    adjustment = 1
                if engagement_score > 200:
                    adjustment = 2
                if engagement_score > 500:
                    adjustment = 2
                if engagement_score < 20:
                    adjustment = -1
                if engagement_score < 10:
                    adjustment = -2
                
                cursor.execute("""
                    UPDATE content_ideas
                    SET quality_score = MAX(1, MIN(10, quality_score + ?))
                    WHERE id = ?
                """, (adjustment, content_id))
                
                return True
        except Exception as e:
            print(f"Error adjusting quality: {e}")
            return False
    
    def get_deployment_history(self, content_id: int) -> List[Dict]:
        """Get deployment history for a content item."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM tweet_deployments
                WHERE content_id = ?
                ORDER BY deployed_at DESC
            """, (content_id,))
            
            return [
                {
                    'tweet_id': row['tweet_id'],
                    'platform': row['platform'],
                    'deployed_at': row['deployed_at'],
                    'likes': row['likes'],
                    'retweets': row['retweets'],
                    'replies': row['replies'],
                    'engagement_score': row['engagement_score']
                }
                for row in cursor.fetchall()
            ]
    
    def get_engagement_summary(self, days: int = 30) -> Dict:
        """Get overall engagement summary."""
        cutoff = (datetime.now() - datetime.timedelta(days=days)).isoformat()
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    COUNT(*) as total_tweets,
                    SUM(likes) as total_likes,
                    SUM(retweets) as total_retweets,
                    SUM(replies) as total_replies,
                    AVG(engagement_score) as avg_score,
                    SUM(engagement_score) as total_score
                FROM tweet_deployments
                WHERE deployed_at > ?
            """, (cutoff,))
            
            row = cursor.fetchone()
            
            return {
                'period_days': days,
                'total_tweets': row['total_tweets'] or 0,
                'total_likes': row['total_likes'] or 0,
                'total_retweets': row['total_retweets'] or 0,
                'total_replies': row['total_replies'] or 0,
                'avg_engagement': round(row['avg_score'] or 0, 1),
                'total_engagement': row['total_score'] or 0
            }
    
    def get_performance_trends(self, days: int = 30) -> List[Dict]:
        """Get daily engagement trends."""
        cutoff = (datetime.now() - datetime.timedelta(days=days)).isoformat()
        
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    DATE(deployed_at) as date,
                    COUNT(*) as tweets,
                    SUM(engagement_score) as score,
                    AVG(engagement_score) as avg_score
                FROM tweet_deployments
                WHERE deployed_at > ?
                GROUP BY DATE(deployed_at)
                ORDER BY date DESC
            """, (cutoff,))
            
            return [
                {
                    'date': row['date'],
                    'tweets': row['tweets'],
                    'score': row['score'],
                    'avg_score': round(row['avg_score'], 1)
                }
                for row in cursor.fetchall()
            ]


def init_deployments_table():
    """Initialize the tweet_deployments table if it doesn't exist."""
    db = get_db()
    
    with db.get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tweet_deployments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content_id INTEGER,
                topic TEXT,
                category TEXT,
                tweet_id TEXT,
                platform TEXT DEFAULT 'x',
                deployed_at TEXT,
                likes INTEGER DEFAULT 0,
                retweets INTEGER DEFAULT 0,
                replies INTEGER DEFAULT 0,
                engagement_score REAL DEFAULT 0.0,
                metadata TEXT,
                FOREIGN KEY (content_id) REFERENCES content_ideas(id)
            )
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_deployments_tweet
            ON tweet_deployments(tweet_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_deployments_content
            ON tweet_deployments(content_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_deployments_date
            ON tweet_deployments(deployed_at DESC)
        """)
        
        print("✓ tweet_deployments table initialized")


# CLI interface
if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Engagement Tracker')
    parser.add_argument('--init', action='store_true', help='Initialize deployments table')
    parser.add_argument('--summary', type=int, metavar='DAYS', default=30, help='Get summary for last N days')
    parser.add_argument('--best', type=int, metavar='DAYS', default=30, help='Get best performing content')
    parser.add_argument('--trends', type=int, metavar='DAYS', default=30, help='Get daily trends')
    
    args = parser.parse_args()
    
    tracker = EngagementTracker()
    
    if args.init:
        init_deployments_table()
    
    elif args.summary:
        summary = tracker.get_engagement_summary(args.summary)
        print(f"\n📊 Engagement Summary ({summary['period_days']} days)")
        print("=" * 40)
        for k, v in summary.items():
            print(f"  {k}: {v}")
    
    elif args.best:
        print(f"\n🏆 Best Performing Content (last {args.best} days)")
        print("=" * 40)
        best = tracker.get_best_performing_content(days=args.best, limit=10)
        for i, item in enumerate(best, 1):
            print(f"  {i}. {item['topic'][:40]}...")
            print(f"     Score: {item['total_score']:.0f} ({item['tweet_count']} tweets)")
    
    elif args.trends:
        print(f"\n📈 Daily Engagement Trends (last {args.trends} days)")
        print("=" * 40)
        trends = tracker.get_performance_trends(args.trends)
        for day in trends[:10]:
            print(f"  {day['date']}: {day['tweets']} tweets, {day['score']:.0f} total, {day['avg_score']:.1f} avg")
    
    else:
        parser.print_help()
