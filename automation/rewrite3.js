const fs = require('fs');
let content = fs.readFileSync('hermes-to-supabase.js', 'utf8');

// Remove old fetchShopifyMetrics function
const startMarker = '/**\n * Fetch real metrics from Shopify API';
const endMarker = '  }\n  return metrics;\n  } catch (err) {';
const endMarkerFull = '  } catch (err) {\n    console.error(\'❌ Error fetching Shopify data:\', err.message);\n    return [];\n  }\n}\n';

const startIdx = content.indexOf(startMarker);
let endIdx = -1;

if (startIdx !== -1) {
  // Find the end of the function (2 closing braces after return metrics)
  let braceCount = 0;
  let inFunction = false;
  for (let i = startIdx; i < content.length; i++) {
    if (content.substr(i, 20).includes('async function fetchShopifyMetrics')) {
      inFunction = true;
    }
    if (inFunction) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
  }
}

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find fetchShopifyMetrics function boundaries');
  process.exit(1);
}

const newFunction = fs.readFileSync('/tmp/new_metrics_section.txt', 'utf8');

content = content.substring(0, startIdx) + newFunction + content.substring(endIdx);

fs.writeFileSync('hermes-to-supabase.js', content);
console.log('Replaced fetchShopifyMetrics with enhanced version');
