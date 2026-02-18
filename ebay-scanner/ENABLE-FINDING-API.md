# Enable Finding API Access

## Issue

You're getting this error:
```
Service call has exceeded the number of times the operation is allowed to be called
```

This means your app doesn't have Finding API access enabled yet.

---

## Solution: Enable Finding API

### Step 1: Go to Your App Settings

1. Go to **https://developer.ebay.com/my/keys**
2. Click on your app (**"Jett Card Finder"** or whatever you named it)

### Step 2: Check API Access

Look for a section called **"API Access"** or **"Enabled APIs"**

You need to make sure these are enabled:
- **Finding API** ← This is what we need
- **Shopping API** (optional, for details)
- **Trading API** (optional, for bidding)

### Step 3: Request Access (if needed)

If Finding API isn't listed or shows as disabled:

1. Look for **"Request API Access"** or **"Enable APIs"** button
2. Select **"Finding API"**
3. Submit the request
4. eBay might approve it instantly or within 24 hours

### Step 4: Alternative - Use Browse API Instead

If Finding API requires approval, you can use the **Browse API** instead:

1. In your app settings, enable **"Buy APIs"**
2. This includes the **Browse API** which does the same thing as Finding API
3. It's part of the newer RESTful API set

---

## What to Look For

When you're in your app settings, look for these sections:

### Production Keys Section
```
✓ App ID (Client ID): terryhua-JettCard-PRD-...
✓ Cert ID (Client Secret): PRD-...
✓ Dev ID: ...
```

### API Access Section (you need to find this)
```
Enabled APIs:
☐ Finding API
☐ Shopping API
☐ Trading API
☐ Browse API (RESTful)
```

You need to check the box next to **Finding API** or **Browse API**.

---

## Next Steps

### Option 1: Finding API (Traditional)
1. Enable Finding API in developer portal
2. Wait for approval (if needed)
3. Run test again: `node test-find-by-keywords.js`

### Option 2: Browse API (Newer, recommended)
1. Enable "Buy APIs" in developer portal
2. I'll update the code to use Browse API instead
3. Browse API is faster and has better features

---

## Check Your Settings Now

Go to **https://developer.ebay.com/my/keys** and:

1. Click your app name
2. Look for "API Access" or "Enabled APIs"
3. Tell me what you see

Or just paste a screenshot if that's easier!

---

**Status:** Waiting for Finding API access to be enabled
**Estimated time:** Instant to 24 hours (usually instant)
