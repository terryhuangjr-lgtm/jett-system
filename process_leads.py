import json

# Filter and process leads from the data
qualified_leads = []

# Data will be passed via stdin
import sys
data = json.load(sys.stdin)

for row in data[1:]:  # Skip header
    if len(row) < 13:
        continue
    
    try:
        reviews = row[6].strip() if row[6] else "0"
        rating = row[7].strip() if row[7] else "0"
        outreach = row[12].strip() if len(row) > 12 else ""
        
        # Filter criteria: Reviews > 5, Rating > 4.0, Outreach = "N"
        if reviews and rating:
            rev_num = float(reviews) if reviews.replace('.','',1).isdigit() else 0
            rat_num = float(rating) if rating.replace('.','',1).isdigit() else 0
            
            if rev_num > 5 and rat_num > 4.0 and outreach == "N":
                website_status = row[8] if len(row) > 8 else ""
                website_url = row[9] if len(row) > 9 else ""
                ig = row[10] if len(row) > 10 else ""
                fb = row[11] if len(row) > 11 else ""
                
                # Check website issues
                has_website_issue = website_status in ["NO WEBSITE", "BROKEN/DOWN"] or "OUTDATED" in website_status or "BROKEN" in website_status or "BASIC" in website_status or "TEMPLATE" in website_status
                
                # Check missing social
                missing_ig = not ig or ig == ""
                missing_fb = not fb or fb == ""
                missing_social = missing_ig or missing_fb
                
                lead = {
                    "name": row[1],
                    "industry": row[2],
                    "reviews": rev_num,
                    "rating": rat_num,
                    "phone": row[3],
                    "address": row[5],
                    "website": website_url,
                    "website_status": website_status,
                    "fb": fb,
                    "ig": ig,
                    "missing_ig": missing_ig,
                    "missing_fb": missing_fb,
                    "has_website_issue": has_website_issue,
                    "row_index": len(qualified_leads) + 2  # +2 for header and 1-indexed
                }
                qualified_leads.append(lead)
    except Exception as e:
        continue

print(f"TOTAL QUALIFIED LEADS: {len(qualified_leads)}", file=sys.stderr)

# Sort by priority: website issues first, then high reviews, then missing social
def sort_key(lead):
    website_priority = 0 if lead["has_website_issue"] else 1
    social_priority = 0 if (lead["missing_ig"] and lead["missing_fb"]) else 1
    return (website_priority, -lead["reviews"], social_priority, -lead["rating"])

qualified_leads.sort(key=sort_key)

# Top 20
top_20 = qualified_leads[:20]

print(f"TOP 20 PRIORITY LEADS:", file=sys.stderr)

# Output JSON for further processing
output = {
    "total_qualified": len(qualified_leads),
    "top_20": top_20
}
print(json.dumps(output, indent=2))