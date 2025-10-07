import type { NextApiRequest, NextApiResponse } from 'next';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!; // <-- use same name as get-customer.ts
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-04';
const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

const QUERY = /* GraphQL */ `
  query ProductById($id: ID!) {
    node(id: $id) {
      ... on Product {
        id
        handle
        title
        descriptionHtml
        images(first: 10) {
          edges { node { url width height altText } }
        }
        variants(first: 50) {
          edges {
            node {
              id
              title
              availableForSale
              quantityAvailable
              sku
              price { amount currencyCode }
              selectedOptions { name value }
              image { url width height altText }
            }
          }
        }
        metafields(identifiers: [
          { namespace: "custom", key: "alloy" },
          { namespace: "custom", key: "metal" },
          { namespace: "custom", key: "metal_colour" },
          { namespace: "custom", key: "thread_type" },
          { namespace: "custom", key: "gem_type" },
          { namespace: "custom", key: "gem_colour" },
          { namespace: "custom", key: "name" },
          { namespace: "custom", key: "title" },
          { namespace: "custom", key: "sku" },
          { namespace: "custom", key: "width" },
          { namespace: "custom", key: "height" },
          { namespace: "custom", key: "length" },
          { namespace: "custom", key: "gauge" },
          { namespace: "custom", key: "sold_as" },
          { namespace: "custom", key: "shipping" },
          { namespace: "custom", key: "base_size" },
          { namespace: "custom", key: "variants" },
          { namespace: "custom", key: "variant_label" },
          { namespace: "custom", key: "fitting" }
        ]) { key value }
      }
    }
  }
`;

type ShopifyResp = {
  data?: { node?: unknown };
  errors?: unknown;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.body as { id?: string };
  if (!id) return res.status(400).json({ error: 'Missing id' });

  if (!SHOPIFY_DOMAIN || !STOREFRONT_TOKEN) {
    return res.status(500).json({
      error: 'Missing env',
      details: {
        SHOPIFY_STORE_DOMAIN: Boolean(SHOPIFY_DOMAIN),
        SHOPIFY_STOREFRONT_ACCESS_TOKEN: Boolean(STOREFRONT_TOKEN),
      },
    });
  }

  try {
    const resp = await fetch(STOREFRONT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query: QUERY, variables: { id } }),
    });

    if (!resp.ok) {
      const text = await resp.text(); // expose body for debugging
      return res.status(resp.status).json({ error: 'Shopify fetch failed', status: resp.status, body: text });
    }

    const json = (await resp.json()) as ShopifyResp;

    if (json.errors) {
      return res.status(500).json({ error: 'Shopify GraphQL errors', details: json.errors });
    }

    return res.status(200).json({ product: json.data?.node ?? null });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: message });
  }
}
