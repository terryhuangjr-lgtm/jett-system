# Content Quality Improvements for 21M Sports

## Problem Analysis (Kerby Joseph Example)

### What Went Wrong:
1. **Prediction Articles**: Research found "2026 NFL extension predictions" (not signed deals)
2. **Unknown Player**: Kerby Joseph is not a star (defensive back, not household name)
3. **No Story**: Just math ($20M = 290 BTC) with no compelling narrative
4. **Recent Contract**: No dramatic BTC price difference to showcase fiat debasement

### What Makes Good Content:
- **Historic contracts** with dramatic BTC price differences (10x-100x)
- **Star players** people recognize (not role players)
- **Compelling stories** (went broke, missed opportunity, success/failure)
- **Clear lessons** about sound money, fiat debasement, financial mistakes

## Fixes to Implement

### 1. Filter Out Prediction Articles

**brave-search.js** - Add exclusion patterns:
```javascript
// After line 106, add exclusion check:
const predictionIndicators = [
  /predict/i, /projection/i, /could sign/i, /might sign/i,
  /potential/i, /expected to/i, /likely to/i, /offseason outlook/i
];

const isPrediction = predictionIndicators.some(pattern =>
  pattern.test(title) || pattern.test(description)
);

if (isPrediction) {
  continue; // Skip prediction articles
}
```

### 2. Improve Search Queries

**brave-search.js line 213-216** - Better queries:
```javascript
const queries = [
  `${sportFilter} "signed" OR "agrees to" contract 2025 2026`,  // Actual signings
  `${sportFilter} "finalizes" OR "lands" mega deal 2025 2026`,  // Finalized deals
  `college basketball football NIL "signing" 2025 2026`,  // NIL actual signings
];
```

### 3. Add Player Recognition Scoring

**21m-sports-real-research.py** - Add star player bonus:

```python
def calculate_star_power(player_name: str) -> int:
    """
    Score player recognition (0-10)
    Higher for household names, lower for role players
    """
    # Tier 1: Superstars (10 points)
    superstars = ['Patrick Mahomes', 'Shohei Ohtani', 'LeBron James',
                  'Aaron Judge', 'Caitlin Clark', 'Stephen Curry']

    # Tier 2: All-Stars (7 points)
    allstars = ['Jaylen Brown', 'Tua Tagovailoa', 'Bryce Harper']

    # Check name matches
    for star in superstars:
        if star.lower() in player_name.lower():
            return 10

    for star in allstars:
        if star.lower() in player_name.lower():
            return 7

    # Default: role player (3 points)
    return 3

# In scoring logic (around line 700):
star_bonus = calculate_star_power(contract['player'])
content_score += star_bonus
```

### 4. Prioritize Historic Contracts

**Database query** - Prefer older contracts with big BTC differences:

```python
# In research script, boost scores for contracts with:
# 1. Contract year < 2015 (BTC was cheap)
# 2. Contract value > $100M
# 3. BTC price at signing < $10,000

if contract_year < 2015:
    quality_score += 2  # Historic bonus

if btc_price_at_signing < 10000:
    quality_score += 2  # Cheap BTC bonus

if contract_value > 100_000_000:
    quality_score += 1  # Mega-deal bonus
```

### 5. Improve Claude Generation Prompt

**21m-claude-generator.js** - Add better context to prompt:

```javascript
const promptContext = `
CONTENT QUALITY GUIDELINES:
- Focus on dramatic contrasts (then vs now, rich vs broke)
- Tell a story, don't just state facts
- Show the lesson (what went wrong/right)
- Make it emotional and relatable
- Prove a point about sound money vs fiat debasement

GOOD EXAMPLE:
"Robinson Cano signed for $240M in 2013 = 1.2M BTC.
Jaylen Brown signed for $304M in 2023 = 10,857 BTC.
Same sport. Same fiat system. Wildly different wealth."
→ Shows dramatic 110x difference, proves fiat debasement point

BAD EXAMPLE:
"Kerby Joseph's $20M = 290 BTC at $68,845. Fiat devalues."
→ Just math, no story, no dramatic contrast, no lesson
`;
```

### 6. Content Type Priority

**Research selection** - Prioritize in this order:
1. **Historic mega-deals** (pre-2015, $100M+) - Best BTC comparisons
2. **Bankruptcy stories** (Allen Iverson, Antoine Walker) - Clear lessons
3. **Comparison pairs** (Cano vs Brown) - Shows debasement over time
4. **Rookie contracts from 2009-2013** (BTC was pennies) - Missed opportunities
5. **Recent contracts** - ONLY if star players with interesting angles

## Implementation Priority

### Phase 1 (Quick - 30 min):
1. Filter out prediction articles in brave-search.js
2. Improve search queries
3. Update Claude prompt with quality guidelines

### Phase 2 (Medium - 1 hour):
4. Add star power scoring
5. Boost historic contract scores
6. Test with dry-run

### Phase 3 (Optional - Future):
7. Build database of "known stars" list
8. Add narrative templates for different content types
9. Create quality dashboard to track content scores

## Expected Results

**Before (Kerby Joseph):**
- Unknown player
- Prediction article
- No story
- Quality score: 5/10

**After:**
- Star players or compelling stories
- Actual signed contracts
- Clear narrative with lesson
- Quality score: 8-10/10

Examples of ideal content:
- Allen Iverson: $200M to broke (bankruptcy lesson)
- Cano vs Brown: 110x BTC difference (fiat debasement)
- Trevor Lawrence 2021 rookie deal: $24M bonus = worth billions if in BTC
- A-Rod $252M in 2000: When BTC was $0 (historic perspective)
