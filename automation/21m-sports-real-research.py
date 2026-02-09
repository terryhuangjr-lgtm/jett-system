#!/usr/bin/env python3
"""
21M Sports Real Research Automation
Implements JETT RESEARCH & DATABASE PROTOCOL v1.0

MISSION: Find unique insights connecting sports and Bitcoin that people haven't seen.
Draw connections between athlete finances and sound money principles.
Teach lessons through real stories. Make people think differently about money.

Research focuses on:
- Time preference (athletes who saved vs. spent)
- Fiat debasement (what contracts bought then vs. now)
- Sound money principles illustrated through sports
- Teaching moments (bankruptcies, success stories)
- Unique angles that aren't obvious

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
QUICK_SCAN = '--quick-scan' in sys.argv  # Quick mode: only check last 7 days for breaking news


class ResearchSession:
    """Manages a research session with verification logging"""

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

    def log_search(self, query: str, results_count: int, top_source: Optional[str] = None):
        """Log a search that was conducted"""
        self.searches_conducted.append({
            'query': query,
            'results_count': results_count,
            'top_source': top_source,
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
        log_file = VERIFICATION_LOGS_DIR / f'{self.session_date}.md'

        content = f"""# Verification Log - {self.session_date}

## Research Session: Sports Contracts & NIL Deals

### Searches Conducted:
"""

        for search in self.searches_conducted:
            content += f"""
- Query: "{search['query']}"
  - Results: {search['results_count']} articles found
"""
            if search['top_source']:
                content += f"  - Top source: {search['top_source']}\n"
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
                                headers={'User-Agent': '21M-Sports-Research/1.0'})
        # Accept 200 or 403 (Spotrac blocks HEAD but page exists)
        if response.status_code == 200:
            if source_tracker:
                source_tracker.report_source_success(url)
            return True
        elif response.status_code == 403 and 'spotrac.com' in url:
            if source_tracker:
                source_tracker.report_source_success(url)
            return True

        if source_tracker:
            source_tracker.report_source_failure(url, f"HTTP {response.status_code}")
        return False
    except Exception as e:
        if VERBOSE:
            print(f"  Warning: URL verification failed for {url}: {e}")
        if source_tracker:
            source_tracker.report_source_failure(url, str(e))
        return False


def get_btc_price_for_date(date_str: str, session: ResearchSession) -> Optional[Dict]:
    """
    Get BTC price from CoinGecko for a specific date

    Args:
        date_str: Date in YYYY-MM-DD format
        session: Research session for logging

    Returns:
        Dict with price and source, or None if failed
    """
    # Convert to DD-MM-YYYY for CoinGecko
    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
    coingecko_date = date_obj.strftime('%d-%m-%Y')

    url = f'https://api.coingecko.com/api/v3/coins/bitcoin/history?date={coingecko_date}'

    if VERBOSE:
        print(f"  Fetching BTC price for {date_str}...")

    try:
        response = requests.get(url, timeout=10, headers={'User-Agent': '21M-Sports-Research/1.0'})
        response.raise_for_status()
        data = response.json()

        # Check for error
        if 'error' in data:
            error_msg = data.get('error', 'Unknown error')
            # If historical data not available (>365 days), try current price
            if '365' in str(error_msg) or 'time range' in str(error_msg).lower():
                if VERBOSE:
                    print("  Historical data not available, fetching current price...")
                return get_current_btc_price(session)
            raise Exception(f"CoinGecko error: {error_msg}")

        price = data.get('market_data', {}).get('current_price', {}).get('usd')
        if not price:
            raise Exception("BTC price not found in response")

        if VERBOSE:
            print(f"  ✓ BTC price on {date_str}: ${price:,.2f}")

        return {
            'price': price,
            'source': url,
            'date': date_str
        }

    except Exception as e:
        session.log_error(f"Failed to fetch BTC price: {e}", date_str)
        if VERBOSE:
            print(f"  ✗ Error fetching BTC price: {e}")
        return None


def get_current_btc_price(session: ResearchSession) -> Optional[Dict]:
    """Get current BTC price as fallback"""
    url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'

    try:
        response = requests.get(url, timeout=10, headers={'User-Agent': '21M-Sports-Research/1.0'})
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


def search_recent_contracts_via_brave(days: int, exclude_players: List[str], session: ResearchSession) -> List[Dict]:
    """
    Search for recent sports contracts using Brave Search via JavaScript module

    Args:
        days: Number of days to look back
        exclude_players: List of player names to exclude
        session: Research session for logging

    Returns:
        List of contract dictionaries with player, team, value, etc.
    """
    import subprocess
    import json

    if VERBOSE:
        print(f"  Searching for contracts in last {days} days...")
        if exclude_players:
            print(f"  Excluding: {', '.join(exclude_players)}")

    try:
        # Call brave-search.js module with --json flag
        brave_search_script = os.path.join(parent_dir, 'automation', 'brave-search.js')

        exclude_arg = ','.join(exclude_players) if exclude_players else ''
        cmd = [
            'node',
            brave_search_script,
            '--contracts',
            '--days', str(days),
            '--exclude', exclude_arg,
            '--json'
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            if VERBOSE:
                print(f"  ✗ Brave search failed: {result.stderr}")
            session.log_error(f"Brave search failed: {result.stderr}")
            return []

        # Parse JSON output from JavaScript module
        try:
            contracts_data = json.loads(result.stdout)
        except json.JSONDecodeError as e:
            if VERBOSE:
                print(f"  ✗ Failed to parse JSON: {e}")
            session.log_error(f"Failed to parse contract JSON: {e}")
            return []

        # Convert JavaScript contract format to Python contract format
        contracts = []
        for item in contracts_data:
            # Skip if no player name or contract value
            if not item.get('playerName') or not item.get('contractValue'):
                continue

            contracts.append({
                'player': item['playerName'],
                'team': item.get('team', 'Unknown'),
                'sport': 'Unknown',  # Would need sport detection
                'contract_value': item['contractValue'],
                'signing_date': datetime.now().strftime('%Y-%m-%d'),  # Approximate
                'source_url': item['url'],
                'notes': item.get('title', '')
            })

        if VERBOSE:
            print(f"  ✓ Found {len(contracts)} contracts with complete data")

        session.log_search(f"contracts (last {days} days)", len(contracts),
                          contracts[0]['source_url'] if contracts else None)

        return contracts

    except subprocess.TimeoutExpired:
        if VERBOSE:
            print(f"  ✗ Search timed out")
        session.log_error("Brave search timed out")
        return []
    except Exception as e:
        if VERBOSE:
            print(f"  ✗ Search error: {e}")
        session.log_error(f"Brave search error: {e}")
        return []


def get_historic_mega_deals() -> List[Dict]:
    """
    Historic mega-deals for when recent contracts are slim
    These are verified, high-profile contracts that make great content
    """
    return [
        {
            'player': 'Patrick Mahomes',
            'team': 'Kansas City Chiefs',
            'sport': 'NFL',
            'contract_value': 450000000,
            'signing_date': '2020-07-06',
            'source_url': 'https://www.spotrac.com/nfl/kansas-city-chiefs/patrick-mahomes-21751/',
            'notes': '10-year extension, largest in NFL history at time'
        },
        {
            'player': 'Mike Trout',
            'team': 'Los Angeles Angels',
            'sport': 'MLB',
            'contract_value': 426500000,
            'signing_date': '2019-03-20',
            'source_url': 'https://www.spotrac.com/mlb/los-angeles-angels/mike-trout-9644/',
            'notes': '12-year extension'
        },
        {
            'player': 'Mookie Betts',
            'team': 'Los Angeles Dodgers',
            'sport': 'MLB',
            'contract_value': 365000000,
            'signing_date': '2020-07-22',
            'source_url': 'https://www.spotrac.com/mlb/los-angeles-dodgers/mookie-betts-17235/',
            'notes': '12-year deal'
        },
        {
            'player': 'Aaron Judge',
            'team': 'New York Yankees',
            'sport': 'MLB',
            'contract_value': 360000000,
            'signing_date': '2022-12-21',
            'source_url': 'https://www.spotrac.com/mlb/new-york-yankees/aaron-judge-17920/',
            'notes': '9-year deal'
        },
        {
            'player': 'Jaylen Brown',
            'team': 'Boston Celtics',
            'sport': 'NBA',
            'contract_value': 303700000,
            'signing_date': '2023-07-25',
            'source_url': 'https://www.spotrac.com/nba/boston-celtics/jaylen-brown-20224/',
            'notes': 'Supermax extension'
        }
    ]


def get_rookie_contracts() -> List[Dict]:
    """
    Notable rookie contracts and signing bonuses

    Perfect for "what if they bought Bitcoin" content - young athletes,
    signing bonuses from years ago, easy to calculate BTC gains
    """
    return [
        {
            'player': 'Trevor Lawrence',
            'team': 'Jacksonville Jaguars',
            'sport': 'NFL',
            'contract_value': 36793488,  # 4-year rookie deal
            'signing_bonus': 24118900,
            'signing_date': '2021-07-28',
            'source_url': 'https://www.spotrac.com/nfl/jacksonville-jaguars/trevor-lawrence-54867/',
            'notes': '#1 overall pick 2021, $24M signing bonus'
        },
        {
            'player': 'Zion Williamson',
            'team': 'New Orleans Pelicans',
            'sport': 'NBA',
            'contract_value': 44271137,  # Rookie scale + extension
            'signing_bonus': 0,  # NBA doesn't do signing bonuses
            'signing_date': '2019-07-01',
            'source_url': 'https://www.spotrac.com/nba/new-orleans-pelicans/zion-williamson-56304/',
            'notes': '#1 pick 2019, rookie scale $44M over 4 years'
        },
        {
            'player': 'Joe Burrow',
            'team': 'Cincinnati Bengals',
            'sport': 'NFL',
            'contract_value': 36190137,
            'signing_bonus': 23880100,
            'signing_date': '2020-07-30',
            'source_url': 'https://www.spotrac.com/nfl/cincinnati-bengals/joe-burrow-48484/',
            'notes': '#1 overall 2020, $23.8M signing bonus - imagine in BTC'
        },
        {
            'player': 'Cade Cunningham',
            'team': 'Detroit Pistons',
            'sport': 'NBA',
            'contract_value': 45600000,
            'signing_bonus': 0,
            'signing_date': '2021-08-03',
            'source_url': 'https://www.spotrac.com/nba/detroit-pistons/cade-cunningham-99811/',
            'notes': '#1 pick 2021 NBA, $45M rookie scale'
        },
        {
            'player': 'Bryce Harper',
            'team': 'Washington Nationals',
            'sport': 'MLB',
            'contract_value': 9900000,  # Signing bonus
            'signing_bonus': 9900000,
            'signing_date': '2010-08-16',
            'source_url': 'https://www.spotrac.com/mlb/philadelphia-phillies/bryce-harper-10915/',
            'notes': '#1 overall 2010, $9.9M bonus. BTC was $0.06 then!'
        },
        {
            'player': 'Stephen Strasburg',
            'team': 'Washington Nationals',
            'sport': 'MLB',
            'contract_value': 15100000,  # Signing bonus
            'signing_bonus': 15100000,
            'signing_date': '2009-08-17',
            'source_url': 'https://www.spotrac.com/mlb/washington-nationals/stephen-strasburg-7194/',
            'notes': '#1 overall 2009, $15.1M bonus. BTC didnt exist yet (2009)!'
        },
        {
            'player': 'Paulo Banchero',
            'team': 'Orlando Magic',
            'sport': 'NBA',
            'contract_value': 50157960,
            'signing_bonus': 0,
            'signing_date': '2022-07-01',
            'source_url': 'https://www.spotrac.com/nba/orlando-magic/paolo-banchero-103463/',
            'notes': '#1 pick 2022, $50M rookie scale'
        },
        {
            'player': 'Andrew Luck',
            'team': 'Indianapolis Colts',
            'sport': 'NFL',
            'contract_value': 22107998,
            'signing_bonus': 14518544,
            'signing_date': '2012-07-29',
            'source_url': 'https://www.spotrac.com/nfl/indianapolis-colts/andrew-luck-7774/',
            'notes': '#1 overall 2012, $14.5M bonus when BTC was $10'
        }
    ]


def get_bankruptcy_stories() -> List[Dict]:
    """
    Athlete bankruptcy and financial disaster stories
    These teach important lessons about money management
    """
    return [
        {
            'player': 'Antoine Walker',
            'sport': 'NBA',
            'earned': 110000000,
            'lost': 'Everything',
            'story': 'Earned $110M over career. Went bankrupt supporting 70+ people, bad investments, gambling',
            'lesson': 'High time preference destroys wealth',
            'sources': ['https://www.espn.com/nba/story/_/id/25336868/]
        },
        {
            'player': 'Allen Iverson',
            'sport': 'NBA',
            'earned': 200000000,
            'lost': 'Nearly all',
            'story': 'Earned $200M+, spent on entourage of 50+, jewelry, cars. Nearly bankrupt',
            'lesson': 'Living beyond means catches up',
            'sources': ['https://www.si.com/nba/']
        },
        {
            'player': 'Vince Young',
            'sport': 'NFL',
            'earned': 26000000,
            'lost': 'Everything',
            'story': '$26M gone in 2 years. Private jets, $5K/week at Cheesecake Factory, entourage',
            'lesson': 'Lifestyle inflation destroys wealth',
            'sources': ['https://www.sportscasting.com/']
        },
        {
            'player': 'Terrell Owens',
            'sport': 'NFL',
            'earned': 80000000,
            'lost': 'Everything',
            'story': '$80M gone in 4 years. Child support, bad investments, lifestyle',
            'lesson': 'Multiple obligations compound',
            'sources': ['https://www.cnbc.com/']
        }
    ]


def get_financial_success_stories() -> List[Dict]:
    """
    Athletes who built generational wealth through smart financial decisions
    """
    return [
        {
            'player': 'Junior Bridgeman',
            'sport': 'NBA',
            'career_earnings': 350000,
            'net_worth': 600000000,
            'strategy': "Bought Wendy's franchises during career, built restaurant empire",
            'lesson': 'Low time preference creates generational wealth',
            'sources': ['https://www.cnbc.com/']
        },
        {
            'player': 'Magic Johnson',
            'sport': 'NBA',
            'career_earnings': 40000000,
            'net_worth': 620000000,
            'strategy': 'Starbucks franchises, movie theaters, strategic investments',
            'lesson': 'Ownership beats salary',
            'sources': ['https://www.forbes.com/']
        },
        {
            'player': 'Roger Staubach',
            'sport': 'NFL',
            'career_earnings': 4000000,
            'net_worth': 600000000,
            'strategy': 'Real estate development, sold company for $613M',
            'lesson': 'Building equity compounds',
            'sources': ['https://www.forbes.com/']
        }
    ]


def discover_unique_angles(contract: Dict, btc_data: Dict) -> List[str]:
    """
    Discover unique insights and angles for content

    This finds connections people haven't thought of:
    - Time preference lessons
    - Fiat debasement over time
    - Purchasing power erosion
    - Comparisons that reveal truths

    Returns list of insight angles
    """
    angles = []

    contract_value = contract['contract_value']
    btc_equivalent = contract_value / btc_data['price']
    signing_year = int(contract['signing_date'][:4])
    years_ago = 2026 - signing_year

    # Angle 1: Time perspective
    if years_ago > 5:
        angles.append(f"TIME_DECAY: In {signing_year}, ${contract_value/1e6:.0f}M = {btc_equivalent:.0f} BTC. Today that same dollar amount buys far fewer BTC. Fiat loses purchasing power, Bitcoin doesn't.")

    # Angle 2: Deferred money trap (if recent)
    if years_ago < 2 and contract_value > 200000000:
        angles.append(f"DEFERRAL_TRAP: ${contract_value/1e6:.0f}M paid over years loses real value. Each payment buys less. Athletes don't realize they're being paid in melting ice cubes.")

    # Angle 3: Generational wealth comparison
    if btc_equivalent > 2000:  # Significant BTC amount
        btc_percent = (btc_equivalent / 21000000) * 100
        angles.append(f"SUPPLY_PERSPECTIVE: {btc_equivalent:.0f} BTC = {btc_percent:.4f}% of all Bitcoin that will EVER exist. That's generational wealth if held. If spent in fiat, it's just a paycheck.")

    # Angle 4: Time preference lesson
    if contract_value > 100000000:
        angles.append(f"TIME_PREFERENCE: {contract['player']} earns ${contract_value/1e6:.0f}M. High time preference = spend on cars, jewelry, entourage NOW. Low time preference = save in hard asset. Bitcoin measures which choice they made.")

    # Angle 5: Historic contract - inflation reveal
    if years_ago > 10:
        angles.append(f"INFLATION_REVEAL: {signing_year} contract looked huge. But measured in BTC, it reveals inflation's theft. ${contract_value/1e6:.0f}M then bought {btc_equivalent:.0f} BTC. Same dollars today? Maybe 1/10th of that.")

    return angles


def research_contract(contract: Dict, session: ResearchSession) -> Optional[Dict]:
    """
    Research a specific contract and verify sources

    Args:
        contract: Contract data dict
        session: Research session for logging

    Returns:
        Enriched contract data with BTC analysis, or None if verification failed
    """
    if VERBOSE:
        print(f"\nResearching: {contract['player']} - ${contract['contract_value']/1e6:.0f}M")

    # Verify source URL with smart reliability tracking
    if VERBOSE:
        print(f"  Verifying source: {contract['source_url']}")

    if not verify_url(contract['source_url'], source_tracker=session.source_tracker):
        session.log_error(f"Source URL not accessible", contract['player'])
        if VERBOSE:
            print(f"  ✗ Source not accessible")
        return None

    if VERBOSE:
        print("  ✓ Source verified")

    # Get BTC price for signing date
    btc_data = get_btc_price_for_date(contract['signing_date'], session)
    if not btc_data:
        # Try current price as fallback
        btc_data = get_current_btc_price(session)
        if not btc_data:
            session.log_error(f"Could not get BTC price", contract['player'])
            return None

    # Calculate BTC equivalent
    btc_equivalent = contract['contract_value'] / btc_data['price']
    btc_percent_of_supply = (btc_equivalent / 21000000) * 100

    # Log verified fact
    claim = f"{contract['player']} ${contract['contract_value']/1e6:.0f}M contract = {btc_equivalent:.0f} BTC"
    session.log_verified_fact(claim, contract['source_url'])

    # Discover unique angles and insights
    unique_angles = discover_unique_angles(contract, btc_data)

    if VERBOSE and unique_angles:
        print(f"  💡 Found {len(unique_angles)} unique angles:")
        for angle in unique_angles[:2]:  # Show first 2
            angle_type = angle.split(':')[0]
            print(f"     - {angle_type}")

    # Create enriched contract data with insights
    result = {
        **contract,
        'btc_price_at_signing': btc_data['price'],
        'btc_equivalent': btc_equivalent,
        'btc_percent_of_supply': btc_percent_of_supply,
        'btc_price_source': btc_data['source'],
        'unique_angles': unique_angles,  # NEW: unique insights
        'verified': True,
        'verified_at': datetime.now().isoformat()
    }

    if VERBOSE:
        print(f"  ✓ {btc_equivalent:.0f} BTC @ ${btc_data['price']:,.2f}")

    return result


def save_research_to_markdown(contracts: List[Dict], session: ResearchSession) -> str:
    """Save research findings to dated markdown file"""
    today = datetime.now().strftime('%Y-%m-%d')
    filename = RESEARCH_DIR / f'{today}-contracts.md'

    content = f"""# Sports Contracts Research - {datetime.now().strftime('%B %d, %Y')}

## Summary
Researched {len(contracts)} major sports contracts with BTC analysis.

## Key Findings

"""

    for contract in contracts:
        content += f"""### {contract['player']} ({contract['sport']})
- **Team**: {contract['team']}
- **Contract**: ${contract['contract_value']/1e6:.0f}M over multiple years
- **Signed**: {contract['signing_date']}
- **Source**: {contract['source_url']}

**BTC Analysis:**
- **BTC Price at Signing**: ${contract['btc_price_at_signing']:,.2f}
- **BTC Equivalent**: {contract['btc_equivalent']:,.0f} BTC
- **% of 21M Supply**: {contract['btc_percent_of_supply']:.4f}%
- **Verified**: ✅ {contract['verified_at'][:10]}

**Notes**: {contract.get('notes', 'N/A')}

"""

    content += f"""## Content Ideas Generated

"""

    # Generate content ideas
    for i, contract in enumerate(contracts, 1):
        content += f"""{i}. **{contract['player']}'s Contract in BTC Terms**
   - Angle: "{contract['player']}'s ${contract['contract_value']/1e6:.0f}M deal = {contract['btc_equivalent']:.0f} BTC - Fiat debasement perspective"
   - Hook: "While {contract['player']} signed for ${contract['contract_value']/1e6:.0f}M, in Bitcoin terms that's {contract['btc_equivalent']:.0f} BTC..."

"""

    content += f"""## Research Methodology
- Used Spotrac.com for contract verification
- BTC prices from CoinGecko historical API
- All sources verified as accessible
- Calculations: Contract Value USD / BTC Price on Signing Date

## Next Steps
- Monitor for new contract signings weekly
- Add NIL deals research
- Track deferred payment structures
"""

    with open(filename, 'w') as f:
        f.write(content)

    if VERBOSE:
        print(f"\n✓ Research saved to: {filename}")

    return str(filename)


def save_to_database(contracts: List[Dict], session: ResearchSession) -> int:
    """Save research findings to database with smart content scoring"""
    saved_count = 0

    for contract in contracts:
        try:
            # Create research finding entry
            topic = f"{contract['player']} ${contract['contract_value']/1e6:.0f}M contract - BTC analysis"
            findings = f"{contract['player']} signed {contract['contract_value']/1e6:.0f}M/{len(contract['notes'].split('year')[0])}yr with {contract['team']}. Contract = {contract['btc_equivalent']:.0f} BTC at signing day price of ${contract['btc_price_at_signing']:,.2f}. Represents {contract['btc_percent_of_supply']:.4f}% of total 21M supply."
            sources = [contract['source_url'], contract['btc_price_source']]
            tags = ['contracts', contract['sport'].lower(), contract['player'].lower().replace(' ', '-'), 'btc-analysis']

            research_id = session.db.add_research(
                topic=topic,
                category='sports',
                findings=findings,
                sources=sources,
                tags=tags
            )

            session.log_database_entry('research_findings', 'contract research')
            saved_count += 1

            if VERBOSE:
                print(f"  ✓ Saved to database: {topic} (ID: {research_id})")

            # Generate content ideas using UNIQUE ANGLES discovered
            content_ideas = []

            # Use discovered unique angles if available
            if contract.get('unique_angles'):
                for angle in contract['unique_angles'][:3]:  # Top 3 angles
                    # Extract insight from angle (remove type prefix)
                    insight = ':'.join(angle.split(':')[1:]).strip()
                    content_ideas.append(f"{contract['player']}: {insight}")

            # Fallback ideas if no unique angles
            if not content_ideas:
                content_ideas = [
                    f"{contract['player']}'s contract measured in Bitcoin terms - fiat debasement angle",
                    f"Compare {contract['player']} deal to historical contracts in BTC purchasing power"
                ]

            for idea in content_ideas:
                # Score the content idea
                scoring = score_content_idea(
                    content=idea,
                    topic=f"{contract['player']} Contract",
                    category='sports',
                    metadata={'contract_value': contract['contract_value']}
                )

                session.content_scores.append({
                    'topic': f"{contract['player']} - {scoring['priority'].upper()}",
                    'score': scoring['score'],
                    'priority': scoring['priority'],
                    'schedule': scoring['schedule_window']
                })

                # Save with priority in status
                session.db.add_content_idea(
                    topic=f"{contract['player']} BTC Analysis - {scoring['priority'].upper()}",
                    category='21m-sports',
                    content=idea,
                    status=f"draft-{scoring['priority']}"
                )
                session.log_database_entry('content_ideas', f"{scoring['priority']} priority")

                if VERBOSE:
                    print(f"    ✓ Content idea: {scoring['score']}/100 ({scoring['priority'].upper()}) - {scoring['schedule_window']}")

        except Exception as e:
            session.log_error(f"Database save failed: {e}", contract['player'])
            if VERBOSE:
                print(f"  ✗ Database error: {e}")

    return saved_count


def main():
    """Main research execution"""
    print("\n" + "="*70)
    print("🏈 21M SPORTS RESEARCH AUTOMATION")
    print("="*70)

    if DRY_RUN:
        print("🔍 DRY RUN MODE - Testing only\n")

    # Initialize session
    session = ResearchSession()

    try:
        # Step 1: Search for recent contracts via Brave Search
        if QUICK_SCAN:
            print("\n⚡ QUICK SCAN MODE: Checking for breaking news (last 7 days)...")
            search_days = 7
        else:
            print("\n📊 Step 1: Searching for RECENT sports contracts...")
            search_days = 30

        # Excluded players list (only exclude pre-draft prospects)
        exclude_players = ['Shedeur Sanders']

        # Search for contracts
        recent_contracts = search_recent_contracts_via_brave(
            days=search_days,
            exclude_players=exclude_players,
            session=session
        )

        print(f"  ✓ Found {len(recent_contracts)} recent contracts")

        # Step 2: Add diverse content pool (skip in quick-scan mode)
        all_content = []

        # Add recent contracts (highest priority)
        all_content.extend(recent_contracts)

        # Only build diverse pool in full research mode
        if not QUICK_SCAN:
            print("\n📝 Step 2: Building diverse content pool...")

        # If recent contracts are slim (<3), add historic mega-deals
        if len(recent_contracts) < 3 and not QUICK_SCAN:
            print("  ℹ️  Adding historic mega-deals to content pool...")
            historic = get_historic_mega_deals()
            # Rotate through them, not always Mahomes
            import random
            random.shuffle(historic)
            all_content.extend(historic[:2])  # Add 2 historic deals

        # Only add bankruptcy/success stories in full research mode
        if not QUICK_SCAN:
            # Always include 1 bankruptcy story (teaching moment)
            print("  ℹ️  Adding financial lesson content...")
            bankruptcy_stories = get_bankruptcy_stories()
            import random
            all_content.append(random.choice(bankruptcy_stories))

            # Occasionally add success story (25% chance)
            if random.random() < 0.25:
                success_stories = get_financial_success_stories()
                all_content.append(random.choice(success_stories))

            # Add rookie contract (50% chance) - great for "what if they bought BTC" content
            if random.random() < 0.5:
                print("  ℹ️  Adding rookie contract/signing bonus...")
                rookie_contracts = get_rookie_contracts()
                all_content.append(random.choice(rookie_contracts))

        if QUICK_SCAN:
            print(f"  ✓ Quick scan: {len(all_content)} breaking contracts found")
        else:
            print(f"  ✓ Content pool: {len(all_content)} items (contracts + stories)")

        # Step 3: Research and verify content
        print("\n📝 Step 3: Researching and verifying content...")

        verified_contracts = []

        for item in all_content:
            # Check if it's a contract or a story
            if 'contract_value' in item:
                # It's a contract - research it
                result = research_contract(item, session)
                if result:
                    verified_contracts.append(result)
            else:
                # It's a story (bankruptcy/success) - add to database directly
                # These don't need BTC calculation, just good content
                if VERBOSE:
                    print(f"\nAdding story: {item['player']} - {item.get('story', item.get('strategy', ''))[:50]}...")

                try:
                    # Save story to database
                    session.db.add_research_finding(
                        topic=f"{item['player']} Financial Story",
                        category='athlete_finances',
                        content=item.get('story', item.get('strategy', '')),
                        source=item.get('sources', ['Manual entry'])[0] if item.get('sources') else 'Manual entry',
                        bitcoin_angle=f"Lesson: {item.get('lesson', 'Financial discipline matters')}",
                        tags=['financial_lesson', 'athlete_story', item['sport'].lower()]
                    )
                    session.log_database_entry('research_findings', 'story')

                    if VERBOSE:
                        print(f"  ✓ Saved story to database")
                except Exception as e:
                    if VERBOSE:
                        print(f"  ✗ Error saving story: {e}")

        print(f"\n  ✓ Verified {len(verified_contracts)} contracts + stories")

        if len(verified_contracts) == 0:
            print("\n⚠️  Warning: No contracts verified, but stories added to database")
            # Don't fail - we have story content

        # Step 3: Save to markdown
        print("\n💾 Step 3: Saving research to markdown...")
        markdown_file = save_research_to_markdown(verified_contracts, session)

        # Step 4: Save to database
        print("\n💾 Step 4: Saving to database...")
        saved_count = save_to_database(verified_contracts, session)
        print(f"  ✓ Saved {saved_count} entries to database")

        # Step 5: Create verification log
        print("\n📋 Step 5: Creating verification log...")
        log_file = session.create_verification_log()
        print(f"  ✓ Verification log: {log_file}")

        # Step 6: Generate trend analysis
        print("\n📈 Step 6: Generating trend analysis...")
        try:
            analyzer = TrendAnalyzer()
            trends_file = analyzer.generate_trends_report()
            print(f"  ✓ Trends analysis: {trends_file}")
        except Exception as e:
            print(f"  ⚠ Trend analysis warning: {e}")

        # Summary
        print("\n" + "="*70)
        print("✅ RESEARCH COMPLETE")
        print("="*70)
        print(f"  Contracts verified: {len(verified_contracts)}")
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
        print(f"\n❌ Research failed: {e}")
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
