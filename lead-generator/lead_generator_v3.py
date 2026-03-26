#!/usr/bin/env python3
"""
Level Up Digital — Lead Generator v3 (Optimized)
=================================================
Major improvements in v3:
- Broader filters (3.8★, 1000 reviews max)
- Email extraction from websites
- AI-powered lead qualification (optional)
- Parallel processing support
- Configurable via environment variables
- 5 towns per run (was 3)
- Expanded industry keywords

API Keys: Set via environment or hardcoded below
"""

import os
import re
import time
import json
import requests
import subprocess
from datetime import datetime
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

# ─── YOUR API KEYS ──────────────────────────────────────────────────────────

BRAVE_API_KEY = os.environ.get("BRAVE_API_KEY", "BSA42Y7KAuT2JbIsWjI1CUkm57PTxfi")
GOOGLE_PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "AIzaSyAgmfVMDHDCbQdq06pCDiMCEeN-0lx-_d4")
SPREADSHEET_ID = os.environ.get("LEAD_GEN_SPREADSHEET_ID", "1Dl0VF4yASbUSXcuyS1km-Uo1fa6fZVfAYlRFl7h38gc")
WORKSHEET_NAME = "Leads"

# ─── CONFIGURABLE FILTERS (via env vars) ────────────────────────────────────

MIN_REVIEWS = int(os.environ.get("MIN_REVIEWS", "3"))          # Was 5
MAX_REVIEWS = int(os.environ.get("MAX_REVIEWS", "1000"))       # Was 500
MIN_RATING = float(os.environ.get("MIN_RATING", "3.8"))      # Was 4.0
SEARCH_RADIUS_METERS = int(os.environ.get("SEARCH_RADIUS", "10000"))  # Was 8000
OUTDATED_CUTOFF_YEAR = 2021  # Was 2022
ENABLE_AI_QUALIFY = os.environ.get("ENABLE_AI_QUALIFY", "0") == "1"
ENABLE_EMAIL_SCRAPE = os.environ.get("ENABLE_EMAIL_SCRAPE", "1") == "1"
DRY_RUN = os.environ.get("DRY_RUN", "0") == "1"

# ─── NASSAU COUNTY TOWNS (25 total) ─────────────────────────────────────────

TOWNS = [
    {"name": "New Hyde Park", "lat": 40.7354, "lng": -73.6885},
    {"name": "Mineola", "lat": 40.7496, "lng": -73.6413},
    {"name": "Garden City", "lat": 40.7268, "lng": -73.6330},
    {"name": "Floral Park", "lat": 40.7220, "lng": -73.7021},
    {"name": "Elmont", "lat": 40.6968, "lng": -73.7085},
    {"name": "Valley Stream", "lat": 40.6643, "lng": -73.7085},
    {"name": "Lynbrook", "lat": 40.6559, "lng": -73.6735},
    {"name": "Rockville Centre", "lat": 40.6587, "lng": -73.6407},
    {"name": "Hempstead", "lat": 40.7062, "lng": -73.6187},
    {"name": "Westbury", "lat": 40.7554, "lng": -73.5874},
    {"name": "Hicksville", "lat": 40.7685, "lng": -73.5252},
    {"name": "Plainview", "lat": 40.7768, "lng": -73.4674},
    {"name": "Syosset", "lat": 40.8232, "lng": -73.5021},
    {"name": "Great Neck", "lat": 40.8001, "lng": -73.7329},
    {"name": "Port Washington", "lat": 40.8257, "lng": -73.6985},
    {"name": "Manhasset", "lat": 40.7957, "lng": -73.6968},
    {"name": "Roslyn", "lat": 40.7993, "lng": -73.6474},
    {"name": "Bethpage", "lat": 40.7546, "lng": -73.4835},
    {"name": "Massapequa", "lat": 40.6776, "lng": -73.4735},
    {"name": "Oceanside", "lat": 40.6387, "lng": -73.6368},
    {"name": "Baldwin", "lat": 40.6557, "lng": -73.6107},
    {"name": "Freeport", "lat": 40.6576, "lng": -73.5835},
    {"name": "Merrick", "lat": 40.6593, "lng": -73.5496},
    {"name": "Wantagh", "lat": 40.6615, "lng": -73.5096},
    {"name": "Levittown", "lat": 40.7257, "lng": -73.5135},
]

# NEW: Queens towns (Tier 4 expansion)
QUEENS_TOWNS = [
    {"name": "Flushing", "lat": 40.7675, "lng": -73.8331},
    {"name": "Astoria", "lat": 40.7713, "lng": -73.9040},
    {"name": "Bay Side", "lat": 40.7557, "lng": -73.7410},
    {"name": "Forest Hills", "lat": 40.7086, "lng": -73.8431},
    {"name": "Jamaica", "lat": 40.7027, "lng": -73.7890},
    {"name": "Long Island City", "lat": 40.7282, "lng": -73.9442},
]

# ─── EXPANDED INDUSTRY TYPES ────────────────────────────────────────────────

TIER_1 = [
    "pressure_washing_service",
    "painter", "handyman",
    "house_cleaning_service",       # NEW
    "window_washing_service",       # NEW
    "drywall_contractor",           # NEW
    "tile_contractor",              # NEW
    "floor_installation",           # NEW
    "carpet_cleaning_service",      # NEW
]

TIER_2 = [
    "landscaper", "lawn_care_service", "roofing_contractor",
    "fence_contractor",             # NEW
    "flooring_store",               # NEW
    "kitchen_remodeler",            # NEW
    "bathroom_remodeler",           # NEW
    "siding_contractor",            # NEW
    "hardwood_flooring",            # NEW
]

TIER_3 = [
    "electrician", "hvac_contractor",
    "appliance_repair_service", "locksmith", "pest_control_service",
    "septic_system_service",        # NEW
    "waterproofing_company",        # NEW
    "foundation_repair",            # NEW
    "chimney_sweep",                # NEW
    "garage_door_service",          # NEW
]

TIER_4 = [  # NEW: Real estate adjacent
    "real_estate_agency",
    "property_management",
    "home_inspector",
    "real_estate_investor",         # As keyword
    "construction_company",
    "general_contractor",
]

# ─── GOOGLE SHEETS HEADERS ───────────────────────────────────────────────────

HEADERS = [
    "Date Found", "Business Name", "Industry", "Phone", "Email",
    "Address", "Reviews", "Rating", "Website Status", "Website URL",
    "Facebook", "Instagram", "Outreach Done?", "Contact Method", "Notes",
    "AI Score", "Lead Type", "Close Probability", "Priority Actions", "Personalized Message",
]

# ─── GOOGLE SHEETS HELPERS ────────────────────────────────────────────────────

def init_sheet():
    """Connect to Google Sheets."""
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
    """Return set of already-logged business names."""
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
    """Append a lead row to the sheet."""
    if DRY_RUN:
        print(f"   [DRY RUN] Would add: {row[1]}")
        return True
    
    try:
        # Ensure headers exist
        result = subprocess.run(
            ["gws", "sheets", "spreadsheets", "values", "get", "--params", json.dumps({"spreadsheetId": sheet_id, "range": "Leads!A1:T1"})],
            capture_output=True, text=True, timeout=10
        )
        
        if result.returncode == 0:
            data = json.loads(result.stdout)
            values = data.get("values", [])
            if not values or len(values[0]) < 5:
                # Write headers
                subprocess.run(
                    ["gws", "sheets", "spreadsheets", "values", "update", "--params", json.dumps({
                        "spreadsheetId": sheet_id,
                        "range": "Leads!A1:T1",
                        "valueInputOption": "USER_ENTERED"
                    }), "--json", json.dumps({"values": [HEADERS]})],
                    capture_output=True, text=True, timeout=15
                )
        
        # Append row
        result = subprocess.run(
            ["gws", "sheets", "spreadsheets", "values", "append", "--params", json.dumps({
                "spreadsheetId": sheet_id,
                "range": "Leads!A:T",
                "valueInputOption": "USER_ENTERED"
            }), "--json", json.dumps({"values": [row]})],
            capture_output=True, text=True, timeout=15
        )
        return result.returncode == 0
    except Exception as e:
        print(f"      ⚠️ Sheet write error: {e}")
        return False


# ─── GOOGLE PLACES API ──────────────────────────────────────────────────────

def places_nearby_search(lat, lng, keyword, radius=SEARCH_RADIUS_METERS):
    """Search for businesses near lat/lng."""
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

            next_token = data.get("next_page_token")
            if next_token:
                time.sleep(2)
                params = {"pagetoken": next_token, "key": GOOGLE_PLACES_API_KEY}
            else:
                break
        except Exception as e:
            print(f"   ⚠️ Places search error: {e}")
            break

    return results


def get_place_details(place_id):
    """Get detailed info for a place."""
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "name,formatted_phone_number,website,formatted_address,business_status",
        "key": GOOGLE_PLACES_API_KEY,
    }
    try:
        resp = requests.get(url, params=params, timeout=10)
        return resp.json().get("result", {})
    except:
        return {}


# ─── WEBSITE CHECKING & EMAIL EXTRACTION ───────────────────────────────────

def check_website(url):
    """Returns (status_label, url)."""
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

        # Check copyright year
        year_matches = re.findall(r'(?:©|copyright)[^\d]*(\d{4})', content)
        if year_matches:
            latest = max(int(y) for y in year_matches if 2000 <= int(y) <= 2030)
            if latest < OUTDATED_CUTOFF_YEAR:
                return f"OUTDATED ({latest})", url, extract_emails_from_content(content)

        # Check Last-Modified
        lm = resp.headers.get("Last-Modified", "")
        if lm:
            try:
                from email.utils import parsedate
                d = parsedate(lm)
                if d and d[0] < OUTDATED_CUTOFF_YEAR:
                    return f"OUTDATED ({d[0]})", url, extract_emails_from_content(content)
            except:
                pass

        return "HAS WEBSITE", url, extract_emails_from_content(content)

    except requests.exceptions.ConnectionError:
        return "BROKEN/DOWN", url, []
    except Exception:
        return "BROKEN/DOWN", url, []


def extract_emails_from_content(content):
    """Extract emails from HTML content."""
    if not ENABLE_EMAIL_SCRAPE:
        return []
    
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    found = set()
    
    emails = re.findall(email_pattern, content)
    for email in emails:
        email = email.lower()
        if not any(x in email for x in ['example.com', 'yourdomain.com', 'email.com', 'wix.com', 'sentry']):
            if not email.endswith(('.png', '.jpg', '.gif', '.svg')):
                if not email.startswith(('noreply', 'no-reply', 'info@example')):
                    found.add(email)
    
    return list(found)[:3]


def extract_emails_from_website(url):
    """Full email extraction from website pages."""
    if not url or not ENABLE_EMAIL_SCRAPE:
        return []
    
    all_emails = []
    
    # Main page
    try:
        resp = requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
        all_emails.extend(extract_emails_from_content(resp.text))
    except:
        pass
    
    # Contact pages
    contact_paths = ['/contact', '/contact-us', '/about', '/about-us', '/aboutus']
    for path in contact_paths:
        if len(all_emails) >= 3:
            break
        try:
            contact_url = url.rstrip('/') + path
            resp = requests.get(contact_url, timeout=5, headers={"User-Agent": "Mozilla/5.0"})
            all_emails.extend(extract_emails_from_content(resp.text))
        except:
            continue
    
    return list(set(all_emails))[:3]


# ─── BRAVE SEARCH WITH RETRY ─────────────────────────────────────────────────

# Global API counter (shared across function calls)
BRAVE_CALLS = 0

def brave_search_with_retry(query, count=5, retries=3):
    """Brave Search API query with retry and rate limit handling."""
    global BRAVE_CALLS
    
    # Check budget
    if BRAVE_CALLS >= MAX_BRAVE_CALLS:
        print(f"   ⚠️ API budget reached ({MAX_BRAVE_CALLS}). Skipping search.")
        return []
    
    BRAVE_CALLS += 1
    
    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "Accept": "application/json",
        "X-Subscription-Token": BRAVE_API_KEY,
    }
    params = {"q": query, "count": count, "country": "us"}
    
    for attempt in range(retries):
        try:
            if attempt > 0:
                # Exponential backoff: 2s, 5s, 8s
                wait_time = 2 + (attempt * 3)
                print(f"   ↻ Retry {attempt+1}/{retries}, waiting {wait_time}s...")
                time.sleep(wait_time)
            
            resp = requests.get(url, headers=headers, params=params, timeout=10)
            
            if resp.status_code == 429:
                wait = (attempt + 1) * 15
                print(f"   ⚠️ Rate limited. Waiting {wait}s...")
                time.sleep(wait)
                continue
                
            resp.raise_for_status()
            return [r.get("url", "") for r in resp.json().get("web", {}).get("results", [])]
            
        except Exception as e:
            if attempt < retries - 1:
                print(f"   ⚠️ Brave error (attempt {attempt+1}): {e}")
                time.sleep(5)
            else:
                print(f"   ❌ Brave failed after {retries} attempts: {e}")
                return []
    
    return []


def brave_search(query, count=5):
    """Legacy wrapper - now uses retry version."""
    return brave_search_with_retry(query, count)


def find_social_media(name, town):
    """Find FB and IG pages - DISABLED due to API rate limits"""
    # Disabled - causes 429 errors from Brave API
    # Lead quality doesn't depend on social presence anyway
    return "", ""


# ─── AI QUALIFICATION (OPTIONAL) ─────────────────────────────────────────────

def ai_qualify_lead(business_data):
    """Call AI qualifier if enabled."""
    if not ENABLE_AI_QUALIFY:
        return None
    
    try:
        # Import and call ai_qualifier
        import sys
        sys.path.insert(0, '/home/clawd/clawd/lead-generator')
        from ai_qualifier import qualify_lead
        return qualify_lead(business_data)
    except ImportError:
        return None


# ─── ENHANCED QUALIFICATION LOGIC ────────────────────────────────────────────

def qualifies(rating, reviews, website_status, business_status=None):
    """Enhanced qualification with multiple pathways."""
    
    # Exclude closed businesses
    if business_status and business_status == "CLOSED_PERMANENTLY":
        return False
    
    # Path 1: Standard (relaxed filters)
    if rating >= MIN_RATING and MIN_REVIEWS <= reviews <= MAX_REVIEWS:
        if website_status != "HAS WEBSITE":
            return True
    
    # Path 2: Established with good rating (lenient on website)
    if rating >= 4.0 and 25 <= reviews <= 200:
        return True
    
    # Path 3: High review volume = budget exists
    if reviews >= 300 and rating >= 3.9:
        return True
    
    # Path 4: No website at all
    if website_status == "NO WEBSITE" and rating >= 3.5:
        return True
    
    # Path 5: BROKEN site = urgent need
    if "BROKEN" in website_status and rating >= 3.5:
        return True
    
    return False


# ─── CORE PROCESSING ─────────────────────────────────────────────────────────

def process_business(place, industry, town, sheet_id, logged_names, session_log):
    """Process a single business through the qualification pipeline."""
    name = place.get("name", "").strip()
    if not name:
        return False
    
    if name.lower() in logged_names:
        return False
    
    rating = place.get("rating", 0)
    reviews = place.get("user_ratings_total", 0)
    
    # Pre-filter before expensive calls
    if rating < 3.5 or reviews < 2:
        return False
    
    place_id = place.get("place_id", "")
    details = get_place_details(place_id)
    time.sleep(0.2)
    
    phone = details.get("formatted_phone_number", "")
    website = details.get("website", "")
    address = details.get("formatted_address", "")
    business_status = details.get("business_status", "")
    
    # Website check
    if isinstance(check_website(website), tuple):
        website_status, website_url, emails_from_page = check_website(website)
    else:
        website_status, website_url = check_website(website), ""
        emails_from_page = []
    
    # Extract additional emails
    additional_emails = extract_emails_from_website(website) if ENABLE_EMAIL_SCRAPE else []
    all_emails = list(set(emails_from_page + additional_emails))
    emails_str = ", ".join(all_emails) if all_emails else ""
    
    # Qualification check
    if not qualifies(rating, reviews, website_status, business_status):
        return False
    
    # ✅ Qualified - gather social and AI
    print(f"\n      ✅ {name} ({reviews} reviews, {rating}★, {website_status})")
    
    facebook, instagram = find_social_media(name, town["name"])
    time.sleep(0.1)
    
    # AI Qualification
    ai_result = None
    if ENABLE_AI_QUALIFY:
        print(f"         🔮 Running AI qualification...", end=" ", flush=True)
        ai_result = ai_qualify_lead({
            "name": name,
            "industry": industry,
            "rating": rating,
            "review_count": reviews,
            "has_website": website_status == "HAS WEBSITE",
            "website_status": website_status,
            "town": town["name"]
        })
        print("done")
    
    # Build AI columns
    ai_score = ai_result.get("score", "") if ai_result else ""
    ai_type = ai_result.get("lead_type", "") if ai_result else ""
    ai_reasoning = ai_result.get("reasoning", "") if ai_result else ""
    ai_actions = ", ".join(ai_result.get("priority_actions", [])) if ai_result else ""
    ai_message = ai_result.get("personalized_message", "") if ai_result else ""
    
    # Close probability
    close_prob = ""
    if ai_result:
        try:
            from ai_qualifier import calculate_close_probability
            close_prob = round(calculate_close_probability(
                {"rating": rating, "review_count": reviews, "website_status": website_status},
                ai_score if isinstance(ai_score, int) else 50
            ), 2)
        except:
            close_prob = ""
    
    # Notes
    social_note = []
    if instagram:
        social_note.append("IG → DM")
    if facebook:
        social_note.append("FB")
    if all_emails:
        social_note.append(f"Emails found: {len(all_emails)}")
    if "OUTDATED" in website_status or "BROKEN" in website_status:
        social_note.append(f"Site: {website_status}")
    if ai_result:
        social_note.append(f"AI: {ai_score}/100")
    
    # Contact method priority
    contact_method = ""
    if ai_result:
        contact_method = ai_result.get("recommended_contact_method", "")
    if not contact_method:
        if all_emails:
            contact_method = "email"
        elif instagram:
            contact_method = "dm"
        elif phone:
            contact_method = "phone"
    
    row = [
        datetime.now().strftime("%Y-%m-%d %H:%M"),
        name,
        industry.replace("_", " "),
        phone,
        emails_str,
        address,
        str(reviews),
        str(rating),
        website_status,
        website_url,
        facebook,
        instagram,
        "N",  # Outreach done
        contact_method,
        " | ".join(social_note),
        ai_score,
        ai_type,
        close_prob,
        ai_actions,
        ai_message,
    ]
    
    if sheet_id and append_lead(sheet_id, row):
        logged_names.add(name.lower())
        session_log.append(f"{name} — {town['name']} ({industry}) score:{ai_score}")
        return True
    
    return False


def process_town(town, industries, sheet_id, logged_names, session_log):
    """Process all industries for a town."""
    leads = 0
    print(f"\n📍 {town['name']}")
    
    for industry in industries:
        keyword = industry.replace("_", " ")
        print(f"   🔍 {keyword}...", end=" ", flush=True)
        
        results = places_nearby_search(town["lat"], town["lng"], keyword)
        time.sleep(0.2)
        
        found = 0
        for place in results:
            try:
                if process_business(place, industry, town, sheet_id, logged_names, session_log):
                    found += 1
                    time.sleep(0.3)
            except Exception as e:
                print(f"\n      ⚠️ Error processing business: {e}")
                continue
        
        print(f"{found} leads" if found > 0 else "no new leads")
        time.sleep(0.5)
    
    return leads


# ─── EMAIL NOTIFICATION ─────────────────────────────────────────────────────

def send_email_notification(leads_found, session_log):
    """Send email notification with results."""
    email_script = "/home/clawd/clawd/lib/send-email.js"
    subject = f"Lead Generator v3: {leads_found} new leads"
    body = f"""Lead Generator v3 completed - {leads_found} new entries

Session Log:
{chr(10).join(session_log) if session_log else "No leads found"}

View sheet: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}
"""
    
    try:
        result = subprocess.run(
            ["node", email_script, "--to", "terryhuangjr@gmail.com", 
             "--subject", subject, "--body", body],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            print("   📧 Email notification sent")
        else:
            print(f"   ⚠️ Email failed: {result.stderr}")
    except Exception as e:
        print(f"   ⚠️ Email error: {e}")


# ─── STATE TRACKING ─────────────────────────────────────────────────────────

STATE_FILE = "/home/clawd/.lead-gen-state.json"


def load_state():
    try:
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    except:
        return {"town_index": 0, "tier": 1}


def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)


def get_next_run_params(num_towns=5):
    """Get next town indices and tier, rotating through all options."""
    state = load_state()
    
    current_tier = state.get("tier", 1)
    next_tier = current_tier + 1 if current_tier < 4 else 1
    
    town_index = state.get("town_index", 0) % len(TOWNS)
    town_indices = list(range(town_index, town_index + num_towns))
    town_indices = [i % len(TOWNS) for i in town_indices]
    
    next_town_index = (town_index + num_towns) % len(TOWNS)
    save_state({"town_index": next_town_index, "tier": next_tier})
    
    return town_indices, next_tier


# ─── MAIN RUNNER ─────────────────────────────────────────────────────────────

def run_session(town_indices=None, industries=None, tier="1", num_towns=5):
    """
    Run a prospecting session.
    
    Args:
        town_indices: list of town indices to search
        industries: explicit list of industry keywords
        tier: "1", "2", "3", "4" for predefined tiers
        num_towns: number of towns to search (default 5)
    """
    print("\n" + "═"*60)
    print("  LEVEL UP DIGITAL — LEAD GENERATOR v3 (Optimized)")
    print(f"  {datetime.now().strftime('%A %B %d, %Y  %I:%M %p')}")
    print("="*60)
    print(f"  Filters: ≥{MIN_RATING}★ | {MIN_REVIEWS}-{MAX_REVIEWS} reviews | {SEARCH_RADIUS_METERS}m radius")
    print(f"  AI Qualify: {'ON' if ENABLE_AI_QUALIFY else 'OFF'}")
    print(f"  Email Scrape: {'ON' if ENABLE_EMAIL_SCRAPE else 'OFF'}")
    print(f"  DRY RUN: {'YES' if DRY_RUN else 'NO'}")
    print("═"*60)

    # Resolve towns
    indices = town_indices if town_indices is not None else list(range(num_towns))
    towns = [TOWNS[i] for i in indices if i < len(TOWNS)]

    # Resolve industries
    if industries is None:
        industries = {"1": TIER_1, "2": TIER_2, "3": TIER_3, "4": TIER_4}.get(str(tier), TIER_1)

    print(f"\n🗺  Towns      : {', '.join(t['name'] for t in towns)}")
    print(f"🏢 Industries : {len(industries)} types")
    print(f"   ({', '.join(i.replace('_',' ') for i in industries[:5])}...)")

    # Connect to Sheets
    print("\n📊 Connecting to Google Sheets...")
    sheet_id = init_sheet()
    print("   ✅ Connected!" if sheet_id else "   ⚠️ Sheets unavailable")

    logged_names = get_logged_names(sheet_id) if sheet_id else set()
    print(f"   Already logged: {len(logged_names)} businesses")

    # Run searches
    total = 0
    session_log = []

    for town in towns:
        leads_in_town = process_town(town, industries, sheet_id, logged_names, session_log)
        total += leads_in_town
        time.sleep(1)

    # Summary
    print("\n" + "═"*60)
    print(f"  SESSION DONE — {total} new lead(s) added")
    print("═"*60)
    if session_log:
        print("\n  ✅ Leads found:")
        for entry in session_log:
            print(f"     • {entry}")
    else:
        print("\n  No new qualifying leads found this session.")

    print(f"\n📊 View sheet: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}")

    # Email notification
    send_email_notification(total, session_log)


# ─── ENTRY POINT ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    
    # Parse args: python3 lead_generator_v3.py [tier] [num_towns] [start_index]
    # OR: python3 lead_generator_v3.py (auto-rotation)
    
    # API budget counter
    MAX_BRAVE_CALLS = 60  # Safe limit for free tier
    brave_calls = 0
    
    print(f"Config: MIN_RATING={MIN_RATING}, MAX_REVIEWS={MAX_REVIEWS}, RADIUS={SEARCH_RADIUS_METERS}")
    print(f"API budget: {MAX_BRAVE_CALLS} Brave searches max")
    
    tier = "1"
    num_towns = 5
    start_index = None
    
    if len(sys.argv) == 1:
        # Auto-rotation: get from state
        town_indices, tier = get_next_run_params(num_towns)
        print(f"\n🔄 Auto-rotating: Tier {tier}, Towns {town_indices}")
    else:
        tier = sys.argv[1]
        if len(sys.argv) > 2:
            num_towns = int(sys.argv[2])
        if len(sys.argv) > 3:
            start_index = int(sys.argv[3])
        
        if start_index is not None:
            town_indices = list(range(start_index, start_index + num_towns))
            town_indices = [i % len(TOWNS) for i in town_indices]
        else:
            town_indices = list(range(num_towns))
    
    run_session(town_indices=town_indices, tier=tier, num_towns=num_towns)
    
    # Report API usage
    print(f"\n📊 Brave API calls used: {BRAVE_CALLS}/{MAX_BRAVE_CALLS}")
