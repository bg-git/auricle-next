// scripts/add-starter-tags.cjs
//
// One-off script to add starter tags to products based on:
// 1) Collection membership (only apply within allowed collections)
// 2) Product title matching
//
// Adds a single tag if missing. Leaves existing tags unchanged.
// Safe-ish to re-run.
//
// Mapping (edit as needed):
// - Polished Titanium -> polished-ti-starter
// - Gold Titanium     -> gold-titanium-starter
// - 14k Yellow Gold   -> yellow-gold-starter
// - 14k White Gold    -> white-gold-starter   (as provided)

require('dotenv').config({ path: '.env.local' });

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2025-01';

if (!STORE_DOMAIN || !ADMIN_TOKEN) {
  console.error('❌ Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_API_ACCESS_TOKEN in env.');
  process.exit(1);
}

const GRAPHQL_ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

const ALLOWED_COLLECTION_TITLES = new Set([
  'ends & gems',
  'titanium ends & gems',
]);

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

// Pull products + tags + collections
const PRODUCTS_QUERY = `
  query ProductsWithCollections($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          title
          tags
          collections(first: 20) {
            edges { node { title } }
          }
        }
      }
    }
  }
`;

// Add tags to a product
const TAGS_ADD_MUTATION = `
  mutation tagsAdd($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      node { id }
      userErrors { field message }
    }
  }
`;

function normalize(s) {
  return String(s || '').trim().toLowerCase();
}

function inAllowedCollections(product) {
  const cols = product.collections?.edges || [];
  for (const c of cols) {
    const t = normalize(c.node?.title);
    if (ALLOWED_COLLECTION_TITLES.has(t)) return true;
  }
  return false;
}

function pickStarterTagFromTitle(titleRaw) {
  const title = normalize(titleRaw);

  // ---- Rules (edit freely) ----
  // 14k gold (yellow/white)
  const is14k = title.includes('14k') || title.includes('14 k') || title.includes('14ct') || title.includes('14 ct');

  // Titanium
  const isTitanium = title.includes('titanium') || title.includes('ti ');
  const isGoldTitanium = isTitanium && (title.includes('gold titanium') || title.includes('gold ti') || title.includes('pvd') || title.includes('gold pvd'));
  const isPolishedTitanium = isTitanium && (title.includes('polished') || title.includes('mirror') || title.includes('shiny')) && !isGoldTitanium;

  // Gold colour words
  const isYellow = title.includes('yellow gold') || title.includes('yg');
  const isWhite = title.includes('white gold') || title.includes('wg');

  if (is14k && isYellow) return TAGS.yellowGold14k;
  if (is14k && isWhite) return TAGS.whiteGold14k;

  if (isGoldTitanium) return TAGS.goldTitanium;
  if (isPolishedTitanium) return TAGS.polishedTitanium;

  // If you want a fallback for 14k when colour not mentioned:
  // if (is14k) return TAGS.yellowGold14k;

  return null;
}

async function run() {
  console.log('▶ Starting starter tag assignment');
  console.log(`   Store: ${STORE_DOMAIN}`);
  console.log(`   Allowed collections: ${Array.from(ALLOWED_COLLECTION_TITLES).join(' | ')}`);
  console.log('');

  let cursor = null;

  let totalSeen = 0;
  let totalInScope = 0;
  let totalMatchedRule = 0;
  let totalAlreadyTagged = 0;
  let totalTagged = 0;

  while (true) {
    const data = await shopifyGraphQL(PRODUCTS_QUERY, { cursor });

    const products = data.products?.edges || [];
    if (!products.length) break;

    for (const edge of products) {
      const product = edge.node;
      totalSeen++;

      if (!inAllowedCollections(product)) continue;
      totalInScope++;

      const tagToAdd = pickStarterTagFromTitle(product.title);
      if (!tagToAdd) continue;
      totalMatchedRule++;

      const existingTags = (product.tags || []).map(normalize);
      if (existingTags.includes(normalize(tagToAdd))) {
        totalAlreadyTagged++;
        continue;
      }

      console.log(`→ Adding tag "${tagToAdd}" to: "${product.title}" (${product.id})`);

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

      await sleep(250);
    }

    const pageInfo = data.products.pageInfo;
    if (!pageInfo.hasNextPage) break;

    cursor = pageInfo.endCursor;
    console.log('… Fetching next page of products …');
    await sleep(500);
  }

  console.log('');
  console.log('✅ Done.');
  console.log(`   Products seen:           ${totalSeen}`);
  console.log(`   In allowed collections:  ${totalInScope}`);
  console.log(`   Matched title rule:      ${totalMatchedRule}`);
  console.log(`   Already had tag:         ${totalAlreadyTagged}`);
  console.log(`   Tagged now:              ${totalTagged}`);
}

run().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
