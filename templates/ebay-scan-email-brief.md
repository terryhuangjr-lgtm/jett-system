# CardIQ Scanner Email Template Brief

## Overview
Build an HTML email template for eBay card scan results. This is for CardIQ - a sports card intelligence tool that alerts collectors to deals.

---

## Design Specs

### Overall Style
- Dark background (#0f0f0f or #111111) — feels premium, sports-app aesthetic
- Clean sans-serif font (Inter or system-ui)
- Mobile-first — most collectors check email on phone
- Max width 600px centered

### Header Section
```
[Logo/Icon] CardIQ Scanner
Daily Deal Report — March 22, 2026
Raw Mode | 14 results found
```
- Dark header bar, white text
- Accent color: gold #FFD700 or electric blue #00D4FF

### Each Card Result Card

```
┌─────────────────────────────────────┐
│ #1  🔥 POTENTIAL STEAL    9.2/10   │
├─────────────────────────────────────┤
│ 2003 Topps Chrome LeBron James RC  │
│ Refractor /999                      │
├─────────────────────────────────────┤
│ 💰 $34.99 + $4.99 shipping         │
│ 👁 Vision: Corners 8 | Center 9    │
│ 📅 Listed 1 day ago                │
│ ⭐ Seller: 99.8% (1,243 sales)     │
├─────────────────────────────────────┤
│ [COMPS COMING SOON]                 │
│ PSA 9 est: --  |  PSA 10 est: --   │
├─────────────────────────────────────┤
│          [VIEW ON EBAY →]           │
└─────────────────────────────────────┘
```

### Score Badge Colors
- 9.0-10.0 → 🔥 red/orange badge
- 8.0-8.9  → ⚡ electric blue badge
- 7.0-7.9  → 💰 green badge

### Placeholder Strategy for Missing Comp Data
```
PSA 9 Comp:  Coming soon
PSA 10 Comp: Coming soon
Avg Sold:    Pending API
```
Or use subtle locked icon with "Upgrade for comp data"

### Footer
```
CardIQ — Your Card Intelligence Tool
Unsubscribe | Preferences | Help
Sent for: [user@email.com]
```

---

## Technical Requirements

1. **Build as HTML email template**
2. **Inline all CSS** — email clients strip external stylesheets
3. **Test rendering** in both dark and light mode email clients
4. **Make the eBay button a real CTA button** not just a link
5. **Keep total email size under 100kb** for deliverability
6. **Use `--html` flag** when sending via send-email.js

---

## Output

Create: `/home/clawd/clawd/templates/ebay-scan-email.html`

The template should accept these variables:
- `{{date}}` - Scan date
- `{{totalResults}}` - Number of results
- `{{cards}}` - Array of card objects with:
  - `{{cards[].rank}}` - Position (1, 2, 3...)
  - `{{cards[].title}}` - Card title
  - `{{cards[].subtype}}` - Refractor/auto/etc
  - `{{cards[].price}}` - Buy it now price
  - `{{cards[].shipping}}` - Shipping cost
  - `{{cards[].condition}}` - Corner/center grades
  - `{{cards[].listed}}` - Days listed
  - `{{cards[].sellerRating}}` - Seller feedback %
  - `{{cards[].sellerSales}}` - Total sales
  - `{{cards[].score}}` - Deal score (0-10)
  - `{{cards[].url}}` - eBay item URL
  - `{{cards[].psa9Est}}` - PSA 9 estimate
  - `{{cards[].psa10Est}}` - PSA 10 estimate
