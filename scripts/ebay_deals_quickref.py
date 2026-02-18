#!/usr/bin/env python3
"""
eBay Deals - Quick Reference
Copy-paste examples for common operations
"""

from jett_db import JettDB

# Initialize database
db = JettDB()

# ============================================================
# ADD NEW DEAL
# ============================================================
def add_deal_example():
    """Add a new eBay deal."""
    deal_id = db.add_ebay_deal(
        card_name="Player Name Year Set Card Type",
        listing_url="https://ebay.com/itm/XXXXXX",
        current_price=100.00,
        market_value=150.00,
        deal_score=85.0,
        seller_name="seller_username",
        seller_feedback=99.5,
        photo_count=10,
        listing_age_days=2,
        notes="Optional notes"
    )
    print(f"Added deal ID: {deal_id}")


# ============================================================
# GET HOT DEALS
# ============================================================
def get_hot_deals():
    """Get deals with score >= 80."""
    deals = db.get_deals_by_score(min_score=80.0)
    for deal in deals:
        print(f"{deal['card_name']}: ${deal['current_price']}, Score: {deal['deal_score']}")


# ============================================================
# DAILY REVIEW
# ============================================================
def daily_review():
    """Review new deals from last 24 hours."""
    new_deals = db.get_recent_deals(days=1, status='new')
    print(f"Found {len(new_deals)} new deals to review")
    for deal in new_deals:
        print(f"ID {deal['id']}: {deal['card_name']} - ${deal['current_price']}")


# ============================================================
# MARK PURCHASED
# ============================================================
def mark_purchased_example():
    """Mark deal as purchased."""
    deal_id = 5  # Replace with actual deal ID
    db.mark_deal_purchased(deal_id, notes="Won auction, paid $850")
    print(f"Deal {deal_id} marked as purchased")


# ============================================================
# MARK SKIPPED
# ============================================================
def mark_skipped_example():
    """Mark deal as skipped."""
    deal_id = 6  # Replace with actual deal ID
    db.mark_deal_skipped(deal_id, reason="Price dropped, waiting")
    print(f"Deal {deal_id} marked as skipped")


# ============================================================
# SEARCH DEALS
# ============================================================
def search_deals_example():
    """Search for specific cards."""
    # Search by card name
    trout_deals = db.search_ebay_deals(card_name="Trout")

    # Search with filters
    results = db.search_ebay_deals(
        card_name="Ohtani",
        min_score=75.0,
        max_price=500.00,
        status='new'
    )


# ============================================================
# GET STATISTICS
# ============================================================
def get_stats():
    """Get deal statistics."""
    stats = db.get_deal_stats()
    print(f"Total deals: {stats['total_deals']}")
    print(f"Hot deals: {stats['hot_deals']}")
    print(f"Potential savings: ${stats['potential_savings']:.2f}")
    print(f"By status: {stats['by_status']}")


# ============================================================
# VIEW SINGLE DEAL
# ============================================================
def view_deal_example():
    """View a specific deal."""
    deal_id = 5  # Replace with actual deal ID
    deal = db.get_ebay_deal(deal_id)
    if deal:
        print(f"Card: {deal['card_name']}")
        print(f"Price: ${deal['current_price']}")
        print(f"Score: {deal['deal_score']}")
        print(f"Status: {deal['status']}")


# ============================================================
# MAIN - Show examples
# ============================================================
if __name__ == "__main__":
    print("eBay Deals Quick Reference")
    print("=" * 60)
    print()
    print("Copy-paste these examples into your scripts:")
    print()
    print("from jett_db import JettDB")
    print("db = JettDB()")
    print()
    print("# Add deal:")
    print('db.add_ebay_deal(card_name="...", current_price=100, ...)')
    print()
    print("# Get hot deals:")
    print("hot = db.get_deals_by_score(80)")
    print()
    print("# Daily review:")
    print('new = db.get_recent_deals(1, status="new")')
    print()
    print("# Mark purchased:")
    print('db.mark_deal_purchased(deal_id, notes="...")')
    print()
    print("# Get stats:")
    print("stats = db.get_deal_stats()")
    print()
    print("=" * 60)
    print()
    print("Run: python3 test_ebay_deals.py for full examples")
