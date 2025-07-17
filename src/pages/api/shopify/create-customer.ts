import type { NextApiRequest, NextApiResponse } from 'next';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '';
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || '';
const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/2023-01/graphql.json`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, password, firstName, lastName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  const query = `
    mutation customerCreate($input: CustomerCreateInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
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
      firstName,
      lastName,
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

    if (json.errors || json.data.customerCreate.customerUserErrors.length > 0) {
      const message =
        json.errors?.[0]?.message || json.data.customerCreate.customerUserErrors[0]?.message;
      return res.status(400).json({ success: false, error: message });
    }

    return res.status(200).json({ success: true });
  } catch (error: unknown) {
  const message =
    error instanceof Error ? error.message : 'An unknown error occurred';

  return res.status(500).json({ error: message });
}

}
