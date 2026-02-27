# BLOCKING ISSUE - Sports Betting Database Schema Mismatch

**Status:** 🔴 BLOCKING (prevents all testing and cron jobs)
**Severity:** Critical
**Created:** 2026-02-19 10:16 EST
**Days Blocked:** 4 (no testing since Feb 15)

---

## Problem

Scout Mode fails with: `sqlite3.OperationalError: no such column: ppg`

When trying to run:
```bash
cd /home/clawd/clawd/sports_betting && python3 orchestrator.py --mode scout
```

**What works:**
- Games collection (19 NBA games scraped)
- Injury data collection (104 injured players scraped)

**What breaks:**
- Player stats saving fails because `player_stats` table is missing columns:
  - `ppg` (points per game)
  - Likely other stat columns

---

## Root Cause

`init_db.py` creates a `player_stats` table, but the schema doesn't match what `orchestrator.py` expects when calling:

```python
# In orchestrator.py line 140
cursor.execute('''
    INSERT INTO player_stats (player_id, ppg, ...)
    VALUES (?, ?, ...)
''')
```

The `ppg` column (and others) don't exist in the table created by `init_db.py`.

---

## Solution

**Option A (Recommended):** Fix `init_db.py`
- Check what columns `orchestrator.py` needs for `player_stats`
- Update the CREATE TABLE statement in `init_db.py`
- Drop the old database and reinitialize
- Test Scout Mode

**Option B:** Manually add columns
```python
ALTER TABLE player_stats ADD COLUMN ppg REAL;
# ... add other missing columns
```

---

## Testing Impact

- ❌ Scout Mode blocked
- ❌ Final Pick Mode blocked  
- ❌ Cron jobs failing
- ❌ No testing for 4 days

## Action Required

**For Mini:**
1. Compare `init_db.py` CREATE TABLE with what `orchestrator.py` expects
2. Fix the schema
3. Reinitialize database
4. Test: `python3 orchestrator.py --mode scout`
5. Commit fix to GitHub

**Estimated time:** 15-30 minutes

---

**File:** `/home/clawd/clawd/sports_betting/orchestrator.py` (line 140+)
**File:** `/home/clawd/clawd/sports_betting/init_db.py`
**Database:** `/home/clawd/clawd/data/sports_betting.db`
