const domain =
  process.env.SHOPIFY_STORE_DOMAIN?.replace(/^https?:\/\//, '') || '';
const token = process.env.SHOPIFY_STOREFRONT_TOKEN!;

export async function shopifyFetch({ query, variables = {} }: { query: string; variables?: any }) {
  const res = await fetch(`https://${domain}/api/2024-04/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}
