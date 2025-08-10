import type { NextApiRequest, NextApiResponse } from 'next';
import { setCustomerCookie } from '@/lib/cookies';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, password, checkoutId } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  const query = `
    mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken {
          accessToken
          expiresAt
        }
        customerUserErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      email,
      password,
    },
  };

  try {
    const response = await fetch(STOREFRONT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await response.json();



    if (json.errors || json.data.customerAccessTokenCreate.customerUserErrors.length > 0) {
      const message =
        json.errors?.[0]?.message || json.data.customerAccessTokenCreate.customerUserErrors[0]?.message;
      return res.status(400).json({ success: false, error: message });
    }

    const { accessToken } = json.data.customerAccessTokenCreate.customerAccessToken;
    setCustomerCookie(res, accessToken);

    if (checkoutId) {
      const IDENTITY_MUTATION = `mutation cartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) { cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) { cart { id } userErrors { field message } } }`;
      const variables = {
        cartId: checkoutId,
        buyerIdentity: {
          countryCode: 'GB',
          customerAccessToken: accessToken,
        },
      };
      const bindRes = await fetch(STOREFRONT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
        },
        body: JSON.stringify({ query: IDENTITY_MUTATION, variables }),
      });
      const bindJson = await bindRes.json();
      const userErrors = bindJson.data?.cartBuyerIdentityUpdate?.userErrors;
      if (userErrors?.length) {
        console.error('Shopify cartBuyerIdentityUpdate user errors:', userErrors);
      }
    }

    return res.status(200).json({ success: true, accessToken });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ error: message });
  }
} 