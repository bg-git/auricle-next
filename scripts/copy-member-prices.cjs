// scripts/copy-member-prices.js
//
// One-off script to copy every variant's current price
// into the custom.member_price metafield (if empty).
//
// SAFE: it does NOT overwrite existing member_price values.

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

// Query: products + variants + current member_price
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
                price
                metafield(namespace: "custom", key: "member_price") {
                  id
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

// Mutation: set metafields
const METAFIELDS_SET_MUTATION = `
  mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        key
        namespace
        owner {
          ... on ProductVariant {
            id
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

async function run() {
  console.log('▶ Starting copy of variant prices -> custom.member_price');
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

      const metafieldsToSet = [];

      for (const vEdge of variants) {
        const variant = vEdge.node;
        totalVariantsSeen++;

        const basePrice = variant.price;
        const existingMetafield = variant.metafield;

        if (!basePrice) continue;

        // If member_price already has a value, skip it
        if (
          existingMetafield &&
          existingMetafield.value &&
          existingMetafield.value.toString().trim() !== ''
        ) {
          continue;
        }

        metafieldsToSet.push({
          ownerId: variant.id,
          namespace: 'custom',
          key: 'member_price',
          type: 'number_decimal',
          value: basePrice.toString(), // must be string
        });
      }

      if (metafieldsToSet.length > 0) {
        // Work in chunks so we’re kind to the API
        const chunkSize = 20;
        for (let i = 0; i < metafieldsToSet.length; i += chunkSize) {
          const chunk = metafieldsToSet.slice(i, i + chunkSize);

          console.log(
            `→ Product "${product.title}" - setting member_price on ${chunk.length} variants`
          );

          const result = await shopifyGraphQL(METAFIELDS_SET_MUTATION, {
            metafields: chunk,
          });

          const userErrors = result.metafieldsSet.userErrors || [];
          if (userErrors.length > 0) {
            console.error(
              'User errors when setting metafields:',
              JSON.stringify(userErrors, null, 2)
            );
          } else {
            totalUpdated += chunk.length;
          }

          await sleep(300);
        }
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
  console.log(`   Variants seen:   ${totalVariantsSeen}`);
  console.log(`   Metafields set:  ${totalUpdated}`);
}

run().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
