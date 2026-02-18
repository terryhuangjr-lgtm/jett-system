"""
Usage Tracker - Track LLM usage and cost savings
Stores usage stats in SQLite for monitoring and reporting
"""

import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json
from contextlib import contextmanager
import os


DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'jett_knowledge.db')


class UsageTracker:
    """Track LLM usage, costs, and savings."""

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._ensure_table_exists()

    @contextmanager
    def _get_connection(self):
        """Get database connection."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def _ensure_table_exists(self):
        """Create usage_stats table if it doesn't exist."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS usage_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP NOT NULL,
                    provider TEXT NOT NULL,
                    model TEXT,
                    prompt TEXT,
                    response_preview TEXT,
                    routing_reason TEXT,
                    complexity_score REAL,
                    tokens INTEGER,
                    time_ms REAL,
                    cost_usd REAL,
                    savings_usd REAL,
                    success INTEGER DEFAULT 1
                )
            """)

            # Create indexes
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_usage_timestamp
                ON usage_stats(timestamp)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_usage_provider
                ON usage_stats(provider)
            """)

    def log_usage(self, provider: str, prompt: str, result: Dict):
        """
        Log an LLM usage event.

        Args:
            provider: 'ollama' or 'claude'
            prompt: User prompt
            result: Result dictionary from LLM router
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Truncate prompt and response for storage
            prompt_preview = prompt[:500] if prompt else None
            response_preview = result.get('response', '')[:500] if result.get('response') else None

            cursor.execute("""
                INSERT INTO usage_stats (
                    timestamp, provider, model, prompt, response_preview,
                    routing_reason, complexity_score, tokens, time_ms,
                    cost_usd, savings_usd, success
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                datetime.now().isoformat(),
                provider,
                result.get('model'),
                prompt_preview,
                response_preview,
                result.get('routing_reason'),
                result.get('complexity_score'),
                result.get('tokens'),
                result.get('time_ms'),
                result.get('cost_usd', 0.0),
                result.get('savings_usd', 0.0),
                1 if result.get('success') else 0
            ))

    def get_stats(
        self,
        days: int = 1,
        provider: Optional[str] = None
    ) -> Dict:
        """
        Get usage statistics for a time period.

        Args:
            days: Number of days to look back (default: 1 = today)
            provider: Filter by provider ('ollama' or 'claude')

        Returns:
            Dict with usage statistics
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Calculate date threshold
            start_date = (datetime.now() - timedelta(days=days)).isoformat()

            # Build query
            query = """
                SELECT
                    provider,
                    COUNT(*) as count,
                    SUM(tokens) as total_tokens,
                    SUM(cost_usd) as total_cost,
                    SUM(savings_usd) as total_savings,
                    AVG(time_ms) as avg_time_ms,
                    AVG(complexity_score) as avg_complexity
                FROM usage_stats
                WHERE timestamp >= ?
            """
            params = [start_date]

            if provider:
                query += " AND provider = ?"
                params.append(provider)

            query += " GROUP BY provider"

            cursor.execute(query, params)
            rows = cursor.fetchall()

            # Parse results
            stats = {
                'period_days': days,
                'start_date': start_date,
                'end_date': datetime.now().isoformat(),
                'providers': {}
            }

            total_count = 0
            total_cost = 0.0
            total_savings = 0.0

            for row in rows:
                provider_stats = {
                    'count': row['count'],
                    'total_tokens': row['total_tokens'] or 0,
                    'total_cost': row['total_cost'] or 0.0,
                    'total_savings': row['total_savings'] or 0.0,
                    'avg_time_ms': row['avg_time_ms'] or 0.0,
                    'avg_complexity': row['avg_complexity'] or 0.0
                }
                stats['providers'][row['provider']] = provider_stats

                total_count += row['count']
                total_cost += (row['total_cost'] or 0.0)
                total_savings += (row['total_savings'] or 0.0)

            # Calculate aggregates
            stats['total_requests'] = total_count
            stats['total_cost'] = total_cost
            stats['total_savings'] = total_savings
            stats['cost_avoided'] = total_cost + total_savings
            stats['savings_percentage'] = (
                (total_savings / (total_cost + total_savings) * 100)
                if (total_cost + total_savings) > 0 else 0
            )

            # Local vs API breakdown
            local_count = stats['providers'].get('ollama', {}).get('count', 0)
            api_count = stats['providers'].get('claude', {}).get('count', 0)
            stats['local_percentage'] = (
                (local_count / total_count * 100) if total_count > 0 else 0
            )

            return stats

    def get_recent_usage(self, limit: int = 20) -> List[Dict]:
        """Get recent usage entries."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM usage_stats
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))

            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_daily_summary(self, days: int = 7) -> List[Dict]:
        """Get daily summary for the past N days."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            start_date = (datetime.now() - timedelta(days=days)).isoformat()

            cursor.execute("""
                SELECT
                    DATE(timestamp) as date,
                    provider,
                    COUNT(*) as count,
                    SUM(cost_usd) as cost,
                    SUM(savings_usd) as savings
                FROM usage_stats
                WHERE timestamp >= ?
                GROUP BY DATE(timestamp), provider
                ORDER BY date DESC
            """, (start_date,))

            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_routing_accuracy(self, days: int = 7) -> Dict:
        """Analyze routing accuracy and decisions."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            start_date = (datetime.now() - timedelta(days=days)).isoformat()

            # Get routing reasons distribution
            cursor.execute("""
                SELECT
                    routing_reason,
                    provider,
                    COUNT(*) as count,
                    AVG(complexity_score) as avg_complexity
                FROM usage_stats
                WHERE timestamp >= ?
                GROUP BY routing_reason, provider
                ORDER BY count DESC
            """, (start_date,))

            rows = cursor.fetchall()

            routing_analysis = {
                'period_days': days,
                'routing_decisions': [dict(row) for row in rows]
            }

            return routing_analysis

    def clear_old_data(self, days: int = 90):
        """Clear usage data older than N days."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()

            cursor.execute("""
                DELETE FROM usage_stats
                WHERE timestamp < ?
            """, (cutoff_date,))

            deleted_count = cursor.rowcount

            return {
                'deleted_count': deleted_count,
                'cutoff_date': cutoff_date
            }


def format_cost(cost_usd: float) -> str:
    """Format cost for display."""
    if cost_usd < 0.01:
        return f"${cost_usd * 100:.3f}¢"
    else:
        return f"${cost_usd:.4f}"


def print_stats_summary(stats: Dict):
    """Print formatted statistics summary."""
    print("\n" + "="*60)
    print(f"USAGE STATISTICS - Last {stats['period_days']} day(s)")
    print("="*60)
    print()

    print(f"Total Requests: {stats['total_requests']}")
    print(f"Total Cost: {format_cost(stats['total_cost'])}")
    print(f"Total Savings: {format_cost(stats['total_savings'])}")
    print(f"Cost Avoided: {format_cost(stats['cost_avoided'])}")
    print(f"Savings Rate: {stats['savings_percentage']:.1f}%")
    print(f"Local Usage: {stats['local_percentage']:.1f}%")
    print()

    if stats['providers']:
        print("-"*60)
        print("BREAKDOWN BY PROVIDER:")
        print("-"*60)

        for provider, pstats in stats['providers'].items():
            print(f"\n{provider.upper()}:")
            print(f"  Requests: {pstats['count']}")
            print(f"  Tokens: {pstats['total_tokens']:,}")
            print(f"  Cost: {format_cost(pstats['total_cost'])}")
            print(f"  Savings: {format_cost(pstats['total_savings'])}")
            print(f"  Avg Time: {pstats['avg_time_ms']:.0f}ms")
            print(f"  Avg Complexity: {pstats['avg_complexity']:.2f}")

    print("\n" + "="*60)


if __name__ == "__main__":
    # Test usage tracker
    tracker = UsageTracker()

    print("Testing Usage Tracker...")

    # Get stats
    stats = tracker.get_stats(days=7)
    print_stats_summary(stats)

    # Get recent usage
    print("\nRecent Usage (last 5):")
    recent = tracker.get_recent_usage(limit=5)
    for entry in recent:
        print(f"  {entry['timestamp'][:19]} - {entry['provider']} - {entry['prompt'][:50]}...")
