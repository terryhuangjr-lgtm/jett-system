# URGENT: Fix Injury/Suspension Data Collection

## Problem

The betting system's injury collector is not properly tracking player availability, causing **0% injury data** for most teams. This results in:

- 15% of confidence scoring defaulting to 0.0 (neutral)
- Missing critical context on suspensions, injuries, and absences
- False negatives on bets (system passing on good opportunities)
- Yesterday: Missed Isaiah Stewart (7-game suspension) + Jalen Duren (2-game suspension) for Pistons

## Current State

**File:** `sports_betting/collectors/injury_collector.py`

**What it does:**
- Scrapes ESPN injury reports
- Gets 115+ injury records
- Stores in `player_stats` table

**What's broken:**
1. Data is stored but not properly queried by scorer
2. Duplicate entries inflating injury counts
3. Suspensions marked as "questionable" before official announcement
4. Team name matching issues (e.g., "Pistons" vs "Detroit Pistons")

## Evidence

```bash
# Yesterday's run showed:
✓ Scraped 115 injury records from ESPN
✅ Latest injury reports

# But scorer shows:
Injury Impact: 0.0 (every game)
```

**Database check:**
```sql
SELECT DISTINCT team_name FROM player_stats;
-- Returns: "Los Angeles Lakers", "Team Name"
-- Missing: All other NBA teams
```

## What Needs To Be Fixed

### 0. 🔴 CRITICAL: Fix Predicted Spread Calculation

**Problem:** Line value is maxing out at +10.0 on every game because predicted spreads ignore injury impact.

**Current code (line 266-270 in `analyzer/bet_scorer.py`):**
```python
predicted = (
    current_scores['team_quality']['score'] * 0.4 +
    current_scores['recent_form']['score'] * 0.3 +
    current_scores['home_court']['score'] * 0.3
)
```

**The bug:** Injury impact is NOT included in predicted spread, so the model predicts Thunder -0.7 when SGA (7.18 impact) is out, while actual line is -9.5.

**Fix:**
```python
predicted = (
    current_scores['team_quality']['score'] * 0.35 +
    current_scores['recent_form']['score'] * 0.25 +
    current_scores['home_court']['score'] * 0.25 +
    current_scores['injury_impact']['score'] * 0.15
)
```

**Impact:** 
- Before: All games showing +10.0 line value (maxed out)
- After: Realistic line value scores (+2 to +5), accurate confidence scores

**This is why zero games qualified today** - the line value calculation is broken.

---

### 1. Team Name Normalization
**Problem:** Inconsistent team names prevent data linking
- ESPN: "Detroit Pistons"  
- Games table: "Pistons"
- Player_stats: Not matching

**Fix:** Add team name mapping in `injury_collector.py`:
```python
TEAM_NAME_MAP = {
    'Detroit Pistons': 'Pistons',
    'Toronto Raptors': 'Raptors',
    'Los Angeles Lakers': 'Lakers',
    # ... all 30 teams
}
```

### 2. Deduplicate Player Records
**Problem:** Same player appearing 4x in database

**Fix:** Use `INSERT OR REPLACE` with unique constraint on `(player_name, team_name, game_date)`

### 3. Suspension Detection
**Problem:** ESPN lists as "questionable" before NBA announces suspension

**Fix:** Add keyword detection in injury descriptions:
```python
SUSPENSION_KEYWORDS = ['suspend', 'fight', 'discipline', 'brawl', 'ejected']

if any(keyword in description.lower() for keyword in SUSPENSION_KEYWORDS):
    injury_status = 'out'  # Force to OUT
```

### 4. Verify Scorer Integration
**Problem:** `bet_scorer.py` might not be querying correct table/columns

**Fix:** Check `_score_injury_impact()` method:
```python
# Current query:
SELECT COUNT(*) FROM player_stats
WHERE team_name = ? AND injury_status IN ('out', 'doubtful')

# Ensure team_name matches games.home_team / games.away_team
```

## Testing Checklist

### Test 1: Verify Predicted Spread Fix

```bash
# Before fix: predicted spreads ignore injuries
# Thunder missing SGA (7.18 impact) → predicted +0.7 vs actual -9.5 = 10.2 gap

# After fix: predicted spreads account for injuries
# Thunder missing SGA → predicted -6.0 to -8.0 vs actual -9.5 = 2-3 gap

cd ~/clawd/sports_betting
python3 -c "
from analyzer.bet_scorer import BetScorer
scorer = BetScorer('/home/clawd/clawd/data/sports_betting.db')
analysis = scorer.score_game('nba_20260212_Bucks_Thunder')
lv = analysis['scores']['line_value']
print(f'Line Value Score: {lv[\"score\"]:.1f}/10')
print(f'Predicted: {lv[\"predicted_spread\"]}, Actual: {lv[\"actual_spread\"]}')
print(f'Gap: {lv[\"value_points\"]} points')
print('✅ PASS' if abs(lv['value_points']) < 5 else '❌ FAIL - Still broken')
"
```

**Expected result:** Line value score between +2 to +5 (not +10.0)

### Test 2: Full System Test

After fixes, run these tests:

```bash
# 1. Scrape fresh data
cd ~/clawd/sports_betting
python3 -c "from collectors.injury_collector import InjuryCollector; ic = InjuryCollector('/home/clawd/clawd/data/sports_betting.db'); ic.collect_injuries()"

# 2. Check data
python3 -c "import sqlite3; conn = sqlite3.connect('/home/clawd/clawd/data/sports_betting.db'); cursor = conn.cursor(); cursor.execute('SELECT DISTINCT team_name FROM player_stats'); print([t[0] for t in cursor.fetchall()])"
# Should see: All 30 NBA teams

# 3. Check deduplication
python3 -c "import sqlite3; conn = sqlite3.connect('/home/clawd/clawd/data/sports_betting.db'); cursor = conn.cursor(); cursor.execute('SELECT player_name, COUNT(*) FROM player_stats GROUP BY player_name HAVING COUNT(*) > 1'); dupes = cursor.fetchall(); print(f'Duplicates: {len(dupes)}')"
# Should see: 0 duplicates

# 4. Test scorer
python3 orchestrator.py --mode final
# Should see: Injury Impact > 0.0 for games with injuries
```

## Expected Outcome

**Before (broken):**
```
Thunder vs Bucks:
  Predicted spread: +0.7 (ignores SGA being out)
  Actual spread: -9.5
  Line Value: +10.0/10 (maxed out)
  Injury Impact: -4.17/10
  Final Confidence: 6.1/10 → PASS
```

**After (fixed):**
```
Thunder vs Bucks:
  Predicted spread: -7.0 (accounts for SGA being out)
  Actual spread: -9.5
  Line Value: +2.5/10 (realistic)
  Injury Impact: -4.17/10
  Final Confidence: 7.4/10 → BET Bucks +9.5
  
Pistons vs Raptors:
  Predicted spread: -5.0 (accounts for Stewart+Duren suspensions)
  Actual spread: -5.5
  Line Value: +0.5/10 (minimal value)
  Injury Impact: +4.0/10 (Pistons missing key players)
  Final Confidence: 7.2/10 → BET Raptors -5.5
```

## Files To Modify

1. **`analyzer/bet_scorer.py`** (lines 266-270) - **CRITICAL: Add injury impact to predicted spread**
2. **`collectors/injury_collector.py`** - Team name mapping + deduplication
3. **`analyzer/bet_scorer.py`** (_score_injury_impact method) - Verify query logic
4. **`schema.sql`** - Add unique constraint if needed

## Priority

🔴 **CRITICAL - Fix #0 (predicted spread) MUST be done first**
- This is breaking ALL recommendations (100% failure rate)
- Without it, every game shows maxed line value (+10.0) and fails to qualify
- 5 minute fix, massive impact

🟡 **HIGH - Fixes #1-4 improve accuracy**
- These are 15% of the scoring model
- Already partially working, but needs refinement
- 1-2 hour fixes

## Timeline

**Fix #0 (predicted spread):**
- **5 minutes** - Add one line of code to bet_scorer.py
- **Immediate impact** - Games will start qualifying

**Fixes #1-4 (injury data):**
- 30 min: Team name mapping + deduplication
- 30 min: Suspension detection  
- 30 min: Testing + verification

---

## Quick Win Alternative

If full fix takes too long, **temporary workaround:**

Lower confidence threshold from 7.0 → 6.5 in `config.py`:
```python
'min_confidence': 6.5  # Temporary until injury data fixed
```

This would have qualified Bucks @ Thunder (6.3) yesterday, but it's a bandaid, not a fix.

---

**Need:** Developer to implement these fixes and verify data flow from ESPN → DB → Scorer works correctly.
