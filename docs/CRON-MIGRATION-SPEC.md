# Migration: Clawdbot Cron → System Cron

## Problem
Clawdbot cron jobs use `wakeMode: "next-heartbeat"` which requires active heartbeats in the session. The main session heartbeat is disabled, so jobs schedule but never execute.

## Solution
Migrate all automated tasks to native Linux cron (crontab), bypassing Clawdbot's scheduler entirely.

---

## Tasks to Migrate

### Daily Tasks (24 total)
| Time | Task | Command |
|------|------|---------|
| 00:00 | 21M Research | `cd /home/clawd && /home/clawd/.nvm/versions/node/v22.22.0/bin/node /home/clawd/clawd/automation/21m-nightly-scraper.js` |
| 00:00 | BTC Research | `cd /home/clawd && /home/clawd/.nvm/versions/node/v22.22.0/bin/node /home/clawd/clawd/automation/jett-daily-research.js --balanced` |
| 03:00 | Podcast Processing | `/usr/bin/python3 /home/clawd/skills/podcast-summary/run_background.py` |
| 04:00 | Bitcoin Tweet Gen | `/home/clawd/.nvm/versions/node/v22.22.0/bin/node /home/clawd/clawd/automation/21m-claude-generator.js --type bitcoin` |
| 05:00 | Sports Tweet Gen | `/home/clawd/.nvm/versions/node/v22.22.0/bin/node /home/clawd/clawd/automation/21m-claude-generator.js --type sports` |
| 06:30 | Podcast Deploy | `/home/clawd/.nvm/versions/node/v22.22.0/bin/node /home/clawd/clawd/automation/deploy-podcast-summary.js` |
| 07:30 | Sports Deploy | `/home/clawd/.nvm/versions/node/v22.22.0/bin/node /home/clawd/clawd/automation/deploy-21m-tweet.js /home/clawd/clawd/memory/21m-sports-verified-content.json` |
| 08:00 | System Health | `/home/clawd/.nvm/versions/node/v22.22.0/bin/node /home/clawd/clawd/automation/post-health-to-slack.js` |
| 08:30 | Bitcoin Deploy | `/home/clawd/.nvm/versions/node/v22.22.0/bin/node /home/clawd/clawd/automation/deploy-21m-tweet.js /home/clawd/clawd/memory/21m-bitcoin-verified-content.json` |
| 09:00 | eBay Scans (Mon-Fri) | `cd /home/clawd/clawd/ebay-scanner && /home/clawd/.nvm/versions/node/v22.22.0/bin/node run-from-config.js [day]` |
| 10:00 | eBay Deploy | `/home/clawd/.nvm/versions/node/v22.22.0/bin/node /home/clawd/clawd/automation/deploy-ebay-scans.js` |
| 10:00 | Sports Scout | `/usr/bin/python3 /home/clawd/clawd/sports_betting/orchestrator.py --mode scout` |
| 16:00 | Sports Pick | `/usr/bin/python3 /home/clawd/clawd/sports_betting/orchestrator.py --mode final` |

### Weekly Tasks
| Time | Task |
|------|------|
| Sun 09:00 | eBay Scan (Cam Ward) |
| Mon 09:00 | eBay Scan (MJ Finest) |
| Tue 09:00 | eBay Scan (Griffey) |
| Wed 09:00 | eBay Scan (Kobe) |
| Thu 09:00 | eBay Scan (MJ UD) |
| Fri 09:00 | eBay Scan (Multi) |
| Sat 09:00 | eBay Scan (MJ 94-99) |

### Maintenance
| Time | Task |
|------|------|
| Daily 02:30 | Log Rotate |
| Daily 02:45 | Backup |
| Sun 03:00 | Podcast Cleanup |

---

## Implementation Plan

1. **Create wrapper script** (`/home/clawd/scripts/cron-runner.sh`)
   - Sets proper PATH, NODE_PATH, HOME
   - Logs output to `/home/clawd/logs/cron/{job-name}.log`
   - Handles errors gracefully

2. **Add to crontab** (`crontab -e`)
   - Set timezone to America/New_York
   - Add all daily/weekly jobs

3. **Disable Clawdbot cron jobs**
   - Mark all existing cron jobs as disabled (so they don't conflict)

4. **Add monitoring**
   - Simple health check script that alerts if cron stops running

---

## Files to Create/Modify

- `/home/clawd/scripts/cron-runner.sh` - Wrapper script
- `/home/clawd/crontab` - Full crontab file
- Update each automation script to ensure standalone execution

---

## Success Criteria
- [ ] All daily content tasks run on schedule without manual intervention
- [ ] No dependency on Clawdbot session/heartbeat
- [ ] Logs go to `/home/clawd/logs/cron/`
- [ ] Failed jobs alert to Slack
