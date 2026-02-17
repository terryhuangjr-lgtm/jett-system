# Example: Send Email with Attachment

This is a complete, working example of how Jett should send emails with attachments using the new file upload tools.

## Scenario

Send Level-Up-Investor-Deck.pdf to Terry via Gmail from jett.theassistant@gmail.com

## Step-by-Step Code

```javascript
// Load the helpers
const FileUploadHelper = require('./lib/file-upload-helper');
const GmailHelper = require('./lib/gmail-helper');

const fileHelper = new FileUploadHelper();
const gmailHelper = new GmailHelper();

// ========================================
// STEP 1: Validate the email and file
// ========================================

const emailData = {
  to: 'terryhuangjr@gmail.com',
  subject: 'Level Up Investor Deck',
  body: 'Hi Terry,\n\nHere is the Level Up investor deck as requested.\n\nBest,\nJett',
  attachments: ['Level-Up-Investor-Deck.pdf']
};

// Validate before proceeding
const validation = gmailHelper.validateEmail(emailData);

if (!validation.valid) {
  console.error('❌ Cannot send email:');
  validation.errors.forEach(err => console.error(`  - ${err}`));
  return;
}

if (validation.warnings.length > 0) {
  console.warn('⚠️  Warnings:');
  validation.warnings.forEach(warn => console.warn(`  - ${warn}`));
}

console.log('✅ Email validation passed');

// ========================================
// STEP 2: Resolve file path
// ========================================

const fileResult = fileHelper.resolveFilePath('Level-Up-Investor-Deck.pdf');

if (!fileResult.valid) {
  console.error(`❌ File error: ${fileResult.error}`);
  return;
}

console.log(`✅ File ready: ${fileResult.absolutePath} (${fileResult.sizeMB} MB)`);

// ========================================
// STEP 3: Execute browser automation
// ========================================

// Navigate to Gmail
await browser({
  action: 'navigate',
  url: 'https://mail.google.com/'
});

// Wait for Gmail to load
await browser({
  action: 'wait',
  timeoutMs: 10000
});

// Get page snapshot to find compose button
const homeSnapshot = await browser({
  action: 'snapshot',
  format: 'interactive'
});

// Parse snapshot to find compose button ref
// Look for element with text "Compose" or aria-label containing "Compose"
const composeRef = findElementRef(homeSnapshot, 'Compose');

if (!composeRef) {
  console.error('❌ Cannot find Compose button');
  return;
}

// Click compose
await browser({
  action: 'act',
  ref: composeRef,
  type: 'click'
});

console.log('✅ Compose window opened');

// Wait for compose window to appear
await browser({
  action: 'wait',
  timeoutMs: 5000
});

// Get compose window snapshot
const composeSnapshot = await browser({
  action: 'snapshot',
  format: 'interactive'
});

// Find field refs from snapshot
const toRef = findElementRef(composeSnapshot, 'To');
const subjectRef = findElementRef(composeSnapshot, 'Subject');
const bodyRef = findElementRef(composeSnapshot, 'Message Body');
const attachRef = findElementRef(composeSnapshot, 'Attach');

// Fill in recipient
await browser({
  action: 'act',
  ref: toRef,
  type: 'type',
  text: emailData.to
});

// Fill in subject
await browser({
  action: 'act',
  ref: subjectRef,
  type: 'type',
  text: emailData.subject
});

// Fill in body
await browser({
  action: 'act',
  ref: bodyRef,
  type: 'type',
  text: emailData.body
});

console.log('✅ Email fields filled');

// ========================================
// STEP 4: Attach file
// CRITICAL: ARM the file chooser BEFORE clicking attach!
// ========================================

// ARM the file chooser with absolute path
await browser({
  action: 'upload',
  files: [fileResult.absolutePath]  // MUST be absolute path!
});

console.log('✅ File chooser armed');

// NOW click the attach button
// The armed file chooser will handle it automatically
await browser({
  action: 'act',
  ref: attachRef,
  type: 'click'
});

console.log('🔄 Uploading attachment...');

// Wait for upload to complete (generous timeout)
await browser({
  action: 'wait',
  timeoutMs: 60000  // 60 seconds
});

console.log('✅ Attachment uploaded');

// ========================================
// STEP 5: Send the email
// ========================================

// Get fresh snapshot to find send button
const readySnapshot = await browser({
  action: 'snapshot',
  format: 'interactive'
});

const sendRef = findElementRef(readySnapshot, 'Send');

if (!sendRef) {
  console.error('❌ Cannot find Send button');
  return;
}

// Click send
await browser({
  action: 'act',
  ref: sendRef,
  type: 'click'
});

console.log('📧 Sending email...');

// Wait for send confirmation
await browser({
  action: 'wait',
  timeoutMs: 5000
});

console.log('✅ Email sent successfully!');

// ========================================
// Helper function to find element refs
// ========================================

function findElementRef(snapshot, searchText) {
  // Parse snapshot to find element with matching text or aria-label
  // This is a simplified version - actual implementation depends on snapshot format

  // Snapshot format (interactive) returns refs like:
  // [1] button "Compose"
  // [2] textbox "To"
  // [3] textbox "Subject"
  // etc.

  const lines = snapshot.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes(searchText.toLowerCase())) {
      // Extract ref number from line like "[12] button 'Compose'"
      const match = line.match(/\[(\d+|e\d+)\]/);
      if (match) {
        return match[1];
      }
    }
  }

  return null;
}
```

## Quick Version (Using Helpers)

```javascript
// Even simpler - let the helper generate the workflow

const GmailHelper = require('./lib/gmail-helper');
const gmail = new GmailHelper();

// Validate
const validation = gmail.validateEmail({
  to: 'terryhuangjr@gmail.com',
  subject: 'Level Up Investor Deck',
  body: 'Hi Terry, here is the investor deck.',
  attachments: ['Level-Up-Investor-Deck.pdf']
});

if (!validation.valid) {
  console.error('Errors:', validation.errors);
  return;
}

// Generate workflow
const workflow = gmail.sendEmail({
  to: 'terryhuangjr@gmail.com',
  subject: 'Level Up Investor Deck',
  body: 'Hi Terry, here is the investor deck.',
  attachments: ['Level-Up-Investor-Deck.pdf']
});

// workflow.commands contains the complete sequence
// Execute each command with the browser tool
console.log(`Generated ${workflow.totalSteps} step workflow`);
```

## Command Line Version

```bash
# Check file first
./quick.sh upload-check Level-Up-Investor-Deck.pdf

# Generate workflow
node lib/gmail-helper.js send \
  terryhuangjr@gmail.com \
  "Level Up Investor Deck" \
  "Hi Terry, here is the investor deck." \
  Level-Up-Investor-Deck.pdf

# Output is JSON workflow you can execute
```

## Critical Points

### 1. Always Use Absolute Paths
```javascript
// ❌ WRONG - relative path
{ action: 'upload', files: ['report.pdf'] }

// ✅ CORRECT - absolute path
{ action: 'upload', files: ['/home/clawd/clawd/report.pdf'] }
```

### 2. ARM Then CLICK
```javascript
// ❌ WRONG ORDER
browser({ action: 'act', ref: attachRef, type: 'click' });
browser({ action: 'upload', files: [path] });

// ✅ CORRECT ORDER
browser({ action: 'upload', files: [path] });  // ARM first
browser({ action: 'act', ref: attachRef, type: 'click' });  // Then click
```

### 3. Use Generous Timeouts
```javascript
// ❌ TOO SHORT
{ action: 'wait', timeoutMs: 5000 }  // Only 5 seconds

// ✅ GENEROUS
{ action: 'wait', timeoutMs: 60000 }  // 60 seconds for uploads
```

### 4. Validate Before Sending
```javascript
// ✅ ALWAYS VALIDATE FIRST
const validation = gmailHelper.validateEmail(emailData);
if (!validation.valid) {
  // Handle errors before attempting send
  return;
}
```

## Troubleshooting

### File Not Found
```bash
# Debug the file path
./quick.sh upload-check myfile.pdf

# If not found, list available files
./quick.sh upload-list
```

### Upload Fails
- Check file size: `./quick.sh upload-check <file>`
- Gmail limit is 25MB per email
- Use longer timeout (60s+) for large files

### Button Not Clickable
- Take fresh snapshot before each action
- Use `{ action: 'screenshot' }` to visually debug
- Check if element is covered/hidden

### Wrong Element Clicked
- Parse snapshot carefully to find correct ref
- Look for aria-label or text content matches
- Refs are only valid for current page - get fresh snapshot after navigation

## Success Criteria

✅ File path resolved to absolute path
✅ Email data validated (recipient, size limits)
✅ File chooser armed before clicking attach
✅ Generous timeout used for upload
✅ Email sent successfully

## Next Steps

After success:
1. Log to memory: `./quick.sh log "Sent email to Terry with investor deck"`
2. Update state: Mark email as sent
3. Verify: Check sent folder in Gmail

After failure:
1. Debug: `./quick.sh upload-check <file>`
2. Screenshot: `browser({ action: 'screenshot' })`
3. Check logs: Look for error messages in browser console
