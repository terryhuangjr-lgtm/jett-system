#!/usr/bin/env node

/**
 * Opportunity Scanner
 * Scans for side hustle and business opportunities
 */

const StealthBrowser = require('../lib/stealth-browser/browser-service');
const fs = require('fs');
const path = require('path');

async function scanOpportunities() {
  const browser = new StealthBrowser({
    headless: true,
    sessionName: 'opportunities'
  });

  try {
    await browser.launch();
    
    const opportunities = [];
    
    // 1. Check Reddit - entrepreneur subreddit
    console.log('🔍 Checking r/Entrepreneur...');
    await browser.goto('https://old.reddit.com/r/Entrepreneur/');
    await browser.page.waitForTimeout(2000);
    
    const redditText = await browser.getText();
    opportunities.push({
      source: 'reddit-entrepreneur',
      url: 'https://old.reddit.com/r/Entrepreneur/',
      timestamp: new Date().toISOString(),
      preview: redditText.substring(0, 2000)
    });
    
    // 2. Check BizBuySell for businesses for sale
    console.log('🔍 Checking BizBuySell...');
    await browser.goto('https://www.bizbuysell.com/');
    await browser.page.waitForTimeout(2000);
    
    const bizText = await browser.getText();
    opportunities.push({
      source: 'bizbuysell',
      url: 'https://www.bizbuysell.com/',
      timestamp: new Date().toISOString(),
      preview: bizText.substring(0, 2000)
    });
    
    // Save results
    const timestamp = new Date().toISOString().split('T')[0];
    const outputDir = '/home/clawd/clawd/opportunities';
    const outputFile = path.join(outputDir, `scan-${timestamp}.json`);
    
    fs.writeFileSync(outputFile, JSON.stringify({
      scanDate: new Date().toISOString(),
      opportunities,
      notes: 'Daily opportunity scan - review for potential side hustles'
    }, null, 2));
    
    console.log(`✅ Saved opportunities to: ${outputFile}`);
    console.log(`📊 Found ${opportunities.length} sources to review`);
    
  } catch (error) {
    console.error('❌ Error scanning opportunities:', error.message);
  } finally {
    await browser.close();
  }
}

scanOpportunities();
