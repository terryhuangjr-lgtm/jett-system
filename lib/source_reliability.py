"""
Source Reliability Tracker
Maintains quality scores for sources and auto-weights verification
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional

HOME = Path.home()
MEMORY_DIR = HOME / 'clawd' / 'memory'
SOURCE_RELIABILITY_FILE = MEMORY_DIR / 'source-reliability.json'

# Default source reliability scores (0-10)
DEFAULT_SOURCES = {
    # Sports sources
    'spotrac.com': {'score': 10, 'category': 'sports', 'notes': 'Official contract database, always accurate'},
    'basketball-reference.com': {'score': 10, 'category': 'sports', 'notes': 'Official stats, verified data'},
    'pro-football-reference.com': {'score': 10, 'category': 'sports', 'notes': 'Official stats, verified data'},
    'baseball-reference.com': {'score': 10, 'category': 'sports', 'notes': 'Official stats, verified data'},
    'espn.com': {'score': 9, 'category': 'sports', 'notes': 'Very reliable, occasionally speculative on rumors'},
    'theathletic.com': {'score': 9, 'category': 'sports', 'notes': 'Premium journalism, well-sourced'},
    'bleacherreport.com': {'score': 6, 'category': 'sports', 'notes': 'Mixed quality, verify critical claims'},

    # Bitcoin sources
    'bitcoin.org': {'score': 10, 'category': 'bitcoin', 'notes': 'Official Bitcoin site'},
    'github.com/bitcoinbook': {'score': 10, 'category': 'bitcoin', 'notes': 'Mastering Bitcoin - Andreas Antonopoulos'},
    'saifedean.com': {'score': 10, 'category': 'bitcoin', 'notes': 'The Bitcoin Standard author'},
    'en.bitcoin.it': {'score': 9, 'category': 'bitcoin', 'notes': 'Bitcoin Wiki - community maintained'},
    'coindesk.com': {'score': 8, 'category': 'bitcoin', 'notes': 'Major crypto news, generally reliable'},
    'cointelegraph.com': {'score': 7, 'category': 'bitcoin', 'notes': 'Crypto news, sometimes clickbait'},

    # Financial sources
    'api.coingecko.com': {'score': 10, 'category': 'finance', 'notes': 'Official CoinGecko API for prices'},
    'bloomberg.com': {'score': 9, 'category': 'finance', 'notes': 'Premium financial journalism'},
    'investopedia.com': {'score': 8, 'category': 'finance', 'notes': 'Educational, good for definitions'},

    # General news
    'bbc.com': {'score': 9, 'category': 'news', 'notes': 'High editorial standards'},
    'reuters.com': {'score': 9, 'category': 'news', 'notes': 'Wire service, factual reporting'},
    'nytimes.com': {'score': 8, 'category': 'news', 'notes': 'Established journalism'},

    # Social/community
    'twitter.com': {'score': 5, 'category': 'social', 'notes': 'Verify all claims, user-generated content'},
    'reddit.com': {'score': 4, 'category': 'social', 'notes': 'Community discussions, verify everything'},
}


class SourceReliabilityTracker:
    """Track and score source reliability"""

    def __init__(self):
        self.sources = self._load_sources()

    def _load_sources(self) -> Dict:
        """Load source reliability scores from file"""
        if SOURCE_RELIABILITY_FILE.exists():
            with open(SOURCE_RELIABILITY_FILE, 'r') as f:
                return json.load(f)
        else:
            # Initialize with defaults
            self._save_sources(DEFAULT_SOURCES)
            return DEFAULT_SOURCES.copy()

    def _save_sources(self, sources: Dict):
        """Save source reliability scores to file"""
        MEMORY_DIR.mkdir(parents=True, exist_ok=True)
        with open(SOURCE_RELIABILITY_FILE, 'w') as f:
            json.dump(sources, f, indent=2)

    def get_domain(self, url: str) -> str:
        """Extract domain from URL"""
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc.replace('www.', '')
        return domain

    def get_source_score(self, url: str) -> Dict:
        """
        Get reliability score for a source URL

        Returns:
            Dict with score (0-10), category, notes, verification_level
        """
        domain = self.get_domain(url)

        # Check if we have this domain
        if domain in self.sources:
            source_data = self.sources[domain].copy()
            score = source_data['score']
        else:
            # Unknown source - default to low score
            score = 3
            source_data = {
                'score': score,
                'category': 'unknown',
                'notes': 'Unknown source - requires verification'
            }

        # Determine verification level based on score
        if score >= 9:
            verification_level = 'low'  # Trust, minimal verification needed
        elif score >= 7:
            verification_level = 'medium'  # Verify key claims
        else:
            verification_level = 'high'  # Verify everything, need secondary source

        source_data['verification_level'] = verification_level
        source_data['url'] = url
        source_data['domain'] = domain

        return source_data

    def should_verify_multiple_sources(self, url: str) -> bool:
        """Check if this source requires multiple source verification"""
        score_data = self.get_source_score(url)
        return score_data['score'] < 7

    def add_or_update_source(self, url: str, score: int, category: str, notes: str):
        """Add or update a source's reliability score"""
        domain = self.get_domain(url)
        self.sources[domain] = {
            'score': max(0, min(10, score)),  # Clamp to 0-10
            'category': category,
            'notes': notes,
            'last_updated': datetime.now().isoformat()
        }
        self._save_sources(self.sources)

    def report_source_failure(self, url: str, failure_type: str):
        """
        Report a source failure (wrong info, inaccessible, etc.)
        Decreases reliability score
        """
        domain = self.get_domain(url)
        if domain in self.sources:
            current_score = self.sources[domain]['score']
            new_score = max(0, current_score - 1)
            self.sources[domain]['score'] = new_score
            self.sources[domain]['notes'] += f" | Failure: {failure_type} on {datetime.now().date()}"
            self._save_sources(self.sources)
            print(f"⚠️  Source reliability decreased: {domain} ({current_score} → {new_score})")

    def report_source_success(self, url: str):
        """
        Report a source success (info verified correct)
        Increases reliability score for unknown sources
        """
        domain = self.get_domain(url)
        if domain in self.sources:
            current_score = self.sources[domain]['score']
            if current_score < 8:  # Only increase if not already highly rated
                new_score = min(10, current_score + 0.5)
                self.sources[domain]['score'] = new_score
                self._save_sources(self.sources)

    def get_all_sources_by_category(self, category: str) -> Dict:
        """Get all sources in a category, sorted by score"""
        category_sources = {
            domain: data for domain, data in self.sources.items()
            if data.get('category') == category
        }
        return dict(sorted(category_sources.items(),
                          key=lambda x: x[1]['score'],
                          reverse=True))

    def get_stats(self) -> Dict:
        """Get source reliability statistics"""
        categories = {}
        for domain, data in self.sources.items():
            cat = data.get('category', 'unknown')
            if cat not in categories:
                categories[cat] = {'count': 0, 'avg_score': 0, 'sources': []}
            categories[cat]['count'] += 1
            categories[cat]['sources'].append(data['score'])

        for cat, cat_data in categories.items():
            cat_data['avg_score'] = sum(cat_data['sources']) / len(cat_data['sources'])
            del cat_data['sources']  # Don't need the list anymore

        return {
            'total_sources': len(self.sources),
            'by_category': categories,
            'high_reliability_count': sum(1 for s in self.sources.values() if s['score'] >= 9),
            'low_reliability_count': sum(1 for s in self.sources.values() if s['score'] < 5),
        }


# Example usage
if __name__ == "__main__":
    tracker = SourceReliabilityTracker()

    print("\n=== Source Reliability Tracker ===\n")

    # Test some URLs
    test_urls = [
        'https://www.spotrac.com/mlb/contracts/',
        'https://twitter.com/some-random-user/status/123',
        'https://api.coingecko.com/api/v3/simple/price',
        'https://unknown-blog.com/article'
    ]

    for url in test_urls:
        score_data = tracker.get_source_score(url)
        print(f"URL: {url}")
        print(f"Domain: {score_data['domain']}")
        print(f"Score: {score_data['score']}/10")
        print(f"Verification: {score_data['verification_level'].upper()}")
        print(f"Notes: {score_data['notes']}")
        print(f"Requires multiple sources: {tracker.should_verify_multiple_sources(url)}")
        print()

    # Show stats
    stats = tracker.get_stats()
    print(f"Total sources tracked: {stats['total_sources']}")
    print(f"High reliability (9-10): {stats['high_reliability_count']}")
    print(f"Low reliability (<5): {stats['low_reliability_count']}")
    print()

    print("By category:")
    for cat, data in stats['by_category'].items():
        print(f"  {cat}: {data['count']} sources, avg score {data['avg_score']:.1f}")
