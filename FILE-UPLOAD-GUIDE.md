# 📎 File Upload Guide for Gmail & Google Drive

## The Problem

When trying to upload files through browser automation, you often get "file not found" errors because:
1. Relative paths don't work - browser needs absolute paths
2. File might not exist where you think it does
3. Browser process may not have permission to access the file

## The Solution

Use the **file-upload-helper.js** tool to resolve paths and generate reliable upload workflows.

## Quick Commands

```bash
# Check if a file exists and is uploadable
./quick.sh upload-check myfile.pdf

# List all uploadable files
./quick.sh upload-list

# Debug a specific file path issue
node lib/file-upload-helper.js debug ./report.pdf
```

## Gmail Attachments - Step by Step

### Method 1: Using the Helper (Recommended)

```javascript
const FileUploadHelper = require('./lib/file-upload-helper');
const helper = new FileUploadHelper();

// 1. Check the file first
const fileCheck = helper.resolveFilePath('report.pdf');
if (!fileCheck.valid) {
  console.error(fileCheck.error);
  // File not found - helper will suggest similar files
  return;
}

// 2. Get the workflow
const workflow = helper.gmailAttachWorkflow(
  'report.pdf',                    // File to attach
  'terry@example.com',             // Recipient
  'Monthly Report',                // Subject
  'See attached report'            // Body
);

// 3. Execute with browser tool
// Use workflow.filePath for the absolute path
```

### Method 2: Manual Browser Commands

```javascript
// IMPORTANT: Must use absolute path!
const absolutePath = '/home/clawd/clawd/report.pdf';

// Gmail attachment flow:
// 1. Navigate to Gmail
browser({ action: 'navigate', url: 'https://mail.google.com/' });

// 2. Click compose
browser({ action: 'snapshot' }); // Get page structure
browser({ action: 'act', ref: '<compose-button-ref>', type: 'click' });

// 3. Fill in email
browser({ action: 'act', ref: '<to-field-ref>', type: 'type', text: 'terry@example.com' });
browser({ action: 'act', ref: '<subject-ref>', type: 'type', text: 'Monthly Report' });
browser({ action: 'act', ref: '<body-ref>', type: 'type', text: 'See attached' });

// 4. ARM the file chooser BEFORE clicking attach
browser({ action: 'upload', files: [absolutePath] });

// 5. NOW click the attach button (chooser is armed)
browser({ action: 'act', ref: '<attach-button-ref>', type: 'click' });

// 6. Wait for upload to complete
browser({ action: 'wait', timeoutMs: 30000 });

// 7. Send
browser({ action: 'act', ref: '<send-button-ref>', type: 'click' });
```

## Google Drive Upload

```javascript
const FileUploadHelper = require('./lib/file-upload-helper');
const helper = new FileUploadHelper();

// Get Drive workflow
const workflow = helper.driveUploadWorkflow(
  'document.pdf',
  'Work Files'  // Optional folder name
);

// Execute the workflow steps with browser tool
// workflow.steps contains the full sequence
```

## Common Issues & Fixes

### Issue 1: "File not found"

**Cause:** Relative path used instead of absolute path

**Fix:**
```javascript
// ❌ Don't do this
const file = 'report.pdf';

// ✅ Do this
const helper = new FileUploadHelper();
const result = helper.resolveFilePath('report.pdf');
if (result.valid) {
  const file = result.absolutePath; // "/home/clawd/clawd/report.pdf"
}
```

### Issue 2: "File chooser not opening"

**Cause:** Clicked attach button before arming the file chooser

**Fix:**
```javascript
// ❌ Wrong order
browser({ action: 'act', ref: 'attach-btn', type: 'click' });
browser({ action: 'upload', files: [path] }); // Too late!

// ✅ Correct order
browser({ action: 'upload', files: [path] }); // ARM first
browser({ action: 'act', ref: 'attach-btn', type: 'click' }); // Then click
```

### Issue 3: "Upload times out"

**Cause:** Large file or slow connection

**Fix:**
```javascript
// Increase timeout
browser({ action: 'wait', timeoutMs: 60000 }); // 60 seconds

// Or check file size first
const result = helper.resolveFilePath('large-file.pdf');
console.log(`File size: ${result.sizeMB} MB`);
if (result.sizeMB > 25) {
  console.warn('File may be too large for Gmail (25MB limit)');
}
```

### Issue 4: "Element not clickable"

**Cause:** Wrong element, covered by something, or not visible

**Fix:**
```javascript
// Take a snapshot to find the right element
const snapshot = browser({ action: 'snapshot', format: 'interactive' });

// Look for the attach button in the snapshot
// Use the ref from snapshot, not a guess

// Or take a screenshot to debug visually
browser({ action: 'screenshot' });
```

## File Path Rules

1. **Always use absolute paths** for browser uploads
   - ✅ `/home/clawd/clawd/file.pdf`
   - ❌ `file.pdf`
   - ❌ `./file.pdf`

2. **Check file exists before upload**
   ```bash
   ./quick.sh upload-check myfile.pdf
   ```

3. **Common file locations**
   - Workspace: `/home/clawd/clawd/`
   - Temporary: `/tmp/`
   - Downloads: Varies by system

4. **Use the helper to resolve paths**
   ```javascript
   const helper = new FileUploadHelper();
   const result = helper.resolveFilePath('myfile.pdf');
   // result.absolutePath = "/home/clawd/clawd/myfile.pdf"
   ```

## Integration with AGENTS.md

Add to your session workflow:

```javascript
// Before sending files
const FileUploadHelper = require('./lib/file-upload-helper');
const helper = new FileUploadHelper();

// Check file
const check = helper.debugUpload(filename);
if (!check.valid) {
  // File not found - helper shows suggestions
  return;
}

// Use check.absolutePath for browser upload
```

## Testing

Run the test suite to verify everything works:

```bash
./test-file-upload.sh
```

Or test individual components:

```bash
# Check specific file
./quick.sh upload-check Level-Up-Investor-Deck.pdf

# List all files
./quick.sh upload-list

# Test path resolution
node lib/file-upload-helper.js resolve myfile.pdf

# Generate Gmail workflow
node lib/file-upload-helper.js gmail report.pdf terry@example.com "Subject" "Body"

# Generate Drive workflow
node lib/file-upload-helper.js drive document.pdf "My Folder"
```

## Quick Reference

| Task | Command |
|------|---------|
| Check file before upload | `./quick.sh upload-check <file>` |
| List uploadable files | `./quick.sh upload-list` |
| Debug path issue | `node lib/file-upload-helper.js debug <file>` |
| Resolve path | `helper.resolveFilePath(file)` |
| Gmail workflow | `helper.gmailAttachWorkflow(file, to, subject, body)` |
| Drive workflow | `helper.driveUploadWorkflow(file, folder)` |

## Example: Complete Email with Attachment

```javascript
const FileUploadHelper = require('./lib/file-upload-helper');
const helper = new FileUploadHelper();

// 1. Prepare file
const fileResult = helper.resolveFilePath('report.pdf');
if (!fileResult.valid) {
  console.error(`Cannot send: ${fileResult.error}`);
  return;
}

console.log(`Sending ${fileResult.sizeMB} MB file...`);

// 2. Navigate to Gmail
browser({ action: 'navigate', url: 'https://mail.google.com/' });
browser({ action: 'wait', selector: '[aria-label="Compose"]', timeoutMs: 10000 });

// 3. Open compose
browser({ action: 'snapshot', format: 'interactive' });
// Find compose button ref from snapshot, then:
browser({ action: 'act', ref: 'compose-ref', type: 'click' });

// 4. Fill email
browser({ action: 'wait', selector: '[name="to"]', timeoutMs: 5000 });
// Get refs from snapshot for each field:
browser({ action: 'act', ref: 'to-ref', type: 'type', text: 'terry@example.com' });
browser({ action: 'act', ref: 'subject-ref', type: 'type', text: 'Monthly Report' });
browser({ action: 'act', ref: 'body-ref', type: 'type', text: 'Please see attached.' });

// 5. Attach file (ARM THEN CLICK!)
browser({ action: 'upload', files: [fileResult.absolutePath] });
// Get attach button ref from snapshot:
browser({ action: 'act', ref: 'attach-ref', type: 'click' });

// 6. Wait for upload
browser({ action: 'wait', timeoutMs: 30000 });

// 7. Send
// Get send button ref from snapshot:
browser({ action: 'act', ref: 'send-ref', type: 'click' });

console.log('✅ Email sent with attachment');
```

## Tips for Jett

1. **Always check file first**: Use `helper.debugUpload(filename)` to catch issues early

2. **Use absolute paths**: Never pass relative paths to browser upload

3. **ARM before CLICK**: The upload action MUST come before clicking attach/upload button

4. **Wait for completion**: File uploads take time - use generous timeouts (30-60s)

5. **Snapshot before acting**: Get fresh refs from snapshot before clicking elements

6. **Handle errors gracefully**: If file not found, suggest alternatives from `helper.findSimilarFiles()`

## Troubleshooting Checklist

- [ ] File exists: `./quick.sh upload-check <file>`
- [ ] Using absolute path: `/home/clawd/clawd/file.pdf`
- [ ] Armed file chooser BEFORE clicking: `upload` → `click`
- [ ] Waited for upload: `wait` with 30-60s timeout
- [ ] Browser is logged in to Gmail/Drive
- [ ] Got fresh snapshot before clicking
- [ ] Using correct ref from snapshot

---

**Bottom line:** Use `FileUploadHelper` to resolve paths, always use absolute paths, ARM the file chooser before clicking, and wait for uploads to complete.
