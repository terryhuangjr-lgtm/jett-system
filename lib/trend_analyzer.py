"""
Trend Analyzer - Track patterns over time
Analyzes research findings to identify trends
"""

import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import sys

# Add parent directory to path for jett_db import
sys.path.insert(0, str(Path(__file__).parent.parent))
from jett_db import get_db

HOME = Path.home()
MEMORY_DIR = HOME / 'clawd' / 'memory' / 'research'
TRENDS_FILE = MEMORY_DIR / 'trends-analysis.md'


class TrendAnalyzer:
    """Analyze trends in research data over time"""

    def __init__(self):
        self.db = get_db()

    def analyze_contract_trends(self, days_back: int = 30) -> Dict:
        """
        Analyze sports contract trends over time

        Returns trends in:
        - Average contract size (USD and BTC)
        - BTC equivalent trends
        - Sport-specific patterns
        """
        # Get all sports research
        all_sports = self.db.search_research(category='sports')

        # Filter by date
        cutoff = (datetime.now() - timedelta(days=days_back)).isoformat()
        recent = [r for r in all_sports if r['created_date'] >= cutoff]

        if not recent:
            return {'error': 'No recent sports research found'}

        # Extract contract data
        contracts = []
        for research in recent:
            # Parse findings for contract value and BTC
            findings = research['findings']

            # Try to extract contract value (formats: "$765M", "$700M", etc.)
            import re
            value_match = re.search(r'\$(\d+(?:,\d+)*(?:\.\d+)?)\s*(M|million|B|billion)', findings, re.IGNORECASE)
            btc_match = re.search(r'(\d+(?:,\d+)*(?:\.\d+)?)\s*BTC', findings)

            if value_match and btc_match:
                value_str = value_match.group(1).replace(',', '')
                value = float(value_str)
                unit = value_match.group(2).lower()

                if unit in ['m', 'million']:
                    value *= 1_000_000
                elif unit in ['b', 'billion']:
                    value *= 1_000_000_000

                btc_str = btc_match.group(1).replace(',', '')
                btc = float(btc_str)

                # Tags might be list or string
                tags = research.get('tags', [])
                if isinstance(tags, str):
                    tags = tags.split(',') if tags else []

                contracts.append({
                    'topic': research['topic'],
                    'value_usd': value,
                    'btc_equivalent': btc,
                    'date': research['created_date'][:10],
                    'tags': tags
                })

        if not contracts:
            return {'error': 'No contract data found in research'}

        # Calculate trends
        total_contracts = len(contracts)
        avg_value_usd = sum(c['value_usd'] for c in contracts) / total_contracts
        avg_btc = sum(c['btc_equivalent'] for c in contracts) / total_contracts

        # Find largest/smallest
        largest = max(contracts, key=lambda c: c['value_usd'])
        smallest = min(contracts, key=lambda c: c['value_usd'])

        # Sport breakdown
        sport_breakdown = {}
        for contract in contracts:
            tags = contract['tags']
            sport = next((t for t in tags if t in ['mlb', 'nba', 'nfl', 'nhl']), 'unknown')

            if sport not in sport_breakdown:
                sport_breakdown[sport] = {'count': 0, 'total_usd': 0, 'total_btc': 0}

            sport_breakdown[sport]['count'] += 1
            sport_breakdown[sport]['total_usd'] += contract['value_usd']
            sport_breakdown[sport]['total_btc'] += contract['btc_equivalent']

        # Calculate averages per sport
        for sport, data in sport_breakdown.items():
            data['avg_usd'] = data['total_usd'] / data['count']
            data['avg_btc'] = data['total_btc'] / data['count']

        return {
            'period_days': days_back,
            'total_contracts': total_contracts,
            'avg_value_usd': avg_value_usd,
            'avg_btc_equivalent': avg_btc,
            'largest_contract': {
                'topic': largest['topic'],
                'value_usd': largest['value_usd'],
                'btc': largest['btc_equivalent']
            },
            'smallest_contract': {
                'topic': smallest['topic'],
                'value_usd': smallest['value_usd'],
                'btc': smallest['btc_equivalent']
            },
            'by_sport': sport_breakdown
        }

    def analyze_bitcoin_topics(self, days_back: int = 30) -> Dict:
        """
        Analyze Bitcoin research topics over time

        Returns trends in:
        - Most researched topics
        - Quote sources
        - Historical events covered
        """
        # Get all bitcoin research
        all_bitcoin = self.db.search_research(category='bitcoin')

        # Filter by date
        cutoff = (datetime.now() - timedelta(days=days_back)).isoformat()
        recent = [r for r in all_bitcoin if r['created_date'] >= cutoff]

        if not recent:
            return {'error': 'No recent bitcoin research found'}

        # Categorize by type (quote vs history)
        quotes = []
        history = []

        for research in recent:
            # Tags might be list or string
            tags = research.get('tags', [])
            if isinstance(tags, str):
                tags = tags.split(',') if tags else []

            if 'quotes' in tags:
                quotes.append(research)
            elif 'history' in tags:
                history.append(research)

        # Extract authors from quotes
        authors = {}
        for quote in quotes:
            topic = quote['topic']
            # Extract author from "Bitcoin Quote - Author Name"
            if ' - ' in topic:
                author = topic.split(' - ')[1]
                authors[author] = authors.get(author, 0) + 1

        # Extract historical events
        events = {}
        for hist in history:
            topic = hist['topic']
            # Extract event from "Bitcoin History - Event Name"
            if ' - ' in topic:
                event = topic.split(' - ')[1]
                events[event] = events.get(event, 0) + 1

        return {
            'period_days': days_back,
            'total_bitcoin_research': len(recent),
            'quotes_count': len(quotes),
            'history_count': len(history),
            'top_authors': dict(sorted(authors.items(), key=lambda x: x[1], reverse=True)[:5]),
            'top_events': dict(sorted(events.items(), key=lambda x: x[1], reverse=True)[:5])
        }

    def generate_trends_report(self) -> str:
        """Generate comprehensive trends analysis markdown report"""

        # Analyze both categories
        sports_trends = self.analyze_contract_trends(days_back=30)
        bitcoin_trends = self.analyze_bitcoin_topics(days_back=30)

        report = f"""# Research Trends Analysis

**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}
**Period:** Last 30 days

---

## Sports Contract Trends

"""

        if 'error' not in sports_trends:
            report += f"""
### Overview
- **Total Contracts Researched:** {sports_trends['total_contracts']}
- **Average Value:** ${sports_trends['avg_value_usd']/1e6:.1f}M
- **Average BTC Equivalent:** {sports_trends['avg_btc_equivalent']:,.0f} BTC

### Largest Contract
- **{sports_trends['largest_contract']['topic']}**
- Value: ${sports_trends['largest_contract']['value_usd']/1e6:.0f}M
- BTC: {sports_trends['largest_contract']['btc']:,.0f} BTC

### By Sport
"""
            for sport, data in sports_trends['by_sport'].items():
                report += f"""
**{sport.upper()}**
- Contracts: {data['count']}
- Avg Value: ${data['avg_usd']/1e6:.1f}M
- Avg BTC: {data['avg_btc']:,.0f} BTC
"""
        else:
            report += f"\n*{sports_trends['error']}*\n"

        report += f"""
---

## Bitcoin Research Trends

"""

        if 'error' not in bitcoin_trends:
            report += f"""
### Overview
- **Total Bitcoin Research:** {bitcoin_trends['total_bitcoin_research']}
- **Quotes:** {bitcoin_trends['quotes_count']}
- **Historical Events:** {bitcoin_trends['history_count']}

### Most Quoted Authors
"""
            for author, count in bitcoin_trends['top_authors'].items():
                report += f"- {author}: {count} quotes\n"

            report += "\n### Most Researched Events\n"
            for event, count in bitcoin_trends['top_events'].items():
                report += f"- {event}: {count} times\n"
        else:
            report += f"\n*{bitcoin_trends['error']}*\n"

        report += f"""
---

## Insights & Recommendations

### Content Opportunities
- Focus on sports with highest contract values (bigger numbers = more engagement)
- Use most quoted authors (community trusts these sources)
- Anniversary content for historical events

### Research Gaps
- Look for underrepresented sports
- Find new Bitcoin thought leaders
- Research recent Bitcoin milestones not yet covered

### Timing Recommendations
- Big contracts: Post within 24 hours
- Historical anniversaries: Plan 1 week ahead
- Educational content: Use during slow news cycles

---

*This analysis updates automatically as new research is added to the database.*
"""

        # Save report
        MEMORY_DIR.mkdir(parents=True, exist_ok=True)
        with open(TRENDS_FILE, 'w') as f:
            f.write(report)

        return str(TRENDS_FILE)


# Example usage
if __name__ == "__main__":
    analyzer = TrendAnalyzer()

    print("\n=== Trend Analysis ===\n")

    # Generate full report
    report_path = analyzer.generate_trends_report()
    print(f"✓ Trends report generated: {report_path}")

    # Show quick stats
    sports = analyzer.analyze_contract_trends(days_back=30)
    if 'error' not in sports:
        print(f"\nSports Contracts (30 days):")
        print(f"  Total: {sports['total_contracts']}")
        print(f"  Avg Value: ${sports['avg_value_usd']/1e6:.1f}M")
        print(f"  Avg BTC: {sports['avg_btc_equivalent']:,.0f} BTC")

    bitcoin = analyzer.analyze_bitcoin_topics(days_back=30)
    if 'error' not in bitcoin:
        print(f"\nBitcoin Research (30 days):")
        print(f"  Total: {bitcoin['total_bitcoin_research']}")
        print(f"  Quotes: {bitcoin['quotes_count']}")
        print(f"  History: {bitcoin['history_count']}")
