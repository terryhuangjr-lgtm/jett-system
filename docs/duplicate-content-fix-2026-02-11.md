# Duplicate Content Fix - Feb 11, 2026

## Problem

User was receiving recycled Twitter content:
- **Bitcoin**: White paper tweets received on consecutive days (Feb 10 & 11)
- **Sports**: Allen Iverson tweets received on consecutive days

## Root Cause

The research scripts were creating **duplicate database entries** with the same topic:

```
Bitcoin Whitepaper:
- ID 19: status=draft
- ID 20: status=draft
- ID 21: status=published

When ID 21 was marked published, the next day's generator selected ID 19 or 20
(still in draft status), causing the same content to be tweeted again.
```

### Why This Happened

1. Research tasks ran multiple times and created duplicate entries
2. Content generator selected highest quality draft content
3. Only the selected entry was marked published
4. Duplicate entries remained in draft status
5. Next day, generator selected one of the remaining drafts

### Workflow

```
Daily Schedule (via Task Manager):
- 02:00 AM: Sports Research → Checks database/news
- 03:00 AM: Bitcoin Research → Checks database
- 05:00 AM: Sports Content Generation → Selects from drafts
- 06:00 AM: Bitcoin Content Generation → Selects from drafts
- 07:30 AM: Sports Deployment → Posts to #21msports
- 11:00 AM: Bitcoin Deployment → Posts to #21msports
```

## Solution Implemented

### 1. Fixed Existing Duplicates

Created `/home/clawd/clawd/scripts/fix-duplicate-content.py`:
- Scanned database for duplicate topics
- Found 17 topics with 24 duplicate entries
- Kept best quality/already published entry per topic
- Marked remaining duplicates as published

**Results:**
- Draft content: 45 → 21
- Published content: 10 → 34
- All duplicates eliminated

### 2. Added Duplicate Prevention

**Database Layer (jett_db.py):**
```python
def topic_exists(self, topic: str) -> bool:
    """Check if topic already exists (prevents duplicates)"""

def add_content_idea(..., skip_duplicate_check=False):
    """Now checks for duplicates before inserting"""
```

**Node.js Bridge (db-bridge.js):**
```javascript
topicExists(topic) {
    // Checks database for existing topic
}

addContent(...) {
    // Checks for duplicates first
    if (this.topicExists(topic)) {
        return null; // Skip duplicate
    }
    // ... insert logic
}
```

**Research Scripts:**
- Bitcoin researcher: Updated to log when duplicates are skipped
- Sports researcher: Uses Python DB layer with duplicate prevention
- Both will now skip if topic already exists

### 3. Testing

Verified duplicate prevention:
```
✓ Existing topics correctly detected
✓ Duplicate insertions prevented
✓ New topics can still be added
```

## Prevention Going Forward

The system will now:
1. **Check before adding**: Research scripts check if topic exists
2. **Skip duplicates**: Return null instead of creating duplicate entries
3. **Log skips**: Report when content is skipped as duplicate

## Files Modified

1. `/home/clawd/clawd/jett_db.py` - Added topic_exists() and duplicate checking
2. `/home/clawd/clawd/automation/db-bridge.js` - Added duplicate prevention
3. `/home/clawd/clawd/automation/21m-bitcoin-live-researcher.js` - Log duplicate skips
4. `/home/clawd/clawd/scripts/fix-duplicate-content.py` - New tool to fix duplicates

## How to Monitor

### Check for new duplicates:
```bash
python3 /home/clawd/clawd/scripts/fix-duplicate-content.py
```

### Database stats:
```bash
node /home/clawd/clawd/automation/db-bridge.js stats
```

### Check recent content:
```python
from jett_db import get_db
db = get_db()
drafts = db.get_content_by_status('draft', limit=20)
for d in drafts:
    print(f"{d['id']}: {d['topic']}")
```

## Expected Behavior Now

1. Research runs daily → Finds new content
2. Checks if topic exists → Skips if duplicate
3. Adds only new topics → No duplicates created
4. Generator selects draft content → Each topic only once
5. Marks as published → Won't be selected again

## Issue Resolved

✅ No more recycled content
✅ Each topic appears only once
✅ Fresh content every day
✅ Duplicate prevention active at database level
