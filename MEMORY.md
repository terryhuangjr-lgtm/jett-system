## Shopify PDF Reports (2026-04-01)
**Sequence:** 
1. `cd /home/clawd/skills/shopify-manager && node run.js 'sales report'`
2. `node pdf-generator.js`
3. `node send-pdf.js` → Telegram auto.

Dir: /home/clawd/skills/shopify-manager/
## PDF Generation and Sending — Exact Method
To generate and send ANY report as PDF to Terry's Telegram:

Step 1 - Generate PDF:
cd /home/clawd/skills/shopify-manager && node -e "
const { generateWeeklyReport } = require('./pdf-generator');
// build your data objects
generateWeeklyReport(sales, inv, audit).then(filepath => {
  const { sendPDFToTelegram } = require('./send-pdf');
  sendPDFToTelegram(filepath, 'Report Title');
});
"

OR use the skill directly:
node /home/clawd/skills/shopify-manager/run.js "weekly report"

NEVER claim a PDF was sent without confirming Telegram API returned ok:true
NEVER say "check attachment" unless you have a confirmed message_id from Telegram
