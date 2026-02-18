# X (Twitter) Access Setup for Jett
**Tool:** bird CLI (already installed)
**Method:** Cookie authentication

## How to Set Up

### Option 1: Browser Cookies (Easiest)
1. Make sure you're logged into x.com in Chrome, Firefox, or Safari
2. bird will automatically read cookies from your browser
3. That's it!

### Option 2: Manual Cookie Export
If browser method doesn't work:

1. **Get cookies from X.com:**
   - Go to x.com (logged in)
   - Open DevTools (F12)
   - Go to Application/Storage → Cookies → https://x.com
   - Copy these two values:
     - `auth_token`
     - `ct0`

2. **Set environment variables:**
   ```bash
   export AUTH_TOKEN="your_auth_token_here"
   export CT0="your_ct0_here"
   ```

3. **Or pass directly:**
   ```bash
   bird whoami --auth-token <token> --ct0 <token>
   ```

## What Jett Can Do Once Set Up

**Read & Research:**
- Search X for sports news, contract announcements
- Track trending sports topics
- Monitor specific accounts (ESPN, Woj, etc.)
- Pull stats for 21M Sports posts

**Post (Carefully):**
- Draft posts for you to review
- Reply to mentions
- Post approved content

**Engagement:**
- Follow relevant accounts
- Monitor engagement on 21M posts

## Test Once Set Up

```bash
bird whoami
```

Should show your X account info.

---

**Status:** Not configured yet
**Next:** Terry logs into x.com in browser, then bird should work automatically
