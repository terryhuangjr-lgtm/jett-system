# Slack Channels Directory

## Purpose

Organized storage for research, notes, and content tied to specific Slack channels.

## Structure

Each Slack channel gets its own folder with .md files for different purposes:

```
slack-channels/
├── dm-terry/          - DM conversations with Terry
├── 21-m-sports/       - 21M Sports content and research
├── batting-cage/      - Batting cage business planning
├── investing/         - BTC, stocks, market research
└── general/           - Miscellaneous stuff
```

## Usage

**When Terry says "save it" or "save file":**
- Content gets saved to the appropriate channel's .md file
- Based on current context/channel we're in

**When Terry says "remember this":**
- Mental note only (doesn't persist beyond session)

## File Types

Common files in each channel folder:
- **`CONTEXT.md`** - Channel-specific context (auto-loaded for efficiency)
- `notes.md` - General notes and research
- `content-bank.md` - Ideas, drafts, saved content
- `schedule.md` - Planning and timelines
- `resources.md` - Links, references, tools

### CONTEXT.md Files

Each channel has a CONTEXT.md that gets loaded automatically when working in that channel.

**Purpose:** Maximum efficiency - no wasted tokens figuring out "what is this channel about?"

**Contains:**
- Channel purpose and scope
- Key people and context
- Tone/style guidelines
- Quick links to related files
- Efficiency notes

Add new channels as needed!

---

Created: 2026-01-30
