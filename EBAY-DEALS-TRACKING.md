# eBay Deals Tracking

## Overview

The `ebay_deals` table in `jett_knowledge.db` tracks promising eBay card deals with scores, prices, and seller info.

## Quick Start

```python
from jett_db import JettDB

db = JettDB()

# Add a deal from eBay scanner results
deal_id = db.add_ebay_deal(
    card_name="Mike Trout 2011 Topps Update RC PSA 10",
    listing_url="https://ebay.com/itm/12345",
    current_price=850.00,
    market_value=1200.00,
    deal_score=92.5,
    seller_name="cardcollector99",
    seller_feedback=99.8,
    photo_count=12,
    listing_age_days=2,
    notes="Great deal, excellent seller"
)

# Get high-scoring deals
hot_deals = db.get_deals_by_score(min_score=70.0)
for deal in hot_deals:
    print(f"{deal['card_name']}: ${deal['current_price']} (Score: {deal['deal_score']})")

# Mark as purchased
db.mark_deal_purchased(deal_id, notes="Purchased 2/3/26")

# Mark as skipped
db.mark_deal_skipped(deal_id, reason="Price too high")

# Get stats
stats = db.get_deal_stats()
print(f"Total deals tracked: {stats['total_deals']}")
print(f"Hot deals available: {stats['hot_deals']}")
```

## Available Functions

### `add_ebay_deal(card_name, **kwargs)`
Add a new deal to track.

**Parameters:**
- `card_name` (str, required): Name of the card
- `listing_url` (str): eBay listing URL
- `current_price` (float): Current listing price
- `market_value` (float): Estimated market value
- `deal_score` (float): Deal quality score (0-100)
- `seller_name` (str): eBay seller username
- `seller_feedback` (float): Seller feedback %
- `photo_count` (int): Number of photos
- `listing_age_days` (int): Age in days
- `notes` (str): Additional notes

**Returns:** Deal ID

**Auto-calculated:**
- `discount_percent`: Calculated from current_price and market_value
- `date_found`: Set to current timestamp
- `status`: Defaults to 'new'

---

### `get_deals_by_score(min_score=70.0)`
Get deals with score >= threshold.

**Parameters:**
- `min_score` (float): Minimum deal score (default: 70.0)

**Returns:** List of deals sorted by score (descending)

**Example:**
```python
hot_deals = db.get_deals_by_score(80.0)  # Get deals 80+
```

---

### `get_recent_deals(days=7, status=None)`
Get deals found in the last N days.

**Parameters:**
- `days` (int): Number of days to look back (default: 7)
- `status` (str): Filter by status (optional)

**Returns:** List of recent deals sorted by date

**Example:**
```python
this_week = db.get_recent_deals(7)
new_deals = db.get_recent_deals(7, status='new')
```

---

### `mark_deal_purchased(deal_id, notes=None)`
Mark a deal as purchased.

**Parameters:**
- `deal_id` (int): Deal ID
- `notes` (str): Purchase notes (optional)

**Returns:** True if updated

**Example:**
```python
db.mark_deal_purchased(5, notes="Won auction, paid $850")
```

---

### `mark_deal_skipped(deal_id, reason=None)`
Mark a deal as skipped.

**Parameters:**
- `deal_id` (int): Deal ID
- `reason` (str): Reason for skipping (optional)

**Returns:** True if updated

**Example:**
```python
db.mark_deal_skipped(5, reason="Seller has low feedback")
```

---

### `get_deal_stats()`
Get eBay deals statistics.

**Returns:** Dictionary with:
- `total_deals`: Total deals tracked
- `by_status`: Count by status (new, purchased, skipped)
- `hot_deals`: Count of new deals with score >= 70
- `avg_deal_score`: Average score of new deals
- `potential_savings`: Total potential savings on new deals
- `deals_last_7_days`: Deals found in last 7 days

**Example:**
```python
stats = db.get_deal_stats()
print(f"You have {stats['hot_deals']} hot deals waiting!")
```

---

### `search_ebay_deals(card_name=None, min_score=None, max_price=None, status=None)`
Search deals with filters.

**Parameters:**
- `card_name` (str): Search in card name
- `min_score` (float): Minimum deal score
- `max_price` (float): Maximum current price
- `status` (str): Filter by status

**Returns:** List of matching deals

**Example:**
```python
# Find Trout cards under $1000 with good scores
results = db.search_ebay_deals(
    card_name="Trout",
    max_price=1000,
    min_score=75
)
```

---

### `get_ebay_deal(deal_id)`
Get a single deal by ID.

**Parameters:**
- `deal_id` (int): Deal ID

**Returns:** Deal dictionary or None

---

## Database Schema

```sql
CREATE TABLE ebay_deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_name TEXT NOT NULL,
  listing_url TEXT,
  current_price REAL,
  market_value REAL,
  discount_percent REAL,        -- Auto-calculated
  deal_score REAL,
  seller_name TEXT,
  seller_feedback REAL,
  photo_count INTEGER,
  listing_age_days INTEGER,
  date_found TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'new',    -- new, purchased, skipped
  notes TEXT
);
```

**Indexes:**
- `idx_ebay_deals_score` - Fast sorting by score
- `idx_ebay_deals_status` - Fast filtering by status
- `idx_ebay_deals_date` - Fast date-based queries

## Integration with eBay Scanner

When the eBay scanner finds deals, automatically add them:

```python
from jett_db import JettDB

db = JettDB()

# Process scanner results
for deal in scanner_results:
    if deal['score'] >= 70:  # Only track good deals
        db.add_ebay_deal(
            card_name=deal['title'],
            listing_url=deal['url'],
            current_price=deal['price'],
            market_value=deal['market_value'],
            deal_score=deal['score'],
            seller_name=deal['seller'],
            seller_feedback=deal['seller_feedback'],
            photo_count=deal['photo_count'],
            listing_age_days=deal['listing_age']
        )

# Review hot deals
hot_deals = db.get_deals_by_score(80.0)
print(f"Found {len(hot_deals)} hot deals to review!")
```

## Workflow

1. **eBay scanner runs** → Finds deals with scores
2. **Auto-add to database** → All deals with score >= 70
3. **Review daily** → Check `get_deals_by_score(80)`
4. **Take action:**
   - Purchase → `mark_deal_purchased(id, notes)`
   - Skip → `mark_deal_skipped(id, reason)`
   - Wait → Leave as 'new' status

## Status Values

- `new` - Deal found, not yet reviewed
- `purchased` - Deal purchased
- `skipped` - Deal reviewed but skipped

## Tips

- Set your own score threshold (70, 75, 80) based on volume
- Use `notes` field to track decision reasoning
- Run `get_deal_stats()` weekly to track performance
- Search by card name to track specific players
- Use `get_recent_deals()` for daily review

## Example Daily Workflow

```python
from jett_db import JettDB

db = JettDB()

# Morning routine: Check yesterday's deals
yesterday = db.get_recent_deals(days=1, status='new')
print(f"📬 {len(yesterday)} new deals to review\n")

for deal in yesterday:
    print(f"🎴 {deal['card_name']}")
    print(f"   💰 ${deal['current_price']} (Market: ${deal['market_value']})")
    print(f"   📊 Score: {deal['deal_score']}")
    print(f"   🔗 {deal['listing_url']}")
    print(f"   👤 Seller: {deal['seller_name']} ({deal['seller_feedback']}%)")
    print()

# Check stats
stats = db.get_deal_stats()
print(f"\n📊 Stats: {stats['hot_deals']} hot deals, {stats['total_deals']} total tracked")
```

---

**Database:** `/home/clawd/clawd/data/jett_knowledge.db`
**Module:** `/home/clawd/clawd/jett_db.py`
**Test:** `python3 /home/clawd/clawd/test_ebay_deals.py`
