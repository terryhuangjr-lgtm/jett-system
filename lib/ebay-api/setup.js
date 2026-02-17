#!/usr/bin/env node
/**
 * eBay API Setup Wizard
 * Interactive setup for eBay API credentials
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      resolve(answer);
    });
  });
}

async function setup() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  eBay API Setup Wizard                       ║
╚══════════════════════════════════════════════════════════════╝

This wizard will help you configure your eBay API credentials.

You need an eBay Developer account and API key (it's FREE!).

`);

  const hasAccount = await question('Do you have an eBay Developer account? (y/n): ');

  if (hasAccount.toLowerCase() !== 'y') {
    console.log(`
No problem! Here's how to get your FREE eBay API key:

STEP 1: Create eBay Developer Account
  → Go to: https://developer.ebay.com/
  → Click "Register" (top right)
  → Sign in with your eBay account (or create one)

STEP 2: Create an Application
  → Go to: https://developer.ebay.com/my/keys
  → Click "Create an Application Key"
  → Choose "Production" (for real eBay data)
  → Fill in application details:
     - Application Title: "Price Monitor" (or any name)
     - Description: "Price monitoring tool"
  → Submit

STEP 3: Get Your App ID
  → After creating, you'll see your "App ID (Client ID)"
  → Copy this - you'll need it in a moment

STEP 4: Run this setup again
  → Come back and run: node setup.js

Press Enter when you're ready, or Ctrl+C to exit...
    `);
    await question('');
    rl.close();
    process.exit(0);
  }

  console.log(`\nGreat! Let's configure your API credentials.\n`);

  const appId = await question('Enter your App ID (Client ID): ');

  if (!appId || appId.trim() === '') {
    console.error('\nError: App ID is required');
    rl.close();
    process.exit(1);
  }

  console.log(`\nOptional: Client Secret (for advanced features)`);
  const clientSecret = await question('Enter your Client Secret (or press Enter to skip): ');

  const useSandbox = await question('\nUse Sandbox (testing) mode? (y/n, default: n): ');

  const config = {
    appId: appId.trim(),
    clientId: appId.trim(), // Same as appId for Finding API
    clientSecret: clientSecret.trim() || null,
    sandbox: useSandbox.toLowerCase() === 'y',
    globalId: 'EBAY-US'
  };

  // Save config
  const configPath = path.join(__dirname, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log(`\n✓ Configuration saved to: ${configPath}`);

  // Test the API
  console.log(`\nTesting API connection...`);

  try {
    const eBayClient = require('./client');
    const client = new eBayClient(config);
    const results = await client.search('test', { limit: 1 });

    if (results.success) {
      console.log(`✓ API connection successful!`);
      console.log(`✓ Found ${results.count} test results`);
      console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
      console.log(`║                    Setup Complete!                           ║`);
      console.log(`╚══════════════════════════════════════════════════════════════╝`);
      console.log(`\nYou're ready to use the eBay API!`);
      console.log(`\nTry these commands:`);
      console.log(`  node cli.js search "vintage jersey"`);
      console.log(`  node cli.js prices "nintendo switch"`);
      console.log(`  node cli.js monitor "rare coins" --threshold 100`);
      console.log(`\nFor help: node cli.js help`);
    } else {
      console.error(`✗ API test failed: ${results.error}`);
      console.error(`\nPlease check your credentials and try again.`);
    }
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    console.error(`\nPlease check your credentials and try again.`);
  }

  rl.close();
}

setup().catch(error => {
  console.error('Setup failed:', error);
  rl.close();
  process.exit(1);
});
