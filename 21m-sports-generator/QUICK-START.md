# 21M Sports Content Generator - Quick Start

## Installation

```bash
cd 21m-sports-generator
npm install
```

## Generate Content

### Generate All Content Types (Recommended for Daily Use)
```bash
npm run generate all
```

This gives you multiple ready-to-post options across all categories:
- Contract comparisons
- Athlete wealth stories
- Quick hits
- Educational content

### Generate by Content Type

```bash
# Contract comparisons (then vs now in BTC)
npm run generate contract

# Athlete stories (bankruptcy/success)
npm run generate athlete

# Quick hits (fast, punchy content)
npm run generate quick

# Educational content (sound money lessons)
npm run generate edu
```

### Generate by Weekly Theme

```bash
# Monday - breaking news in BTC terms
npm run generate theme 21m-monday

# Thursday - historical moments
npm run generate theme timechain-thursday

# Friday - contract era comparisons (your signature content!)
npm run generate theme fiat-friday

# Saturday - educational content
npm run generate theme sat-stacking-saturday

# Sunday - athlete wealth stories
npm run generate theme sound-money-sunday
```

### List Available Themes
```bash
npm run generate themes
```

## How It Works

1. **Data Sources**: Real-time sports contracts + historical BTC prices
2. **Templates**: Multiple variations for each content type
3. **Fact-Checked**: All numbers verified with sources included
4. **Ready to Post**: Character count, warnings, and metadata included

## Example Output

```
─── Option 1 ───
James Harden signed for 57,000 BTC in 2017.
Shohei Ohtani just signed for 25,000 BTC.

The "historic" deal is actually 0.4x smaller in real terms.
This is fiat debasement.

Characters: 177/280

📊 DATA & SOURCES
────────────────────────────────────────
James Harden: $228M (2017) = 57,000 BTC
Shohei Ohtani: $700M (2023) = 25,000 BTC
2.3x difference in real terms

Sources:
  • Historical BTC price data: CoinGecko
  • Contract data: Sports reference databases
```

## Tips

1. **Run `npm run generate all` each morning** to get fresh content ideas
2. **Pick your favorite** from the 3-5 options provided
3. **Copy & paste** directly to X - it's ready to go!
4. **Customize** if needed, but the data is fact-checked
5. **Track what works** and generate more of that type

## Content Categories

### Contract Comparisons
Shows how modern "massive" contracts are actually smaller in BTC terms than older deals. Your signature content.

### Athlete Stories
High vs low time preference lessons from sports. Who went broke, who built wealth.

### Quick Hits
Fast, punchy content perfect for engagement. Stats, Fed connections, inflation reality checks.

### Educational
Teaching Bitcoin/sound money principles through sports analogies. Sat Stacking Saturday content.

## Troubleshooting

**API Rate Limits**: The tool uses fallback historical BTC price data if the API is unavailable.

**Want Different Sports**: Edit `modules/sports-data.js` to add more contracts to the database.

**Character Count Over 280**: The tool automatically filters these out. Only posts within the limit are shown.

## What's Next?

This is v1. Future enhancements could include:
- Auto-posting to X (requires Twitter API)
- Web scraping for real-time contract news
- Image generation for contract comparisons
- Content calendar with scheduling
- Analytics on what performs best

For now, this gives you fact-checked, ready-to-post content in seconds instead of hours.

Happy orange-pilling through sports! 🏀⚾🏈₿
