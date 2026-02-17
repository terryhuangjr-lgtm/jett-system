# Slack Integration Limitations

**Last Updated:** 2026-01-31

## What Works ✅

- **Text messages** - Full two-way communication across all channels
- **@mentions** - Optional (not required in 1-on-1 channels)
- **Channel monitoring** - All channels where Jett is a member
- **Message history** - Persistent timestamp tracking (no duplicate replies)

## What Doesn't Work ❌

### File Attachments

**Status:** Not supported

**Reason:** Slack's file system requires browser-session authentication that bot tokens don't provide. All file URLs (including thumbnails) redirect to login pages when accessed programmatically.

**Attempted Solutions:**
- Direct download with bot token → HTML login page instead of file
- Slack API `files.sharedPublicURL` → Requires user token (not_allowed_token_type)
- Public URLs and thumbnails → All redirect to auth

**Workaround:** ✅ **Use Telegram for file uploads** (confirmed working)

## Architecture

### Slack Bridge (`slack-bridge.js`)
- Polls Slack every 8 seconds
- Monitors 7 channels + DMs
- Forwards messages to clawdbot gateway
- Saves timestamps to disk to prevent duplicate processing

### File Storage
- Text messages: Instant relay to Jett
- File uploads: **Use Telegram instead**

## Recommendations

1. **For text communication:** Use Slack (fast, clean, organized by channel)
2. **For file uploads:** Use Telegram (reliable file transfer confirmed working)
3. **Don't waste time trying to fix Slack files** - it requires major architectural changes

## Technical Notes

Slack file access would require one of:
- Browser automation with logged-in session (complex, fragile)
- Slack user token with file permissions (security risk)
- Enterprise Grid with different file settings (not available)

None of these are worth the effort given Telegram already works.

---

**Bottom Line:** Slack is great for messaging, Telegram is great for files. Use both for their strengths.
