# Podcast Summarization - Jett Reference

## Quick Start

When user shares a YouTube link for transcription:

**1. User says:** "Summarize this podcast: [URL]" or "Transcribe this: [URL]"

**2. Jett responds:** "Starting transcription. This will take 15-60 minutes depending on podcast length. I'll post the summary to #podcastsummary when ready."

**3. Jett runs:**
```bash
python3 /home/clawd/skills/podcast-summary/summarize_podcast.py [URL]
```

**4. When complete:**
- Summary auto-posts to #podcastsummary
- Full summary saved to `/home/clawd/data/podcasts/summaries/`

---

## Queue System (Optional)

Instead of immediate processing, add to queue for nightly processing:

**Add to queue:**
```bash
python3 /home/clawd/skills/podcast-summary/manage_queue.py add [URL]
```

**View queue:**
```bash
python3 /home/clawd/skills/podcast-summary/manage_queue.py view
```

**Queue processes automatically at 3:00 AM daily**

---

## Slack Commands Jett Should Recognize

| Trigger | Action |
|---------|--------|
| "summarize this podcast: [URL]" | Run transcription immediately |
| "add [URL] to podcast queue" | Add to nightly queue |
| "show podcast queue" | Display queued podcasts |
| "remove [position] from queue" | Remove from queue |
| "clear podcast queue" | Clear all queued podcasts |

---

## Dashboard

Access at: **http://localhost:5001**

Features:
- View queue
- Add/remove URLs
- "Transcribe Now" button
- Recent summaries list
- Processing stats

---

## Troubleshooting

**If transcription fails:**
- Check Whisper model is installed: `whisper --version` (first run downloads ~3GB)
- Check Ollama is running: `curl http://localhost:11434/api/tags`
- Check ffmpeg installed: `which ffmpeg`

**If Slack post fails:**
- Verify channel ID in `/home/clawd/clawd/automation/post-podcast-summary.js`
- Check Slack bot token is valid

---

## Files

- Script: `/home/clawd/skills/podcast-summary/summarize_podcast.py`
- Queue manager: `/home/clawd/skills/podcast-summary/manage_queue.py`
- Dashboard: `/home/clawd/skills/podcast-summary/app.py`
- Database: `/home/clawd/data/podcasts/podcasts.db`
- Summaries: `/home/clawd/data/podcasts/summaries/`
- Transcripts: `/home/clawd/data/podcasts/transcripts/`
