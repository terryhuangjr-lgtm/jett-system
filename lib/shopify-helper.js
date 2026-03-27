require('dotenv').config({ path: require('os').homedir() + '/.env' });
const fetch = require('node-fetch');

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_TOKEN;
const BASE = `https://${STORE}/admin/api/2026-01`;
const HEADERS = {
  'X-Shopify-Access-Token': TOKEN,
  'Content-Type': 'application/json'
};

const api = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
};

// ─────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────

async function getAllProducts() {
  const data = await api('GET', '/products.json?limit=250');
  return data.products || [];
}

async function searchProducts(keyword) {
  const products = await getAllProducts();
  return products.filter(p =>
    p.title.toLowerCase().includes(keyword.toLowerCase())
  );
}

async function updateProduct(productId, updates) {
  return api('PUT', `/products/${productId}.json`, { product: updates });
}

async function updateVariant(variantId, updates) {
  return api('PUT', `/variants/${variantId}.json`, { variant: updates });
}

async function bulkAddTags(tag) {
  const products = await getAllProducts();
  const results = [];
  for (const p of products) {
    const existingTags = p.tags ? p.tags.split(', ') : [];
    if (!existingTags.includes(tag)) {
      existingTags.push(tag);
      await updateProduct(p.id, { tags: existingTags.join(', ') });
      results.push(p.title);
    }
  }
  return results;
}

async function fixZeroPrices(defaultPrice) {
  const products = await getAllProducts();
  const fixed = [];
  for (const p of products) {
    for (const v of p.variants) {
      if (parseFloat(v.price) === 0) {
        await updateVariant(v.id, { price: defaultPrice });
        fixed.push(`${p.title} - ${v.title}`);
      }
    }
  }
  return fixed;
}

// ─────────────────────────────────────────
// INVENTORY
// ─────────────────────────────────────────

async function getLocations() {
  const data = await api('GET', '/locations.json');
  return data.locations || [];
}

async function getInventoryLevels(locationId) {
  const data = await api('GET', `/inventory_levels.json?location_ids=${locationId}&limit=250`);
  return data.inventory_levels || [];
}

async function adjustInventory(inventoryItemId, locationId, adjustment) {
  return api('POST', '/inventory_levels/adjust.json', {
    inventory_item_id: inventoryItemId,
    location_id: locationId,
    available_adjustment: adjustment
  });
}

async function setInventory(inventoryItemId, locationId, quantity) {
  return api('POST', '/inventory_levels/set.json', {
    inventory_item_id: inventoryItemId,
    location_id: locationId,
    available: quantity
  });
}

async function getLowStock(threshold = 10) {
  const products = await getAllProducts();
  const low = [];
  for (const p of products) {
    const lowV = p.variants.filter(v => v.inventory_quantity <= threshold);
    if (lowV.length) low.push({ product: p.title, variants: lowV });
  }
  return low;
}

async function adjustProductInventory(keyword, adjustment) {
  const locations = await getLocations();
  const locationId = locations[0].id;
  const products = await searchProducts(keyword);
  if (!products.length) return `No products found matching "${keyword}"`;
  const results = [];
  for (const p of products) {
    for (const v of p.variants) {
      await adjustInventory(v.inventory_item_id, locationId, adjustment);
      results.push(`${p.title} - ${v.title}: ${adjustment > 0 ? '+' : ''}${adjustment}`);
    }
  }
  return results;
}

// ─────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────

async function getOrders(status = 'any', limit = 20) {
  const data = await api('GET', `/orders.json?status=${status}&limit=${limit}`);
  return data.orders || [];
}

async function createTestOrder(productTitle, variantTitle) {
  const products = await searchProducts(productTitle);
  if (!products.length) return `Product not found: ${productTitle}`;
  const product = products[0];
  const variant = variantTitle
    ? product.variants.find(v => v.title.toLowerCase().includes(variantTitle.toLowerCase()))
    : product.variants[0];
  if (!variant) return `Variant not found: ${variantTitle}`;
  return api('POST', '/orders.json', {
    order: {
      line_items: [{ variant_id: variant.id, quantity: 1 }],
      financial_status: 'paid',
      fulfillment_status: null,
      email: 'demo@superaredemo.com',
      billing_address: {
        first_name: 'Demo', last_name: 'Customer',
        address1: '123 Fight St', city: 'New York',
        province: 'New York', country: 'US', zip: '10001'
      }
    }
  });
}

async function getDailySales() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const orders = await getOrders('any', 250);
  const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
  const revenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
  return {
    orderCount: todayOrders.length,
    revenue: revenue.toFixed(2),
    orders: todayOrders
  };
}

async function getSalesSummary(days = 30) {
  const orders = await getOrders('any', 250);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = orders.filter(o => new Date(o.created_at) >= cutoff);
  const revenue = recent.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
  const productSales = {};
  for (const o of recent) {
    for (const item of o.line_items || []) {
      productSales[item.title] = (productSales[item.title] || 0) + item.quantity;
    }
  }
  const topSellers = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  return { period: `${days} days`, orderCount: recent.length, revenue: revenue.toFixed(2), topSellers };
}

// ─────────────────────────────────────────
// CATALOG AUDIT
// ─────────────────────────────────────────

async function catalogAudit() {
  const products = await getAllProducts();
  const issues = [];
  let totalIssues = 0;

  for (const p of products) {
    const productIssues = [];
    const descText = p.body_html ? p.body_html.replace(/<[^>]*>/g, '').trim() : '';
    if (descText.length < 20) productIssues.push('weak/missing description');
    if (!p.tags || p.tags.length === 0) productIssues.push('no tags');
    if (!p.product_type) productIssues.push('no product type');
    for (const v of p.variants) {
      if (!v.sku) productIssues.push(`missing SKU (${v.title})`);
      if (!v.barcode) productIssues.push(`missing UPC/barcode (${v.title})`);
      if (parseFloat(v.price) === 0) productIssues.push(`$0 price (${v.title})`);
    }
    if (productIssues.length) {
      issues.push({ product: p.title, issues: productIssues });
      totalIssues += productIssues.length;
    }
  }
  return { totalProducts: products.length, productsWithIssues: issues.length, totalIssues, issues };
}

async function catalogHealthScore() {
  const audit = await catalogAudit();
  const maxIssuesPerProduct = 5;
  const maxPossibleIssues = audit.totalProducts * maxIssuesPerProduct;
  const score = Math.max(0, Math.round(((maxPossibleIssues - audit.totalIssues) / maxPossibleIssues) * 100));
  return { score, ...audit };
}

// ─────────────────────────────────────────
// PURCHASE ORDERS
// ─────────────────────────────────────────

async function generatePurchaseOrder(threshold = 10) {
  const lowStock = await getLowStock(threshold);
  if (!lowStock.length) return 'No items below threshold — no PO needed!';

  const date = new Date().toLocaleDateString();
  const poNumber = `PO-${Date.now().toString().slice(-6)}`;

  let po = `\n📋 PURCHASE ORDER ${poNumber}\n`;
  po += `Date: ${date}\n`;
  po += `Vendor: Superare Supplier\n`;
  po += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  po += `ITEMS TO REORDER:\n\n`;

  let totalUnits = 0;
  for (const item of lowStock) {
    po += `${item.product}\n`;
    for (const v of item.variants) {
      const reorderQty = Math.max(20, 20 - v.inventory_quantity);
      po += `  • ${v.title}: ${v.inventory_quantity} in stock → reorder ${reorderQty} units\n`;
      totalUnits += reorderQty;
    }
    po += '\n';
  }

  po += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  po += `Total SKUs: ${lowStock.reduce((s, i) => s + i.variants.length, 0)}\n`;
  po += `Total Units: ${totalUnits}\n`;
  po += `Status: PENDING APPROVAL\n`;

  return po;
}

// ─────────────────────────────────────────
// MORNING BRIEF
// ─────────────────────────────────────────

async function morningBrief() {
  const products = await getAllProducts();
  const lowStock = await getLowStock(10);
  const audit = await catalogAudit();
  const sales = await getSalesSummary(7);
  const orders = await getOrders('unfulfilled', 10);

  const totalVariants = products.reduce((s, p) => s + p.variants.length, 0);
  const outOfStock = products.flatMap(p => p.variants).filter(v => v.inventory_quantity <= 0).length;

  let brief = `\n🌅 SUPERARE DAILY BRIEF\n`;
  brief += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  brief += `📅 ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n\n`;

  brief += `📊 CATALOG\n`;
  brief += `  ${products.length} products | ${totalVariants} variants\n`;
  brief += `  Catalog health: ${(await catalogHealthScore()).score}%\n`;
  brief += `  Issues to fix: ${audit.totalIssues}\n\n`;

  brief += `📦 INVENTORY\n`;
  brief += `  🔴 Out of stock: ${outOfStock} variants\n`;
  brief += `  🟡 Low stock: ${lowStock.length} products\n\n`;

  brief += `🛒 ORDERS (last 7 days)\n`;
  brief += `  Orders: ${sales.orderCount}\n`;
  brief += `  Revenue: $${sales.revenue}\n`;
  brief += `  Unfulfilled: ${orders.length}\n\n`;

  if (lowStock.length) {
    brief += `⚠️ TOP LOW STOCK ALERTS\n`;
    for (const item of lowStock.slice(0, 3)) {
      brief += `  • ${item.product}\n`;
    }
    brief += '\n';
  }

  if (audit.issues.length) {
    brief += `🔧 TOP CATALOG ISSUES\n`;
    for (const item of audit.issues.slice(0, 3)) {
      brief += `  • ${item.product}: ${item.issues.slice(0, 2).join(', ')}\n`;
    }
  }

  return brief;
}

// ─────────────────────────────────────────
// INVENTORY SUMMARY (formatted)
// ─────────────────────────────────────────

async function getInventorySummary(keyword) {
  const products = await searchProducts(keyword);
  if (!products.length) return `No products found matching "${keyword}"`;
  let summary = '';
  for (const p of products) {
    summary += `\n📦 ${p.title}\n`;
    for (const v of p.variants) {
      const qty = v.inventory_quantity;
      const flag = qty <= 0 ? '🔴' : qty <= 5 ? '🟡' : '🟢';
      summary += `  ${flag} ${v.title}: ${qty} units\n`;
    }
  }
  return summary;
}

module.exports = {
  getAllProducts,
  searchProducts,
  updateProduct,
  updateVariant,
  bulkAddTags,
  fixZeroPrices,
  getLocations,
  getInventoryLevels,
  adjustInventory,
  setInventory,
  getLowStock,
  adjustProductInventory,
  getOrders,
  createTestOrder,
  getDailySales,
  getSalesSummary,
  catalogAudit,
  catalogHealthScore,
  generatePurchaseOrder,
  morningBrief,
  getInventorySummary
};
