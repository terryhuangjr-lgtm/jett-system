# Model Routing Strategy
**Updated:** 2026-02-01

## Active Rules

### Grok-3 (X/Twitter Specialist)
**Use for:**
- 21M Sports content research
- X/Twitter trending topics
- Viral post discovery
- Sports news from social media
- Any X/Twitter-related tasks

**How:** Spawn sub-agent with `model: xai/grok-3`

**Example:**
```
Task: "Find trending sports contract news on X"
→ Spawn sub-agent with Grok-3
→ Grok searches X, finds viral topics
→ Reports back results
```

### Claude Sonnet 4.5 (Default)
**Use for:**
- Everything else
- Analysis and decision-making
- General research (via Brave Search)
- Automation and scripting
- File operations
- Project planning

**How:** Default model (no special config needed)

### Why This Works
- **Grok knows X better** - real-time access, social context
- **Claude handles everything else** - already excellent
- **Clear boundaries** - easy to remember when to use what

## Implementation Checklist
- [x] Document strategy (this file)
- [x] Always use Grok for 21M Sports research
- [x] Default to Claude for everything else
- [ ] Track if this actually improves results

---

**Rule:** When working on 21M Sports content, think "Is this X/Twitter related?" If yes → Grok. If no → Claude.
