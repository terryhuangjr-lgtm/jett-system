# Year Range Search Feature

The SmartQueryParser now supports year ranges, allowing you to search multiple years with a single query.

## How It Works

Year ranges are automatically detected and expanded into individual year searches. This gives better eBay results by running separate, focused searches for each year.

## Supported Syntax

Three different formats are supported:

1. **Hyphen format**: `jordan 1990-1994`
2. **Natural language**: `jordan between 1990 and 1994`
3. **"to" format**: `jordan 1990 to 1994`

All three formats work identically and produce the same results.

## Examples

### Simple Year Range
```
Query: "jordan 1990-1994"
Result: 5 searches
  - "1990 jordan"
  - "1991 jordan"
  - "1992 jordan"
  - "1993 jordan"
  - "1994 jordan"
```

### Year Range + Single Card Type
```
Query: "kobe 1996-2000 refractors"
Result: 5 searches
  - "1996 kobe refractor"
  - "1997 kobe refractor"
  - "1998 kobe refractor"
  - "1999 kobe refractor"
  - "2000 kobe refractor"
```

### Year Range + Multiple Card Types
```
Query: "wade 2003-2005 autos and numbered"
Result: 6 searches (3 years × 2 types)
  - "2003 wade auto"
  - "2003 wade numbered"
  - "2004 wade auto"
  - "2004 wade numbered"
  - "2005 wade auto"
  - "2005 wade numbered"
```

### Complex Multi-Search
```
Query: "lebron 2003-2006 rookies, refractors, and autos"
Result: 12 searches (4 years × 3 types)
  - "2003 lebron rookie"
  - "2003 lebron refractor"
  - "2003 lebron auto"
  - "2004 lebron rookie"
  ... (and so on)
```

## Using with Multi-Search

The feature works automatically with your existing `multi-search.js` script:

```bash
node multi-search.js "jordan 1990-1994"
node multi-search.js "wade 2003-2005 autos and numbered"
node multi-search.js "kobe between 1996 and 2000 refractors"
```

The SmartQueryParser will:
- ✓ Detect the year range
- ✓ Expand into individual years
- ✓ Combine with card type splitting
- ✓ Run all searches
- ✓ Deduplicate results
- ✓ Score and rank deals

## Validation

Year ranges are validated to ensure:
- Years are between 1900-2100
- Start year ≤ end year
- Invalid ranges are ignored and treated as regular search terms

## Testing

Run the test suite to see all examples:

```bash
node test-year-ranges.js
```

Or see practical examples:

```bash
node example-year-range-search.js
```

## Benefits

1. **Better Coverage**: Separate searches per year find more listings
2. **More Accurate**: Year-specific searches avoid false positives
3. **Flexible**: Supports multiple syntax formats
4. **Powerful**: Combines with existing card type splitting
5. **Automatic**: No code changes needed - just use the feature

## Edge Cases

- Single year range (e.g., "1990-1990"): Returns single search
- Backwards range (e.g., "1995-1990"): Ignored, treated as regular text
- Out of range (e.g., "1890-1900"): Ignored, treated as regular text

## Performance

Large year ranges create many searches. For example:
- "jordan 1984-2003 refractors, autos, and numbered" = 60 searches (20 years × 3 types)

The multi-search tool handles deduplication automatically, so you get comprehensive results without duplicates.
