// scripts/add-17-percent-to-ti-prices.cjs
//
// One-off script to add 17% to the NON-member variant price
// (the main variant `price` field) for variants where the SKU
// starts with "Ti-0" and the product status is ACTIVE.
//
// Only affects variants with SKU beginning "Ti-0" on ACTIVE products.
// Others are left unchanged.
//
// WARNING: This is destructive. Run ONCE. If you run it again,
// it will add another 17% on top of the already-updated price.

require('dotenv').config({ path: '.env.local' });

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2025-01';

if (!STORE_DOMAIN || !ADMIN_TOKEN) {
  console.error('❌ Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_API_ACCESS_TOKEN in env.');
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

// Query: products + status + variants (id, sku, price)
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
          status
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

// Bulk mutation
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

function shouldUpdateVariant(product, variant) {
  const sku = variant.sku || '';
  const priceStr = variant.price;

  if (!sku || !priceStr) return false;

  // Only ACTIVE products
  if (product.status !== 'ACTIVE') return false;

  // Only SKUs starting with "Ti-0"
  return sku.startsWith('Ti-0');
}

function calculateNewPrice(priceStr) {
  const base = parseFloat(priceStr);
  if (Number.isNaN(base)) return null;

  const newPrice = base * 1.17; // +17%
  // Round to 2 decimal places as string
  return newPrice.toFixed(2);
}

async function run() {
  console.log('▶ Starting 17% price increase for Ti-0 SKUs on ACTIVE products');
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

        if (!shouldUpdateVariant(product, variant)) {
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
          `→ Queuing update for variant ${variant.id} [${variant.sku}] on "${product.title}" (${product.status}) from ${currentPrice} → ${newPrice}`
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
