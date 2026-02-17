# Complete System Documentation

**Master index for all systems** - Read this first!

---

## 21M Content System
📍 **File:** `/home/clawd/clawd/21M-SYSTEM-FINAL.md`
- Sports & Bitcoin tweet generation
- Research pipeline
- Tracker system
- Daily schedule

---

## Podcast Summarization  
📍 **File:** `/home/clawd/skills/podcast-summary/SYSTEM.md`
- YouTube to summary pipeline
- Queue management
- Dashboard at port 5001

---

## eBay Scanner
📍 **File:** `/home/clawd/clawd/ebay-scanner/SYSTEM.md`
- Card scanning system
- Scheduled searches
- Results posted to Slack

---

## Sports Betting
📍 **File:** `/home/clawd/clawd/sports_betting/SYSTEM.md`
- Scout mode (10 AM)
- Pick of the day (4 PM)
- Analysis and predictions

---

## Task Manager
📍 **File:** `/home/clawd/clawd/task-manager/SYSTEM.md`
- Cron-like scheduler
- Dashboard at port 3000
- All automation tasks

---

## ClawdBot / Jett
📍 **Files:** 
- `/home/clawd/clawd/AGENTS.md` - Core identity
- `/home/clawd/clawd/MODEL-ROUTING.md` - Model usage

---

## Quick Reference

### Ports
| Service | Port |
|---------|------|
| Task Manager | 3000 |
| Podcast Dashboard | 5001 |

### Key Scripts
```bash
# 21M Content
node /home/clawd/clawd/automation/jett-daily-research.js --balanced    # Research
node /home/clawd/clawd/automation/21m-claude-generator.js --type sports  # Generate
node /home/clawd/clawd/automation/deploy-21m-tweet.js              # Deploy

# Podcast
python3 /home/clawd/skills/podcast-summary/summarize_podcast.py [URL]

# Tasks
curl http://localhost:3000/api/tasks
```

### Memory Locations
```
/home/clawd/clawd/memory/
├── research/                    # 21M research source
├── 21m-*-verified-*.json     # 21M content
├── ebay-scans/               # eBay results
├── sports_betting/           # Betting history
└── task-logs/               # Automation logs
```

---

## Daily Schedule

| Time | Task |
|------|-------|
| 00:00 | Research |
| 03:00 | Podcast Process |
| 04:00 | Bitcoin Generate |
| 05:00 | Sports Generate |
| 06:30 | Podcast Deploy |
| 07:30 | Sports Deploy |
| 08:00 | Bitcoin Deploy |
| 08:00 | Morning Brief |
| 10:00 | Sports Scout |
| 10:00 | eBay Scan (Wed) |
| 16:00 | Sports Pick |

---

*Last updated: 2026-02-15*
