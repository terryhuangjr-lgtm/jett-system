/**
 * Test eBay API Connection
 * Quick test to verify credentials and API access
 */

const GemFinder = require('./gem-finder');

async function testConnection() {
  console.log('🧪 Testing eBay API Connection...\n');

  try {
    const finder = new GemFinder();

    // Run a simple search (Michael Jordan - most reliable results)
    console.log('Running test search: Michael Jordan cards...\n');

    const results = await finder.runSearches('michaelJordan');

    // Check results
    if (results.michaelJordan && !results.michaelJordan.error) {
      console.log('✅ API Connection Successful!\n');
      console.log(`Found ${results.michaelJordan.totalFound} total items`);
      console.log(`Filtered to ${results.michaelJordan.filtered} quality items\n`);

      // Show first 3 items as sample
      if (results.michaelJordan.items.length > 0) {
        console.log('Sample results:\n');
        results.michaelJordan.items.slice(0, 3).forEach((item, i) => {
          console.log(`${i + 1}. ${item.title}`);
          console.log(`   Price: $${item.currentPrice} (+ $${item.shippingCost} shipping)`);
          console.log(`   Time left: ${item.endTime}`);
          console.log(`   Seller: ${item.sellerUsername} (${item.sellerPositivePercent}%)`);
          console.log(`   URL: ${item.viewItemURL}\n`);
        });
      }

      console.log('🎉 Everything is working! Ready to scan for gems.\n');
      return true;

    } else {
      console.error('❌ API Error:', results.michaelJordan.error);
      return false;
    }

  } catch (error) {
    console.error('❌ Connection Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check that credentials.json has correct App ID, Cert ID, and Dev ID');
    console.error('2. Verify your eBay developer account is approved for Production access');
    console.error('3. Make sure your app has Finding API permissions\n');
    return false;
  }
}

// Run test
testConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
