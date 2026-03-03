#!/usr/bin/env python3
"""
Web scraper using scrapling for jett-daily-research
Fetches pages fast (774x faster than BeautifulSoup)
"""

import sys
import json
import argparse
from scrapling import Fetcher

DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

def fetch_url(url, selector=None):
    """Fetch a URL and optionally extract using CSS selector"""
    try:
        spider = Fetcher()
        response = spider.get(url, headers=DEFAULT_HEADERS)
        
        if selector:
            items = response.css(selector).extract()
            return '\n'.join(items)
        else:
            return response.text
    except Exception as e:
        return f"Error: {str(e)}"

def search_spotrac_contracts(sport, year=None):
    """Search Spotrac for recent contracts"""
    base_url = f"https://www.spotrac.com/{sport.lower()}/contracts/"
    if year:
        base_url += f"?year={year}"
    
    # Get top contracts - extract player names and values
    selector = ".team-name a::text, .contract-value::text, .total-value::text"
    return fetch_url(base_url, selector)

def fetch_spotrac_player(player, sport):
    """Fetch a specific player's contract from Spotrac"""
    # Build search URL
    player_slug = player.lower().replace(' ', '-')
    sport_lower = sport.lower()
    
    if sport_lower == 'nfl':
        url = f"https://www.spotrac.com/contracts/nfl/{player_slug}/"
    elif sport_lower == 'nba':
        url = f"https://www.spotrac.com/contracts/nba/{player_slug}/"
    elif sport_lower == 'mlb':
        url = f"https://www.spotrac.com/contracts/mlb/{player_slug}/"
    else:
        url = f"https://www.spotrac.com/contracts/{sport_lower}/{player_slug}/"
    
    # Extract key contract info
    selector = "span.label::text, span.value::text, .contract-value::text"
    return fetch_url(url, selector)

def fetch_wikipedia_bitcoin(topic):
    """Fetch Bitcoin topic from Wikipedia"""
    topic_map = {
        'pizza': 'Bitcoin_Pizza_Day',
        'halving': 'Bitcoin#Halving',
        'genesis': 'Genesis_block',
        'mtgox': 'Mt._Gox',
        'etf': 'Bitcoin ETF',
        'saylor': 'Michael_Saylor',
        'adoption': 'Bitcoin#Adoption',
        'supply': 'Bitcoin#Supply'
    }
    
    slug = topic_map.get(topic.lower(), topic.replace(' ', '_'))
    url = f"https://en.wikipedia.org/wiki/{slug}"
    
    selector = "p::text, h2::text, h3::text"
    return fetch_url(url, selector)

def main():
    parser = argparse.ArgumentParser(description='Web scraper for Jett research')
    parser.add_argument('--spotrac-player', help='Fetch player contract from Spotrac')
    parser.add_argument('--spotrac-sport', help='Sport for Spotrac search (nfl, nba, mlb)')
    parser.add_argument('--bitcoin', help='Bitcoin topic from Wikipedia')
    parser.add_argument('--url', help='Fetch any URL')
    parser.add_argument('--selector', help='CSS selector for extraction')
    
    args = parser.parse_args()
    
    result = ""
    
    if args.spotrac_player and args.spotrac_sport:
        result = fetch_spotrac_player(args.spotrac_player, args.spotrac_sport)
    elif args.spotrac_sport:
        result = search_spotrac_contracts(args.spotrac_sport)
    elif args.bitcoin:
        result = fetch_wikipedia_bitcoin(args.bitcoin)
    elif args.url:
        result = fetch_url(args.url, args.selector)
    
    print(result)

if __name__ == '__main__':
    main()
