/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local" });

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || "2025-01";
const SKU = process.env.SKU;

if (!STORE_DOMAIN || !ADMIN_TOKEN || !SKU) {
  console.error("❌ Missing SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_API_ACCESS_TOKEN / SKU");
  console.error('   PowerShell: $env:SKU="14k-0276"; node scripts/inspect-links-by-sku.cjs');
  process.exit(1);
}

const GRAPHQL_ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

async function shopifyGraphQL(query, variables = {}) {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Shopify API error ${res.status}: ${text}`);

  const json = JSON.parse(text);
  if (json.errors) {
    console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
    throw new Error("GraphQL returned errors");
  }
  return json.data;
}

const Q = `
  query VariantBySku($q: String!) {
    productVariants(first: 5, query: $q) {
      edges {
        node {
          id
          sku
          title
          metafields(first: 250) {
            edges { node { id namespace key type value } }
          }
          product {
            id
            title
            handle
            metafields(first: 250) {
              edges { node { id namespace key type value } }
            }
          }
          inventoryItem {
            id
            sku
            metafields(first: 250) {
              edges { node { id namespace key type value } }
            }
          }
        }
      }
    }
  }
`;

function hits(mfs) {
  return (mfs || [])
    .map((e) => e.node)
    .filter((m) => (m.value || "").includes("/product/") || (m.value || "").includes("::"));
}

function printBlock(label, mfs) {
  const found = hits(mfs);
  console.log(`${label}: total=${(mfs || []).length}, matches=${found.length}`);
  for (const m of found) {
    console.log(`- ${m.namespace}.${m.key} [${m.type}]`);
    console.log(`  ${m.value}`);
  }
  console.log("");
}

(async () => {
  const data = await shopifyGraphQL(Q, { q: `sku:${SKU}` });
  const edges = data.productVariants?.edges || [];
  if (!edges.length) {
    console.log("❌ No variant found for SKU:", SKU);
    return;
  }

  const v = edges[0].node;

  console.log(`✅ Found variant: SKU ${v.sku} | ${v.product.title} (${v.product.handle}) | ${v.title}`);
  console.log(`   Variant ID: ${v.id}`);
  console.log(`   Product ID: ${v.product.id}`);
  console.log(`   InventoryItem ID: ${v.inventoryItem?.id || "∅"}`);
  console.log("");

  printBlock("VARIANT metafields", v.metafields?.edges);
  printBlock("PRODUCT metafields", v.product.metafields?.edges);
  printBlock("INVENTORY ITEM metafields", v.inventoryItem?.metafields?.edges);
})().catch((e) => {
  console.error("❌ Failed:", e);
  process.exit(1);
});
