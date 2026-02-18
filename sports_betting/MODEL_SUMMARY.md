# NBA Betting Model Summary

## Core Philosophy
Rate both teams 0-100 based on factors → compare to book spread → bet where there's value.

## Team Rating Formula (0-100 scale)

```
home_rating = base + form_adj + injury_adj + home_court
away_rating = base + form_adj - injury_adj - home_court
```

Where:
- **base** = (point_differential + 10) from team_stats
- **form_adj** = recent_form_score × 0.5
- **injury_adj** = injury_impact_score × -1 (negative = home hurt)
- **home_court** = home_court_score (usually +3 to +5)

## Model Spread
```
model_spread = home_rating - away_rating
```
- Positive = home team should win
- Negative = away team should win

## Edge Calculation
```
edge = model_spread - book_spread
```

| edge | Meaning | Bet |
|------|---------|-----|
| edge > 0 | Model likes HOME more than book | Home |
| edge < 0 | Model likes AWAY more than book | Away |

## Confidence Score (0-10)
```
confidence = 5 + (edge × 1.5) + (model_spread × 0.5)
```

| Confidence | Interpretation |
|------------|----------------|
| 8-10 | Very Strong |
| 7-8 | Strong |
| 6-7 | Good |
| 5-6 | Slight Edge |
| <5 | Pass |

## Bet Recommendation Criteria
- **Minimum edge**: 3 points
- **Bet**: Team with value (edge ≥ 3)
- **Expected Value**: edge × 3%

## Weight Summary
- Team Quality: 0.27 (27%)
- Injury Impact: 0.31 (31%)
- Home Court: 0.15 (15%)
- Recent Form: 0.12 (12%)
- Line Value: 0.15 (15%)

## Current Output Example
```
Bucks @ Thunder
  Book: Bucks -9.5 ( Bucks favored)
  Model: Thunder wins by +0.0 (pick'em)
  Edge: -9.5 pts
  Confidence: 10/10 (Very Strong)
  BET: Thunder +9.5 (EV: 28.5%)
```

## Known Issues / Questions
1. Model often predicts pick'ems - is this too conservative?
2. Should model spread weight certain factors more heavily?
3. Is 3-point edge threshold appropriate?
4. Should confidence scale be different?
5. Should model develop stronger opinions on actual winners?

## Files
- `/home/clawd/clawd/sports_betting/analyzer/bet_scorer.py` - Main model
- `/home/clawd/clawd/sports_betting/collectors/injury_collector.py` - Injury impact scoring
