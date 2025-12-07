// scripts/add-10-percent-to-14k-prices.cjs
//
// One-off script to add 10% to the NON-member variant price
// (the main variant `price` field) for variants where the SKU
// starts with "14k".
//
// Only affects variants with SKU beginning "14k".
// Others are left unchanged.
//
// WARNING: This is destructive. Run ONCE. If you run it again,
// it will add another 10% on top of the already-updated price.

require('dotenv').config({ path: '.env.local' });

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2025-01';

if (!STORE_DOMAIN || !ADMIN_TOKEN) {
  console.error('❌ Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN in env.');
  process.exit(1);
}

const GRAPHQL_ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

// Helper: wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: call Shopify Admin GraphQL
async function shopifyGraphQL(query, variables = {}) {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.errors) {
    console.error('GraphQL errors:', JSON.stringify(json.errors, null, 2));
    throw new Error('GraphQL returned errors');
  }
  return json.data;
}

// Query: products + variants (id, sku, price)
const PRODUCTS_QUERY = `
  query ProductsWithVariants($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          variants(first: 100) {
            edges {
              node {
                id
                sku
                price
              }
            }
          }
        }
      }
    }
  }
`;

// ✅ New mutation: productVariantsBulkUpdate (not productVariantUpdate)
const VARIANTS_BULK_UPDATE_MUTATION = `
  mutation productVariantsBulkUpdate(
    $productId: ID!
    $variants: [ProductVariantsBulkInput!]!
  ) {
    productVariantsBulkUpdate(
      productId: $productId
      variants: $variants
      allowPartialUpdates: true
    ) {
      productVariants {
        id
        price
      }
      userErrors {
        field
        message
      }
    }
  }
`;

function shouldUpdateVariant(variant) {
  const sku = variant.sku || '';
  const priceStr = variant.price;

  if (!sku || !priceStr) return false;

  // Only SKUs starting with "14k"
  return sku.startsWith('14k');
}

function calculateNewPrice(priceStr) {
  const base = parseFloat(priceStr);
  if (Number.isNaN(base)) return null;

  const newPrice = base * 1.1; // +10%
  // Round to 2 decimal places as string
  return newPrice.toFixed(2);
}

async function run() {
  console.log('▶ Starting 10% price increase for 14k SKUs');
  console.log(`   Store: ${STORE_DOMAIN}`);
  console.log('');

  let cursor = null;
  let totalVariantsSeen = 0;
  let totalUpdated = 0;

  while (true) {
    const data = await shopifyGraphQL(PRODUCTS_QUERY, { cursor });

    const products = data.products?.edges || [];
    if (products.length === 0) {
      console.log('No more products returned.');
      break;
    }

    for (const edge of products) {
      const product = edge.node;
      const variants = product.variants?.edges || [];

      // Collect all updates for this product in one bulk call
      const variantsToUpdate = [];

      for (const vEdge of variants) {
        const variant = vEdge.node;
        totalVariantsSeen++;

        if (!shouldUpdateVariant(variant)) {
          continue;
        }

        const currentPrice = variant.price;
        const newPrice = calculateNewPrice(currentPrice);

        if (!newPrice) {
          console.warn(
            `⚠️ Skipping variant ${variant.id} (${variant.sku}) – invalid price "${currentPrice}"`
          );
          continue;
        }

        if (newPrice === currentPrice) {
          // Already at the new price, skip
          continue;
        }

        console.log(
          `→ Queuing update for variant ${variant.id} [${variant.sku}] on "${product.title}" from ${currentPrice} → ${newPrice}`
        );

        variantsToUpdate.push({
          id: variant.id,
          price: newPrice,
        });
      }

      if (variantsToUpdate.length > 0) {
        console.log(
          `→ Running productVariantsBulkUpdate for product "${product.title}" on ${variantsToUpdate.length} variant(s)`
        );

        const result = await shopifyGraphQL(VARIANTS_BULK_UPDATE_MUTATION, {
          productId: product.id,
          variants: variantsToUpdate,
        });

        const userErrors = result.productVariantsBulkUpdate?.userErrors || [];
        if (userErrors.length > 0) {
          console.error(
            'User errors when updating variants:',
            JSON.stringify(userErrors, null, 2)
          );
        } else {
          totalUpdated += variantsToUpdate.length;
        }

        // Be nice to the API
        await sleep(500);
      }
    }

    const pageInfo = data.products.pageInfo;
    if (!pageInfo.hasNextPage) {
      break;
    }
    cursor = pageInfo.endCursor;
    console.log('… Fetching next page of products …');
    await sleep(500);
  }

  console.log('');
  console.log('✅ Done.');
  console.log(`   Variants seen:    ${totalVariantsSeen}`);
  console.log(`   Variants updated: ${totalUpdated}`);
}

run().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
