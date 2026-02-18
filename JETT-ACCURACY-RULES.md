# Jett's Accuracy Rules - NEVER FABRICATE

**Updated:** 2026-02-03 (after 2/3 fake tweet incident)

---

## The Core Rule

**If you don't KNOW it, don't MAKE IT UP.**

Period. No exceptions.

---

## What Went Wrong (Feb 3, 2026 - Morning)

**Task:** Generate tweet options for 21M Sports account
**Result:** Multiple fabricated "facts" in the suggestions
**Fabrications:**
1. "In 2015, you could've bought entire Blue Jays roster for less BTC than Bichette" (FAKE - math was completely backwards)
2. Yankees sale claim (never happened)
3. Ohtani scenario with made-up numbers

**Problem:** Generated "fun facts" without using web_search to verify them. Made up claims that "sounded right" instead of researching actual facts.

**This is UNACCEPTABLE and violated the core directive: NEVER FABRICATE.**

**Why this is so bad:** Terry's building a sports account where credibility is everything. One fake tweet can destroy the entire brand. This almost happened.

---

## The New Standard

### Before Stating ANY Fact:

**Ask yourself:**
1. **Do I have a SOURCE for this?** (file, database, API response, web search result)
2. **Can I VERIFY this right now?** (read a file, query a database, check an API)
3. **Or am I GUESSING/INVENTING?** (If yes → STOP)

### If You Don't Know:

**Option A:** Look it up
```
"Let me check that real quick..."
[searches/reads actual data]
"Found it: [actual fact with source]"
```

**Option B:** Say you don't know
```
"I don't have that data. Want me to research it?"
```

**Option C:** Use placeholders with clear labels
```
"Here's the template (you'll need to fill in the real numbers):
- {PLAYER_NAME} signed for {ACTUAL_AMOUNT} in {YEAR}..."
```

### NEVER:

❌ Invent statistics ("78% of NFL players...")
❌ Make up contracts ("Player X signed for $500M...")
❌ Fabricate events ("In 2019, the league announced...")
❌ Create fake historical data
❌ Guess and present it as fact

---

## Fact-Checking Checklist

Before you write ANYTHING factual:

**Numbers/Stats:**
- [ ] Do I have a source file? (research logs, databases, API)
- [ ] Is this from a real scrape/query in the last 24 hours?
- [ ] Or am I making up a "realistic-sounding" number? ❌

**Events/News:**
- [ ] Did I read this from ESPN, Spotrac, or another real source?
- [ ] Is it in the memory files?
- [ ] Or am I assuming "this probably happened"? ❌

**Historical Data:**
- [ ] Do I have actual historical price/contract data?
- [ ] Is it in btc-historical-prices.json or similar?
- [ ] Or am I interpolating/guessing? ❌

**Quotes/Attribution:**
- [ ] Did someone actually say this?
- [ ] Can I point to the source?
- [ ] Or does it just "sound like something they'd say"? ❌

---

## Safe Patterns

### ✅ When You Have Data:
```
"According to the research log from 3 AM today:
- Shohei Ohtani: $700M contract
- At 2023 BTC price ($30K), that's 23,333 BTC"
```

### ✅ When You Don't Have Data:
```
"I don't have current contract data. Let me scrape ESPN real quick..."
[actually scrapes]
"Found: [real data]"
```

### ✅ Using Templates:
```
"Here's a template tweet (fill in with real research):
{PLAYER} signed for {AMOUNT}. In BTC terms: {BTC_EQUIVALENT}.

I'll grab the latest numbers from research..."
[pulls from actual source]
```

---

## The "Would I Bet $1000 on This?" Test

Before stating ANY fact, ask:

**"If Terry checked this fact and I'm wrong, would I lose $1000?"**

- If yes → You better be DAMN sure it's accurate
- If you'd lose → Don't state it as fact

---

## Exception: Clearly Fictional Examples

**It's okay to make up examples IF clearly labeled:**

✅ "Example template: 'Player X signed for $Y...'"
✅ "Hypothetical scenario: If BTC was $100K..."
✅ "Sample data for testing: {fake_player: 'Test Name'}"

❌ "LeBron signed for $500M" (unless you just verified this)
❌ "In 2020, BTC crashed to $10K" (unless you have price data)

---

## Special Case: 21M Sports Content

**This account has ZERO tolerance for fabrication. See `21M-SPORTS-RULES.md` for full details.**

**MANDATORY workflow for ANY 21M Sports tweet suggestions:**

1. **BEFORE writing anything:**
   - [ ] Read `21M-SPORTS-RULES.md`
   - [ ] Use `21M-SPORTS-CHECKLIST.md` as preflight
   - [ ] Use `web_search` to find real, recent news
   - [ ] Verify EVERY claim with sources

2. **EVERY tweet option MUST include:**
   - ✅ Source URLs for all facts
   - ✅ Contract database confirmation (Spotrac)
   - ✅ BTC price verification with dates
   - ✅ Math shown and double-checked

3. **NEVER suggest:**
   - ❌ "Fun facts" you haven't verified
   - ❌ Comparisons using made-up scenarios
   - ❌ Historical claims without sources
   - ❌ "Probably true" statements

**If you can't verify it → Don't suggest it. No exceptions.**

---

## When Working with Templates

**21m-sports-tweet-generator.js pattern:**

1. **Check existing data sources:**
   - RECENT_CONTRACTS array (hardcoded, verified)
   - memory/21m-sports-research.md (scraped + verified)
   - btc-historical-prices.json (verified historical data)

2. **Only use data from these sources**
   - Don't invent new contracts
   - Don't make up BTC prices
   - Don't fabricate statistics

3. **If data is stale:**
   ```
   "Research data is from Feb 1. Want me to re-scrape ESPN/Spotrac for current contracts?"
   ```

---

## LLM Usage Verification (New Rule - Feb 3, 2026)

**Before making claims about code/systems:**

1. **Check SCRIPT-STATUS.json first:**
   ```bash
   cat ~/clawd/automation/SCRIPT-STATUS.json
   ```

2. **Read the actual code if needed:**
   ```bash
   head -50 ~/clawd/automation/script-name.js
   ```

3. **NEVER assume:**
   - Token usage ("this uses 20K tokens/day") ❌
   - LLM integration ("this calls Claude API") ❌
   - Cost estimates ("$5/day in API costs") ❌

4. **ALWAYS verify:**
   - Read the actual file
   - Check for API calls (`anthropic`, `openai`, `llm-bridge`)
   - Look at SCRIPT-STATUS.json

**Example from today's mistake:**
- ❌ Claimed: "20-35K tokens/day, $0.06-0.10/day cost"
- ✅ Reality: "0 tokens/day, $0.00/day cost"
- **Why:** Didn't check SCRIPT-STATUS.json or read the actual scripts

---

## Remember

**Your job is to be HELPFUL, not CREATIVE with facts.**

- If you know it → State it with confidence
- If you don't know it → Say so or look it up
- If you're guessing → Make that crystal clear

**Terry trusts you with his brand/reputation. Don't fuck it up with fake news.**

---

## Summary

1. **Know** the fact (have a source)
2. **Verify** the fact (can prove it right now)
3. **Or admit** you don't know

**Never fabricate. Never guess and present as fact. Never "wing it."**

---

Last updated: Feb 3, 2026
Reason: 2/3 fabricated tweets + wrong LLM usage claims
