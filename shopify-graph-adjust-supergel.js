require('dotenv').config({ path: '/home/clawd/.env', override: true });

const storeUrl = 'superare-demo.myshopify.com';
const apiKey = process.env.SHOPIFY_TOKEN;
if (!apiKey) throw new Error('SHOPIFY_TOKEN missing');

const version = '2024-04';
const baseUrl = `https://${storeUrl}/admin/api/${version}/graphql.json`;
const headers = {
  'X-Shopify-Access-Token': apiKey,
  'Content-Type': 'application/json',
};

async function api(query, variables = {}) {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  });
  const data = await response.json();
  if (!response.ok || data.errors) {
    throw new Error(JSON.stringify(data.errors || data));
  }
  return data.data;
}

const QUERY = `
query ($itemIds: [ID!]!, $locationId: ID!) {
  inventoryItems(first: 20, ids: $itemIds) {
    edges {
      node {
        id
      }
    }
  }
  location(id: $locationId) {
    id
  }
}
`;

const MUTATION = `
mutation inventoryActivate($input: InventoryActivateV2Input!) {
  inventoryActivateV2(input: $input) {
    inventoryLevels {
      userErrors {
        field
        message
      }
    }
  }
}
`; 

No, for adjust: inventoryAdjustQuantities

const ADJUST_MUTATION = `
mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
  inventoryAdjustQuantities(input: $input) {
    inventoryLevels {
      inventoryItem {
        id
      }
      availableQuantity
      userErrors {
        field
        message
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

async function main() {
  // Get location ID
  const locRes = await api(`
    query {
      locations(first: 1) {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  `);
  const locationId = locRes.locations.edges[0].node.id;
  console.log(`Location: ${locRes.locations.edges[0].node.name} (${locationId})`);

  // Get product variants inventory_item_ids
  const productRes = await api(`
    query {
      productByHandle(handle: "supergel-v-gloves") {
        id
        variants(first: 25) {
          edges {
            node {
              id
              inventoryItem {
                id
              }
              inventoryQuantity
              displayName
            }
          }
        }
      }
    }
  `);
  const product = productRes.productByHandle;
  if (!product) throw new Error('Product not found');

  console.log(`Product: SuperGel V Gloves (${product.variants.edges.length} variants)`);

  const changes = [];
  product.variants.edges.forEach(edge => {
    const qty = edge.node.inventoryQuantity;
    if (qty > 0) {
      changes.push({
        inventoryItemId: edge.node.inventoryItem.id,
        delta: -1,
        reason: "MANUAL_ADJUSTMENT"
      });
    }
  });

  if (changes.length === 0) {
    console.log('No positive qty variants.');
    return;
  }

  console.log(`Adjusting ${changes.length} variants by -1...`);

  const input = {
    changes,
    locationId
  };

  const result = await api(ADJUST_MUTATION, { input });
  const adjust = result.inventoryAdjustQuantities;

  if (adjust.userErrors.length > 0) throw new Error(adjust.userErrors[0].message);

  adjust.inventoryLevels.forEach((level, i) => {
    console.log(`  ${product.variants.edges[i].node.displayName}: new qty ${level.availableQuantity}`);
  });

  console.log('\\n✅ Success!');
}

main().catch(e => {
  console.error(e.message);
});