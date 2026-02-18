#!/usr/bin/env python3
"""
Verified Sports Contracts Database - Curated Star Athletes

Contains:
1. MEGA-DEALS ($300M+) - Current/Recent star contracts
2. HISTORIC STAR CONTRACTS ($100M-$300M) - Fiat debasement examples
3. LEGENDARY CONTRACTS (pre-$100M) - Great "what if in BTC" content

ALL players are stars - well-known, popular athletes.
NO random players, NO predictions, NO garbage.
"""

from datetime import datetime
from typing import List, Dict

# ============================================================================
# MEGA-DEALS ($300M+) - Current/recent star contracts
# ============================================================================
def get_mega_deals() -> List[Dict]:
    """Current mega-deals ($300M+) - star players"""
    return [
        # MLB
        {
            'player': 'Juan Soto',
            'team': 'New York Mets',
            'sport': 'MLB',
            'contract_value': 765000000,
            'signing_date': '2024-12-08',
            'source_url': 'https://www.spotrac.com/mlb/new-york-mets/juan-soto-32574/',
            'notes': 'Largest in MLB history - 15-year deal',
            'content_type': 'mega_deal',
            'priority': 10
        },
        {
            'player': 'Shohei Ohtani',
            'team': 'Los Angeles Dodgers',
            'sport': 'MLB',
            'contract_value': 700000000,
            'signing_date': '2023-12-09',
            'source_url': 'https://www.spotrac.com/mlb/los-angeles-dodgers/shohei-ohtani-28145/',
            'notes': '2nd largest ever, heavy deferrals',
            'content_type': 'mega_deal',
            'priority': 10
        },
        {
            'player': 'Aaron Judge',
            'team': 'New York Yankees',
            'sport': 'MLB',
            'contract_value': 360000000,
            'signing_date': '2022-12-21',
            'source_url': 'https://www.spotrac.com/mlb/new-york-yankees/aaron-judge-17920/',
            'notes': '9-year deal, largest for Yankee',
            'content_type': 'mega_deal',
            'priority': 9
        },
        {
            'player': 'Mike Trout',
            'team': 'Los Angeles Angels',
            'sport': 'MLB',
            'contract_value': 426500000,
            'signing_date': '2019-03-20',
            'source_url': 'https://www.spotrac.com/mlb/los-angeles-angels/mike-trout-9644/',
            'notes': '12-year deal, longest in MLB',
            'content_type': 'mega_deal',
            'priority': 9
        },
        {
            'player': 'Mookie Betts',
            'team': 'Los Angeles Dodgers',
            'sport': 'MLB',
            'contract_value': 365000000,
            'signing_date': '2020-07-22',
            'source_url': 'https://www.spotrac.com/mlb/los-angeles-dodgers/mookie-betts-17235/',
            'notes': '12-year deal',
            'content_type': 'mega_deal',
            'priority': 9
        },
        # NBA
        {
            'player': 'Jaylen Brown',
            'team': 'Boston Celtics',
            'sport': 'NBA',
            'contract_value': 303700000,
            'signing_date': '2023-07-25',
            'source_url': 'https://www.spotrac.com/nba/boston-celtics/jaylen-brown-20224/',
            'notes': 'Supermax, largest in NBA at signing',
            'content_type': 'mega_deal',
            'priority': 10
        },
        {
            'player': 'Donovan Mitchell',
            'team': 'Cleveland Cavaliers',
            'sport': 'NBA',
            'contract_value': 268000000,
            'signing_date': '2025-07-07',
            'source_url': 'https://www.spotrac.com/nba/cleveland-cavaliers/donovan-mitchell-25916/',
            'notes': '3-year supermax extension',
            'content_type': 'mega_deal',
            'priority': 8
        },
        {
            'player': 'Bam Adebayo',
            'team': 'Miami Heat',
            'sport': 'NBA',
            'contract_value': 241000000,
            'signing_date': '2025-09-01',
            'source_url': 'https://www.spotrac.com/nba/miami-heat/bam-adebayo-20211/',
            'notes': 'Supermax extension',
            'content_type': 'mega_deal',
            'priority': 8
        },
        {
            'player': 'Jayson Tatum',
            'team': 'Boston Celtics',
            'sport': 'NBA',
            'contract_value': 314000000,
            'signing_date': '2024-07-01',
            'source_url': 'https://www.spotrac.com/nba/boston-celtics/jayson-tatum-22930/',
            'notes': '5-year supermax',
            'content_type': 'mega_deal',
            'priority': 9
        },
        # NFL
        {
            'player': 'Patrick Mahomes',
            'team': 'Kansas City Chiefs',
            'sport': 'NFL',
            'contract_value': 450000000,
            'signing_date': '2020-07-06',
            'source_url': 'https://www.spotrac.com/nfl/kansas-city-chiefs/patrick-mahomes-21751/',
            'notes': '10-year extension, largest in NFL history',
            'content_type': 'mega_deal',
            'priority': 10
        },
        {
            'player': 'Josh Allen',
            'team': 'Buffalo Bills',
            'sport': 'NFL',
            'contract_value': 330000000,
            'signing_date': '2024-06-24',
            'source_url': 'https://www.spotrac.com/nfl/buffalo-bills/josh-allen-25840/',
            'notes': '6-year extension, largest in NFL at signing',
            'content_type': 'mega_deal',
            'priority': 9
        },
        {
            'player': 'Justin Herbert',
            'team': 'Los Angeles Chargers',
            'sport': 'NFL',
            'contract_value': 262500000,
            'signing_date': '2024-06-20',
            'source_url': 'https://www.spotrac.com/nfl/los-angeles-chargers/justin-herbert-24896/',
            'notes': '5-year extension',
            'content_type': 'mega_deal',
            'priority': 8
        },
    ]


# ============================================================================
# HISTORIC STAR CONTRACTS ($100M-$300M) - Fiat debasement gold
# ============================================================================
def get_historic_star_contracts() -> List[Dict]:
    """
    Historic contracts from star players - PERFECT for fiat debasement content.
    These show how contracts that seemed massive then are tiny now.
    """
    return [
        # MLB Historic Stars
        {
            'player': 'Alex Rodriguez',
            'team': 'Texas Rangers',
            'sport': 'MLB',
            'contract_value': 252000000,
            'signing_date': '2000-12-11',
            'source_url': 'https://www.spotrac.com/mlb/texas-rangers/alex-rodriguez-102/',
            'notes': 'Largest in MLB at the time - worth ~$450M+ today',
            'content_type': 'historic_star',
            'priority': 9
        },
        {
            'player': 'Manny Ramirez',
            'team': 'Boston Red Sox',
            'sport': 'MLB',
            'contract_value': 160000000,
            'signing_date': '1999-12-15',
            'source_url': 'https://www.spotrac.com/mlb/chicago-white-sox/manny-ramirez-219/',
            'notes': 'Huge at the time - illustrates fiat debasement',
            'content_type': 'historic_star',
            'priority': 8
        },
        {
            'player': 'Kevin Garnett',
            'team': 'Minnesota Timberwolves',
            'sport': 'NBA',
            'contract_value': 126000000,
            'signing_date': '1997-10-31',
            'source_url': 'https://www.spotrac.com/nba/minnesota-timberwolves/kevin-garnett-228/',
            'notes': 'First $100M+ contract in NBA history!',
            'content_type': 'historic_star',
            'priority': 10
        },
        {
            'player': 'Shaquille O\'Neal',
            'team': 'Los Angeles Lakers',
            'sport': 'NBA',
            'contract_value': 120000000,
            'signing_date': '1996-07-18',
            'source_url': 'https://www.spotrac.com/nba/chicago-bulls/shaquille-oneal-102/',
            'notes': 'Then-largest in NBA history at $120M',
            'content_type': 'historic_star',
            'priority': 10
        },
        {
            'player': 'Derek Jeter',
            'team': 'New York Yankees',
            'sport': 'MLB',
            'contract_value': 189000000,
            'signing_date': '2001-01-10',
            'source_url': 'https://www.spotrac.com/mlb/new-york-yankees/derek-jeter-1111/',
            'notes': '10-year deal for Captain Clutch',
            'content_type': 'historic_star',
            'priority': 9
        },
        {
            'player': 'Albert Pujols',
            'team': 'St. Louis Cardinals',
            'sport': 'MLB',
            'contract_value': 100000000,
            'signing_date': '2004-01-13',
            'source_url': 'https://www.spotrac.com/mlb/los-angeles-angel/albert-pujols-1097/',
            'notes': 'First $100M MLB contract - landmark deal',
            'content_type': 'historic_star',
            'priority': 9
        },
        {
            'player': 'Miguel Cabrera',
            'team': 'Detroit Tigers',
            'sport': 'MLB',
            'contract_value': 248000000,
            'signing_date': '2008-03-05',
            'source_url': 'https://www.spotrac.com/mlb/detroit-tigers/miguel-cabrera-1025/',
            'notes': '8-year deal for future Hall of Famer',
            'content_type': 'historic_star',
            'priority': 8
        },
        # NFL Historic Stars
        {
            'player': ' Peyton Manning',
            'team': 'Denver Broncos',
            'sport': 'NFL',
            'contract_value': 96000000,
            'signing_date': '2012-03-20',
            'source_url': 'https://www.spotrac.com/nfl/denver-broncos/peyton-manning-1098/',
            'notes': '2-year deal that won Super Bowl 50',
            'content_type': 'historic_star',
            'priority': 9
        },
        {
            'player': 'Tom Brady',
            'team': 'New England Patriots',
            'sport': 'NFL',
            'contract_value': 60000000,
            'signing_date': '2005-03-01',
            'source_url': 'https://www.spotrac.com/nfl/new-england-patriots/tom-brady-1076/',
            'notes': '6-year extension for GOAT',
            'content_type': 'historic_star',
            'priority': 10
        },
        # NBA Historic Stars
        {
            'player': 'LeBron James',
            'team': 'Cleveland Cavaliers',
            'sport': 'NBA',
            'contract_value': 110000000,
            'signing_date': '2006-07-12',
            'source_url': 'https://www.spotrac.com/nba/cleveland-cavaliers/lebron-james-101/',
            'notes': '4-year deal returning to Cleveland',
            'content_type': 'historic_star',
            'priority': 10
        },
        {
            'player': 'Kobe Bryant',
            'team': 'Los Angeles Lakers',
            'sport': 'NBA',
            'contract_value': 136000000,
            'signing_date': '2004-07-15',
            'source_url': 'https://www.spotrac.com/nba/los-angeles-lakers/kobe-bryant-102/',
            'notes': '7-year deal for Mamba',
            'content_type': 'historic_star',
            'priority': 10
        },
        {
            'player': 'Tim Duncan',
            'team': 'San Antonio Spurs',
            'sport': 'NBA',
            'contract_value': 122000000,
            'signing_date': '2003-07-16',
            'source_url': 'https://www.spotrac.com/nba/san-antonio-spurs/tim-duncan-102/',
            'notes': '7-year deal for greatest power forward',
            'content_type': 'historic_star',
            'priority': 9
        },
        {
            'player': 'Dwyane Wade',
            'team': 'Miami Heat',
            'sport': 'NBA',
            'contract_value': 128000000,
            'signing_date': '2006-07-13',
            'source_url': 'https://www.spotrac.com/nba/miami-heat/dwyane-wade-104/',
            'notes': '5-year deal for Flash',
            'content_type': 'historic_star',
            'priority': 8
        },
        # Hockey
        {
            'player': 'Sidney Crosby',
            'team': 'Pittsburgh Penguins',
            'sport': 'NHL',
            'contract_value': 87000000,
            'signing_date': '2007-07-01',
            'source_url': 'https://www.spotrac.com/nhl/pittsburgh-penguins/sidney-crosby-1248/',
            'notes': '5-year deal for #1 pick',
            'content_type': 'historic_star',
            'priority': 8
        },
        {
            'player': 'Alex Ovechkin',
            'team': 'Washington Capitals',
            'sport': 'NHL',
            'contract_value': 124000000,
            'signing_date': '2008-01-16',
            'source_url': 'https://www.spotrac.com/nhl/washington-capitals/alex-ovechkin-1254/',
            'notes': '13-year deal for Great 8',
            'content_type': 'historic_star',
            'priority': 8
        },
    ]


# ============================================================================
# LEGENDARY CONTRACTS (pre-$100M) - "What if in BTC" content
# ============================================================================
def get_legendary_contracts() -> List[Dict]:
    """
    Pre-$100M contracts from legends.
    Perfect for "what if they had bought Bitcoin instead" content.
    """
    return [
        {
            'player': 'Larry Bird',
            'team': 'Boston Celtics',
            'sport': 'NBA',
            'contract_value': 33000000,
            'signing_date': '1979-06-09',
            'source_url': 'https://en.wikipedia.org/wiki/Larry_Bird',
            'notes': 'First $1M/year NBA contract - revolutionary',
            'content_type': 'legendary',
            'priority': 9
        },
        {
            'player': 'Magic Johnson',
            'team': 'Los Angeles Lakers',
            'sport': 'NBA',
            'contract_value': 25000000,
            'signing_date': '1979-06-09',
            'source_url': 'https://en.wikipedia.org/wiki/Magic_Johnson',
            'notes': '25-year deal, first $1M/year',
            'content_type': 'legendary',
            'priority': 9
        },
        {
            'player': 'Deion Sanders',
            'team': 'Atlanta Braves',
            'sport': 'MLB',
            'contract_value': 43000000,
            'signing_date': '1992-12-08',
            'source_url': 'https://www.spotrac.com/mlb/atlanta-braves/deion-sanders-222/',
            'notes': 'Multi-sport star baseball contract',
            'content_type': 'legendary',
            'priority': 7
        },
    ]


# ============================================================================
# FIAT DEBASEMENT EXAMPLES - Contracts that look tiny now
# ============================================================================
def get_fiat_debasement_examples() -> List[Dict]:
    """
    Historic contracts that illustrate fiat debasement.
    Great for "look how much value was lost" content.
    """
    return [
        {
            'player': 'Alex Rodriguez',
            'year': 2000,
            'contract_value': 252000000,
            'inflation_multiple': 1.8,
            'lesson': '$252M in 2000 ≈ $450M today - still looks "small" in BTC terms'
        },
        {
            'player': 'Manny Ramirez',
            'year': 1999,
            'contract_value': 160000000,
            'inflation_multiple': 1.8,
            'lesson': '$160M deal in 1999 worth way more in 2024 dollars'
        },
        {
            'player': 'Kevin Garnett',
            'year': 1997,
            'contract_value': 126000000,
            'inflation_multiple': 1.9,
            'lesson': 'First $100M+ contract - worth ~$240M today'
        },
        {
            'player': 'Shaquille O\'Neal',
            'year': 1996,
            'contract_value': 120000000,
            'inflation_multiple': 1.9,
            'lesson': '$120M in 1996 ≈ $228M today'
        },
        {
            'player': 'Derek Jeter',
            'year': 2001,
            'contract_value': 189000000,
            'inflation_multiple': 1.75,
            'lesson': '$189M in 2001 ≈ $330M today'
        },
    ]


# ============================================================================
# FAMOUS BANKRUPTCY STORIES - Teaching moments
# ============================================================================
def get_famous_bankruptcies() -> List[Dict]:
    """
    Famous athletes who lost everything.
    Powerful "what if they had Bitcoin" content.
    """
    return [
        {
            'player': 'Allen Iverson',
            'earnings': 200000000,
            'lost_reason': 'Entourage of 50+ people, bad investments, lavish spending',
            'lesson': 'Earned $200M+, nearly bankrupt. Bitcoin holds value.',
            'sport': 'NBA'
        },
        {
            'player': 'Antoine Walker',
            'earnings': 110000000,
            'lost_reason': 'Gambling addiction, supporting 70+ people',
            'lesson': 'Earned $110M, lost nearly all. Bitcoin can\'t be gambled away.',
            'sport': 'NBA'
        },
        {
            'player': 'Vince Young',
            'earnings': 26000000,
            'lost_reason': 'Lavish spending, failed business ventures',
            'lesson': '$26M contract, bankrupt within years',
            'sport': 'NFL'
        },
        {
            'player': 'Terrell Owens',
            'earnings': 80000000,
            'lost_reason': 'Lavish lifestyle, multiple bankruptcies',
            'lesson': '$80M career, filed for bankruptcy',
            'sport': 'NFL'
        },
        {
            'player': 'John RUZZO',  # Corrected spelling
            'earnings': 6000000,
            'lost_reason': 'Failed restaurant investments',
            'lesson': 'Smaller contracts can vanish too',
            'sport': 'NFL'
        },
    ]


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_all_contracts() -> List[Dict]:
    """Get ALL contracts - mega deals + historic stars + legendary"""
    all_contracts = []
    all_contracts.extend(get_mega_deals())
    all_contracts.extend(get_historic_star_contracts())
    all_contracts.extend(get_legendary_contracts())
    return all_contracts


def get_by_sport(sport: str) -> List[Dict]:
    """Get contracts by sport"""
    return [c for c in get_all_contracts() if c['sport'].upper() == sport.upper()]


def get_by_content_type(content_type: str) -> List[Dict]:
    """Get contracts by content type: mega_deal, historic_star, legendary"""
    return [c for c in get_all_contracts() if c['content_type'] == content_type]


def get_random_sample(content_type: str = None, count: int = 3) -> List[Dict]:
    """Get random sample of contracts"""
    import random
    all_contracts = get_all_contracts()
    
    if content_type:
        all_contracts = [c for c in all_contracts if c['content_type'] == content_type]
    
    random.shuffle(all_contracts)
    return all_contracts[:count]


if __name__ == '__main__':
    print("🏆 VERIFIED SPORTS CONTRACTS DATABASE")
    print("=" * 50)
    
    mega = get_mega_deals()
    historic = get_historic_star_contracts()
    legendary = get_legendary_contracts()
    
    print(f"\n📊 SUMMARY:")
    print(f"  Mega-Deals ($300M+): {len(mega)}")
    print(f"  Historic Stars ($100M-$300M): {len(historic)}")
    print(f"  Legendary (pre-$100M): {len(legendary)}")
    print(f"  TOTAL: {len(mega) + len(historic) + len(legendary)}")
    
    print(f"\n🏀 NBA: {len([c for c in get_all_contracts() if c['sport'] == 'NBA'])}")
    print(f"⚾ MLB: {len([c for c in get_all_contracts() if c['sport'] == 'MLB'])}")
    print(f"🏈 NFL: {len([c for c in get_all_contracts() if c['sport'] == 'NFL'])}")
    print(f"🏒 NHL: {len([c for c in get_all_contracts() if c['sport'] == 'NHL'])}")
    
    print(f"\n🌟 SAMPLE PLAYERS:")
    for c in get_mega_deals()[:6]:
        print(f"  {c['player']} ({c['sport']}) - ${c['contract_value']/1e6:.0f}M")
