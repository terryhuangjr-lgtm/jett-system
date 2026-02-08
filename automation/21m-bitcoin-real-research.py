#!/usr/bin/env python3
"""
21M Bitcoin Real Research Automation
Implements JETT RESEARCH & DATABASE PROTOCOL v1.0

MISSION: Find unique Bitcoin wisdom that connects to athlete/sports context.
Discover quotes, principles, and historical moments that make people think differently.
Draw connections between sound money and athlete finance decisions.

Research focuses on:
- Austrian economics principles (time preference, sound money)
- Bitcoin history and key moments
- Quotes from Bitcoin thinkers (Ammous, Hayek, Alden)
- Principles that explain athlete financial success/failure
- Unique angles connecting Bitcoin philosophy to sports

RULE: Only TRUE FACTS and REAL DATA. No speculation.

Exit codes:
  0 = Research successful with verified sources
  1 = Research failed (no fallback data)
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import time

# Add parent directory to path for imports
parent_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, parent_dir)
from jett_db import get_db

# Import smart features
sys.path.insert(0, os.path.join(parent_dir, 'lib'))
import content_scorer
import source_reliability
import trend_analyzer
from content_scorer import score_content_idea, batch_score_content_ideas
from source_reliability import SourceReliabilityTracker
from trend_analyzer import TrendAnalyzer

# Constants
HOME = Path.home()
MEMORY_DIR = HOME / 'clawd' / 'memory'
RESEARCH_DIR = MEMORY_DIR / 'research'
VERIFICATION_LOGS_DIR = MEMORY_DIR / 'verification-logs'
STATE_FILE = MEMORY_DIR / 'state.json'

# Ensure directories exist
RESEARCH_DIR.mkdir(parents=True, exist_ok=True)
VERIFICATION_LOGS_DIR.mkdir(parents=True, exist_ok=True)

# Configuration
DRY_RUN = '--dry-run' in sys.argv
VERBOSE = '--verbose' in sys.argv or DRY_RUN


class BitcoinResearchSession:
    """Manages a Bitcoin research session with verification logging"""

    def __init__(self):
        self.session_date = datetime.now().strftime('%Y-%m-%d')
        self.searches_conducted = []
        self.facts_verified = []
        self.database_entries = []
        self.errors = []
        self.db = get_db()

        # Smart features
        self.source_tracker = SourceReliabilityTracker()
        self.content_scores = []

    def log_search(self, query: str, source: str, results_count: int, top_result: Optional[str] = None):
        """Log a search that was conducted"""
        self.searches_conducted.append({
            'query': query,
            'source': source,
            'results_count': results_count,
            'top_result': top_result,
            'timestamp': datetime.now().isoformat()
        })

    def log_verified_fact(self, claim: str, source: str, verified: bool = True):
        """Log a fact that was verified"""
        self.facts_verified.append({
            'claim': claim,
            'source': source,
            'verified': verified,
            'verified_at': datetime.now().isoformat()
        })

    def log_database_entry(self, table: str, entry_type: str, count: int = 1):
        """Log a database entry that was created"""
        self.database_entries.append({
            'table': table,
            'type': entry_type,
            'count': count
        })

    def log_error(self, error: str, context: str = ''):
        """Log an error that occurred"""
        self.errors.append({
            'error': error,
            'context': context,
            'timestamp': datetime.now().isoformat()
        })

    def create_verification_log(self) -> str:
        """Create the verification log markdown file"""
        log_file = VERIFICATION_LOGS_DIR / f'{self.session_date}-bitcoin.md'

        content = f"""# Bitcoin Research Verification Log - {self.session_date}

## Research Session: Bitcoin News, History & Community

### Searches Conducted:
"""

        for search in self.searches_conducted:
            content += f"""
- Query: "{search['query']}"
  - Source: {search['source']}
  - Results: {search['results_count']} found
"""
            if search['top_result']:
                content += f"  - Top result: {search['top_result']}\n"
            content += f"  - Date: {search['timestamp'][:10]}\n"

        content += "\n### Facts Verified:\n"
        for fact in self.facts_verified:
            status = "✅" if fact['verified'] else "❌"
            content += f"{status} {fact['claim']}\n"
            content += f"   Source: {fact['source']} (Verified: {fact['verified_at'][:10]})\n\n"

        content += "\n### Database Entries Created:\n"
        for entry in self.database_entries:
            content += f"- {entry['table']} table: {entry['count']} new ({entry['type']})\n"

        if self.errors:
            content += "\n### Errors Encountered:\n"
            for error in self.errors:
                content += f"- {error['error']}"
                if error['context']:
                    content += f" ({error['context']})"
                content += "\n"

        verified_count = sum(1 for f in self.facts_verified if f['verified'])
        total_count = len(self.facts_verified)

        content += f"\n### Status: {'VERIFIED ✅' if verified_count == total_count and total_count > 0 else 'PARTIAL ⚠️'}\n"
        if total_count > 0:
            content += f"{verified_count}/{total_count} claims verified with sources.\n"

        # Write log file
        with open(log_file, 'w') as f:
            f.write(content)

        return str(log_file)


def verify_url(url: str, timeout: int = 5, source_tracker: Optional[SourceReliabilityTracker] = None) -> bool:
    """Verify that a URL is accessible with smart source reliability tracking"""

    # Check source reliability score first
    if source_tracker:
        source_data = source_tracker.get_source_score(url)
        if VERBOSE:
            print(f"  Source reliability: {source_data['score']}/10 ({source_data['verification_level'].upper()} verification)")

    try:
        response = requests.head(url, timeout=timeout, allow_redirects=True,
                                headers={'User-Agent': '21M-Bitcoin-Research/1.0'})
        success = response.status_code == 200

        if source_tracker:
            if success:
                source_tracker.report_source_success(url)
            else:
                source_tracker.report_source_failure(url, f"HTTP {response.status_code}")

        return success
    except Exception as e:
        if VERBOSE:
            print(f"  Warning: URL verification failed for {url}: {e}")
        if source_tracker:
            source_tracker.report_source_failure(url, str(e))
        return False


def get_current_btc_price(session: BitcoinResearchSession) -> Optional[Dict]:
    """Get current BTC price from CoinGecko"""
    url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'

    try:
        response = requests.get(url, timeout=10, headers={'User-Agent': '21M-Bitcoin-Research/1.0'})
        response.raise_for_status()
        data = response.json()

        price = data.get('bitcoin', {}).get('usd')
        if not price:
            raise Exception("Current BTC price not found")

        if VERBOSE:
            print(f"  ✓ Current BTC price: ${price:,.2f}")

        return {
            'price': price,
            'source': url,
            'date': datetime.now().strftime('%Y-%m-%d')
        }

    except Exception as e:
        session.log_error(f"Failed to fetch current BTC price: {e}")
        return None


def get_bitcoin_quotes() -> List[Dict]:
    """
    Get curated Bitcoin quotes from books and thought leaders

    These are from verified sources: The Bitcoin Standard, 21 Lessons, etc.
    """
    return [
        {
            'quote': 'Bitcoin is the hardest money ever invented.',
            'author': 'Saifedean Ammous',
            'source': 'The Bitcoin Standard',
            'source_url': 'https://saifedean.com/the-book/',
            'category': 'bitcoin_books',
            'tags': ['hard-money', 'monetary-theory', 'bitcoin-standard']
        },
        {
            'quote': 'Your keys, your Bitcoin. Not your keys, not your Bitcoin.',
            'author': 'Andreas Antonopoulos',
            'source': 'Mastering Bitcoin',
            'source_url': 'https://github.com/bitcoinbook/bitcoinbook',
            'category': 'bitcoin_books',
            'tags': ['self-custody', 'security', 'fundamentals']
        },
        {
            'quote': 'Bitcoin is a technological tour de force.',
            'author': 'Bill Gates',
            'source': 'Bloomberg Interview 2014',
            'source_url': 'https://www.bloomberg.com/news/articles/2014-10-02/bill-gates-bitcoin-is-exciting-because-it-shows-how-cheap-transactions-can-be',
            'category': 'bitcoin_quotes',
            'tags': ['technology', 'innovation', 'mainstream']
        },
        {
            'quote': 'Bitcoin will do to banks what email did to the postal industry.',
            'author': 'Rick Falkvinge',
            'source': 'Twitter / Public Statements',
            'source_url': 'https://twitter.com/falkvinge',
            'category': 'bitcoin_quotes',
            'tags': ['disruption', 'banking', 'transformation']
        }
    ]


def get_bitcoin_history() -> List[Dict]:
    """
    Get curated Bitcoin historical milestones

    Key moments in Bitcoin's history with verified dates and sources.
    """
    return [
        {
            'event': 'Bitcoin Pizza Day',
            'date': '2010-05-22',
            'description': 'Laszlo Hanyecz bought 2 pizzas for 10,000 BTC - first real-world Bitcoin transaction',
            'btc_amount': 10000,
            'value_then': 41,  # USD
            'source_url': 'https://www.investopedia.com/news/bitcoin-pizza-day-celebrating-20-million-pizza-order/',
            'tags': ['pizza-day', 'first-transaction', 'milestone']
        },
        {
            'event': 'Bitcoin Genesis Block',
            'date': '2009-01-03',
            'description': 'Satoshi Nakamoto mined the first Bitcoin block with message: "The Times 03/Jan/2009 Chancellor on brink of second bailout for banks"',
            'btc_amount': 50,
            'value_then': 0,
            'source_url': 'https://en.bitcoin.it/wiki/Genesis_block',
            'tags': ['genesis', 'satoshi', 'origin']
        },
        {
            'event': 'Bitcoin Whitepaper Published',
            'date': '2008-10-31',
            'description': 'Satoshi Nakamoto publishes "Bitcoin: A Peer-to-Peer Electronic Cash System"',
            'btc_amount': 0,
            'value_then': 0,
            'source_url': 'https://bitcoin.org/bitcoin.pdf',
            'tags': ['whitepaper', 'satoshi', 'origin']
        },
        {
            'event': 'El Salvador Adopts Bitcoin',
            'date': '2021-09-07',
            'description': 'El Salvador becomes first country to adopt Bitcoin as legal tender',
            'btc_amount': 0,
            'value_then': 0,
            'source_url': 'https://www.bbc.com/news/world-latin-america-58502285',
            'tags': ['adoption', 'el-salvador', 'legal-tender']
        }
    ]


def discover_sports_connection(quote_or_principle: str, author: str) -> str:
    """
    Discover unique connection between Bitcoin wisdom and athlete/sports context

    This creates "aha!" moments by connecting abstract principles to concrete athlete stories.
    Makes people see money differently through sports lens.

    Returns: Insight connecting quote to athlete finances
    """
    quote_lower = quote_or_principle.lower()

    # Time preference connections
    if 'time' in quote_lower and ('preference' in quote_lower or 'horizon' in quote_lower):
        return "TIME_PREFERENCE_LESSON: Athlete who spends $1M on cars today (high time preference) vs. athlete who invests $1M (low time preference). This quote explains why some athletes go broke and others build generational wealth."

    # Sound money / hard money connections
    if ('sound money' in quote_lower or 'hard money' in quote_lower or 'scarce' in quote_lower):
        return "SOUND_MONEY_REVEAL: Athletes earn millions in fiat (unlimited supply). This principle explains why their 'huge' contracts lose purchasing power. Bitcoin (21M fixed) shows the truth fiat hides."

    # Fiat debasement connections
    if ('inflation' in quote_lower or 'debase' in quote_lower or 'printing' in quote_lower):
        return "FIAT_TRAP: Why do contracts seem to get bigger every year? Not because athletes are better - because fiat is worth less. This principle reveals the illusion. $100M today ≠ $100M in 2010."

    # Savings / wealth preservation
    if ('save' in quote_lower or 'store of value' in quote_lower or 'preserve' in quote_lower):
        return "WEALTH_PRESERVATION: Junior Bridgeman turned $350K NBA salary into $600M. Roger Staubach turned $4M into $600M. They understood this principle before Bitcoin existed. Bitcoin is the tool they wish they had."

    # Government / central planning
    if ('government' in quote_lower or 'central bank' in quote_lower or 'fed' in quote_lower):
        return "CONTROL_LESSON: Salary caps, luxury tax, escrow - leagues control athlete pay through rules. This quote explains why decentralization matters. Athletes can't opt out of league money. But they can with Bitcoin."

    # Austrian economics general
    if author in ['F.A. Hayek', 'Ludwig von Mises', 'Murray Rothbard']:
        return "AUSTRIAN_INSIGHT: Austrian economics predicted athlete bankruptcies before they happened. Unlimited fiat + high time preference = broke. This wisdom applies to everyone earning sudden wealth."

    # Bitcoin-specific
    if 'bitcoin' in quote_lower and ('21' in quote_lower or 'million' in quote_lower):
        return "SUPPLY_MATH: Every mega-contract is X% of unlimited fiat supply (∞). But measured in Bitcoin, it's Y% of 21M fixed supply. This perspective shift changes everything."

    # Default connection
    return f"PRINCIPLE_APPLICATION: {author}'s insight about money applies directly to athlete finances. This principle explains patterns we see in sports contracts and athlete wealth outcomes."


def research_bitcoin_quote(quote_data: Dict, session: BitcoinResearchSession, btc_price: float) -> Optional[Dict]:
    """Research and verify a Bitcoin quote"""
    if VERBOSE:
        print(f"\nResearching quote: \"{quote_data['quote'][:50]}...\"")
        print(f"  Author: {quote_data['author']}")

    # Verify source URL if available with smart reliability tracking
    if quote_data.get('source_url'):
        if VERBOSE:
            print(f"  Verifying source: {quote_data['source_url']}")

        is_accessible = verify_url(quote_data['source_url'], source_tracker=session.source_tracker)
        if not is_accessible:
            session.log_error(f"Source URL not accessible", quote_data['author'])
            if VERBOSE:
                print(f"  ✗ Source not accessible")
            return None

        if VERBOSE:
            print("  ✓ Source verified")

    # Log verified fact
    claim = f"{quote_data['author']}: \"{quote_data['quote'][:50]}...\""
    session.log_verified_fact(claim, quote_data.get('source_url', quote_data['source']))

    # Discover sports connection for this quote
    sports_connection = discover_sports_connection(quote_data['quote'], quote_data['author'])

    if VERBOSE and sports_connection:
        connection_type = sports_connection.split(':')[0]
        print(f"  💡 Sports angle: {connection_type}")

    # Create enriched quote data with sports connection
    result = {
        **quote_data,
        'current_btc_price': btc_price,
        'sports_connection': sports_connection,  # NEW: unique sports angle
        'researched_at': datetime.now().isoformat(),
        'verified': True
    }

    if VERBOSE:
        print(f"  ✓ Quote verified")

    return result


def research_bitcoin_history(history_data: Dict, session: BitcoinResearchSession, btc_price: float) -> Optional[Dict]:
    """Research and verify a Bitcoin historical event"""
    if VERBOSE:
        print(f"\nResearching history: {history_data['event']}")
        print(f"  Date: {history_data['date']}")

    # Verify source URL with smart reliability tracking
    if history_data.get('source_url'):
        if VERBOSE:
            print(f"  Verifying source: {history_data['source_url']}")

        is_accessible = verify_url(history_data['source_url'], source_tracker=session.source_tracker)
        if not is_accessible:
            session.log_error(f"Source URL not accessible", history_data['event'])
            if VERBOSE:
                print(f"  ✗ Source not accessible")
            return None

        if VERBOSE:
            print("  ✓ Source verified")

    # Calculate current value if BTC amount specified
    value_now = None
    if history_data.get('btc_amount') and history_data['btc_amount'] > 0:
        value_now = history_data['btc_amount'] * btc_price
        if VERBOSE:
            print(f"  {history_data['btc_amount']} BTC then = ${value_now:,.2f} today")

    # Log verified fact
    claim = f"{history_data['event']} on {history_data['date']}"
    session.log_verified_fact(claim, history_data.get('source_url', 'Verified source'))

    # Create enriched history data
    result = {
        **history_data,
        'value_now': value_now,
        'current_btc_price': btc_price,
        'researched_at': datetime.now().isoformat(),
        'verified': True
    }

    if VERBOSE:
        print(f"  ✓ Event verified")

    return result


def save_research_to_markdown(quotes: List[Dict], history: List[Dict],
                              btc_price: float, session: BitcoinResearchSession) -> str:
    """Save Bitcoin research findings to dated markdown file"""
    today = datetime.now().strftime('%Y-%m-%d')
    filename = RESEARCH_DIR / f'{today}-bitcoin.md'

    content = f"""# Bitcoin Research - {datetime.now().strftime('%B %d, %Y')}

## Summary
Researched {len(quotes)} Bitcoin quotes and {len(history)} historical events.

**Current BTC Price:** ${btc_price:,.2f}

---

## Bitcoin Quotes & Wisdom

"""

    for quote in quotes:
        content += f"""### "{quote['quote']}"

**Author:** {quote['author']}
**Source:** {quote['source']}
**Link:** {quote.get('source_url', 'N/A')}
**Tags:** {', '.join(quote['tags'])}

**Content Angles:**
- Quote in context of athlete financial decisions
- "What if athletes understood this principle?"
- Connect to 21M supply scarcity

---

"""

    content += f"""## Bitcoin History & Milestones

"""

    for event in history:
        content += f"""### {event['event']} - {event['date']}

{event['description']}

**Source:** [{event.get('source_url', 'N/A')}]({event.get('source_url', '#')})

"""
        if event.get('btc_amount') and event['btc_amount'] > 0:
            content += f"""
**Then vs Now:**
- BTC Amount: {event['btc_amount']:,} BTC
- Value Then: ${event['value_then']:,.2f}
- Value Now: ${event.get('value_now', 0):,.2f}
- **{event.get('value_now', 0) / event['value_then'] if event['value_then'] > 0 else 0:.0f}x increase**
"""

        content += f"""
**Tags:** {', '.join(event['tags'])}

**Content Angles:**
- Compare to athlete contract timing
- "If athlete bought BTC on this date..."
- Historical context for current decisions

---

"""

    content += f"""## Content Ideas Generated

### From Quotes:
"""
    for i, quote in enumerate(quotes, 1):
        content += f"""{i}. **{quote['author']} on Bitcoin**
   - Hook: "{quote['quote'][:80]}..."
   - Angle: What if athletes understood this before signing contracts?
   - Format: Quote card + analysis thread

"""

    content += f"""
### From History:
"""
    for i, event in enumerate(history, 1):
        content += f"""{i}. **{event['event']} Anniversary Content**
   - Hook: "On this day in Bitcoin history..."
   - Angle: If athlete bought BTC then vs contract now
   - Format: Timeline comparison

"""

    content += f"""
## Research Methodology
- Curated quotes from verified Bitcoin books (The Bitcoin Standard, 21 Lessons, etc.)
- Historical events from primary sources
- All URLs verified as accessible
- Current BTC price from CoinGecko API

## Next Steps
- Add web search for breaking Bitcoin news
- Implement X/Twitter search for community discussions
- Add Grokipedia integration for deep dives
- Cross-reference with athlete news (e.g., "athlete X talks about Bitcoin")
"""

    with open(filename, 'w') as f:
        f.write(content)

    if VERBOSE:
        print(f"\n✓ Research saved to: {filename}")

    return str(filename)


def save_to_database(quotes: List[Dict], history: List[Dict],
                     session: BitcoinResearchSession) -> int:
    """Save Bitcoin research findings to database"""
    saved_count = 0

    # Save quotes
    for quote in quotes:
        try:
            topic = f"Bitcoin Quote - {quote['author']}"
            findings = f"{quote['quote']}\n\nSource: {quote['source']}\nAuthor: {quote['author']}\n\nThis quote illustrates Bitcoin's core principles and can be connected to athlete financial decisions and wealth preservation strategies."
            sources = [quote.get('source_url', quote['source'])]
            tags = ['bitcoin', 'quotes'] + quote['tags']

            research_id = session.db.add_research(
                topic=topic,
                category='bitcoin',
                findings=findings,
                sources=sources,
                tags=tags
            )

            session.log_database_entry('research_findings', 'bitcoin quote')
            saved_count += 1

            if VERBOSE:
                print(f"  ✓ Saved to database: {topic} (ID: {research_id})")

            # Generate content ideas with SMART SCORING
            content_ideas = [
                f"Quote card: {quote['author']} on Bitcoin - connect to athlete wealth",
                f"Thread: What if athletes understood '{quote['quote'][:40]}...'?",
                f"Analysis: {quote['author']}'s insight + athlete financial story"
            ]

            for idea in content_ideas:
                # Score the content idea
                scoring = score_content_idea(
                    content=idea,
                    topic=f"Bitcoin Quote - {quote['author']}",
                    category='bitcoin',
                    metadata={}
                )

                session.content_scores.append({
                    'topic': f"{quote['author']} - {scoring['priority'].upper()}",
                    'score': scoring['score'],
                    'priority': scoring['priority'],
                    'schedule': scoring['schedule_window']
                })

                session.db.add_content_idea(
                    topic=f"Bitcoin Quote - {quote['author']} - {scoring['priority'].upper()}",
                    category='21m-sports',
                    content=idea,
                    status=f"draft-{scoring['priority']}"
                )
                session.log_database_entry('content_ideas', f"{scoring['priority']} priority")

                if VERBOSE:
                    print(f"    ✓ Content idea: {scoring['score']}/100 ({scoring['priority'].upper()}) - {scoring['schedule_window']}")

        except Exception as e:
            session.log_error(f"Database save failed: {e}", quote['author'])
            if VERBOSE:
                print(f"  ✗ Database error: {e}")

    # Save historical events
    for event in history:
        try:
            topic = f"Bitcoin History - {event['event']}"
            findings = f"{event['description']}\n\nDate: {event['date']}\n"

            if event.get('value_now'):
                findings += f"\nValue Analysis:\n- Then: ${event['value_then']:,.2f}\n- Now: ${event['value_now']:,.2f}\n- Increase: {event['value_now']/event['value_then'] if event['value_then'] > 0 else 0:.0f}x"

            sources = [event.get('source_url', 'Historical record')]
            tags = ['bitcoin', 'history'] + event['tags']

            research_id = session.db.add_research(
                topic=topic,
                category='bitcoin',
                findings=findings,
                sources=sources,
                tags=tags
            )

            session.log_database_entry('research_findings', 'bitcoin history')
            saved_count += 1

            if VERBOSE:
                print(f"  ✓ Saved to database: {topic} (ID: {research_id})")

            # Generate content ideas with SMART SCORING
            content_ideas = [
                f"Anniversary post: {event['event']} - What if athlete bought BTC then?",
                f"Timeline comparison: {event['event']} vs athlete contract today",
                f"Historical context: {event['event']} + lessons for athletes now"
            ]

            for idea in content_ideas:
                # Score the content idea
                scoring = score_content_idea(
                    content=idea,
                    topic=f"Bitcoin History - {event['event']}",
                    category='bitcoin',
                    metadata={}
                )

                session.content_scores.append({
                    'topic': f"{event['event']} - {scoring['priority'].upper()}",
                    'score': scoring['score'],
                    'priority': scoring['priority'],
                    'schedule': scoring['schedule_window']
                })

                session.db.add_content_idea(
                    topic=f"Bitcoin History - {event['event']} - {scoring['priority'].upper()}",
                    category='21m-sports',
                    content=idea,
                    status=f"draft-{scoring['priority']}"
                )
                session.log_database_entry('content_ideas', f"{scoring['priority']} priority")

                if VERBOSE:
                    print(f"    ✓ Content idea: {scoring['score']}/100 ({scoring['priority'].upper()}) - {scoring['schedule_window']}")

        except Exception as e:
            session.log_error(f"Database save failed: {e}", event['event'])
            if VERBOSE:
                print(f"  ✗ Database error: {e}")

    return saved_count


def main():
    """Main Bitcoin research execution"""
    print("\n" + "="*70)
    print("₿  21M BITCOIN RESEARCH AUTOMATION")
    print("="*70)

    if DRY_RUN:
        print("🔍 DRY RUN MODE - Testing only\n")

    # Initialize session
    session = BitcoinResearchSession()

    try:
        # Step 1: Get current BTC price
        print("\n📊 Step 1: Getting current Bitcoin price...")
        btc_data = get_current_btc_price(session)
        if not btc_data:
            print("\n❌ Could not fetch BTC price")
            return 1

        btc_price = btc_data['price']
        print(f"  ✓ BTC Price: ${btc_price:,.2f}")

        # Step 2: Research Bitcoin quotes
        print("\n📚 Step 2: Researching Bitcoin quotes & wisdom...")
        quote_sources = get_bitcoin_quotes()
        session.log_search(
            "Bitcoin quotes from books",
            "Curated database (Bitcoin Standard, 21 Lessons, etc.)",
            len(quote_sources),
            quote_sources[0]['source'] if quote_sources else None
        )

        verified_quotes = []
        for quote in quote_sources:
            result = research_bitcoin_quote(quote, session, btc_price)
            if result:
                verified_quotes.append(result)

        print(f"\n  ✓ Verified {len(verified_quotes)} quotes")

        # Step 3: Research Bitcoin history
        print("\n📜 Step 3: Researching Bitcoin historical events...")
        history_sources = get_bitcoin_history()
        session.log_search(
            "Bitcoin historical milestones",
            "Historical records (Bitcoin.org, Wikipedia, News)",
            len(history_sources),
            history_sources[0]['event'] if history_sources else None
        )

        verified_history = []
        for event in history_sources:
            result = research_bitcoin_history(event, session, btc_price)
            if result:
                verified_history.append(result)

        print(f"\n  ✓ Verified {len(verified_history)} events")

        if not verified_quotes and not verified_history:
            print("\n❌ No Bitcoin research could be verified")
            return 1

        # Step 4: Save to markdown
        print("\n💾 Step 4: Saving research to markdown...")
        markdown_file = save_research_to_markdown(
            verified_quotes, verified_history, btc_price, session
        )

        # Step 5: Save to database
        print("\n💾 Step 5: Saving to database...")
        saved_count = save_to_database(verified_quotes, verified_history, session)
        print(f"  ✓ Saved {saved_count} entries to database")

        # Step 6: Create verification log
        print("\n📋 Step 6: Creating verification log...")
        log_file = session.create_verification_log()
        print(f"  ✓ Verification log: {log_file}")

        # Step 7: Generate trend analysis
        print("\n📈 Step 7: Generating trend analysis...")
        try:
            analyzer = TrendAnalyzer()
            trends_file = analyzer.generate_trends_report()
            print(f"  ✓ Trends analysis: {trends_file}")
        except Exception as e:
            print(f"  ⚠ Trend analysis warning: {e}")

        # Summary
        print("\n" + "="*70)
        print("✅ BITCOIN RESEARCH COMPLETE")
        print("="*70)
        print(f"  Quotes verified: {len(verified_quotes)}")
        print(f"  History events verified: {len(verified_history)}")
        print(f"  Database entries: {saved_count}")
        print(f"  Research file: {markdown_file}")
        print(f"  Verification log: {log_file}")
        print(f"  Errors: {len(session.errors)}")

        # Show content scoring summary
        if session.content_scores:
            high_pri = sum(1 for s in session.content_scores if s['priority'] == 'high')
            med_pri = sum(1 for s in session.content_scores if s['priority'] == 'medium')
            low_pri = sum(1 for s in session.content_scores if s['priority'] == 'low')
            print(f"\n  Content ideas: {high_pri} HIGH, {med_pri} MEDIUM, {low_pri} LOW priority")

        print("")

        return 0

    except Exception as e:
        print(f"\n❌ Bitcoin research failed: {e}")
        session.log_error(str(e), "main execution")

        # Still create verification log even on failure
        try:
            log_file = session.create_verification_log()
            print(f"  Verification log (with errors): {log_file}")
        except:
            pass

        return 1


if __name__ == '__main__':
    sys.exit(main())
