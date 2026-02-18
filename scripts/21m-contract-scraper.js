#!/usr/bin/env node

/**
 * 21M Sports Contract Scraper
 * Scrapes sports contract news for content ideas
 */

const StealthBrowser = require('../lib/stealth-browser/browser-service');
const fs = require('fs');
const path = require('path');

async function scrapeContracts() {
  const browser = new StealthBrowser({
    headless: true,
    sessionName: '21m-research'
  });

  try {
    await browser.launch();
    
    // Scrape Spotrac for recent contracts
    console.log('📊 Scraping recent sports contracts...');
    await browser.goto('https://www.spotrac.com/');
    
    // Give page time to load
    await browser.page.waitForTimeout(3000);
    
    // Get page content
    const html = await browser.getHTML();
    const text = await browser.getText();
    
    // Save raw data
    const timestamp = new Date().toISOString().split('T')[0];
    const outputDir = '/home/clawd/clawd/21m-research/contracts';
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `spotrac-${timestamp}.json`);
    
    fs.writeFileSync(outputFile, JSON.stringify({
      url: 'https://www.spotrac.com/',
      timestamp: new Date().toISOString(),
      text: text.substring(0, 10000), // First 10k chars
      source: 'spotrac'
    }, null, 2));
    
    console.log(`✅ Saved contract data to: ${outputFile}`);
    
    // Take screenshot
    const screenshotPath = path.join(outputDir, `spotrac-${timestamp}.png`);
    await browser.screenshot(screenshotPath);
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    
  } catch (error) {
    console.error('❌ Error scraping contracts:', error.message);
  } finally {
    await browser.close();
  }
}

scrapeContracts();
