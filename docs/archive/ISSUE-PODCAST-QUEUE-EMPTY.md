# PODCAST QUEUE - Empty / User Action Required

**Status:** ℹ️ Not a bug - by design
**Severity:** Medium (workflow missing)
**Created:** 2026-02-19 12:37 EST

---

## Problem

Podcast processing job runs daily (3 AM) but produces no summaries.

**Root Cause:** Podcast queue is empty.

```
Queue status: Queue is empty (5 max)
```

---

## How the System Works

1. **User adds podcast URL to queue:**
   ```bash
   python3 /home/clawd/skills/podcast-summary/manage_queue.py add https://www.youtube.com/watch?v=...
   ```

2. **Cron job processes it (3 AM daily):**
   - Pulls from queue
   - Downloads audio
   - Transcribes with Whisper
   - Summarizes with Claude
   - Saves to `/home/clawd/clawd/data/podcasts/summaries/`

3. **Deploy job posts it (6:30 AM):**
   - Reads summary file
   - Posts to #podcastsummary on Slack

---

## Current State

- ✅ Podcast system is working correctly
- ✅ Processing script works (tested manually)
- ✅ Queue management works
- ❌ **Queue is empty** — nothing to process
- ❌ **No workflow to add podcasts** — user doesn't know how

---

## What's Needed

1. **User needs to add podcasts to the queue:**
   ```bash
   python3 manage_queue.py add <youtube-url>
   ```

2. **Or:** Set up automatic podcast feed subscription

3. **Or:** Create a Slack command that adds podcasts to queue

---

## To Test

```bash
# Add a test podcast
cd /home/clawd/skills/podcast-summary
python3 manage_queue.py add https://www.youtube.com/watch?v=dQw4w9WgXcQ

# Check queue
python3 manage_queue.py view

# Run processing manually
python3 run_background.py
```

---

## Not a Bug

The podcast system itself is **fully functional**. This is a missing operational workflow — nobody is feeding podcasts to the system.

Either:
1. Terry needs to manually add podcasts to test/use
2. Or set up automatic feed subscription
3. Or create a Slack UI to submit podcast URLs
