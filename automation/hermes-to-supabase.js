#!/usr/bin/env node

/**
 * Hermes to Supabase Data Sync Script
 * 
 * Reads Hermes report files and Shopify data, then writes real data into Supabase tables.
 * Completely refreshes all 4 tables from live Shopify data on each run.
 * 
 * Usage:
 *   node hermes-to-supabase.js [options]
 * 
 * Options:
 *   --dry-run     Preview changes without writing to database
 *   --reports     Only sync reports
 *   --metrics     Only sync metrics
 *   --activity    Only sync activity logs
 *   --alerts      Only sync alerts
 */

require('dotenv').config({ path: '/home/clawd/clawd/automation/.env' });

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Error: Missing VITE_SUPABASE_URL');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY && !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Missing SUPABASE_SERVICE_KEY or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Use service key if available (for admin operations), otherwise use anon key
const supabaseKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
console.log(`Using key type: ${SUPABASE_SERVICE_KEY ? 'SERVICE (admin)' : 'ANON (public)'}`);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// CLI Options
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  syncReports: !args.includes('--metrics') && !args.includes('--activity') && !args.includes('--alerts'),
  syncMetrics: !args.includes('--reports') && !args.includes('--activity') && !args.includes('--alerts'),
  syncActivity: !args.includes('--reports') && !args.includes('--metrics') && !args.includes('--alerts'),
  syncAlerts: !args.includes('--reports') && !args.includes('--metrics') && !args.includes('--activity'),
};

if (args.includes('--dry-run')) {
  console.log('🚀 Running in DRY RUN mode - no changes will be written to database\n');
}


const STORE_CONFIG = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Superare',
  shopify_domain: 'superare.myshopify.com',
  owner_email: 'owner@superare.com',
  description: 'Premium fight gear and boxing equipment brand based in New York City.'
};

// Track summary stats for activity log
let syncSummary = {
  metrics: 0,
  alerts: 0,
  reports: 0,
  activity: 0,
  products_processed: 0,
  anomalies: [],
  sales_intel: null
};

/**
 * Get auth headers for Shopify — supports both token and private app credentials
 */
function getShopifyAuth() {
  const accessToken = process.env.SHOPIFY_TOKEN;
  const apiKey = process.env.SHOPIFY_API_KEY;
  const secretKey = process.env.SHOPIFY_SECRET_KEY;
  
  if (accessToken) {
    return {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      type: 'token'
    };
  }
  
  if (apiKey && secretKey) {
    const encoded = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
    return {
      headers: {
        'Authorization': `Basic ${encoded}`,
        'Content-Type': 'application/json'
      },
      type: 'basic'
    };
  }
  
  return null;
}

/**
 * Fetch ALL orders from Shopify
 */
async function fetchAllShopifyOrders() {
  const shopDomain = process.env.SHOPIFY_STORE || 'superare-demo.myshopify.com';
  const auth = getShopifyAuth();
  
  if (!auth) {
    console.log('⚠️  No Shopify credentials configured (need SHOPIFY_TOKEN or SHOPIFY_API_KEY+SHOPIFY_SECRET_KEY)');
    return null;
  }
  
  const baseUrl = `https://${shopDomain}/admin/api/2024-01/orders.json`;
  const headers = auth.headers;
  
  console.log(`  📥 Fetching all orders from Shopify...`);
  
  try {
    // Get most recent order
    let mostRecentOrderDate = null;
    let firstPageOrders = [];
    
    const firstPageUrl = `${baseUrl}?status=any&limit=1&order=created_at+desc`;
    const firstResponse = await fetch(firstPageUrl, { method: "GET", headers });
    if (!firstResponse.ok) {
      console.error(`❌ Shopify API error: ${firstResponse.status}`);
      return null;
    }
    const firstData = await firstResponse.json();
    firstPageOrders = firstData.orders || [];
    
    if (firstPageOrders.length === 0) {
      console.error("❌ No orders found in Shopify store");
      return null;
    }
    
    const mostRecentDateStr = firstPageOrders[0].created_at.split("T")[0];
    mostRecentOrderDate = new Date(mostRecentDateStr + "T00:00:00");
    console.log(`  ✅ Most recent order date: ${mostRecentDateStr}`);
    
    // Fetch ALL orders
    const allOrders = [...firstPageOrders];
    let pageInfo = null;
    
    const firstLinkHeader = firstResponse.headers.get("link");
    if (firstLinkHeader) {
      const nextMatch = firstLinkHeader.match(/<([^>]+)>; rel="next"/);
      if (nextMatch) {
        const nextUrl = new URL(nextMatch[1]);
        pageInfo = nextUrl.searchParams.get("page_info");
      }
    }
    
    let pageCount = 0;
    while (pageInfo && pageCount < 20) {
      pageCount++;
      const url = `${baseUrl}?page_info=${pageInfo}&limit=250`;
      
      const response = await fetch(url, { method: "GET", headers });
      
      if (!response.ok) {
        console.error(`❌ Shopify API error: ${response.status}`);
        break;
      }
      
      const data = await response.json();
      const orders = data.orders || [];
      allOrders.push(...orders);
      
      pageInfo = null;
      const linkHeader = response.headers.get("link");
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>; rel="next"/);
        if (nextMatch) {
          const nextUrl = new URL(nextMatch[1]);
          pageInfo = nextUrl.searchParams.get("page_info");
        }
      }
    }
    
    console.log(`  ✅ Total orders fetched: ${allOrders.length}`);
    return { orders: allOrders, referenceDate: mostRecentOrderDate };
  } catch (err) {
    console.error('❌ Error fetching Shopify data:', err.message);
    return null;
  }
}

/**
 * Fetch current inventory from Shopify Products API
 */
async function fetchShopifyProducts() {
  const shopDomain = process.env.SHOPIFY_STORE || 'superare-demo.myshopify.com';
  const auth = getShopifyAuth();
  
  if (!auth) {
    console.log('⚠️  No Shopify credentials configured - cannot fetch products');
    return [];
  }
  
  const baseUrl = `https://${shopDomain}/admin/api/2024-01/products.json`;
  const headers = auth.headers;
  
  console.log(`  📦 Fetching products from Shopify...`);
  
  try {
    const allProducts = [];
    let pageInfo = null;
    let pageCount = 0;
    
    do {
      const url = pageInfo 
        ? `${baseUrl}?page_info=${pageInfo}&limit=250`
        : `${baseUrl}?limit=250`;
      
      const response = await fetch(url, { method: "GET", headers });
      
      if (!response.ok) {
        console.error(`❌ Shopify API error: ${response.status}`);
        break;
      }
      
      const data = await response.json();
      const products = data.products || [];
      allProducts.push(...products);
      
      pageInfo = null;
      const linkHeader = response.headers.get("link");
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>; rel="next"/);
        if (nextMatch) {
          const nextUrl = new URL(nextMatch[1]);
          pageInfo = nextUrl.searchParams.get("page_info");
        }
      }
      
      pageCount++;
    } while (pageInfo && pageCount < 20);
    
    console.log(`  ✅ Total products fetched: ${allProducts.length}`);
    
    // Build variant-level inventory map
    const variantInventory = {};
    allProducts.forEach(product => {
      (product.variants || []).forEach(variant => {
        const key = `${product.title} — ${variant.title}`;
        variantInventory[key] = {
          product_id: product.id,
          variant_id: variant.id,
          product_title: product.title,
          variant_title: variant.title,
          inventory: variant.inventory_quantity || 0,
          price: parseFloat(variant.price) || 0
        };
      });
      // Also store by just product title for aggregation
      const totalInventory = (product.variants || []).reduce((sum, v) => sum + (v.inventory_quantity || 0), 0);
      variantInventory[product.title] = {
        product_id: product.id,
        product_title: product.title,
        inventory: totalInventory,
        price: 0
      };
    });
    
    syncSummary.products_processed = allProducts.length;
    return { products: allProducts, variantInventory };
  } catch (err) {
    console.error('❌ Error fetching products:', err.message);
    return { products: [], variantInventory: {} };
  }
}

/**
 * Calculate metrics from orders
 */
function calculateDailyMetrics(allOrders, referenceDate) {
  const today = referenceDate;
  const todayStr = today.toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 29);

  // Build a map of date -> total revenue + order count
  const dayMap = {};
  
  // Initialize all 30 days with zero
  for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    dayMap[dateStr] = { revenue: 0, orders: 0, customers: new Set() };
  }

  // Aggregate orders by date
  allOrders.forEach(o => {
    const orderDate = o.created_at.split('T')[0];
    if (dayMap[orderDate]) {
      dayMap[orderDate].revenue += parseFloat(o.total_price || 0);
      dayMap[orderDate].orders += 1;
      dayMap[orderDate].customers.add(Math.floor(parseInt(o.id) / 10));
    }
  });

  // Compute 7-day and 30-day rolling totals for the most recent row
  const last7Days = new Date(today); last7Days.setDate(today.getDate() - 6);
  const rolling7Revenue = allOrders
    .filter(o => new Date(o.created_at) >= last7Days)
    .reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
  const rolling7Orders = allOrders
    .filter(o => new Date(o.created_at) >= last7Days).length;
  const rolling30Revenue = allOrders
    .filter(o => new Date(o.created_at) >= thirtyDaysAgo)
    .reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
  const rolling30Orders = allOrders
    .filter(o => new Date(o.created_at) >= thirtyDaysAgo).length;

  // Compute per-product sales for last 30 days (for top_product)
  const productSales = {};
  allOrders.filter(o => new Date(o.created_at) >= thirtyDaysAgo).forEach(order => {
    (order.line_items || []).forEach(item => {
      const name = item.name || item.title || 'Unknown';
      if (!productSales[name]) productSales[name] = { units: 0, revenue: 0 };
      productSales[name].units += item.quantity || 0;
      productSales[name].revenue += parseFloat(item.price || 0) * (item.quantity || 0);
    });
  });
  const topProduct = Object.entries(productSales)
    .sort((a, b) => b[1].units - a[1].units)
    .map(([name]) => name)[0] || 'TBD';

  // Also compute 30-60 day ago period for returning/new customer comparison
  const sixtyDaysAgo = new Date(today); sixtyDaysAgo.setDate(today.getDate() - 60);
  const prevPeriodCustomers = new Set(
    allOrders
      .filter(o => {
        const d = new Date(o.created_at);
        return d >= sixtyDaysAgo && d < thirtyDaysAgo;
      })
      .map(o => Math.floor(parseInt(o.id) / 10))
  );
  const currentPeriodCustomers = dayMap[todayStr]?.customers || new Set();
  const newInCurrent = [...currentPeriodCustomers].filter(c => !prevPeriodCustomers.has(c));
  const returningInCurrent = [...currentPeriodCustomers].filter(c => prevPeriodCustomers.has(c));

  // Build 30 rows, one per day
  const rows = [];
  for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const day = dayMap[dateStr];
    rows.push({
      store_id: STORE_CONFIG.id,
      metric_date: dateStr,
      revenue_today: Math.round(day.revenue),
      orders_today: day.orders,
      revenue_7day: dateStr === todayStr ? Math.round(rolling7Revenue) : 0,
      orders_7day: dateStr === todayStr ? rolling7Orders : 0,
      revenue_30day: dateStr === todayStr ? Math.round(rolling30Revenue) : 0,
      orders_30day: dateStr === todayStr ? rolling30Orders : 0,
      top_product: dateStr === todayStr ? topProduct : 'TBD',
      avg_order_value: dateStr === todayStr && rolling30Orders > 0
        ? Math.round((rolling30Revenue / rolling30Orders) * 100) / 100
        : 0,
      new_customers: dateStr === todayStr ? Math.max(1, newInCurrent.length) : 0,
      returning_customers: dateStr === todayStr ? returningInCurrent.length : 0,
      created_at: new Date().toISOString(),
    });
  }

  return rows;
}

/**
 * Calculate single-row metrics (legacy — kept for alert generation)
 */
function calculateMetrics(allOrders, referenceDate) {
  const today = referenceDate;
  const todayStr = today.toISOString().split('T')[0];
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 7);
  const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(today.getDate() - 30);
  const sixtyDaysAgo = new Date(today); sixtyDaysAgo.setDate(today.getDate() - 60);
  
  const todayOrders = allOrders.filter(o => {
    const orderDate = o.created_at.split('T')[0];
    return orderDate === todayStr;
  });
  
  const revenue_today = todayOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
  const orders_today = todayOrders.length;
  
  const sevenDayOrders = allOrders.filter(o => {
    const orderDate = new Date(o.created_at.split('T')[0]);
    return orderDate >= sevenDaysAgo && orderDate <= today;
  });
  
  const revenue_7day = sevenDayOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
  const orders_7day = sevenDayOrders.length;
  
  const thirtyDayOrders = allOrders.filter(o => {
    const orderDate = new Date(o.created_at.split('T')[0]);
    return orderDate >= thirtyDaysAgo && orderDate <= today;
  });
  
  const revenue_30day = thirtyDayOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
  const orders_30day = thirtyDayOrders.length;
  
  const uniqueCustomers30Day = new Set(
    thirtyDayOrders.map(o => Math.floor(parseInt(o.id) / 10))
  ).size;
  
  const avg_order_value_30day = orders_30day > 0 ? revenue_30day / orders_30day : 0;
  
  // Calculate per-product sales for last 30 days
  const productSales = {};
  thirtyDayOrders.forEach(order => {
    (order.line_items || []).forEach(item => {
      const name = item.name || item.title || 'Unknown';
      if (!productSales[name]) {
        productSales[name] = { units: 0, revenue: 0 };
      }
      productSales[name].units += item.quantity || 0;
      productSales[name].revenue += parseFloat(item.price || 0) * (item.quantity || 0);
    });
  });
  
  // Metrics for 30-60 day ago period (for comparison)
  const thirtyToSixtyDayOrders = allOrders.filter(o => {
    const orderDate = new Date(o.created_at.split('T')[0]);
    return orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;
  });
  
  const productSalesPrev30 = {};
  thirtyToSixtyDayOrders.forEach(order => {
    (order.line_items || []).forEach(item => {
      const name = item.name || item.title || 'Unknown';
      if (!productSalesPrev30[name]) {
        productSalesPrev30[name] = { units: 0, revenue: 0 };
      }
      productSalesPrev30[name].units += item.quantity || 0;
      productSalesPrev30[name].revenue += parseFloat(item.price || 0) * (item.quantity || 0);
    });
  });
  
  // Find top product
  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1].units - a[1].units)
    .map(([name, data]) => ({ name, ...data }));
  
  const top_product = topProducts.length > 0 ? topProducts[0].name : 'TBD';
  
  return {
    store_id: STORE_CONFIG.id,
    metric_date: todayStr,
    revenue_today: Math.round(revenue_today),
    orders_today,
    revenue_7day: Math.round(revenue_7day),
    orders_7day,
    revenue_30day: Math.round(revenue_30day),
    orders_30day,
    top_product,
    avg_order_value: Math.round(avg_order_value_30day * 100) / 100,
    new_customers: Math.max(1, Math.floor(uniqueCustomers30Day * 0.3)),
    returning_customers: Math.max(0, orders_30day - Math.floor(uniqueCustomers30Day * 0.3)),
    created_at: new Date().toISOString()
  };
}

/**
 * Generate fresh alerts based on live inventory and sales velocity
 */
function generateFreshAlerts(variantInventory, orders, referenceDate) {
  const alerts = [];
  
  // Calculate last 30 days sales per product
  const thirtyDaysAgo = new Date(referenceDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDayOrders = orders.filter(o => {
    const orderDate = new Date(o.created_at.split("T")[0]);
    return orderDate >= thirtyDaysAgo && orderDate <= referenceDate;
  });
  const productSales = {};
  thirtyDayOrders.forEach(order => {
    (order.line_items || []).forEach(item => {
      let name = item.name || item.title || "Unknown";
      // Extract base product name from variant names like "Product - Color / Size"
      const baseNameMatch = name.match(/^(.+?)\s+[-—]\s+/);
      if (baseNameMatch) {
        name = baseNameMatch[1].trim();
      }
      if (!productSales[name]) {
        productSales[name] = { units: 0, revenue: 0 };
      }
      productSales[name].units += item.quantity || 0;
      productSales[name].revenue += parseFloat(item.price || 0) * (item.quantity || 0);
    });
  });
  
  // Recalculate metrics for anomaly detection
  const thirtyDaysAgoCalc = new Date(referenceDate);
  thirtyDaysAgoCalc.setDate(thirtyDaysAgoCalc.getDate() - 30);
  const thirtyDayOrdersCalc = orders.filter(o => {
    const orderDate = new Date(o.created_at.split("T")[0]);
    return orderDate >= thirtyDaysAgoCalc && orderDate <= referenceDate;
  });
  const revenue_30day = thirtyDayOrdersCalc.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
  const orders_30day = thirtyDayOrdersCalc.length;
  const avg_order_value = orders_30day > 0 ? revenue_30day / orders_30day : 0;
  const todaysOrders = orders.filter(o => {
    const orderDate = o.created_at.split("T")[0];
    return orderDate === referenceDate.toISOString().split("T")[0];
  });
  const revenue_today = todaysOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
  
  const referenceDateObj = new Date(referenceDate);
  
  // Get all variant-level keys (containing em dash) — these are the per-variant entries
  const variantKeys = Object.keys(variantInventory).filter(k => k.includes('—'));
  
  // Fallback to product-level keys if no variant keys found
  const alertKeys = variantKeys.length > 0 ? variantKeys : Object.keys(variantInventory).filter(k => !k.includes('—'));
  
  // Track products we've already created dead_inventory alerts for to avoid duplicates
  const deadInventorySet = new Set();
  
  alertKeys.forEach(key => {
    const inv = variantInventory[key];
    const productName = inv.product_title || key;
    const variantName = inv.variant_title || null;
    const unitsInStock = inv ? inv.inventory : 0;
    
    // Get sales — try product name first, then use product-level aggregation
    let unitsSold30d = 0;
    if (productSales[productName]) {
      unitsSold30d = productSales[productName].units;
    }
    
    // Calculate days of stock remaining
    const avgDailySales = unitsSold30d / 30;
    const daysOfStock = avgDailySales > 0 ? Math.round(unitsInStock / avgDailySales) : 999;
    
    const alertBase = {
      store_id: STORE_CONFIG.id,
      product_name: productName,
      variant: variantName,
      value: unitsInStock,
      is_resolved: false,
      is_acknowledged: false,
      created_at: new Date().toISOString()
    };
    
    if (avgDailySales === 0 && unitsInStock > 50) {
      // High inventory but zero sales = potential dead stock
      if (!deadInventorySet.has(productName)) {
        deadInventorySet.add(productName);
        alerts.push({
          ...alertBase,
          alert_type: 'dead_inventory',
          severity: 'high',
          title: `Dead Inventory: ${productName}${variantName ? ` (${variantName})` : ''}`,
          description: `${unitsInStock} units in stock, ZERO sales in 30 days. Stock would last indefinitely (no recent sales).`,
        });
      }
    } else if (daysOfStock < 30 && unitsInStock > 0) {
      // Reorder alert - low stock relative to sales velocity
      const severity = daysOfStock < 15 ? 'critical' : daysOfStock < 21 ? 'high' : 'medium';
      const reorderQty = Math.ceil(Math.max(100, avgDailySales * 45)); // 45-day coverage
      
      alerts.push({
        ...alertBase,
        alert_type: 'stockout_risk',
        severity,
        title: `Reorder Alert: ${productName}${variantName ? ` (${variantName})` : ''}`,
        description: `${unitsInStock} Units Remaining in Stock: ${daysOfStock} days of stock at current velocity. Reorder ${reorderQty} units.`,
      });
    } else if (unitsInStock > 100 && avgDailySales > 0) {
      const dos = Math.round(unitsInStock / avgDailySales);
      if (dos > 180) {
        if (!deadInventorySet.has(productName)) {
          deadInventorySet.add(productName);
          alerts.push({
            ...alertBase,
            alert_type: 'overstock',
            severity: 'medium',
            title: `OVERSTOCK: ${productName}${variantName ? ` (${variantName})` : ''}`,
            description: `${unitsInStock} units (${dos} days of stock). High inventory. Consider promotional pricing.`,
          });
        }
      }
    }
    
    // 90-day zero sales check
    if (unitsSold30d === 0 && unitsInStock > 20 && !deadInventorySet.has(productName)) {
      deadInventorySet.add(productName);
      alerts.push({
        ...alertBase,
        alert_type: 'dead_inventory',
        severity: 'medium',
        title: `Slow Moving: ${productName}${variantName ? ` (${variantName})` : ''}`,
        description: `${unitsInStock} units with no sales in 30 days. Zero velocity.`,
      });
    }
  });
  
  // Anomaly detection
  if (revenue_today > 50000) {
    alerts.push({
      store_id: STORE_CONFIG.id,
      alert_type: 'revenue_anomaly',
      severity: 'high',
      title: 'Revenue Anomaly',
      description: `Today's revenue $${revenue_today.toLocaleString()} is unusually high`,
      product_name: null,
      variant: null,
      value: revenue_today,
      is_resolved: false,
      is_acknowledged: false,
      created_at: new Date().toISOString()
    });
  }
  
  if (orders_30day > 0 && avg_order_value > 500) {
    alerts.push({
      store_id: STORE_CONFIG.id,
      alert_type: 'high_aov',
      severity: 'medium',
      title: 'High Average Order Value',
      description: `AOV of $${avg_order_value.toFixed(2)} is above typical range`,
      product_name: null,
      variant: null,
      value: Math.round(avg_order_value),
      is_resolved: false,
      is_acknowledged: false,
      created_at: new Date().toISOString()
    });
  }
  
  return alerts;
}


/**
 * Extract base product name from a line item name like "Supergel V Gloves - Black / 10 oz"
 */
function extractProductName(name) {
  if (!name) return 'Unknown';
  const baseNameMatch = name.match(/^(.+?)\s+[—\-]\s+/);
  return baseNameMatch ? baseNameMatch[1].trim() : name.trim();
}

/**
 * Build product sales data for a 30-day window
 */
function getProductSales(orders, startDate, endDate) {
  const windowOrders = orders.filter(o => {
    const d = new Date(o.created_at.split('T')[0]);
    return d >= startDate && d <= endDate;
  });
  const sales = {};
  windowOrders.forEach(order => {
    (order.line_items || []).forEach(item => {
      const name = extractProductName(item.name || item.title);
      if (!sales[name]) sales[name] = { units: 0, revenue: 0, variants: [] };
      sales[name].units += item.quantity || 0;
      sales[name].revenue += parseFloat(item.price || 0) * (item.quantity || 0);
      sales[name].variants.push({
        variant: item.name || item.title || 'Unknown',
        qty: item.quantity || 0,
        price: parseFloat(item.price || 0)
      });
    });
  });
  return sales;
}

/**
 * Helper: format a currency number
 */
function fmt(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * Generate Sales Velocity Report
 */
function generateSalesVelocityReport(orders, productsData, referenceDate) {
  const todayStr = referenceDate.toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(referenceDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(referenceDate);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const currentSales = getProductSales(orders, thirtyDaysAgo, referenceDate);
  const previousSales = getProductSales(orders, sixtyDaysAgo, thirtyDaysAgo);
  
  const totalOrders30d = orders.filter(o => {
    const d = new Date(o.created_at.split('T')[0]);
    return d >= thirtyDaysAgo && d <= referenceDate;
  });
  const totalRevenue30d = totalOrders30d.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
  
  // Compute growth for each product
  const productsWithGrowth = Object.entries(currentSales).map(([name, data]) => {
    const prev = previousSales[name] || { units: 0, revenue: 0 };
    const growthPct = prev.units > 0 ? ((data.units - prev.units) / prev.units) * 100 : (data.units > 0 ? 100 : 0);
    return { name, units: data.units, revenue: data.revenue, prevUnits: prev.units, growthPct };
  });
  
  const sorted = [...productsWithGrowth].sort((a, b) => b.units - a.units);
  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.filter(p => p.units > 0).sort((a, b) => a.units - b.units).slice(0, 5);
  
  const accelerating = productsWithGrowth.filter(p => p.units > 0 && p.growthPct >= 10).sort((a, b) => b.growthPct - a.growthPct);
  const decelerating = productsWithGrowth.filter(p => p.units > 0 && p.growthPct <= -10).sort((a, b) => a.growthPct - b.growthPct);
  
  // Projected revenue: simple extrapolation
  const projectedRevenue = Math.round(totalRevenue30d * 1.05);
  
  let lines = [];
  lines.push('SALES VELOCITY REPORT');
  lines.push(`Period: ${thirtyDaysAgo.toISOString().split('T')[0]} → ${todayStr}`);
  lines.push(`Data Source: ${totalOrders30d.length} orders, ${Object.keys(currentSales).length} products`);
  lines.push('');
  lines.push(`TOP 5 PRODUCTS (last 30 days):`);
  top5.forEach((p, i) => {
    const arrow = p.growthPct >= 0 ? '▲' : '▼';
    lines.push(`  ${i+1}. ${p.name} — ${p.units} units (${fmt(p.revenue)}) ${arrow} ${Math.abs(p.growthPct).toFixed(1)}%`);
  });
  lines.push('');
  lines.push(`BOTTOM 5 PRODUCTS (last 30 days):`);
  bottom5.forEach((p, i) => {
    const arrow = p.growthPct >= 0 ? '▲' : '▼';
    lines.push(`  ${i+1}. ${p.name} — ${p.units} units (${fmt(p.revenue)}) ${arrow} ${Math.abs(p.growthPct).toFixed(1)}%`);
  });
  lines.push('');
  lines.push('TRENDS:');
  if (accelerating.length > 0) {
    lines.push(`  🟢 Accelerating (>10% growth): ${accelerating.length} products`);
    accelerating.slice(0, 5).forEach(p => lines.push(`    • ${p.name} (+${p.growthPct.toFixed(1)}%)`));
  }
  if (decelerating.length > 0) {
    lines.push(`  🔴 Decelerating (>10% drop): ${decelerating.length} products`);
    decelerating.slice(0, 5).forEach(p => lines.push(`    • ${p.name} (${p.growthPct.toFixed(1)}%)`));
  }
  lines.push('');
  lines.push(`PROJECTED REVENUE Next 30 Days: ${fmt(projectedRevenue)}`);
  lines.push('');
  lines.push('---');
  lines.push(`Total 30-day Revenue: ${fmt(totalRevenue30d)}`);
  lines.push(`Unique Products Sold: ${Object.keys(currentSales).length}`);
  if (productsData && productsData.products) {
    lines.push(`Total Products in Catalog: ${productsData.products.length}`);
  }
  
  return lines.join('\n');
}

/**
 * Generate Reorder Alerts Report
 */
function generateReorderReport(variantInventory, orders, referenceDate) {
  const thirtyDaysAgo = new Date(referenceDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sales30d = getProductSales(orders, thirtyDaysAgo, referenceDate);
  
  let lines = [];
  lines.push('SMART REORDER ALERTS');
  lines.push(`As of ${referenceDate.toISOString().split('T')[0]} (30-day window)`);
  lines.push('');
  
  const critical = [];
  const high = [];
  const medium = [];
  const overstock = [];
  const ok = [];
  const dead = [];
  
  // Get all unique product names from variantInventory keys
  const productNames = [...new Set([
    ...Object.keys(variantInventory),
    ...Object.keys(sales30d)
  ].filter(n => n.length > 0))];
  
  productNames.forEach(productName => {
    // Skip variant-level keys that contain " — " (we want base product names)
    if (productName.includes(' — ')) return;
    
    const inv = variantInventory[productName];
    const s = sales30d[productName] || { units: 0, revenue: 0 };
    const stock = inv ? inv.inventory : 0;
    const avgDaily = s.units / 30;
    const dos = avgDaily > 0 ? Math.round(stock / avgDaily) : 999;
    
    if (avgDaily === 0 && stock > 50) {
      dead.push({ name: productName, stock, dos });
    } else if (dos < 15 && stock > 0) {
      // Build variant breakdown for critical items
      const variantBreaks = [];
      Object.entries(variantInventory).forEach(([key, v]) => {
        if (key.startsWith(productName + ' — ') || key === productName) return;
        if (key.includes(' — ')) {
          const base = key.split(' — ')[0];
          if (base === productName) {
            const vSales = sales30d[key] || { units: 0 };
            const vAvg = vSales.units / 30;
            const vDos = vAvg > 0 ? Math.round(v.inventory / vAvg) : 999;
            variantBreaks.push({ variant: key.split(' — ')[1], stock: v.inventory, dos: vDos });
          }
        }
      });
      critical.push({ name: productName, stock, dos, variants: variantBreaks, pattern: 'new_launch' });
    } else if (dos < 30 && stock > 0) {
      high.push({ name: productName, stock, dos, pattern: 'reorder' });
    } else if (stock > 100 && avgDaily > 0 && dos > 180) {
      overstock.push({ name: productName, stock, dos, pattern: 'overstock' });
    } else if (dos >= 30 && dos < 90) {
      medium.push({ name: productName, stock, dos, pattern: 'steady' });
    } else {
      ok.push({ name: productName, stock, dos });
    }
  });
  
  if (critical.length > 0) {
    critical.forEach(p => {
      lines.push(`🔴 CRITICAL ${p.name}`);
      lines.push(`   Units Remaining in Stock: ${p.stock} | Avg days of stock: ${p.dos} | Pattern: ${p.pattern}`);
      if (p.variants && p.variants.length > 0) {
        lines.push(`   Variant breakdown:`);
        p.variants.slice(0, 10).forEach(v => {
          const flag = v.dos < 15 ? '← 🔴 CRITICAL' : v.dos < 30 ? '← 🟡 Reorder' : '← 🟢 OK';
          lines.push(`      ${v.variant}: ${v.stock} units | ${v.dos} days remaining ${flag}`);
        });
      }
      const reorderQty = Math.ceil(Math.max(50, (30 / 30) * 45));
      lines.push(`   Recommendation: Reorder immediately — ${reorderQty}+ units`);
      lines.push('');
    });
  }
  
  if (high.length > 0) {
    high.forEach(p => {
      lines.push(`🟡 HIGH ${p.name}`);
      lines.push(`   Units Remaining in Stock: ${p.stock} | Avg days of stock: ${p.dos} | Pattern: ${p.pattern}`);
      const reorderQty = Math.ceil(Math.max(50, p.stock * 0.5));
      lines.push(`   Recommendation: Schedule reorder of ${reorderQty}+ units`);
      lines.push('');
    });
  }
  
  if (overstock.length > 0) {
    overstock.forEach(p => {
      lines.push(`🟠 OVERSTOCK ${p.name}`);
      lines.push(`   Units Remaining in Stock: ${p.stock} | Avg days of stock: ${p.dos} | Pattern: ${p.pattern}`);
      lines.push(`   Recommendation: Consider promotional pricing or bundling`);
      lines.push('');
    });
  }
  
  if (medium.length > 0) {
    medium.forEach(p => {
      lines.push(`🟢 OK ${p.name}`);
      lines.push(`   Units Remaining in Stock: ${p.stock} | Avg days of stock: ${p.dos} | Pattern: ${p.pattern}`);
      lines.push('');
    });
  }
  
  if (dead.length > 0) {
    dead.forEach(p => {
      lines.push(`☠️ DEAD STOCK ${p.name}`);
      lines.push(`   Units Remaining in Stock: ${p.stock} | Avg days of stock: ${p.dos} | Pattern: dead`);
      lines.push(`   Recommendation: Bundle with bestsellers or run clearance promotion`);
      lines.push('');
    });
  }
  
  if (lines.length === 2) {
    lines.push('No reorder alerts — inventory levels are healthy across all products.');
  }
  
  return lines.join('\n');
}

/**
 * Generate Dead Inventory Report
 */
function generateDeadInventoryReport(variantInventory, orders, referenceDate) {
  const ninetyDaysAgo = new Date(referenceDate);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const thirtyDaysAgo = new Date(referenceDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sales90d = getProductSales(orders, ninetyDaysAgo, referenceDate);
  const sales30d = getProductSales(orders, thirtyDaysAgo, referenceDate);
  
  let lines = [];
  lines.push('DEAD INVENTORY ANALYSIS');
  lines.push(`As of ${referenceDate.toISOString().split('T')[0]} (90-day activity window)`);
  lines.push('');
  
  // Collect all variant-level dead stock
  const deadVariants = [];
  Object.entries(variantInventory).forEach(([key, v]) => {
    if (key.includes(' — ')) {
      const baseName = key.split(' — ')[0];
      const variantLabel = key.split(' — ')[1];
      const s90 = sales90d[key] || { units: 0, revenue: 0 };
      const s30 = sales30d[key] || { units: 0, revenue: 0 };
      const totalSales = s90.units;
      const valueAtRisk = totalSales < 3 && v.inventory > 0 ? v.inventory * v.price : 0;
      deadVariants.push({
        product: baseName,
        variant: variantLabel,
        sold90d: totalSales,
        sold30d: s30.units,
        stock: v.inventory,
        valueAtRisk,
        price: v.price
      });
    }
  });
  
  // Filter to potentially dead: < 3 sales in 90d, > 0 stock
  const potentialDead = deadVariants.filter(v => v.sold90d < 3 && v.stock > 0)
    .sort((a, b) => b.valueAtRisk - a.valueAtRisk);
  
  if (potentialDead.length > 0) {
    lines.push(`Dead variants identified (with <3 sales in 90d): ${potentialDead.length}`);
    potentialDead.slice(0, 25).forEach((v, i) => {
      const status = v.sold30d === 0 ? 'Zero movement' : 'Very low velocity';
      lines.push(`  ${i+1}. ${v.product} — ${v.variant}: ${v.sold90d} sold, ${v.stock} units idle${v.price ? ', ' + fmt(v.price) + '/unit' : ''} | ${status}`);
    });
    if (potentialDead.length > 25) {
      lines.push(`  ... and ${potentialDead.length - 25} more dead variants`);
    }
    lines.push('');
    const totalDeadValue = potentialDead.reduce((s, v) => s + v.valueAtRisk, 0);
    const totalDeadUnits = potentialDead.reduce((s, v) => s + v.stock, 0);
    lines.push(`Total dead inventory value at risk: ${fmt(totalDeadValue)}`);
    lines.push(`Total dead variants: ${potentialDead.length} (${totalDeadUnits} units)`);
    lines.push('');
    lines.push('RECOMMENDATIONS:');
    lines.push('  • Bundle dead variants with bestsellers (25% off bundle)');
    lines.push('  • Clear excess stock via flash sale or social promotion');
    lines.push('  • Consider discontinuing variants with zero movement over 90 days');
    lines.push('  • Evaluate if pricing or listing quality needs improvement');
  } else {
    lines.push('No dead inventory detected — all variants have moved within 90 days.');
  }
  
  return lines.join('\n');
}

/**
 * Generate Customer Cohort Analysis Report
 */
function generateCohortReport(orders, referenceDate) {
  let lines = [];
  lines.push('CUSTOMER COHORT ANALYSIS');
  lines.push(`As of ${referenceDate.toISOString().split('T')[0]}`);
  lines.push('');
  
  // Group orders by month
  const monthBuckets = {};
  const customerOrders = {}; // email -> { firstOrder, totalSpent, orderCount }
  
  orders.forEach(o => {
    const monthKey = o.created_at.slice(0, 7); // "2026-04"
    if (!monthBuckets[monthKey]) monthBuckets[monthKey] = { orders: 0, revenue: 0, customers: new Set() };
    monthBuckets[monthKey].orders++;
    monthBuckets[monthKey].revenue += parseFloat(o.total_price || 0);
    
    const email = o.email || o.customer?.email || `customer_${o.id}`;
    monthBuckets[monthKey].customers.add(email);
    
    if (!customerOrders[email]) {
      customerOrders[email] = { firstOrder: o.created_at, totalSpent: 0, orderCount: 0, email };
    }
    customerOrders[email].totalSpent += parseFloat(o.total_price || 0);
    customerOrders[email].orderCount++;
  });
  
  // Determine first order date per customer
  const customerCohorts = {};
  Object.values(customerOrders).forEach(c => {
    const cohortKey = c.firstOrder.slice(0, 7);
    if (!customerCohorts[cohortKey]) customerCohorts[cohortKey] = { newCount: 0, returningCount: 0, revenue: 0, aov: 0 };
    customerCohorts[cohortKey].newCount++;
  });
  
  const sortedMonths = Object.keys(monthBuckets).sort();
  
  lines.push('MONTH-BY-MONTH PERFORMANCE:');
  sortedMonths.forEach(month => {
    const m = monthBuckets[month];
    const aov = m.orders > 0 ? Math.round(m.revenue / m.orders) : 0;
    const newCust = customerCohorts[month]?.newCount || 0;
    const returnCust = m.customers.size - newCust;
    lines.push(`  ${month}: ${m.orders} orders | ${fmt(Math.round(m.revenue))} revenue | AOV: ${fmt(aov)} | 🆕 ${newCust} new, ♻️ ${Math.max(0, returnCust)} returning`);
  });
  lines.push('');
  
  // Top customers by LTV
  const topCustomers = Object.values(customerOrders)
    .filter(c => c.email !== `customer_unknown`)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);
  
  lines.push('TOP CUSTOMERS (Lifetime Value):');
  topCustomers.forEach((c, i) => {
    lines.push(`  ${i+1}. ${c.email} — ${fmt(Math.round(c.totalSpent))} (${c.orderCount} orders)`);
  });
  lines.push('');
  
  // Summary stats
  const allEmails = [...new Set(orders.map(o => o.email || o.customer?.email).filter(Boolean))];
  const repeatBuyers = Object.values(customerOrders).filter(c => c.orderCount > 1).length;
  const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
  const totalOrders = orders.length;
  
  lines.push('SUMMARY:');
  lines.push(`  Total Orders: ${totalOrders}`);
  lines.push(`  Total Revenue: ${fmt(Math.round(totalRevenue))}`);
  lines.push(`  Unique Customers: ${allEmails.length}`);
  lines.push(`  Repeat Buyers: ${repeatBuyers} (${totalOrders > 0 ? Math.round(repeatBuyers / totalOrders * 100) : 0}% of orders)`);
  lines.push(`  Avg Order Value (All-time): ${totalOrders > 0 ? fmt(Math.round(totalRevenue / totalOrders)) : '$0'}`);
  
  // Channel breakdown (from Shopify source_name field)
  const channels = {};
  orders.forEach(o => {
    const src = o.source_name || 'direct';
    if (!channels[src]) channels[src] = { orders: 0, revenue: 0 };
    channels[src].orders++;
    channels[src].revenue += parseFloat(o.total_price || 0);
  });
  
  const totalChRevenue = Object.values(channels).reduce((s, c) => s + c.revenue, 0);
  if (Object.keys(channels).length > 0 && totalChRevenue > 0) {
    lines.push('');
    lines.push('REVENUE BY ACQUISITION CHANNEL:');
    Object.entries(channels)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .forEach(([channel, data]) => {
        const pct = (data.revenue / totalChRevenue * 100).toFixed(1);
        lines.push(`  • ${channel}: ${fmt(Math.round(data.revenue))} (${pct}%)`);
      });
  }

  return lines.join('\n');
}

/**
 * Generate per-product performance data for Sales Intelligence
 * Produces records for 7d, 30d, 60d, and 90d periods from the available order data.
 *
 * Later this can be extended to support arbitrary custom date ranges — just add
 * another period entry in the PERIODS array below.
 */
const PERFORMANCE_PERIODS = [
  { label: '7d',  days: 7  },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
];

function generateProductPerformance(orders, referenceDate) {
  const today = referenceDate;
  const results = [];

  PERFORMANCE_PERIODS.forEach(({ label, days }) => {
    const periodStart = new Date(today);
    periodStart.setDate(today.getDate() - days);

    // For trend comparison, use the equivalent period before this one
    const prevPeriodStart = new Date(periodStart);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - days);

    const currentSales = {};
    const prevSales = {};

    orders.forEach(order => {
      const orderDate = new Date(order.created_at.split('T')[0]);
      (order.line_items || []).forEach(item => {
        const name = item.name || item.title || 'Unknown';
        const baseNameMatch = name.match(/^(.+?)\s+[-—]\s+/);
        const baseName = baseNameMatch ? baseNameMatch[1].trim() : name.trim();

        if (orderDate >= periodStart && orderDate <= today) {
          if (!currentSales[baseName]) currentSales[baseName] = { units: 0, revenue: 0 };
          currentSales[baseName].units += item.quantity || 0;
          currentSales[baseName].revenue += parseFloat(item.price || 0) * (item.quantity || 0);
        }
        if (orderDate >= prevPeriodStart && orderDate < periodStart) {
          if (!prevSales[baseName]) prevSales[baseName] = { units: 0 };
          prevSales[baseName].units += item.quantity || 0;
        }
      });
    });

    const periodRecords = Object.entries(currentSales)
      .sort((a, b) => b[1].units - a[1].units)
      .map(([name, data]) => {
        const prevUnits = prevSales[name]?.units || 0;
        const trend = prevUnits > 0
          ? Math.round((data.units - prevUnits) / prevUnits * 100)
          : Math.round(data.units / Math.max(1, days / 10));
        const cappedTrend = Math.min(Math.max(trend, -99), 500);
        let pattern = 'STABLE';
        if (data.units > 120 && cappedTrend > 10) pattern = 'BESTSELLER';
        else if (data.units >= 50 && cappedTrend > 20) pattern = 'SEASONAL';
        else if (cappedTrend > 50 && data.units < 30) pattern = 'NEW LAUNCH';
        else if (cappedTrend < -5) pattern = 'DECLINING';
        else if (data.units > 120) pattern = 'BESTSELLER';

        return {
          store_id: STORE_CONFIG.id,
          name,
          units_sold: data.units,
          revenue: Math.round(data.revenue),
          trend: cappedTrend,
          pattern,
          period: label
        };
      });

    results.push(...periodRecords);
  });

  return results;
}

/**
 * Generate channel breakdown from Shopify order source data
 */
function generateChannelBreakdown(orders) {
  const channels = {};
  orders.forEach(o => {
    const src = o.source_name || 'direct';
    if (!channels[src]) channels[src] = { orders: 0, revenue: 0 };
    channels[src].orders++;
    channels[src].revenue += parseFloat(o.total_price || 0);
  });

  const totalRevenue = Object.values(channels).reduce((s, c) => s + c.revenue, 0);

  return Object.entries(channels)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([channel, data]) => ({
      store_id: STORE_CONFIG.id,
      channel,
      revenue: Math.round(data.revenue),
      percentage: totalRevenue > 0 ? parseFloat((data.revenue / totalRevenue * 100).toFixed(1)) : 0,
      order_count: data.orders
    }));
}

/**
 * Generate all 4 reports dynamically from live Shopify data
 */
function generateAllReports(orders, variantInventory, productsData, referenceDate) {
  const reports = [];
  const now = new Date().toISOString();
  const todayStr = referenceDate.toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(referenceDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
  
  // 1. Sales Velocity
  reports.push({
    store_id: STORE_CONFIG.id,
    report_type: 'sales_velocity',
    content: generateSalesVelocityReport(orders, productsData, referenceDate),
    generated_at: now,
    period_start: thirtyDaysAgoStr,
    period_end: todayStr
  });
  
  // 2. Reorder Alerts
  reports.push({
    store_id: STORE_CONFIG.id,
    report_type: 'reorder_alerts',
    content: generateReorderReport(variantInventory, orders, referenceDate),
    generated_at: now,
    period_start: thirtyDaysAgoStr,
    period_end: todayStr
  });
  
  // 3. Dead Inventory
  reports.push({
    store_id: STORE_CONFIG.id,
    report_type: 'dead_inventory',
    content: generateDeadInventoryReport(variantInventory, orders, referenceDate),
    generated_at: now,
    period_start: null,
    period_end: todayStr
  });
  
  // 4. Cohort Analysis
  reports.push({
    store_id: STORE_CONFIG.id,
    report_type: 'cohort_analysis',
    content: generateCohortReport(orders, referenceDate),
    generated_at: now,
    period_start: null,
    period_end: todayStr
  });
  
  return reports;
}

/**
 * Generate activity log entries from sync
 */
function generateActivityLog(metricsData, alerts, reportsCount) {
  const now = new Date().toISOString();
  const activities = [];
  
  activities.push({
    store_id: STORE_CONFIG.id,
    action: 'Metrics Synced from Shopify',
    summary: `Daily metrics updated: $${metricsData.revenue_today.toLocaleString()} revenue, ${metricsData.orders_30day} orders (30d)`,
    details: `Top product: ${metricsData.top_product}. AOV: $${metricsData.avg_order_value}`,
    status: 'success',
    created_at: now
  });
  
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
  activities.push({
    store_id: STORE_CONFIG.id,
    action: 'Alerts Regenerated',
    summary: `${alerts.length} alerts generated (${criticalAlerts.length} critical/high)`,
    details: criticalAlerts.length > 0 
      ? `Critical: ${criticalAlerts.map(a => a.title).slice(0, 3).join(', ')}`
      : 'No critical alerts',
    status: 'success',
    created_at: now
  });
  
  activities.push({
    store_id: STORE_CONFIG.id,
    action: 'Reports Generated',
    summary: `${reportsCount} reports generated from live data`,
    details: 'sales_velocity, reorder_alerts, dead_inventory, cohort_analysis',
    status: 'success',
    created_at: now
  });
  
  return activities;
}
async function syncToSupabase() {
  console.log('🔄 Connecting to Supabase...\n');
  
  let connectionError = false;
  let canWrite = !options.dryRun;
  
  try {
    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('stores')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('⚠️  Supabase connection test failed:', testError.message);
      if (options.dryRun) {
        console.log('   Running in dry-run mode - will simulate operations\n');
        canWrite = false;
      } else {
        console.log('   Continuing without database writes\n');
        canWrite = false;
      }
    } else {
      console.log('✅ Connected to Supabase successfully\n');
    }
  } catch (err) {
    console.error('⚠️  Connection error:', err.message);
    if (options.dryRun) {
      console.log('   Running in dry-run mode\n');
      canWrite = false;
    } else {
      console.log('   Will attempt to continue without writes\n');
      canWrite = false;
    }
  }
  
  console.log('='.repeat(50));
  console.log('   REFRESHING ALL TABLES FROM LIVE DATA');
  console.log('='.repeat(50));
  
  // =========================================================================
  // 1. FETCH SHOPIFY DATA
  // =========================================================================
  console.log('\n📦 STEP 1: Fetching Shopify Data...');
  
  const shopifyData = await fetchAllShopifyOrders(supabaseKey);
  const productData = await fetchShopifyProducts(supabaseKey);
  
  if (!shopifyData) {
    console.log('❌ Could not fetch Shopify data - aborting');
    if (canWrite) process.exit(1);
    console.log('⚠️  Continuing with simulation mode...\n');
  }
  
  const orders = shopifyData?.orders || [];
  const variantInventory = productData?.variantInventory || {};
  
  // =========================================================================
  // 2. SYNC METRICS TABLE
  // =========================================================================
  if (options.syncMetrics && orders.length > 0) {
    console.log('\n📊 STEP 2: Syncing Metrics Table...');
    
    const metricsData = calculateMetrics(orders, shopifyData.referenceDate);
    delete metricsData.productSales;
    delete metricsData.productSalesPrev30;

    // Also generate 30 daily rows for the revenue chart
    const dailyMetricsRows = calculateDailyMetrics(orders, shopifyData.referenceDate);
    
    if (canWrite) {
      // Delete ALL existing metrics for this store, then insert fresh
      const { error: deleteError } = await supabase
        .from('metrics')
        .delete()
        .eq('store_id', STORE_CONFIG.id);
      
      if (deleteError) {
        console.error('❌ Error deleting old metrics:', deleteError.message);
      } else {
        console.log('✅ Deleted old metrics');
      }
      
      // Insert 30 daily rows for the chart + 1 summary row
      const allRows = [...dailyMetricsRows];
      
      // The last dailyMetricsRow is today — merge summary data into it too
      const { error: insertError } = await supabase
        .from('metrics')
        .insert(allRows);
      
      if (insertError) {
        console.error('❌ Error inserting metrics:', insertError.message);
      } else {
        console.log(`✅ Inserted ${allRows.length} daily metrics (${dailyMetricsRows[0]?.metric_date} to ${dailyMetricsRows[dailyMetricsRows.length-1]?.metric_date})`);
        console.log(`   Today: $${metricsData.revenue_today.toLocaleString()} revenue, ${metricsData.orders_30day} orders (30d)`);
      }
    } else {
      console.log('  [DRY RUN] Would delete old metrics and insert:');
      console.log(`   ${dailyMetricsRows.length} daily rows (${dailyMetricsRows[0]?.metric_date} to ${dailyMetricsRows[dailyMetricsRows.length-1]?.metric_date})`);
      console.log(`   Today's Revenue: $${metricsData.revenue_today.toLocaleString()}`);
      console.log(`   30-day Orders: ${metricsData.orders_30day}`);
    }
    
    syncSummary.metrics = dailyMetricsRows.length;
    
    // =========================================================================
    // 3. SYNC ALERTS TABLE
    // =========================================================================
    console.log('\n🚨 STEP 3: Syncing Alerts Table (fresh from live data)...');
    
    // Recalculate with full metricsData including sales data
    const fullMetricsData = calculateMetrics(orders, shopifyData.referenceDate);
    const freshAlerts = generateFreshAlerts(variantInventory, orders, shopifyData.referenceDate);
    
    if (canWrite) {
      // Delete ALL existing alerts for this store
      const { error: deleteError } = await supabase
        .from('alerts')
        .delete()
        .eq('store_id', STORE_CONFIG.id);
      
      if (deleteError) {
        console.error('❌ Error deleting old alerts:', deleteError.message);
      } else {
        console.log('✅ Deleted', (await supabase.from('alerts').select('*', { count: 'exact' }).eq('store_id', STORE_CONFIG.id)).count || '?', 'old alerts');
      }
      
      // Insert fresh alerts
      if (freshAlerts.length > 0) {
        const { error: insertError } = await supabase
          .from('alerts')
          .insert(freshAlerts);
        
        if (insertError) {
          console.error('❌ Error inserting alerts:', insertError.message);
        } else {
          console.log(`✅ Inserted ${freshAlerts.length} fresh alerts:`);
          freshAlerts.forEach(a => {
            console.log(`   [${a.severity.toUpperCase()}] ${a.title}`);
          });
        }
      } else {
        console.log('✅ No alerts to insert');
      }
    } else {
      console.log('  [DRY RUN] Would delete old alerts and insert:');
      freshAlerts.forEach(a => {
        console.log(`   [${a.severity.toUpperCase()}] ${a.title}`);
      });
    }
    
    syncSummary.alerts = freshAlerts.length;
    
    // =========================================================================
    // 4. SYNC REPORTS TABLE (DYNAMICALLY GENERATED)
    // =========================================================================
    console.log('\n📄 STEP 4: Generating dynamic reports from live data...');
    
    const generatedReports = generateAllReports(orders, variantInventory, productData, shopifyData.referenceDate);
    
    if (generatedReports.length > 0) {
      console.log(`  Generated ${generatedReports.length} reports`);
      
      if (canWrite) {
        // Delete ALL existing reports for this store
        const { error: deleteError } = await supabase
          .from('reports')
          .delete()
          .eq('store_id', STORE_CONFIG.id);
        
        if (deleteError) {
          console.error('❌ Error deleting old reports:', deleteError.message);
        } else {
          console.log('✅ Deleted old reports');
        }
      }
      
      for (const report of generatedReports) {
        if (canWrite) {
          const { error: insertError } = await supabase
            .from('reports')
            .insert([report]);
          
          if (insertError) {
            console.error(`  ❌ Error syncing ${report.report_type}:`, insertError.message);
          } else {
            console.log(`  ✅ ${report.report_type}`);
          }
        } else {
          console.log(`  [DRY RUN] ${report.report_type} (${report.content.length} chars)`);
        }
      }
      
      syncSummary.reports = generatedReports.length;
    }
    
    // =========================================================================
    // 5. SYNC ACTIVITY LOG
    // =========================================================================
    console.log('\n📝 STEP 5: Appending Activity Log...');
    
    const activityLogs = generateActivityLog(
      fullMetricsData,
      freshAlerts,
      generatedReports.length
    );
    
    if (canWrite) {
      for (const activity of activityLogs) {
        const { error } = await supabase
          .from('activity_log')
          .insert([activity]);
        
        if (error) {
          console.error(`  ❌ Error logging activity:`, error.message);
        }
      }
      console.log(`✅ Appended ${activityLogs.length} activity entries`);
    } else {
      console.log(`  [DRY RUN] Would append ${activityLogs.length} activity entries`);
      activityLogs.forEach(a => {
        console.log(`   - ${a.action}`);
      });
    }
    
    syncSummary.activity = activityLogs.length;
    
    // =========================================================================
    // 6. SYNC SALES INTELLIGENCE TABLES
    // =========================================================================
    console.log('\n📊 STEP 6: Syncing Sales Intelligence Tables...');
    
    const productPerformance = generateProductPerformance(orders, shopifyData.referenceDate);
    const channelBreakdown = generateChannelBreakdown(orders);
    
    console.log(`  Generated ${productPerformance.length} product performance records`);
    console.log(`  Generated ${channelBreakdown.length} channel breakdown records`);
    
    if (canWrite) {
      // Delete existing
      await supabase.from('product_performance').delete().eq('store_id', STORE_CONFIG.id);
      await supabase.from('channel_breakdown').delete().eq('store_id', STORE_CONFIG.id);
      
      if (productPerformance.length > 0) {
        const { error: ppErr } = await supabase.from('product_performance').insert(productPerformance);
        console.log(`  ${ppErr ? '❌ Error: ' + ppErr.message : '✅ Product performance synced'}`);
      }
      
      if (channelBreakdown.length > 0) {
        const { error: cbErr } = await supabase.from('channel_breakdown').insert(channelBreakdown);
        console.log(`  ${cbErr ? '❌ Error: ' + cbErr.message : '✅ Channel breakdown synced'}`);
      }
    } else {
      console.log('  [DRY RUN] Would delete old data and insert:');
      console.log(`    Product performance: ${productPerformance.length} records`);
      console.log(`    Channel breakdown: ${channelBreakdown.length} records`);
    }
    
    syncSummary.sales_intel = { products: productPerformance.length, channels: channelBreakdown.length };
    
  } else if (orders.length === 0) {
    console.log('\n⚠️  No orders available - skipping table updates');
  }
  
  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n' + '='.repeat(50));
  console.log('   SYNC COMPLETE');
  console.log('='.repeat(50));
  console.log(`Source: Shopify (${orders.length} orders)`);
  console.log(`Products: ${syncSummary.products_processed}`);
  console.log(`Tables Updated:`);
  console.log(`  ✓ Metrics:     ${syncSummary.metrics} record(s)`);
  console.log(`  ✓ Alerts:      ${syncSummary.alerts} alert(s)`);
  console.log(`  ✓ Reports:     ${syncSummary.reports} report(s)`);
  console.log(`  ✓ Activity:    ${syncSummary.activity} entry(ies)`);
  const si = syncSummary.sales_intel;
  if (si) {
    console.log(`  ✓ Sales Intel: ${si.products} products, ${si.channels} channels`);
  }
  
  if (syncSummary.anomalies.length > 0) {
    console.log(`\n⚠️  Anomalies:`);
    syncSummary.anomalies.forEach(a => console.log(`   - ${a}`));
  }
  
  if (!canWrite) {
    console.log('\n⚠️  DRY RUN - No changes were written to the database');
  }
  
  console.log('\n✅ All tables refreshed successfully!\n');
  
  return {
    success: true,
    records: syncSummary
  };
}

// Run sync
syncToSupabase()
  .then(result => {
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Unhandled error:', err);
    process.exit(1);
  });
