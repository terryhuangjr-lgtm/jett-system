# eBay API Setup Instructions

## Step 1: Register for eBay Developer Account (5 minutes)

1. **Go to:** https://developer.ebay.com/signin?tab=register

2. **Fill out the registration form:**
   - Username: (your choice - suggestion: thjr27 or similar)
   - Password: (create a strong password)
   - Email: terryhuangjr@gmail.com (or jett.theassistant@gmail.com)
   - Re-enter Email
   - ✅ Check "I have read and accept the eBay API License Agreement"
   - Click "Join"

3. **Verify your email** - Check your inbox and click the verification link

## Step 2: Create an Application (5 minutes)

1. **After verifying email, go to:** https://developer.ebay.com/my/keys

2. **Click "Create an App" or "Get Keys"**

3. **Fill out application details:**
   - Application Name: "Card Arbitrage Scanner" (or your choice)
   - Application Type: "Browse/Search"
   - Purpose: "Price comparison for sports card collectibles"
   
4. **Production vs Sandbox:**
   - Start with "Sandbox" (test environment) - FREE
   - Later upgrade to "Production" when ready for live data
   
5. **You'll receive:**
   - App ID (Client ID)
   - Cert ID (Client Secret)
   
   **IMPORTANT:** Save these credentials securely!

## Step 3: Get OAuth Token (5 minutes)

1. **Still on the keys page, click "Get an OAuth Token"**

2. **Select scopes you need:**
   - ✅ https://api.ebay.com/oauth/api_scope/sell.inventory.readonly
   - ✅ https://api.ebay.com/oauth/api_scope/buy.browse
   
3. **Generate the token** - Copy and save it

## Step 4: Give Credentials to Jett

Once you have your credentials, send them to me via WhatsApp:

```
App ID: [your app ID]
Cert ID: [your cert ID]  
OAuth Token: [your token]
```

I'll securely store them in `/home/clawd/clawd/ebay-scanner/credentials.json`

## What Happens Next

Once I have your credentials:
1. I'll integrate them into the scanner
2. Test it with Michael Jordan searches
3. If it works, expand to all your players
4. Set up the daily 1 PM email automation

## Approval Timeline

- Sandbox access: **Immediate** (as soon as you register)
- Production access: May require eBay review (1-3 days)
- Start with Sandbox, upgrade later if needed

## Cost

- Developer account: **FREE**
- Sandbox testing: **FREE**
- Production API calls: **FREE** for most use cases
  - First 5,000 calls/day: FREE
  - Your scanner will use ~50-100 calls/day (well under limit)

---

Screenshot attached showing the registration page →
