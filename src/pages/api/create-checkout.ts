import type { NextApiRequest, NextApiResponse } from 'next';
import { COOKIE_NAME } from '@/lib/cookies';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { items } = req.body;

  const lines = items.map((item: { variantId: string; quantity: number }) => ({
    merchandiseId: item.variantId,
    quantity: item.quantity,
  }));

  const query = `
    mutation cartCreate($lines: [CartLineInput!]!, $buyerIdentity: CartBuyerIdentityInput) {
      cartCreate(input: { lines: $lines, buyerIdentity: $buyerIdentity }) {
        cart {
          id
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const customerAccessToken = req.cookies?.[COOKIE_NAME];

  const variables: {
    lines: { merchandiseId: string; quantity: number }[];
    buyerIdentity: {
      countryCode: string;
      customerAccessToken?: string;
    };
  } = {
    lines,
    buyerIdentity: {
      countryCode: "GB", // ✅ You can change this to "US", "IE", etc.
      ...(customerAccessToken ? { customerAccessToken } : {}),
    },
  };

  const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json();
  const cart = json.data?.cartCreate?.cart;

  if (!cart?.checkoutUrl || !cart?.id) {
    console.error('Shopify cartCreate error:', JSON.stringify(json, null, 2));
    return res.status(500).json({ message: 'Failed to create cart', debug: json });
  }

  return res.status(200).json({ checkoutUrl: cart.checkoutUrl, checkoutId: cart.id });
}
