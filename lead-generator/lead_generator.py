"""
Level Up Digital — Lead Generator v2
======================================
Uses Google Places API as the PRIMARY search engine for accurate business data,
then Brave Search API only for social media lookup on qualified leads.

Flow:
  1. Google Places Nearby Search → finds businesses by type + location
  2. Filter by reviews, rating, website status
  3. Brave Search → FB + IG lookup for qualified leads only
  4. Google Sheets → logs all results automatically

Run:
  python3 lead_generator.py
"""

import os
import re
import time
import json
import requests
import subprocess
from datetime import datetime
from urllib.parse import urlparse

# ─── YOUR API KEYS ────────────────────────────────────────────────────────────

BRAVE_API_KEY           = os.environ.get("BRAVE_API_KEY", "BSA42Y7KAuT2JbIsWjI1CUkm57PTxfi")
GOOGLE_PLACES_API_KEY   = os.environ.get("GOOGLE_PLACES_API_KEY", "AIzaSyAgmfVMDHDCbQdq06pCDiMCEeN-0lx-_d4")
SPREADSHEET_ID          = os.environ.get("LEAD_GEN_SPREADSHEET_ID", "1Dl0VF4yASbUSXcuyS1km-Uo1fa6fZVfAYlRFl7h38gc")
WORKSHEET_NAME          = "Leads"

# ─── LEAD FILTER CRITERIA ─────────────────────────────────────────────────────

MIN_REVIEWS             = 5
MAX_REVIEWS             = 500
MIN_RATING              = 4.0
SEARCH_RADIUS_METERS    = 8000   # ~5 mile radius per town center
OUTDATED_CUTOFF_YEAR    = 2022

# ─── NASSAU COUNTY TOWNS (lat/lng centers) ────────────────────────────────────

TOWNS = [
    {"name": "New Hyde Park",     "lat": 40.7354, "lng": -73.6885},
    {"name": "Mineola",           "lat": 40.7496, "lng": -73.6413},
    {"name": "Garden City",       "lat": 40.7268, "lng": -73.6330},
    {"name": "Floral Park",       "lat": 40.7220, "lng": -73.7021},
    {"name": "Elmont",            "lat": 40.6968, "lng": -73.7085},
    {"name": "Valley Stream",     "lat": 40.6643, "lng": -73.7085},
    {"name": "Lynbrook",          "lat": 40.6559, "lng": -73.6735},
    {"name": "Rockville Centre",  "lat": 40.6587, "lng": -73.6407},
    {"name": "Hempstead",         "lat": 40.7062, "lng": -73.6187},
    {"name": "Westbury",          "lat": 40.7554, "lng": -73.5874},
    {"name": "Hicksville",        "lat": 40.7685, "lng": -73.5252},
    {"name": "Plainview",         "lat": 40.7768, "lng": -73.4674},
    {"name": "Syosset",           "lat": 40.8232, "lng": -73.5021},
    {"name": "Great Neck",        "lat": 40.8001, "lng": -73.7329},
    {"name": "Port Washington",   "lat": 40.8257, "lng": -73.6985},
    {"name": "Manhasset",         "lat": 40.7957, "lng": -73.6968},
    {"name": "Roslyn",            "lat": 40.7993, "lng": -73.6474},
    {"name": "Bethpage",          "lat": 40.7546, "lng": -73.4835},
    {"name": "Massapequa",        "lat": 40.6776, "lng": -73.4735},
    {"name": "Oceanside",         "lat": 40.6387, "lng": -73.6368},
    {"name": "Baldwin",           "lat": 40.6557, "lng": -73.6107},
    {"name": "Freeport",          "lat": 40.6576, "lng": -73.5835},
    {"name": "Merrick",           "lat": 40.6593, "lng": -73.5496},
    {"name": "Wantagh",           "lat": 40.6615, "lng": -73.5096},
    {"name": "Levittown",         "lat": 40.7257, "lng": -73.5135},
]

# ─── INDUSTRY TYPES ───────────────────────────────────────────────────────────
# Uses Google Places "type" field where possible, otherwise keyword search

TIER_1 = [
    "pressure_washing_service",
    "painter",
    "handyman",
]

TIER_2 = [
    "landscaper",
    "lawn_care_service",
    "roofing_contractor",
]

TIER_3 = [
    "electrician",
    "hvac_contractor",
    "appliance_repair_service",
    "locksmith",
    "pest_control_service",
]

# ─── GOOGLE SHEETS (via gws CLI) ─────────────────────────────────────────────

HEADERS = [
    "Date Found", "Business Name", "Industry", "Phone", "Email",
    "Address", "Reviews", "Rating", "Website Status", "Website URL",
    "Facebook", "Instagram", "Outreach Done?", "Contact Method", "Notes",
]


def init_sheet():
    """Connect to Google Sheets using gws CLI."""
    try:
        result = subprocess.run(
            ["gws", "sheets", "spreadsheets", "get", "--params", json.dumps({"spreadsheetId": SPREADSHEET_ID})],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            print(f"   ❌ GWS connection failed: {result.stderr}")
            return None
        return SPREADSHEET_ID
    except Exception as e:
        print(f"   ❌ Google Sheets connection failed: {e}")
        return None


def get_logged_names(sheet_id):
    """Return set of already-logged business names (lowercase) to skip duplicates."""
    try:
        result = subprocess.run(
            ["gws", "sheets", "spreadsheets", "values", "get", "--params", json.dumps({"spreadsheetId": sheet_id, "range": "Leads!B:B"})],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            return set()
        data = json.loads(result.stdout)
        values = data.get("values", [])
        return {row[0].lower().strip() for row in values[1:] if len(row) > 0}
    except:
        return set()


def append_lead(sheet_id, row):
    """Append a lead row to the sheet via gws."""
    try:
        result = subprocess.run(
            ["gws", "sheets", "spreadsheets", "values", "append", "--params", json.dumps({
                "spreadsheetId": sheet_id,
                "range": "Leads!A:O",
                "valueInputOption": "USER_ENTERED"
            }), "--json", json.dumps({"values": [row]})],
            capture_output=True, text=True, timeout=15
        )
        return result.returncode == 0
    except Exception as e:
        print(f"      ⚠️  Sheet write error: {e}")
        return False


# ─── GOOGLE PLACES API ────────────────────────────────────────────────────────

def places_nearby_search(lat, lng, keyword, radius=SEARCH_RADIUS_METERS):
    """
    Search for businesses near a lat/lng using the Places Nearby Search endpoint.
    Returns a list of place results.
    """
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    results = []
    params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "keyword": keyword,
        "key": GOOGLE_PLACES_API_KEY,
    }

    while True:
        try:
            resp = requests.get(url, params=params, timeout=10)
            data = resp.json()
            results.extend(data.get("results", []))

            # Handle pagination (Places returns max 20 per page, up to 60 total)
            next_token = data.get("next_page_token")
            if next_token:
                time.sleep(2)  # Required delay before using next_page_token
                params = {"pagetoken": next_token, "key": GOOGLE_PLACES_API_KEY}
            else:
                break
        except Exception as e:
            print(f"   ⚠️  Places search error: {e}")
            break

    return results


def get_place_details(place_id):
    """
    Get detailed info for a place: phone number, website, full address.
    """
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "name,formatted_phone_number,website,formatted_address",
        "key": GOOGLE_PLACES_API_KEY,
    }
    try:
        resp = requests.get(url, params=params, timeout=10)
        return resp.json().get("result", {})
    except:
        return {}


# ─── WEBSITE STATUS CHECK ─────────────────────────────────────────────────────

def check_website(url):
    """
    Returns (status_label, url).
    Status: NO WEBSITE | OUTDATED (YYYY) | BASIC/TEMPLATE | BROKEN/DOWN | HAS WEBSITE
    """
    if not url:
        return "NO WEBSITE", ""

    template_platforms = [
        "wix.com", "weebly.com", "wordpress.com", "godaddysites.com",
        "sites.google.com", "squarespace.com", "yolasite.com",
    ]
    for p in template_platforms:
        if p in url:
            return "BASIC/TEMPLATE SITE", url

    try:
        resp = requests.get(url, timeout=8, allow_redirects=True,
                            headers={"User-Agent": "Mozilla/5.0"})
        content = resp.text.lower()

        # Look for copyright year in page content
        year_matches = re.findall(r'(?:©|copyright)[^\d]*(\d{4})', content)
        if year_matches:
            latest = max(int(y) for y in year_matches if 2000 <= int(y) <= 2030)
            if latest < OUTDATED_CUTOFF_YEAR:
                return f"OUTDATED ({latest})", url

        # Check Last-Modified header
        lm = resp.headers.get("Last-Modified", "")
        if lm:
            try:
                from email.utils import parsedate
                d = parsedate(lm)
                if d and d[0] < OUTDATED_CUTOFF_YEAR:
                    return f"OUTDATED ({d[0]})", url
            except:
                pass

        return "HAS WEBSITE", url

    except requests.exceptions.ConnectionError:
        return "BROKEN/DOWN", url
    except Exception:
        return "BROKEN/DOWN", url


# ─── SOCIAL MEDIA SEARCH (BRAVE) ─────────────────────────────────────────────

def brave_search(query, count=5):
    """Fire a Brave Search API query, return list of result URLs."""
    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "Accept": "application/json",
        "X-Subscription-Token": BRAVE_API_KEY,
    }
    params = {"q": query, "count": count, "country": "us"}
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=10)
        resp.raise_for_status()
        return [r.get("url", "") for r in resp.json().get("web", {}).get("results", [])]
    except Exception as e:
        print(f"   ⚠️  Brave error: {e}")
        return []


def find_social_media(name, town):
    """Search for FB and IG pages for a qualified lead. Returns (fb_url, ig_url)."""
    facebook, instagram = "", ""

    # Facebook
    fb_urls = brave_search(f'"{name}" {town} site:facebook.com')
    time.sleep(0.5)
    for u in fb_urls:
        if "facebook.com" in u and "/pg/" not in u and "search" not in u and "login" not in u:
            facebook = u
            break

    # Instagram
    ig_urls = brave_search(f'"{name}" {town} site:instagram.com')
    time.sleep(0.5)
    for u in ig_urls:
        if "instagram.com" in u and "/p/" not in u and "explore" not in u and "login" not in u:
            instagram = u
            break

    return facebook, instagram


# ─── CORE LOGIC ───────────────────────────────────────────────────────────────

def qualifies(rating, reviews, website_status):
    """Return True if this business meets lead criteria."""
    if rating < MIN_RATING:
        return False
    if not (MIN_REVIEWS <= reviews <= MAX_REVIEWS):
        return False
    if website_status == "HAS WEBSITE":
        return False
    return True


def process_town(town, industries, sheet_id, logged_names, session_log):
    """Run all industry searches for one town, return count of leads added."""
    leads = 0
    print(f"\n📍 {town['name']}")

    for industry in industries:
        keyword = industry.replace("_", " ")
        print(f"   🔍 {keyword}...", end=" ", flush=True)

        results = places_nearby_search(town["lat"], town["lng"], keyword)
        time.sleep(0.2)

        found = 0
        for place in results:
            name = place.get("name", "").strip()
            vicinity = place.get("vicinity", "").lower()
            town_name = town["name"].lower()
            
            # Skip if business isn't actually in this town (Places can return nearby results)
            if town_name not in vicinity and town_name not in name.lower():
                continue
                
            if not name or name.lower() in logged_names:
                continue

            rating  = place.get("rating", 0)
            reviews = place.get("user_ratings_total", 0)

            # Quick pre-filter before expensive detail call
            if rating < MIN_RATING or reviews < MIN_REVIEWS or reviews > MAX_REVIEWS:
                continue

            place_id = place.get("place_id", "")
            details = get_place_details(place_id)
            time.sleep(0.3)

            phone   = details.get("formatted_phone_number", "")
            website = details.get("website", "")
            address = details.get("formatted_address", "")

            website_status, website_url = check_website(website)

            if not qualifies(rating, reviews, website_status):
                continue

            # ✅ Qualified lead — now check social media
            print(f"\n      ✅ {name} ({reviews} reviews, {rating}★, {website_status})")
            print(f"         Searching social media...", end=" ", flush=True)
            facebook, instagram = find_social_media(name, town["name"])
            time.sleep(0.2)

            social_note = []
            if instagram:
                social_note.append("Has IG → DM first")
            if facebook:
                social_note.append("Has FB")
            if not instagram and not facebook:
                social_note.append("No social found")
            if "OUTDATED" in website_status or "BROKEN" in website_status:
                social_note.append(f"Site issue: {website_status}")

            print("done")

            row = [
                datetime.now().strftime("%Y-%m-%d"),
                name,
                keyword,
                phone,
                "",                          # Email — fill manually
                address,
                str(reviews),
                str(rating),
                website_status,
                website_url,
                facebook,
                instagram,
                "N",                         # Outreach done
                "",                          # Contact method
                " | ".join(social_note),
            ]

            if sheet_id and append_lead(sheet_id, row):
                logged_names.add(name.lower())
                session_log.append(f"{name} — {town['name']} ({keyword})")
                leads += 1
                found += 1
                time.sleep(0.3)

        if found == 0:
            print("no new leads")
        time.sleep(1)

    return leads


# ─── SESSION RUNNER ───────────────────────────────────────────────────────────

def run_session(town_indices=None, industries=None, tier="1"):
    """
    Run a prospecting session.

    Args:
        town_indices : list of ints — which towns from TOWNS list to search.
                       Default: [0, 1, 2] (first 3 towns)
        industries   : explicit list of industry keywords (overrides tier)
        tier         : "1", "2", or "3" — selects predefined industry tier
    """
    print("\n" + "═"*60)
    print("  LEVEL UP DIGITAL — LEAD GENERATOR v2")
    print(f"  {datetime.now().strftime('%A %B %d, %Y  %I:%M %p')}")
    print("═"*60)

    # Resolve towns
    indices = town_indices if town_indices is not None else [0, 1, 2]
    towns   = [TOWNS[i] for i in indices if i < len(TOWNS)]

    # Resolve industries
    if industries is None:
        industries = {"1": TIER_1, "2": TIER_2, "3": TIER_3}.get(str(tier), TIER_1)

    print(f"\n🗺  Towns    : {', '.join(t['name'] for t in towns)}")
    print(f"🏢 Industries: {', '.join(i.replace('_',' ') for i in industries)}")

    # Connect to Sheets
    print("\n📊 Connecting to Google Sheets...")
    sheet_id = init_sheet()
    print("   ✅ Connected!" if sheet_id else "   ⚠️  Sheets unavailable — printing to console")

    logged_names = get_logged_names(sheet_id) if sheet_id else set()
    print(f"   Already logged: {len(logged_names)} businesses")

    # Run searches
    total    = 0
    session_log = []

    for town in towns:
        total += process_town(town, industries, sheet_id, logged_names, session_log)
        time.sleep(2)

    # Summary
    print("\n" + "═"*60)
    print(f"  SESSION DONE — {total} new lead(s) added to sheet")
    print("═"*60)
    if session_log:
        for entry in session_log:
            print(f"  ✅ {entry}")
    else:
        print("  No new qualifying leads found this session.")

    if SPREADSHEET_ID != "YOUR_GOOGLE_SHEET_ID_HERE":
        print(f"\n📊 https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}\n")

    # ─── EMAIL NOTIFICATION ───────────────────────────────────────────────────
    send_email_notification(total, session_log)


def send_email_notification(leads_found, session_log):
    """Send email notification with results."""
    import subprocess
    
    email_script = "/home/clawd/clawd/lib/send-email.js"
    subject = f"Lead Generator: {leads_found} new leads"
    body = f"Lead Generator task completed - {leads_found} new entries"
    
    try:
        result = subprocess.run(
            ["node", email_script, "--to", "terryhuangjr@gmail.com", "--subject", subject, "--body", body],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            print("   📧 Email notification sent")
        else:
            print(f"   ⚠️  Email failed: {result.stderr}")
    except Exception as e:
        print(f"   ⚠️  Email error: {e}")


# ─── STATE TRACKING ───────────────────────────────────────────────────────────

STATE_FILE = "/home/clawd/.lead-gen-state.json"


def load_state():
    """Load saved state for rotation."""
    try:
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    except:
        return {"town_index": 0, "tier": 1}


def save_state(state):
    """Save state for next run."""
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)


def get_next_run_params(num_towns=3):
    """Get next town indices and tier, rotating through all options."""
    state = load_state()
    
    # Get current tier and rotate: 1 → 2 → 3 → 1
    current_tier = state.get("tier", 1)
    next_tier = current_tier + 1 if current_tier < 3 else 1
    
    # Get current town index and rotate through all 25 towns
    town_index = state.get("town_index", 0) % len(TOWNS)
    
    # Calculate town indices for this run
    town_indices = list(range(town_index, town_index + num_towns))
    town_indices = [i % len(TOWNS) for i in town_indices]
    
    # Update state for next run
    next_town_index = (town_index + num_towns) % len(TOWNS)
    save_state({"town_index": next_town_index, "tier": next_tier})
    
    return town_indices, next_tier


# ─── RUN ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    
    # Parse args: python3 lead_generator.py [tier] [num_towns]
    # If no args, use automatic rotation (tier and towns rotate automatically)
    num_towns = 3
    
    if len(sys.argv) > 1:
        tier = sys.argv[1]
    else:
        # Auto-rotate: get next tier and towns from state
        town_indices, tier = get_next_run_params(num_towns)
        print(f"Auto-rotating: Tier {tier}, Towns {town_indices}")
    
    if len(sys.argv) > 2:
        num_towns = int(sys.argv[2])
    
    if len(sys.argv) <= 1:
        # Using auto-rotation, town_indices already calculated
        print(f"Running tier {tier} with towns: {[TOWNS[i]['name'] for i in town_indices]}")
        run_session(town_indices=town_indices, tier=str(tier))
    else:
        towns = list(range(num_towns))
        print(f"Running tier {tier} with {num_towns} towns")
        run_session(town_indices=towns, tier=tier)
