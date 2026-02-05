#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env.local' });

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2025-01';

// Validate environment variables
if (!STORE_DOMAIN) {
  console.error('❌ Error: SHOPIFY_STORE_DOMAIN is not set');
  process.exit(1);
}
if (!ADMIN_TOKEN) {
  console.error('❌ Error: SHOPIFY_ADMIN_API_ACCESS_TOKEN is not set');
  process.exit(1);
}

console.log(`Using store: ${STORE_DOMAIN}`);

const GRAPHQL_ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

const shopifyAdminFetch = async (query, variables = {}) => {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const data = JSON.parse(text);
  if (data.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
  }
  return data.data;
};

const getCollectionsWithDeepLinks = async (cursor = null) => {
  const query = `
    query GetCollections($cursor: String) {
      collections(first: 50, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            handle
            metafield(namespace: "custom", key: "deep_links") {
              value
            }
          }
        }
      }
    }
  `;

  return shopifyAdminFetch(query, { cursor });
};

const updateCollectionMetafield = async (collectionId, newValue) => {
  const mutation = `
    mutation UpdateMetafield($ownerId: ID!, $namespace: String!, $key: String!, $value: String!) {
      metafieldsSet(metafields: [{ownerId: $ownerId, namespace: $namespace, key: $key, value: $value}]) {
        metafields {
          id
          value
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    ownerId: collectionId,
    namespace: 'custom',
    key: 'deep_links',
    value: newValue,
  };

  return shopifyAdminFetch(mutation, variables);
};

const main = async () => {
  try {
    console.log('Starting deep_links URL migration from /collection/ to /browse/...\n');

    let cursor = null;
    let totalProcessed = 0;
    let totalUpdated = 0;

    while (true) {
      const data = await getCollectionsWithDeepLinks(cursor);
      const collections = data.collections.edges;

      if (collections.length === 0) break;

      for (const { node: collection } of collections) {
        if (!collection.metafield || !collection.metafield.value) {
          continue;
        }

        totalProcessed++;
        const originalValue = collection.metafield.value;
        const newValue = originalValue.replace(/\/collection\//g, '/browse/');

        if (originalValue !== newValue) {
          console.log(`Updating: ${collection.handle}`);
          console.log(`  FROM: ${originalValue}`);
          console.log(`  TO:   ${newValue}\n`);

          try {
            await updateCollectionMetafield(
              collection.id,
              newValue
            );
            totalUpdated++;
          } catch (error) {
            console.error(`  ❌ Error updating ${collection.handle}:`, error.message);
          }
        }
      }

      if (!data.collections.pageInfo.hasNextPage) break;
      cursor = data.collections.pageInfo.endCursor;
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Processed: ${totalProcessed} collections`);
    console.log(`   Updated: ${totalUpdated} metafields`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
};

main();
