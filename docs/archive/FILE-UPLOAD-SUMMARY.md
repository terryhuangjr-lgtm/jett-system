# 📎 File Upload Debugging - Summary

**Date:** 2026-01-30
**Issue:** File sharing through Gmail attachments and Google Drive uploads failing
**Root Cause:** File path resolution issues and incorrect upload sequencing

## What Was Fixed

### 1. File Path Resolution
**Problem:** Browser automation needs absolute paths, but relative paths were being used

**Solution:** `file-upload-helper.js`
- Automatically converts relative → absolute paths
- Checks multiple common locations (workspace, /tmp)
- Validates file exists and is readable
- Provides helpful error messages with suggestions

### 2. Upload Sequencing
**Problem:** File chooser must be "armed" BEFORE clicking upload button

**Solution:** Proper workflow order
```javascript
// ❌ Wrong order (doesn't work)
browser({ action: 'act', ref: 'attach', type: 'click' });
browser({ action: 'upload', files: [path] });

// ✅ Correct order
browser({ action: 'upload', files: [path] }); // ARM first
browser({ action: 'act', ref: 'attach', type: 'click' }); // Then click
```

### 3. Gmail Helper
**Problem:** Complex workflow with many steps prone to errors

**Solution:** `gmail-helper.js`
- Pre-validates email data (recipient, attachment size)
- Generates complete browser command sequence
- Enforces Gmail's 25MB attachment limit
- Provides clear step-by-step workflow

## Files Added

```
/home/clawd/clawd/
├── lib/
│   ├── file-upload-helper.js    (new) - Path resolution & validation
│   └── gmail-helper.js           (new) - Gmail workflow generation
├── FILE-UPLOAD-GUIDE.md          (new) - Complete documentation
├── FILE-UPLOAD-SUMMARY.md        (new) - This file
└── test-file-upload.sh           (new) - Test suite
```

## Quick Commands Added

```bash
./quick.sh upload-check <file>    # Check if file is uploadable
./quick.sh upload-list            # List all uploadable files
```

## How to Use

### Quick File Check
```bash
# Before sending, verify the file
./quick.sh upload-check report.pdf

# Output shows:
# ✅ File exists
# ✅ Absolute path: /home/clawd/clawd/report.pdf
# Size: 1.2 MB
```

### Send Gmail with Attachment
```javascript
const FileUploadHelper = require('./lib/file-upload-helper');
const GmailHelper = require('./lib/gmail-helper');

const fileHelper = new FileUploadHelper();
const gmailHelper = new GmailHelper();

// 1. Validate first
const validation = gmailHelper.validateEmail({
  to: 'terry@example.com',
  subject: 'Monthly Report',
  body: 'Please see attached report.',
  attachments: ['report.pdf']
});

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  return;
}

// 2. Get workflow
const workflow = gmailHelper.sendEmail({
  to: 'terry@example.com',
  subject: 'Monthly Report',
  body: 'Please see attached report.',
  attachments: ['report.pdf']
});

// 3. Execute workflow.commands with browser tool
// Each command in workflow.commands is a browser action
```

### Upload to Google Drive
```javascript
const FileUploadHelper = require('./lib/file-upload-helper');
const helper = new FileUploadHelper();

// Get Drive upload workflow
const workflow = helper.driveUploadWorkflow(
  'document.pdf',
  'Work Files'  // Optional folder
);

// Execute workflow.steps with browser tool
```

## Common Issues - SOLVED

### ✅ Issue: "File not found"
**Before:** Passed relative path like `report.pdf`
**After:** Helper resolves to `/home/clawd/clawd/report.pdf`

### ✅ Issue: File chooser not opening
**Before:** Clicked attach before arming upload
**After:** ARM → CLICK sequence enforced

### ✅ Issue: Unknown file location
**Before:** Had to manually search for files
**After:** `./quick.sh upload-list` shows all available files

### ✅ Issue: Large file fails silently
**Before:** No size validation
**After:** Pre-validates against Gmail's 25MB limit

## Testing

Run the test suite:
```bash
./test-file-upload.sh
```

Expected output:
```
1. Testing file resolution...         ✅
2. Listing available files...          ✅
3. Testing path resolution...          ✅
4. Checking for PDF files...           ✅
5. Testing Gmail workflow generation... ✅
6. Testing Drive workflow generation... ✅
```

## Example: Complete Gmail Send

```javascript
const GmailHelper = require('./lib/gmail-helper');
const gmail = new GmailHelper();

// Generate command sequence
const result = gmail.sendEmail({
  to: 'terryhuangjr@gmail.com',
  subject: 'Level Up Investor Deck',
  body: 'Hi Terry, here is the investor deck as requested.',
  attachments: ['Level-Up-Investor-Deck.pdf']
});

// result.commands contains:
// 1. Navigate to Gmail
// 2. Wait for load
// 3. Get snapshot (find compose button)
// 4. Click compose
// 5. Wait for compose window
// 6. Get snapshot (find fields)
// 7. Fill recipient
// 8. Fill subject
// 9. Fill body
// 10. ARM file chooser with absolute path
// 11. Click attach button
// 12. Wait for upload (60s timeout)
// 13. Click send
// 14. Wait for confirmation

// Execute each command with browser tool
```

## Integration with Jett

Update workflow in AGENTS.md:

```javascript
// Before sending files via Gmail/Drive:

// 1. Check file first
const FileUploadHelper = require('./lib/file-upload-helper');
const helper = new FileUploadHelper();

const check = helper.debugUpload(filename);
if (!check.valid) {
  // Show error and suggestions
  return;
}

// 2. Use absolute path
const absolutePath = check.absolutePath;

// 3. ARM before CLICK
browser({ action: 'upload', files: [absolutePath] });
browser({ action: 'act', ref: attachButtonRef, type: 'click' });

// 4. Wait generously
browser({ action: 'wait', timeoutMs: 60000 });
```

## Key Learnings

1. **Browser automation requires absolute paths** - relative paths don't work
2. **File chooser must be armed first** - ARM → CLICK, not CLICK → ARM
3. **Validation prevents errors** - check files before attempting upload
4. **Generous timeouts** - uploads take time, use 30-60s timeouts
5. **Fresh snapshots** - get new refs before clicking, don't reuse old ones

## Documentation

- **Full guide:** `FILE-UPLOAD-GUIDE.md` - Complete documentation with examples
- **Helper API:** `lib/file-upload-helper.js` - See inline comments
- **Gmail API:** `lib/gmail-helper.js` - See inline comments
- **Quick reference:** `./quick.sh help` - Shows upload commands

## Status

✅ **File upload debugging complete**
- Path resolution working
- Gmail workflow tested
- Drive workflow tested
- Documentation complete
- Tests passing

Ready to use for sending emails with attachments and uploading to Drive.

---

**Next time you need to send a file:**
1. `./quick.sh upload-check <file>` - Verify file exists
2. Use `GmailHelper` or `FileUploadHelper` - Generate workflow
3. ARM then CLICK - Proper sequencing
4. Wait generously - 30-60s for uploads
