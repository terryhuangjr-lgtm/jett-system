require('dotenv').config({ path: '/home/clawd/.env', override: true });

const storeUrl = 'superare-demo.myshopify.com';
const apiKey = process.env.SHOPIFY_TOKEN;
const version = '2024-04';
const baseUrl = `https://${storeUrl}/admin/api/${version}/graphql.json`;
const headers = {
  'X-Shopify-Access-Token': apiKey,
  'Content-Type': 'application/json',
};

const MUTATION = `
mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
  inventoryAdjustQuantities(input: $input) {
    inventoryLevels {
      inventoryItem {
        id
      }
      availableQuantity
      updatedAt
    }
    userErrors {
      field
      message
    }
  }
}
`;

async function main() {
  const input = {
    changes: [{
      inventoryItemId: "gid://shopify/InventoryItem/49771488215205",
      delta: -3,
      reason: "MANUAL_CORRECTION"
    }],
    locationId: "gid://shopify/Location/85513961637"
  };

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: MUTATION, variables: { input } })
  });
  const data = await response.json();
  if (!response.ok || data.errors) {
    throw new Error(JSON.stringify(data.errors || data.data.inventoryAdjustQuantities.userErrors));
  }

  const result = data.data.inventoryAdjustQuantities;
  console.log('Success!');
  console.log('New qty:', result.inventoryLevels[0].availableQuantity);
  console.log('Updated:', result.inventoryLevels[0].updatedAt);
}

main().catch(console.error);