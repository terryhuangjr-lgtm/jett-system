# CRITICAL - Podcast Processing Silent Failure

**Status:** 🔴 BLOCKING
**Severity:** Critical
**Created:** 2026-02-19 12:38 EST
**Reported:** Terry had 2-3 podcasts in queue last night, none processed/deployed

---

## Problem

Podcasts were in the queue last night. This morning:
- ❌ Queue is empty (items removed)
- ❌ No summary files created
- ❌ No audio files downloaded
- ❌ No error messages
- ❌ No logs of what happened

**Verdict:** Podcasts were removed from queue but never processed into summaries.

---

## Evidence

**Checked:**
- `/home/clawd/clawd/data/podcasts/summaries/` → Empty (last file Feb 14)
- `/home/clawd/clawd/data/podcasts/audio/` → Empty (no downloads)
- `manage_queue.py view` → "Queue is empty"
- Logs → No record of processing

**What happened to the 2-3 podcasts:**
- Unknown. They're gone but summaries weren't created.

---

## Root Cause Unknown

Could be:
1. Processing script failed silently (no error output)
2. Queue removal happened without triggering processing
3. Processing crashed partway through
4. Webhook/API removed items without processing

**Without logs, can't tell what went wrong.**

---

## Critical Issues

1. **Silent failure** — No indication that something went wrong
2. **No error logging** — Processing job doesn't report failures
3. **Queue management issue** — Items removed without confirmation of success
4. **Lost data** — User's podcasts disappeared without summary

---

## For Mini to Fix

1. Add error logging to `/home/clawd/skills/podcast-summary/run_background.py`
2. Ensure processing doesn't remove queue items until summary is confirmed
3. Add checkpoint logging for each processing step
4. Test with manual podcast addition to see where it fails

---

**This is different from "queue is empty"** — items WERE there, processing happened (or tried to), and failed silently.
