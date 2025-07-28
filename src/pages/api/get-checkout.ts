import type { NextApiRequest, NextApiResponse } from 'next';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const URL = `https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ message: 'Missing id' });
  }

  const query = `
    query cart($id: ID!) {
      cart(id: $id) {
        id
        status
        checkoutUrl
        lines(first: 250) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant { id }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
      },
      body: JSON.stringify({ query, variables: { id } }),
    });

    const json = await response.json();
    const cart = json.data?.cart;
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found', debug: json });
    }

    return res.status(200).json({ cart });
  } catch (err) {
    console.error('Failed to fetch cart:', err);
    return res.status(500).json({ message: 'Failed to fetch cart' });
  }
}
