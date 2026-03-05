# Google Workspace CLI Migration Plan

## Installation (on your local machine)

```bash
# Install
npm install -g @googleworkspace/cli

# Authenticate (opens browser)
gws auth login

# Verify
gws auth status
gws gmail users messages list --params '{"maxResults": 1}'
```

## What gws Replaces

| Current | New |
|---------|-----|
| Notion (Family Brief) | Google Docs + Calendar |
| Slack DM (health alerts) | Gmail |
| Slack (eBay results) | Gmail |
| Slack (Sports betting) | Gmail |

## Tasks to Modify

### 1. Morning Family Brief
- **Current:** `skills/notion-assistant/morning_brief.py` → Notion → Slack
- **New:** Python script → Google Docs + Calendar → Telegram

### 2. Email Reports (NEW)
Create scripts to send daily emails:
- `lib/send-email.js` - Generic email sender using gws

### 3. Modify Existing Scripts

**21m-daily-generator-v2.js:**
- Add email option: `--email` flag
- If enabled: send via `gws gmail users messages send`

**deploy-ebay-scans.js:**
- Add email option
- Send results via email instead of Slack

**Sports betting:**
- Send picks via email

### 4. Remove Slack Later (after testing)
- Remove clawdbot message send from scripts
- Uninstall slack plugin from openclaw

## Implementation Order

1. **Install gws + authenticate** (manual, local)
2. **Create `lib/send-email.js`** - test email sending
3. **Modify 21m-daily-generator-v2.js** - add email flag, test
4. **Modify deploy-ebay-scans.js** - add email, test
5. **Create morning_brief.py replacement** - Google Docs + Calendar
6. **Test all thoroughly**
7. **Remove Slack/Notion**

## Email Script Example

```javascript
// lib/send-email.js
const { execSync } = require('child_process');

function sendEmail(to, subject, body) {
  const cmd = `gws gmail users messages send --json '${JSON.stringify({
    raw: require('nodemailer').createMessage({to, subject, text: body}),
    payload: {
      headers: [
        {name: 'To', value: to},
        {name: 'Subject', value: subject}
      ]
    }
  })}'`;
  execSync(cmd, { cwd: '/home/clawd/clawd' });
}
```

Actually gws has simpler send:
```bash
gws gmail users messages send --json '{"payload":{"raw":"To: terry@test.com\nSubject: Test\n\nBody here"}}'
```
