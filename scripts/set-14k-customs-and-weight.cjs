// scripts/set-14k-customs-and-weight.cjs
//
// One-off script to set customs + weight fields for variants where SKU starts with "14k".
//
// Sets (on the variant's InventoryItem):
// - HS code: 7113.19
// - Country of origin: China (CN)
// - Weight: 1 gram
//
// Only affects variants with SKU beginning "14k".
// Others are left unchanged.
//
// Safe-ish to re-run: skips items already matching target values.

require('dotenv').config({ path: '.env.local' });

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2025-01';

if (!STORE_DOMAIN || !ADMIN_TOKEN) {
  console.error('❌ Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_API_ACCESS_TOKEN in env.');
  process.exit(1);
}

const GRAPHQL_ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

// Targets
const TARGET = {
  hsCode: '7113.19',
  countryCodeOfOrigin: 'CN',
  weightValue: 1,
  weightUnit: 'GRAMS',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function shopifyGraphQL(query, variables = {}) {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Shopify API error ${res.status}: ${text}`);
  }

  const json = JSON.parse(text);

  // IMPORTANT: show the actual errors
  if (json.errors) {
    console.error('GraphQL errors:', JSON.stringify(json.errors, null, 2));
    throw new Error('GraphQL returned errors');
  }

  return json.data;
}

// Query products + variants + inventoryItem customs/weight
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
                inventoryItem {
                  id
                  harmonizedSystemCode
                  countryCodeOfOrigin
                  measurement {
                    weight {
                      value
                      unit
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// Bulk update variants, including inventoryItem updates
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
        inventoryItem {
          id
          harmonizedSystemCode
          countryCodeOfOrigin
          measurement {
            weight {
              value
              unit
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

function skuMatches(variant) {
  const sku = variant.sku || '';
  return sku.startsWith('14k'); // change to sku.toLowerCase().startsWith('14k') if needed
}

function alreadyCorrect(inv) {
  if (!inv) return false;

  const hsOk = (inv.harmonizedSystemCode || '') === TARGET.hsCode;
  const originOk = (inv.countryCodeOfOrigin || '') === TARGET.countryCodeOfOrigin;

  const currentWeightValue = inv.measurement?.weight?.value;
  const currentWeightUnit = inv.measurement?.weight?.unit;

  const weightOk =
    Number(currentWeightValue) === TARGET.weightValue &&
    String(currentWeightUnit || '') === TARGET.weightUnit;

  return hsOk && originOk && weightOk;
}

async function run() {
  console.log('▶ Starting customs + weight update for 14k SKUs');
  console.log(`   Store:   ${STORE_DOMAIN}`);
  console.log(`   Targets: HS ${TARGET.hsCode}, Origin ${TARGET.countryCodeOfOrigin}, Weight ${TARGET.weightValue} ${TARGET.weightUnit}`);
  console.log('');

  let cursor = null;
  let totalVariantsSeen = 0;
  let totalMatchedSku = 0;
  let totalQueued = 0;
  let totalUpdated = 0;

  while (true) {
    const data = await shopifyGraphQL(PRODUCTS_QUERY, { cursor });

    const products = data.products?.edges || [];
    if (products.length === 0) break;

    for (const edge of products) {
      const product = edge.node;
      const variants = product.variants?.edges || [];

      const variantsToUpdate = [];

      for (const vEdge of variants) {
        const variant = vEdge.node;
        totalVariantsSeen++;

        if (!skuMatches(variant)) continue;
        totalMatchedSku++;

        const inv = variant.inventoryItem;
        if (alreadyCorrect(inv)) continue;

        const oldHs = inv?.harmonizedSystemCode || '∅';
        const oldOrigin = inv?.countryCodeOfOrigin || '∅';
        const oldW = inv?.measurement?.weight?.value ?? '∅';
        const oldWU = inv?.measurement?.weight?.unit || '';

        console.log(
          `→ Queuing ${variant.id} [${variant.sku}] on "${product.title}"` +
          ` | HS: ${oldHs}→${TARGET.hsCode}` +
          ` | Origin: ${oldOrigin}→${TARGET.countryCodeOfOrigin}` +
          ` | Weight: ${oldW} ${oldWU}→${TARGET.weightValue} ${TARGET.weightUnit}`
        );

        variantsToUpdate.push({
          id: variant.id,
          inventoryItem: {
            harmonizedSystemCode: TARGET.hsCode,
            countryCodeOfOrigin: TARGET.countryCodeOfOrigin,
            measurement: {
              weight: {
                value: TARGET.weightValue,
                unit: TARGET.weightUnit,
              },
            },
          },
        });
      }

      if (variantsToUpdate.length > 0) {
        totalQueued += variantsToUpdate.length;

        console.log(
          `→ Running productVariantsBulkUpdate for "${product.title}" (${variantsToUpdate.length} variant(s))`
        );

        const result = await shopifyGraphQL(VARIANTS_BULK_UPDATE_MUTATION, {
          productId: product.id,
          variants: variantsToUpdate,
        });

        const userErrors = result.productVariantsBulkUpdate?.userErrors || [];
        if (userErrors.length) {
          console.error('User errors:', JSON.stringify(userErrors, null, 2));
        } else {
          totalUpdated += variantsToUpdate.length;
        }

        await sleep(500);
      }
    }

    const pageInfo = data.products.pageInfo;
    if (!pageInfo.hasNextPage) break;

    cursor = pageInfo.endCursor;
    console.log('… Fetching next page of products …');
    await sleep(500);
  }

  console.log('');
  console.log('✅ Done.');
  console.log(`   Variants seen:          ${totalVariantsSeen}`);
  console.log(`   Variants with 14k SKU:  ${totalMatchedSku}`);
  console.log(`   Variants queued:        ${totalQueued}`);
  console.log(`   Variants updated:       ${totalUpdated}`);
}

run().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
