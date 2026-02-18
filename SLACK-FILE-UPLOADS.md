# 📎 Slack File Upload Support

**Status:** ✅ ACTIVE (2026-01-31)

## What Works Now

Jett can now see and process file uploads across **all Slack channels** automatically.

### Supported File Types
- Images (PNG, JPG, GIF, etc.)
- PDFs
- Documents (DOCX, TXT, etc.)
- Spreadsheets (XLSX, CSV, etc.)
- Any file type Slack supports

### How It Works

1. **Upload a file** to any Slack channel where Jett is a member
2. **Automatic detection** - The slack-bridge detects the file immediately
3. **Download** - File is downloaded to `/home/clawd/clawd/slack-files/`
4. **Processing** - Jett receives:
   - The message text (if any)
   - File name and type
   - File size
   - Local path to the downloaded file
5. **Response** - Jett can analyze, read, or process the file as needed

### Example

```
You: [Upload: IMG_0326.png]
     "Can you extract the text from this screenshot?"

Jett: 📎 Attached file: IMG_0326.png
      Type: image/png
      Size: 1142.4 KB
      Local path: /home/clawd/clawd/slack-files/1769878372_IMG_0326.png

      [Jett processes the image and extracts text...]
```

## Technical Details

### File Storage
- **Directory:** `/home/clawd/clawd/slack-files/`
- **Naming:** `{timestamp}_{original_filename}`
- **Cleanup:** Manual (files persist for future reference)

### Bridge Configuration
- **Script:** `/home/clawd/clawd/slack-bridge.js`
- **Start:** `./start-slack-bridge.sh`
- **Stop:** `./stop-slack-bridge.sh`
- **Logs:** `/home/clawd/clawd/slack-bridge.log`

### Monitored Channels
All channels where Jett is a member:
- #21-m-sports
- #level-up-batting-cage
- #all-terrysworld
- #daily-tasks
- #investing
- #project-ideas
- Direct messages with Terry

## Usage Tips

1. **No special commands needed** - Just upload files normally to any channel
2. **Add context** - Include a message with your file describing what you want Jett to do
3. **Multiple files** - Upload multiple files at once, all will be processed
4. **File size** - Slack's limits apply (varies by workspace plan)

## What Changed (2026-01-31)

### Before
- Files appeared as text "[Slack file: filename.png]"
- Jett couldn't access or process files
- Had to use workarounds (Telegram, Google Drive, etc.)

### After
- Files automatically downloaded when uploaded
- Jett receives full file information and access
- Works across all channels
- No workarounds needed

## Troubleshooting

### File not detected?
1. Check bridge is running: `ps aux | grep slack-bridge`
2. Check logs: `tail -f /home/clawd/clawd/slack-bridge.log`
3. Restart bridge: `./stop-slack-bridge.sh && ./start-slack-bridge.sh`

### File download failed?
- Check disk space: `df -h /home/clawd/clawd/slack-files`
- Check permissions: `ls -la /home/clawd/clawd/slack-files`
- Check logs for error details

### Jett not responding to files?
- Make sure you're in a monitored channel
- Add @Jett mention if in a channel (not needed in DMs)
- Check that the bridge is forwarding messages (see logs)

## Code Changes

Updated `slack-bridge.js`:
- Added `fs` and `path` modules for file handling
- Added `FILE_DOWNLOAD_DIR` constant
- Added `downloadSlackFile()` function
- Added `processFileAttachments()` function
- Modified `sendToClawdbot()` to include file metadata
- Modified `checkConversation()` to detect and process files

## Next Steps

Future enhancements could include:
- Automatic cleanup of old files (retention policy)
- File compression for large images
- OCR processing for images
- Direct upload to Google Drive
- File indexing/search

---

**Last Updated:** 2026-01-31
**Feature Status:** Production Ready ✅
