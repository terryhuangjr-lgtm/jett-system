# HEARTBEAT.md - Jett's Living Pulse

**⚠️ THIS FILE IS REWRITTEN BY JETT AT THE START OF EVERY SESSION.**
It is not static documentation. It is Jett's current awareness snapshot.
If this file is stale (date is old), Jett did not properly initialize last session.

Last Written: [Jett fills this in]
Written By: [Jett fills in model — e.g. grok-4-1-fast]

---

## RIGHT NOW

**System Status:** [HEALTHY / DEGRADED / DOWN]
**Gateway:** [UP / DOWN / UNKNOWN]
**Last overnight run:** [what ran, what succeeded, what failed — check /tmp logs]
**Anything broken:** [yes/no — if yes, what]

---

## WHAT I WORKED ON LAST SESSION

[Jett fills in: what was the last meaningful thing done. If unknown, say unknown.]

---

## WHAT'S PENDING

[Jett fills in: any open tasks, things Terry asked for that aren't done, known issues]

---

## SYSTEM HEALTH SNAPSHOT

Run these to fill in the snapshot — do it fast, don't overthink it:

```bash
pm2 list | grep -E "name|online|stopped"
pgrep -f 'openclaw-gateway' > /dev/null && echo "gateway UP" || echo "gateway DOWN"
ip link show eth0 | grep -o "mtu [0-9]*"
tail -5 /tmp/self-heal.log
clawdbot cron list | grep -E "ok|error|failed" | wc -l
```

**PM2 Dashboard:** [online / stopped]
**Gateway:** [up / down]
**MTU:** [1350 = good / anything else = bad, self-heal should fix]
**Self-heal log (last entry):** [paste last line]
**Cron jobs healthy:** [X of 25 ok]

---

## TOKEN CONSERVATION MODE

Terry watches API costs. Follow these rules every session:

- **Don't summarize back** what Terry just said. He knows what he said.
- **Don't confirm understanding** before acting. Just act.
- **One message to start, one to finish.** Middle messages only if blocked.
- **No "I'll now proceed to..."** — just proceed.
- **Short answers to short questions.** Match his energy.
- **Troubleshooting/explaining = full sentences.** Don't be cryptic when clarity matters.

When Terry is chatting casually or asking questions → use Grok (cheap).
When Terry needs a document, content, or complex output → that's when Sonnet is worth it.

---

## JETT'S CURRENT PRIORITIES (Terry's businesses)

1. **Level Up Digital** — AI automation agency. PRIMARY focus. Lead gen running Mon/Thu.
2. **@21MSports** — Bitcoin/sports tweets. Running daily at 7/7:30 AM.
3. **Level Up Cards** — eBay scanning. Running 9 AM daily rotation.
4. **Renaissance Albums** — Terry less involved. No active automation.

---

## HOW TO WRITE THIS FILE

At the start of every session, Jett does this — fast, under 2 minutes:

```
1. Run the health check commands above
2. Check /tmp/self-heal.log for overnight issues
3. Check clawdbot cron list for any error status
4. Fill in the RIGHT NOW section honestly
5. Update WHAT I WORKED ON LAST SESSION from memory/YYYY-MM-DD.md
6. Note anything pending
7. Save and move on — don't over-engineer it
```

**This file is for Jett's benefit, not Terry's.** It forces honest self-assessment before touching anything. A Jett who writes his own status report can't sleepwalk into a session and make assumptions.

---

## HEALTH MONITORING RULES

*(These are standing rules — Jett checks against them when writing the snapshot above)*

| Check | Threshold | Action |
|-------|-----------|--------|
| Gateway | Must be UP | self-heal.sh restarts, emails Terry if fails |
| MTU | Must be 1350 | self-heal.sh fixes silently |
| PM2 dashboard | Must be online | self-heal.sh restarts, emails Terry if fails |
| Ollama | Should be running | self-heal.sh restarts silently |
| Cron jobs | All 25 should show ok/idle | Report any showing "error" or "failed" to Terry |
| Self-heal log | Check for FAILED entries | If present, manual intervention needed |

**Self-heal script:** `/home/clawd/scripts/self-heal.sh` (runs every 5 min via crontab)
**Self-heal log:** `/tmp/self-heal.log`
**Email alerts:** Sent to terryhuangjr@gmail.com via GWS if services fail to auto-restart

---

## FOR FUTURE LOCAL LLM SESSIONS (Qwen 27B on 5070 Ti)

When running locally, token cost is near zero — but context window matters more.
This file becomes even more important: a tight heartbeat means Jett loads fast
and acts immediately without re-reading everything from scratch.

Keep this file under 100 lines when filled in. Trim aggressively.
The goal is: read this file, know the state, act. Under 60 seconds.
