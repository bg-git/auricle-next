import type { NextApiRequest, NextApiResponse } from 'next';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { variantIds } = req.body as { variantIds?: string[] };

  if (!Array.isArray(variantIds) || variantIds.length === 0) {
    return res.status(400).json({ message: 'No variant IDs provided' });
  }

  const query = `
    query variantAvailability($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on ProductVariant {
          id
          availableForSale
          quantityAvailable
        }
      }
    }
  `;

  try {
    const response = await fetch(STOREFRONT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
      },
      body: JSON.stringify({ query, variables: { ids: variantIds } }),
    });

    const json = await response.json();
    const nodes = json?.data?.nodes;

    if (!Array.isArray(nodes)) {
      return res.status(500).json({ message: 'Unexpected response from Shopify', debug: json });
    }

    const variants = nodes
      .filter((node: { id?: string }) => node?.id)
      .map((node: { id: string; availableForSale?: boolean; quantityAvailable?: number }) => ({
        id: node.id,
        availableForSale: node.availableForSale ?? false,
        quantityAvailable: node.quantityAvailable ?? 0,
      }));

    return res.status(200).json({ variants });
  } catch (err) {
    console.error('Failed to check inventory:', err);
    return res.status(500).json({ message: 'Failed to check inventory' });
  }
}
