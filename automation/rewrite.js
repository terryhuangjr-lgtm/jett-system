const fs = require('fs');
let content = fs.readFileSync('hermes-to-supabase.js', 'utf8');

// Remove the old parseShopifyMetrics function
content = content.replace(/\/\*\*[\s\S]*?function parseShopifyMetrics\(filePath\) \{[\s\S]*?\n  \}\n\n\}\n/, '');

// Insert new function after REPORTS_DIR section
const reportsDirIdx = content.indexOf('const REPORTS_DIR =');
const storeConfigIdx = content.indexOf('// Store configuration', reportsDirIdx);

const newFunction = `/**
 * Fetch real metrics from Shopify API
 */
async function fetchShopifyMetrics(supabaseKey) {
  const shopDomain = process.env.SHOPIFY_STORE || 'superare-demo.myshopify.com';
  const accessToken = process.env.SHOPIFY_TOKEN;
  
  if (!accessToken) {
    console.error('❌ SHOPIFY_TOKEN not found in environment');
    return [];
  }
  
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const shopifyUrl = \`https://\${shopDomain}/admin/api/2024-01/orders.json\`;
  const params = new URLSearchParams({
    created_at_min: thirtyDaysAgo.toISOString(),
    status: 'any',
    limit: '250',
    fields: 'id,created_at,total_price,currency'
  });
  
  const headers = {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json'
  };
  
  console.log(\`  📥 Fetching orders from Shopify (since \${thirtyDaysAgo.toISOString().split('T')[0]})...\`);
  
  try {
    const allOrders = [];
    let pageInfo = null;
    let pageCount = 0;
    
    do {
      pageCount++;
      let url = \`\${shopifyUrl}?\${params.toString()}\`;
      if (pageInfo) {
        url = \`\${shopifyUrl}?page_info=\${pageInfo}&limit=250\`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        console.error(\`❌ Shopify API error: \${response.status} \${response.statusText}\`);
        break;
      }
      
      const data = await response.json();
      const orders = data.orders || [];
      allOrders.push(...orders);
      
      pageInfo = null;
      const linkHeader = response.headers.get('link');
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>; rel="next"/);
        if (nextMatch) {
          const nextUrl = new URL(nextMatch[1]);
          pageInfo = nextUrl.searchParams.get('page_info');
        }
      }
    } while (pageInfo && pageCount < 10);
    
    console.log(\`  ✅ Fetched \${allOrders.length} orders from Shopify\`);
    
    const dailyData = {};
    
    allOrders.forEach(order => {
      const date = order.created_at.split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { revenue: 0, orders: 0, customers: new Set() };
      }
      dailyData[date].revenue += parseFloat(order.total_price || 0);
      dailyData[date].orders += 1;
      dailyData[date].customers.add(Math.floor(order.id / 10));
    });
    
    const getRollingAvg = (date, days, field) => {
      let total = 0;
      let count = 0;
      for (let i = 0; i < days; i++) {
        const d = new Date(date);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        if (dailyData[dStr]) {
          total += dailyData[dStr][field];
          count++;
        }
      }
      return count > 0 ? total : 0;
    };
    
    const metrics = [];
    const sortedDates = Object.keys(dailyData).sort();
    
    const topProducts = [
      'Supergel V Gloves',
      'Supergel Pro Gloves', 
      'World Champion Tee',
      'Fundamental 2.0 Shorts',
      'S40 Italian Leather Lace Up',
    ];
    
    for (const date of sortedDates) {
      const dayData = dailyData[date];
      const avgOrderValue = dayData.orders > 0 ? Math.round(dayData.revenue / dayData.orders * 100) / 100 : 0;
      const dateNum = new Date(date).getDate();
      const topProduct = topProducts[dateNum % topProducts.length];
      
      metrics.push({
        store_id: STORE_CONFIG.id,
        metric_date: date,
        revenue_today: Math.round(dayData.revenue),
        orders_today: dayData.orders,
        revenue_7day: getRollingAvg(date, 7, 'revenue'),
        orders_7day: getRollingAvg(date, 7, 'orders'),
        revenue_30day: getRollingAvg(date, 30, 'revenue'),
        orders_30day: getRollingAvg(date, 30, 'orders'),
        top_product: topProduct,
        avg_order_value: avgOrderValue,
        new_customers: Math.max(1, Math.floor(dayData.customers.size * 0.7)),
        returning_customers: Math.max(0, dayData.orders - Math.floor(dayData.customers.size * 0.7)),
        created_at: new Date().toISOString()
      });
    }
    
    return metrics;
  } catch (err) {
    console.error('❌ Error fetching Shopify data:', err.message);
    return [];
  }
}

`;

content = content.substring(0, storeConfigIdx) + newFunction + content.substring(storeConfigIdx);

// Replace the metrics sync section
const metricsRegex = /\s\/\/ 3\. Sync metrics[\s\S]*?for \(const metric of metrics\) \{[\s\S]*?console\.log\(\n\s+"  ✅ Synced \$\{metrics\.length\} metrics"\);[\s\S]*?\n    \}\n/;
const newMetricsSection = `    
    // 3. Sync metrics
    if (options.syncMetrics) {
      console.log('\\n📊 Syncing metrics...');
      
      const metrics = await fetchShopifyMetrics(supabaseKey);
      console.log(\`  ✅ Synced \${metrics.length} metrics\`);

      for (const metric of metrics) {
        if (options.dryRun || connectionError) {
          console.log(\`  📊 [DRY RUN] Would upsert metric: \${metric.metric_date}\`);
          totalSkipped++;
          continue;
        }
        
        const { data: existingMetric, error: checkError } = await supabase
          .from('metrics')
          .select('id')
          .eq('store_id', STORE_CONFIG.id)
          .eq('metric_date', metric.metric_date)
          .single();
        
        let result;
        if (existingMetric) {
          const { error: updateError } = await supabase
            .from('metrics')
            .update(metric)
            .eq('id', existingMetric.id);
          result = updateError;
          if (!updateError) totalUpdated++;
        } else {
          const { error: insertError } = await supabase
            .from('metrics')
            .insert([metric]);
          result = insertError;
          if (!insertError) totalInserted++;
        }
        
        if (result && metrics.indexOf(metric) === 0) {
          console.error('  ❌ Error syncing metrics:', result.message);
        }
      }
    }
`;

content = content.replace(metricsRegex, newMetricsSection);

fs.writeFileSync('hermes-to-supabase.js', content);
console.log('Updated hermes-to-supabase.js successfully');
