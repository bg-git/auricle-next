// scripts/add-starter-tags-from-collections.cjs
//
// Add starter tags to products in specific collections, based on title tokens like:
// "EMARA" | 14k YELLOW GOLD
// "EMARA" | 14k WHITE GOLD
// "ELRA"  | TITANIUM | GOLD
// "ELRA"  | TITANIUM | POLISHED
//
// Tags:
// - TITANIUM + POLISHED => polished-ti-starter
// - TITANIUM + GOLD     => gold-titanium-starter
// - 14k + YELLOW GOLD   => yellow-gold-starter
// - 14k + WHITE GOLD    => white-gold-starter
//
// Safe-ish to re-run: only adds tag if missing.

require('dotenv').config({ path: '.env.local' });

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2025-01';

if (!STORE_DOMAIN || !ADMIN_TOKEN) {
  console.error('❌ Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_API_ACCESS_TOKEN in env.');
  process.exit(1);
}

const GRAPHQL_ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

const COLLECTION_IDS_NUMERIC = ['647160660293', '656115597637'];
const COLLECTION_GIDS = COLLECTION_IDS_NUMERIC.map((id) => `gid://shopify/Collection/${id}`);

const TAGS = {
  polishedTitanium: 'polished-ti-starter',
  goldTitanium: 'gold-titanium-starter',
  yellowGold14k: 'yellow-gold-starter',
  whiteGold14k: 'white-gold-starter',
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
  if (!res.ok) throw new Error(`Shopify API error ${res.status}: ${text}`);

  const json = JSON.parse(text);

  if (json.errors) {
    console.error('GraphQL errors:', JSON.stringify(json.errors, null, 2));
    throw new Error('GraphQL returned errors');
  }

  return json.data;
}

const COLLECTION_PRODUCTS_QUERY = `
  query CollectionProducts($collectionId: ID!, $cursor: String) {
    collection(id: $collectionId) {
      id
      title
      products(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            title
            tags
          }
        }
      }
    }
  }
`;

const TAGS_ADD_MUTATION = `
  mutation tagsAdd($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      node { id }
      userErrors { field message }
    }
  }
`;

function normalizeToken(s) {
  return String(s || '').trim().toUpperCase();
}

function tokenizeTitle(titleRaw) {
  // Split on pipes and normalize tokens
  return String(titleRaw || '')
    .split('|')
    .map((t) => normalizeToken(t))
    .filter(Boolean);
}

function pickStarterTagFromTokens(tokens) {
  // Robust matching: handles tokens split or combined, e.g.
  // ["EMARA", "14K YELLOW GOLD"] OR ["EMARA", "14K", "YELLOW GOLD"]
  const joined = tokens.join(' | '); // already uppercased

  const has14k = joined.includes('14K');
  const hasTitanium = joined.includes('TITANIUM');

  const hasPolished = joined.includes('POLISHED');

  // Titanium gold should not catch 14k gold items
  const isTitaniumGold = hasTitanium && joined.includes('GOLD') && !has14k;

  const isYellowGold14k = has14k && joined.includes('YELLOW') && joined.includes('GOLD');
  const isWhiteGold14k = has14k && joined.includes('WHITE') && joined.includes('GOLD');

  // Priority: 14k first
  if (isWhiteGold14k) return TAGS.whiteGold14k;
  if (isYellowGold14k) return TAGS.yellowGold14k;

  // Titanium starters
  if (isTitaniumGold) return TAGS.goldTitanium;
  if (hasTitanium && hasPolished) return TAGS.polishedTitanium;

  return null;
}

async function run() {
  console.log('▶ Starting starter tag assignment (collection-scoped)');
  console.log(`   Store: ${STORE_DOMAIN}`);
  console.log(`   Collections: ${COLLECTION_IDS_NUMERIC.join(', ')}`);
  console.log('');

  let totalSeen = 0;
  let totalMatched = 0;
  let totalAlreadyTagged = 0;
  let totalTagged = 0;

  for (const collectionId of COLLECTION_GIDS) {
    let cursor = null;

    while (true) {
      const data = await shopifyGraphQL(COLLECTION_PRODUCTS_QUERY, { collectionId, cursor });

      const collection = data.collection;
      if (!collection) {
        console.error(`❌ Collection not found for id: ${collectionId}`);
        break;
      }

      const edges = collection.products?.edges || [];
      if (!edges.length) break;

      for (const edge of edges) {
        const product = edge.node;
        totalSeen++;

        const tokens = tokenizeTitle(product.title);
        const tagToAdd = pickStarterTagFromTokens(tokens);
        if (!tagToAdd) continue;
        totalMatched++;

        const existing = (product.tags || []).map((t) => String(t).toLowerCase());
        if (existing.includes(tagToAdd.toLowerCase())) {
          totalAlreadyTagged++;
          continue;
        }

        console.log(`→ [${collection.title}] Add "${tagToAdd}" to: "${product.title}"`);

        const result = await shopifyGraphQL(TAGS_ADD_MUTATION, {
          id: product.id,
          tags: [tagToAdd],
        });

        const errs = result.tagsAdd?.userErrors || [];
        if (errs.length) {
          console.error('User errors:', JSON.stringify(errs, null, 2));
        } else {
          totalTagged++;
        }

        await sleep(200);
      }

      const pageInfo = collection.products.pageInfo;
      if (!pageInfo.hasNextPage) break;

      cursor = pageInfo.endCursor;
      console.log('… Fetching next page of collection products …');
      await sleep(400);
    }
  }

  console.log('');
  console.log('✅ Done.');
  console.log(`   Products seen:      ${totalSeen}`);
  console.log(`   Matched rule:       ${totalMatched}`);
  console.log(`   Already had tag:    ${totalAlreadyTagged}`);
  console.log(`   Tagged now:         ${totalTagged}`);
}

run().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
