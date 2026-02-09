"""
Jett Knowledge Base - SQLite Database Interface
A comprehensive database system for storing and retrieving Jett's knowledge.
This replaces constantly re-reading markdown files and saves tokens.
"""

import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional, Any
from contextlib import contextmanager
import os

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'jett_knowledge.db')


class JettDB:
    """Main database interface for Jett's knowledge base."""

    def __init__(self, db_path: str = DB_PATH):
        """Initialize database connection."""
        self.db_path = db_path
        self._ensure_db_exists()

    def _ensure_db_exists(self):
        """Ensure database and tables exist."""
        if not os.path.exists(self.db_path):
            print(f"Database not found at {self.db_path}")
            print("Run: python init_db.py to create the database")

    @contextmanager
    def get_connection(self):
        """Context manager for database connections."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Return rows as dictionaries
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def _row_to_dict(self, row) -> Dict:
        """Convert sqlite3.Row to dictionary."""
        if row is None:
            return None
        return dict(row)

    def _rows_to_dicts(self, rows) -> List[Dict]:
        """Convert list of sqlite3.Row to list of dictionaries."""
        return [dict(row) for row in rows]

    # ==================== ATHLETES ====================

    def add_athlete(
        self,
        name: str,
        sport: str,
        team: Optional[str] = None,
        contract_value: Optional[float] = None,
        contract_year: Optional[int] = None,
        deal_type: Optional[str] = None,
        key_details: Optional[str] = None,
        analysis_notes: Optional[str] = None,
        source_file: Optional[str] = None
    ) -> int:
        """
        Add a new athlete to the database.

        Args:
            name: Athlete's full name
            sport: Sport they play
            team: Current team
            contract_value: Value of contract in dollars
            contract_year: Year of contract
            deal_type: Type of deal (NIL, Professional, etc.)
            key_details: Key details about the athlete
            analysis_notes: Analysis and notes
            source_file: Path to source markdown file

        Returns:
            ID of inserted athlete
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO athletes (
                    name, sport, team, contract_value, contract_year,
                    deal_type, key_details, analysis_notes, source_file, last_updated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                name, sport, team, contract_value, contract_year,
                deal_type, key_details, analysis_notes, source_file,
                datetime.now().isoformat()
            ))
            return cursor.lastrowid

    def get_athlete(self, name: str) -> Optional[Dict]:
        """
        Get athlete by name.

        Args:
            name: Athlete's name (case-insensitive)

        Returns:
            Dictionary with athlete data or None
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM athletes WHERE LOWER(name) = LOWER(?)",
                (name,)
            )
            row = cursor.fetchone()
            return self._row_to_dict(row)

    def search_athletes(
        self,
        sport: Optional[str] = None,
        team: Optional[str] = None,
        deal_type: Optional[str] = None,
        min_value: Optional[float] = None,
        max_value: Optional[float] = None,
        keyword: Optional[str] = None
    ) -> List[Dict]:
        """
        Search athletes with various criteria.

        Args:
            sport: Filter by sport
            team: Filter by team
            deal_type: Filter by deal type
            min_value: Minimum contract value
            max_value: Maximum contract value
            keyword: Search in name, details, or notes

        Returns:
            List of matching athletes
        """
        query = "SELECT * FROM athletes WHERE 1=1"
        params = []

        if sport:
            query += " AND LOWER(sport) = LOWER(?)"
            params.append(sport)

        if team:
            query += " AND LOWER(team) = LOWER(?)"
            params.append(team)

        if deal_type:
            query += " AND LOWER(deal_type) = LOWER(?)"
            params.append(deal_type)

        if min_value is not None:
            query += " AND contract_value >= ?"
            params.append(min_value)

        if max_value is not None:
            query += " AND contract_value <= ?"
            params.append(max_value)

        if keyword:
            query += " AND (LOWER(name) LIKE LOWER(?) OR LOWER(key_details) LIKE LOWER(?) OR LOWER(analysis_notes) LIKE LOWER(?))"
            keyword_pattern = f"%{keyword}%"
            params.extend([keyword_pattern, keyword_pattern, keyword_pattern])

        query += " ORDER BY contract_value DESC"

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return self._rows_to_dicts(cursor.fetchall())

    def update_athlete(self, name: str, **kwargs) -> bool:
        """
        Update athlete information.

        Args:
            name: Athlete's name
            **kwargs: Fields to update

        Returns:
            True if updated, False if not found
        """
        athlete = self.get_athlete(name)
        if not athlete:
            return False

        # Build update query dynamically
        fields = []
        values = []
        for key, value in kwargs.items():
            if key in ['sport', 'team', 'contract_value', 'contract_year',
                      'deal_type', 'key_details', 'analysis_notes', 'source_file']:
                fields.append(f"{key} = ?")
                values.append(value)

        if not fields:
            return False

        fields.append("last_updated = ?")
        values.append(datetime.now().isoformat())
        values.append(name)

        query = f"UPDATE athletes SET {', '.join(fields)} WHERE LOWER(name) = LOWER(?)"

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, values)
            return cursor.rowcount > 0

    def get_all_athletes(self, order_by: str = "contract_value DESC") -> List[Dict]:
        """Get all athletes, ordered by specified field."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM athletes ORDER BY {order_by}")
            return self._rows_to_dicts(cursor.fetchall())

    # ==================== CONTENT IDEAS ====================

    def add_content_idea(
        self,
        topic: str,
        category: str,
        content: str,
        status: str = "draft",
        scheduled_date: Optional[str] = None,
        platform: Optional[str] = None,
        quality_score: Optional[int] = 7,
        source: Optional[str] = None
    ) -> int:
        """
        Add a new content idea.

        Args:
            topic: Content topic/title
            category: Category (21m-sports, batting-cage, personal)
            content: Full content text
            status: Status (draft, scheduled, published)
            scheduled_date: When to publish (ISO format)
            platform: Target platform (twitter, slack, etc.)
            quality_score: Quality rating 1-10 (default 7)
            source: Source URL or reference

        Returns:
            ID of inserted content idea
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO content_ideas (
                    topic, category, content, status, scheduled_date, platform, quality_score, source, created_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (topic, category, content, status, scheduled_date, platform, quality_score, source, datetime.now().isoformat()))
            return cursor.lastrowid

    def get_content_idea(self, content_id: int) -> Optional[Dict]:
        """Get content idea by ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM content_ideas WHERE id = ?", (content_id,))
            return self._row_to_dict(cursor.fetchone())

    def get_content_by_status(self, status: str, limit: Optional[int] = None) -> List[Dict]:
        """Get content ideas with specified status, optionally sorted by quality score."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM content_ideas WHERE status = ? ORDER BY quality_score DESC, created_date DESC"
            if limit:
                query += f" LIMIT {limit}"
            cursor.execute(query, (status,))
            return self._rows_to_dicts(cursor.fetchall())

    def get_content_by_category(
        self,
        category: str,
        status: str = 'draft',
        min_quality: int = 7,
        limit: Optional[int] = None
    ) -> List[Dict]:
        """
        Get content ideas filtered by category, status, and quality score.
        Optimized query that filters in SQL rather than loading all records.

        Args:
            category: Category to filter by (supports LIKE matching)
            status: Status to filter by (default 'draft')
            min_quality: Minimum quality score (default 7)
            limit: Optional limit on results

        Returns:
            List of matching content ideas, sorted by quality score descending
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = """
                SELECT * FROM content_ideas
                WHERE status = ?
                AND category LIKE ?
                AND quality_score >= ?
                ORDER BY quality_score DESC, created_date DESC
            """
            if limit:
                query += f" LIMIT {limit}"

            # Convert category to LIKE pattern
            category_pattern = f"%{category}%"

            cursor.execute(query, (status, category_pattern, min_quality))
            return self._rows_to_dicts(cursor.fetchall())

    def get_pending_content(self) -> List[Dict]:
        """Get all pending (draft + scheduled) content."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM content_ideas
                WHERE status IN ('draft', 'scheduled')
                ORDER BY scheduled_date ASC, created_date ASC
            """)
            return self._rows_to_dicts(cursor.fetchall())

    def mark_content_published(self, content_id: int) -> bool:
        """Mark content as published."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE content_ideas
                SET status = 'published', published_date = ?
                WHERE id = ?
            """, (datetime.now().isoformat(), content_id))
            return cursor.rowcount > 0

    def search_content(
        self,
        category: Optional[str] = None,
        platform: Optional[str] = None,
        keyword: Optional[str] = None
    ) -> List[Dict]:
        """Search content ideas."""
        query = "SELECT * FROM content_ideas WHERE 1=1"
        params = []

        if category:
            query += " AND category = ?"
            params.append(category)

        if platform:
            query += " AND platform = ?"
            params.append(platform)

        if keyword:
            query += " AND (LOWER(topic) LIKE LOWER(?) OR LOWER(content) LIKE LOWER(?))"
            keyword_pattern = f"%{keyword}%"
            params.extend([keyword_pattern, keyword_pattern])

        query += " ORDER BY created_date DESC"

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return self._rows_to_dicts(cursor.fetchall())

    # ==================== RESEARCH FINDINGS ====================

    def add_research(
        self,
        topic: str,
        category: str,
        findings: str,
        sources: Optional[List[str]] = None,
        tags: Optional[List[str]] = None
    ) -> int:
        """
        Add research findings.

        Args:
            topic: Research topic
            category: Category
            findings: Research findings text
            sources: List of source URLs
            tags: List of tags

        Returns:
            ID of inserted research
        """
        sources_json = json.dumps(sources) if sources else None
        tags_str = ",".join(tags) if tags else None

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO research_findings (
                    topic, category, findings, sources, tags, created_date
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (topic, category, findings, sources_json, tags_str, datetime.now().isoformat()))
            return cursor.lastrowid

    def get_research(self, research_id: int) -> Optional[Dict]:
        """Get research by ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM research_findings WHERE id = ?", (research_id,))
            row = cursor.fetchone()
            if row:
                result = self._row_to_dict(row)
                # Parse JSON sources
                if result['sources']:
                    result['sources'] = json.loads(result['sources'])
                # Parse tags
                if result['tags']:
                    result['tags'] = result['tags'].split(',')
                return result
            return None

    def search_research(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        tag: Optional[str] = None
    ) -> List[Dict]:
        """
        Search research findings.

        Args:
            query: Search in topic or findings
            category: Filter by category
            tag: Filter by tag

        Returns:
            List of matching research
        """
        sql = "SELECT * FROM research_findings WHERE 1=1"
        params = []

        if query:
            sql += " AND (LOWER(topic) LIKE LOWER(?) OR LOWER(findings) LIKE LOWER(?))"
            query_pattern = f"%{query}%"
            params.extend([query_pattern, query_pattern])

        if category:
            sql += " AND category = ?"
            params.append(category)

        if tag:
            sql += " AND tags LIKE ?"
            params.append(f"%{tag}%")

        sql += " ORDER BY created_date DESC"

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, params)
            results = self._rows_to_dicts(cursor.fetchall())

            # Parse JSON and tags for each result
            for result in results:
                if result['sources']:
                    result['sources'] = json.loads(result['sources'])
                if result['tags']:
                    result['tags'] = result['tags'].split(',')

            return results

    # ==================== TASKS ====================

    def add_task(
        self,
        description: str,
        category: str,
        priority: str = "medium",
        notes: Optional[str] = None
    ) -> int:
        """
        Add a new task.

        Args:
            description: Task description
            category: Task category
            priority: Priority (high, medium, low)
            notes: Additional notes

        Returns:
            ID of inserted task
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO tasks (
                    description, category, priority, status, notes, created_date
                ) VALUES (?, ?, ?, 'pending', ?, ?)
            """, (description, category, priority, notes, datetime.now().isoformat()))
            return cursor.lastrowid

    def get_task(self, task_id: int) -> Optional[Dict]:
        """Get task by ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
            return self._row_to_dict(cursor.fetchone())

    def get_tasks_by_status(self, status: str) -> List[Dict]:
        """Get all tasks with specified status."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM tasks WHERE status = ? ORDER BY priority DESC, created_date ASC",
                (status,)
            )
            return self._rows_to_dicts(cursor.fetchall())

    def get_tasks_by_priority(self, priority: str) -> List[Dict]:
        """Get all tasks with specified priority."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM tasks WHERE priority = ? AND status != 'completed' ORDER BY created_date ASC",
                (priority,)
            )
            return self._rows_to_dicts(cursor.fetchall())

    def update_task_status(self, task_id: int, status: str) -> bool:
        """
        Update task status.

        Args:
            task_id: Task ID
            status: New status (pending, in_progress, completed)

        Returns:
            True if updated
        """
        updates = {"status": status}
        if status == "completed":
            updates["completed_date"] = datetime.now().isoformat()

        with self.get_connection() as conn:
            cursor = conn.cursor()
            if "completed_date" in updates:
                cursor.execute(
                    "UPDATE tasks SET status = ?, completed_date = ? WHERE id = ?",
                    (status, updates["completed_date"], task_id)
                )
            else:
                cursor.execute(
                    "UPDATE tasks SET status = ? WHERE id = ?",
                    (status, task_id)
                )
            return cursor.rowcount > 0

    def search_tasks(
        self,
        category: Optional[str] = None,
        keyword: Optional[str] = None,
        exclude_completed: bool = True
    ) -> List[Dict]:
        """Search tasks."""
        query = "SELECT * FROM tasks WHERE 1=1"
        params = []

        if exclude_completed:
            query += " AND status != 'completed'"

        if category:
            query += " AND category = ?"
            params.append(category)

        if keyword:
            query += " AND (LOWER(description) LIKE LOWER(?) OR LOWER(notes) LIKE LOWER(?))"
            keyword_pattern = f"%{keyword}%"
            params.extend([keyword_pattern, keyword_pattern])

        query += " ORDER BY priority DESC, created_date ASC"

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return self._rows_to_dicts(cursor.fetchall())

    # ==================== EBAY DEALS ====================

    def add_ebay_deal(
        self,
        card_name: str,
        listing_url: Optional[str] = None,
        current_price: Optional[float] = None,
        market_value: Optional[float] = None,
        deal_score: Optional[float] = None,
        seller_name: Optional[str] = None,
        seller_feedback: Optional[float] = None,
        photo_count: Optional[int] = None,
        listing_age_days: Optional[int] = None,
        notes: Optional[str] = None
    ) -> int:
        """
        Add a new eBay deal to track.

        Args:
            card_name: Name of the card
            listing_url: eBay listing URL
            current_price: Current listing price
            market_value: Estimated market value
            deal_score: Deal quality score (0-100)
            seller_name: eBay seller username
            seller_feedback: Seller feedback score
            photo_count: Number of photos in listing
            listing_age_days: Age of listing in days
            notes: Additional notes

        Returns:
            ID of inserted deal
        """
        # Calculate discount percentage if both prices provided
        discount_percent = None
        if current_price and market_value and market_value > 0:
            discount_percent = ((market_value - current_price) / market_value) * 100

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO ebay_deals (
                    card_name, listing_url, current_price, market_value,
                    discount_percent, deal_score, seller_name, seller_feedback,
                    photo_count, listing_age_days, date_found, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
            """, (
                card_name, listing_url, current_price, market_value,
                discount_percent, deal_score, seller_name, seller_feedback,
                photo_count, listing_age_days, datetime.now().isoformat(), notes
            ))
            return cursor.lastrowid

    def get_deals_by_score(self, min_score: float = 70.0) -> List[Dict]:
        """
        Get deals with score above threshold.

        Args:
            min_score: Minimum deal score (default: 70.0)

        Returns:
            List of deals sorted by score descending
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM ebay_deals
                WHERE deal_score >= ? AND status = 'new'
                ORDER BY deal_score DESC, date_found DESC
            """, (min_score,))
            return self._rows_to_dicts(cursor.fetchall())

    def get_recent_deals(self, days: int = 7, status: Optional[str] = None) -> List[Dict]:
        """
        Get deals found in the last N days.

        Args:
            days: Number of days to look back (default: 7)
            status: Filter by status (optional)

        Returns:
            List of recent deals sorted by date
        """
        from datetime import timedelta
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()

        query = "SELECT * FROM ebay_deals WHERE date_found >= ?"
        params = [cutoff_date]

        if status:
            query += " AND status = ?"
            params.append(status)

        query += " ORDER BY date_found DESC, deal_score DESC"

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return self._rows_to_dicts(cursor.fetchall())

    def mark_deal_purchased(self, deal_id: int, notes: Optional[str] = None) -> bool:
        """
        Mark a deal as purchased.

        Args:
            deal_id: Deal ID
            notes: Optional purchase notes

        Returns:
            True if updated
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if notes:
                cursor.execute("""
                    UPDATE ebay_deals
                    SET status = 'purchased', notes = ?
                    WHERE id = ?
                """, (notes, deal_id))
            else:
                cursor.execute("""
                    UPDATE ebay_deals
                    SET status = 'purchased'
                    WHERE id = ?
                """, (deal_id,))
            return cursor.rowcount > 0

    def mark_deal_skipped(self, deal_id: int, reason: Optional[str] = None) -> bool:
        """
        Mark a deal as skipped.

        Args:
            deal_id: Deal ID
            reason: Reason for skipping

        Returns:
            True if updated
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if reason:
                cursor.execute("""
                    UPDATE ebay_deals
                    SET status = 'skipped', notes = ?
                    WHERE id = ?
                """, (reason, deal_id))
            else:
                cursor.execute("""
                    UPDATE ebay_deals
                    SET status = 'skipped'
                    WHERE id = ?
                """, (deal_id,))
            return cursor.rowcount > 0

    def get_ebay_deal(self, deal_id: int) -> Optional[Dict]:
        """Get eBay deal by ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM ebay_deals WHERE id = ?", (deal_id,))
            return self._row_to_dict(cursor.fetchone())

    def search_ebay_deals(
        self,
        card_name: Optional[str] = None,
        min_score: Optional[float] = None,
        max_price: Optional[float] = None,
        status: Optional[str] = None
    ) -> List[Dict]:
        """
        Search eBay deals with various criteria.

        Args:
            card_name: Search in card name
            min_score: Minimum deal score
            max_price: Maximum current price
            status: Filter by status

        Returns:
            List of matching deals
        """
        query = "SELECT * FROM ebay_deals WHERE 1=1"
        params = []

        if card_name:
            query += " AND LOWER(card_name) LIKE LOWER(?)"
            params.append(f"%{card_name}%")

        if min_score is not None:
            query += " AND deal_score >= ?"
            params.append(min_score)

        if max_price is not None:
            query += " AND current_price <= ?"
            params.append(max_price)

        if status:
            query += " AND status = ?"
            params.append(status)

        query += " ORDER BY deal_score DESC, date_found DESC"

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return self._rows_to_dicts(cursor.fetchall())

    def get_deal_stats(self) -> Dict[str, Any]:
        """
        Get eBay deals statistics.

        Returns:
            Dictionary with deal stats
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()

            stats = {}

            # Total deals
            cursor.execute("SELECT COUNT(*) as count FROM ebay_deals")
            stats['total_deals'] = cursor.fetchone()['count']

            # By status
            cursor.execute("SELECT status, COUNT(*) as count FROM ebay_deals GROUP BY status")
            stats['by_status'] = {row['status']: row['count'] for row in cursor.fetchall()}

            # New deals with high scores
            cursor.execute("SELECT COUNT(*) as count FROM ebay_deals WHERE status = 'new' AND deal_score >= 70")
            stats['hot_deals'] = cursor.fetchone()['count']

            # Average deal score
            cursor.execute("SELECT AVG(deal_score) as avg FROM ebay_deals WHERE status = 'new'")
            avg_row = cursor.fetchone()
            stats['avg_deal_score'] = round(avg_row['avg'], 2) if avg_row['avg'] else 0

            # Total potential savings
            cursor.execute("""
                SELECT SUM(market_value - current_price) as savings
                FROM ebay_deals
                WHERE status = 'new' AND market_value IS NOT NULL AND current_price IS NOT NULL
            """)
            savings_row = cursor.fetchone()
            stats['potential_savings'] = round(savings_row['savings'], 2) if savings_row['savings'] else 0

            # Recent activity (last 7 days)
            from datetime import timedelta
            cutoff = (datetime.now() - timedelta(days=7)).isoformat()
            cursor.execute("SELECT COUNT(*) as count FROM ebay_deals WHERE date_found >= ?", (cutoff,))
            stats['deals_last_7_days'] = cursor.fetchone()['count']

            return stats

    # ==================== UTILITY FUNCTIONS ====================

    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            stats = {}

            # Athletes
            cursor.execute("SELECT COUNT(*) as count FROM athletes")
            stats['total_athletes'] = cursor.fetchone()['count']

            cursor.execute("SELECT COUNT(DISTINCT sport) as count FROM athletes")
            stats['total_sports'] = cursor.fetchone()['count']

            # Content
            cursor.execute("SELECT COUNT(*) as count FROM content_ideas")
            stats['total_content'] = cursor.fetchone()['count']

            cursor.execute("SELECT COUNT(*) as count FROM content_ideas WHERE status = 'draft'")
            stats['draft_content'] = cursor.fetchone()['count']

            cursor.execute("SELECT COUNT(*) as count FROM content_ideas WHERE status = 'published'")
            stats['published_content'] = cursor.fetchone()['count']

            # Research
            cursor.execute("SELECT COUNT(*) as count FROM research_findings")
            stats['total_research'] = cursor.fetchone()['count']

            # Tasks
            cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'")
            stats['pending_tasks'] = cursor.fetchone()['count']

            cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'")
            stats['completed_tasks'] = cursor.fetchone()['count']

            # eBay Deals
            cursor.execute("SELECT COUNT(*) as count FROM ebay_deals")
            stats['total_ebay_deals'] = cursor.fetchone()['count']

            cursor.execute("SELECT COUNT(*) as count FROM ebay_deals WHERE status = 'new'")
            stats['new_ebay_deals'] = cursor.fetchone()['count']

            cursor.execute("SELECT COUNT(*) as count FROM ebay_deals WHERE status = 'purchased'")
            stats['purchased_deals'] = cursor.fetchone()['count']

            return stats


# Convenience functions for direct use
def get_db() -> JettDB:
    """Get database instance."""
    return JettDB()


if __name__ == "__main__":
    # Quick test
    db = get_db()
    print("Database Stats:")
    print(json.dumps(db.get_stats(), indent=2))
