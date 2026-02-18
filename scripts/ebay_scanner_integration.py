#!/usr/bin/env python3
"""
eBay Scanner Integration Example
Shows how to automatically add scanner results to the database
"""

from jett_db import JettDB

def process_scanner_results(deals):
    """
    Process eBay scanner results and add to database.

    Args:
        deals: List of deals from eBay scanner
    """
    db = JettDB()

    added_count = 0

    for deal in deals:
        # Only track deals with score >= 70
        if deal.get('score', 0) >= 70:
            try:
                deal_id = db.add_ebay_deal(
                    card_name=deal['title'],
                    listing_url=deal.get('url'),
                    current_price=deal.get('price'),
                    market_value=deal.get('market_value'),
                    deal_score=deal.get('score'),
                    seller_name=deal.get('seller'),
                    seller_feedback=deal.get('seller_feedback'),
                    photo_count=deal.get('photo_count'),
                    listing_age_days=deal.get('listing_age')
                )
                print(f"✅ Added: {deal['title']} (Score: {deal['score']}, ID: {deal_id})")
                added_count += 1
            except Exception as e:
                print(f"❌ Failed to add deal: {e}")

    print(f"\n📊 Added {added_count} deals to database")

    # Show hot deals
    hot_deals = db.get_deals_by_score(80.0)
    if hot_deals:
        print(f"\n🔥 {len(hot_deals)} HOT DEALS (Score >= 80):")
        for deal in hot_deals[:5]:  # Show top 5
            print(f"   • {deal['card_name']}")
            print(f"     ${deal['current_price']:.2f} | Score: {deal['deal_score']}")


def daily_review():
    """Show daily deals for review."""
    db = JettDB()

    print("=" * 70)
    print("📬 DAILY DEALS REVIEW")
    print("=" * 70)
    print()

    # Get new deals from last 24 hours
    new_deals = db.get_recent_deals(days=1, status='new')

    if not new_deals:
        print("No new deals to review today.")
        return

    print(f"Found {len(new_deals)} new deals:\n")

    for i, deal in enumerate(new_deals, 1):
        print(f"{i}. {deal['card_name']}")
        print(f"   Price: ${deal['current_price']:.2f} | Market: ${deal['market_value']:.2f}")
        print(f"   Discount: {deal['discount_percent']:.1f}% | Score: {deal['deal_score']}")
        print(f"   Seller: {deal['seller_name']} ({deal['seller_feedback']}%)")
        print(f"   URL: {deal['listing_url']}")
        print(f"   Deal ID: {deal['id']}")
        print()

    # Show stats
    stats = db.get_deal_stats()
    print("-" * 70)
    print(f"Total tracked: {stats['total_deals']} | Hot deals: {stats['hot_deals']}")
    print(f"Purchased: {stats['by_status'].get('purchased', 0)} | Skipped: {stats['by_status'].get('skipped', 0)}")
    print()


# Example usage
if __name__ == "__main__":
    # Example scanner results (replace with actual scanner output)
    example_deals = [
        {
            'title': 'Ronald Acuña Jr. 2018 Topps Chrome RC PSA 10',
            'url': 'https://ebay.com/itm/11111',
            'price': 380.00,
            'market_value': 450.00,
            'score': 85.5,
            'seller': 'topgradecards',
            'seller_feedback': 99.9,
            'photo_count': 10,
            'listing_age': 1
        },
        {
            'title': 'Wander Franco 2021 Bowman Chrome 1st RC PSA 9',
            'url': 'https://ebay.com/itm/22222',
            'price': 125.00,
            'market_value': 150.00,
            'score': 72.0,
            'seller': 'cardshack',
            'seller_feedback': 98.5,
            'photo_count': 8,
            'listing_age': 3
        }
    ]

    print("Example: Processing eBay scanner results...")
    print()
    process_scanner_results(example_deals)
    print()
    print("=" * 70)
    print()

    # Show daily review
    daily_review()
