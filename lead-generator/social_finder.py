#!/usr/bin/env python3
"""
Social Finder — finds Facebook & Instagram pages for leads without social URLs.
Uses Startpage search (allows automated queries, no API needed).

Usage:
  python3 social_finder.py                         # Process all unprocessed leads
  python3 social_finder.py --limit 20              # Process first 20 only
  python3 social_finder.py --dry-run --limit 5     # Preview without writing
  python3 social_finder.py --resume                # Skip leads already processed
"""

import json, subprocess, sys, re, time, os
from urllib.parse import quote
from urllib.request import Request, urlopen

SPREADSHEET_ID = "1Dl0VF4yASbUSXcuyS1km-Uo1fa6fZVfAYlRFl7h38gc"
USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

def read_sheet(range_str):
    r = subprocess.run([
        'gws', 'sheets', '+read', '--spreadsheet', SPREADSHEET_ID,
        '--range', range_str, '--format', 'json'
    ], capture_output=True, text=True, timeout=30)
    cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', r.stdout)
    return json.loads(cleaned)['values']

def write_sheet(range_str, values):
    import tempfile
    tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
    json.dump({'values': values, 'majorDimension': 'ROWS'}, tmp)
    tmp.close()
    r = subprocess.run([
        'gws', 'sheets', 'spreadsheets.values', 'update',
        '--params', json.dumps({
            'spreadsheetId': SPREADSHEET_ID,
            'range': range_str,
            'valueInputOption': 'USER_ENTERED'
        }),
        '-o', tmp.name
    ], capture_output=True, text=True, timeout=30)
    os.unlink(tmp.name)
    return r.returncode == 0

def search_startpage(query):
    """Search Startpage and return raw HTML."""
    url = f"https://www.startpage.com/sp/search?query={quote(query)}&language=EN"
    req = Request(url, headers={'User-Agent': USER_AGENT})
    try:
        with urlopen(req, timeout=15) as resp:
            return resp.read().decode('utf-8', errors='replace')
    except Exception as e:
        print(f"⚠ Search error: {e}")
        return ""

def extract_social_from_html(html):
    """Extract FB and IG profile URLs from raw HTML."""
    fb_urls = set()
    ig_urls = set()
    
    # Find all FB URLs
    for m in re.finditer(r'(?:https?://)?(?:www\.)?facebook\.com/([^\s<>\'\"&?/<>]+(?:/[^\s<>\'\"&?<>]+)?)', html, re.IGNORECASE):
        path = m.group(1).split('?')[0].split('&')[0].rstrip('/')
        # Skip branding/startpage artifacts
        if any(x in path.lower() for x in ['startpage', 'google', 'twitter', 'youtube']):
            continue
        # Skip non-profile pages
        if any(x in path.lower() for x in ['/photo', '/posts', '/story', '/share', '/events', '/groups', 'plugins', 'sharer', 'dialog', '/login', '/help', '/privacy', '/policy', '/about', 'developers', 'business', 'creators', 'meta']):
            continue
        if 'profile.php' in path.lower() and 'id=' not in path:
            continue
        url = f"https://facebook.com/{path}"
        if url.count('/') >= 3:
            fb_urls.add(url)
    
    # Find all IG URLs  
    for m in re.finditer(r'(?:https?://)?(?:www\.)?instagram\.com/([^\s<>\'\"&?/<>]+(?:/[^\s<>\'\"&?<>]+)?)', html, re.IGNORECASE):
        path = m.group(1).split('?')[0].split('&')[0].rstrip('/')
        if any(x in path.lower() for x in ['startpage', 'google', 'twitter']):
            continue
        if any(x in path.lower() for x in ['/p/', '/reel/', '/stories/', '/explore/', '/accounts/', '/login', '/help', '/developer']):
            continue
        url = f"https://instagram.com/{path}"
        ig_urls.add(url)
    
    return list(fb_urls), list(ig_urls)

def find_social_for_business(name, town):
    """Search Startpage for social profiles for this business."""
    search_name = name.replace('"', '').strip()
    location = town.strip()
    
    if not search_name or not location:
        return "", ""
    
    print(f"    Searching...", end=' ', flush=True)
    
    # Search with company name + town + social keywords
    html = search_startpage(f'"{search_name}" {location} facebook instagram')
    
    fb_urls, ig_urls = extract_social_from_html(html)
    
    # If nothing found, try a simpler search
    if not fb_urls and not ig_urls:
        html = search_startpage(f'"{search_name}" {location}')
        fb_urls, ig_urls = extract_social_from_html(html)
    
    # Pick the best FB URL
    fb_url = ""
    if fb_urls:
        # Prefer pages with full names over generic
        scored = []
        for url in fb_urls:
            path = url.lower().split('facebook.com/')[1] if 'facebook.com/' in url.lower() else ''
            # Prefer business-named pages over profile.php
            score = 0
            if 'profile.php' not in path: score += 2
            if '/people/' not in path: score += 1
            if '/pages/' in path: score += 1
            if search_name.lower().replace(' ', '') in path.replace(' ', '').replace('-', ''): score += 3
            scored.append((score, url))
        scored.sort(reverse=True)
        fb_url = scored[0][1]
    
    # Pick the best IG URL
    ig_url = ""
    if ig_urls:
        scored = []
        for url in ig_urls:
            path = url.lower().split('instagram.com/')[1] if 'instagram.com/' in url else ''
            score = 0
            if search_name.lower().replace(' ', '') in path.replace(' ', '').replace('-', ''): score += 3
            scored.append((score, url))
        scored.sort(reverse=True)
        ig_url = scored[0][1]
    
    fb_mark = '✅' if fb_url else '—'
    ig_mark = '✅' if ig_url else '—'
    print(f"FB:{fb_mark} IG:{ig_mark}")
    
    return fb_url, ig_url

def search_social_only(name, town, platform):
    """Dedicated search for a specific platform."""
    html = search_startpage(f'"{name}" {town} {platform}')
    fb_urls, ig_urls = extract_social_from_html(html)
    if platform == 'facebook':
        return fb_urls[0] if fb_urls else ""
    return ig_urls[0] if ig_urls else ""

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Find social media pages for leads')
    parser.add_argument('--limit', type=int, default=0, help='Process first N leads only')
    parser.add_argument('--dry-run', action='store_true', help='Preview without writing')
    parser.add_argument('--resume', action='store_true', help='Skip leads that already have social URLs')
    args = parser.parse_args()
    
    print("📋 Reading lead data from Google Sheets...")
    all_rows = read_sheet('Leads!A2:O1196')
    print(f"   Read {len(all_rows)} leads")
    
    candidates = []
    for i, row in enumerate(all_rows):
        has_social = (len(row) > 10 and row[10].strip()) or (len(row) > 11 and row[11].strip())
        if args.resume and has_social:
            continue
        if not has_social:
            name = row[1] if len(row) > 1 else ''
            address = row[5] if len(row) > 5 else ''
            town = ''
            if address:
                parts = address.split(',')
                if len(parts) >= 2:
                    town = parts[-3].strip() if len(parts) >= 3 else parts[-2].strip()
            candidates.append({
                'row_index': i + 2,
                'name': name,
                'town': town,
            })
    
    print(f"   Leads without social URLs: {len(candidates)}")
    print()
    
    if args.limit:
        candidates = candidates[:args.limit]
        print(f"   Processing first {args.limit}...\n")
    
    if args.dry_run:
        print("🧪 DRY RUN — no data will be written\n")
    
    found_fb = 0
    found_ig = 0
    found_any = 0
    
    for idx, lead in enumerate(candidates):
        print(f"[{idx+1}/{len(candidates)}] {lead['name'][:42]:42s} | {lead['town'][:18]:18s}")
        fb_url, ig_url = find_social_for_business(lead['name'], lead['town'])
        
        if fb_url: found_fb += 1
        if ig_url: found_ig += 1
        if fb_url or ig_url:
            found_any += 1
            print(f"      FB: {fb_url}")
            print(f"      IG: {ig_url}")
            if not args.dry_run:
                write_sheet(f"Leads!K{lead['row_index']}:L{lead['row_index']}", [[fb_url, ig_url]])
                print(f"      ✅ Written to row {lead['row_index']}")
        
        time.sleep(1.5)  # Rate limit
    
    print(f"\n{'='*55}")
    print(f"Done! Searched {len(candidates)} leads")
    print(f"   Found FB: {found_fb}/{len(candidates)} ({found_fb*100//max(len(candidates),1)}%)")
    print(f"   Found IG: {found_ig}/{len(candidates)} ({found_ig*100//max(len(candidates),1)}%)")
    print(f"   Found any: {found_any}/{len(candidates)} ({found_any*100//max(len(candidates),1)}%)")
