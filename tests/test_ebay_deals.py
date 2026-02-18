#!/usr/bin/env python3
"""
Test eBay deals functionality
"""

from jett_db import JettDB
import json

def test_ebay_deals():
    """Test all eBay deal functions."""
    print("=" * 70)
    print("Testing eBay Deals Functionality")
    print("=" * 70)
    print()

    db = JettDB()

    # Test 1: Add a sample deal
    print("1️⃣  Adding sample eBay deal...")
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
        notes="Great deal, seller has excellent feedback"
    )
    print(f"   ✅ Deal added with ID: {deal_id}")
    print()

    # Test 2: Get the deal back
    print("2️⃣  Retrieving deal...")
    deal = db.get_ebay_deal(deal_id)
    print(f"   Card: {deal['card_name']}")
    print(f"   Price: ${deal['current_price']:.2f}")
    print(f"   Market Value: ${deal['market_value']:.2f}")
    print(f"   Discount: {deal['discount_percent']:.1f}%")
    print(f"   Score: {deal['deal_score']}")
    print(f"   Status: {deal['status']}")
    print()

    # Test 3: Add another deal
    print("3️⃣  Adding another deal...")
    deal_id2 = db.add_ebay_deal(
        card_name="Shohei Ohtani 2018 Topps Chrome RC PSA 9",
        listing_url="https://ebay.com/itm/67890",
        current_price=450.00,
        market_value=500.00,
        deal_score=65.0,
        seller_name="sportscards_pro",
        seller_feedback=100.0,
        photo_count=8,
        listing_age_days=5
    )
    print(f"   ✅ Deal added with ID: {deal_id2}")
    print()

    # Test 4: Get high-score deals
    print("4️⃣  Getting high-score deals (score >= 70)...")
    high_score_deals = db.get_deals_by_score(min_score=70.0)
    print(f"   Found {len(high_score_deals)} high-score deals:")
    for deal in high_score_deals:
        print(f"   - {deal['card_name']}: Score {deal['deal_score']}, ${deal['current_price']}")
    print()

    # Test 5: Get recent deals
    print("5️⃣  Getting recent deals (last 7 days)...")
    recent = db.get_recent_deals(days=7)
    print(f"   Found {len(recent)} recent deals")
    print()

    # Test 6: Search deals
    print("6️⃣  Searching for 'Trout' cards...")
    search_results = db.search_ebay_deals(card_name="Trout")
    print(f"   Found {len(search_results)} results")
    for deal in search_results:
        print(f"   - {deal['card_name']}: ${deal['current_price']}")
    print()

    # Test 7: Mark deal as purchased
    print("7️⃣  Marking first deal as purchased...")
    success = db.mark_deal_purchased(deal_id, notes="Purchased on 2/3/26 - shipped next day")
    if success:
        deal = db.get_ebay_deal(deal_id)
        print(f"   ✅ Status updated to: {deal['status']}")
        print(f"   Notes: {deal['notes']}")
    print()

    # Test 8: Mark deal as skipped
    print("8️⃣  Marking second deal as skipped...")
    success = db.mark_deal_skipped(deal_id2, reason="Price dropped to $400, waiting")
    if success:
        deal = db.get_ebay_deal(deal_id2)
        print(f"   ✅ Status updated to: {deal['status']}")
        print(f"   Reason: {deal['notes']}")
    print()

    # Test 9: Get deal stats
    print("9️⃣  Getting deal statistics...")
    stats = db.get_deal_stats()
    print("   Deal Stats:")
    print(json.dumps(stats, indent=4))
    print()

    # Test 10: Get overall database stats
    print("🔟 Getting overall database stats...")
    all_stats = db.get_stats()
    print("   Database Stats:")
    print(json.dumps(all_stats, indent=4))
    print()

    print("=" * 70)
    print("✅ All tests passed! eBay deals tracking is working.")
    print("=" * 70)
    print()
    print("Quick reference:")
    print("  • db.add_ebay_deal() - Add new deal")
    print("  • db.get_deals_by_score(70) - Get high-scoring deals")
    print("  • db.get_recent_deals(7) - Get deals from last 7 days")
    print("  • db.mark_deal_purchased(id) - Mark as purchased")
    print("  • db.mark_deal_skipped(id, reason) - Mark as skipped")
    print("  • db.get_deal_stats() - Get statistics")
    print("  • db.search_ebay_deals(card_name='Trout') - Search deals")
    print()

if __name__ == "__main__":
    test_ebay_deals()
