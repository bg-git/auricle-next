import type { NextApiRequest, NextApiResponse } from 'next';

const SHOPIFY_ADMIN_API_URL = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-04/graphql.json`;
const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, firstName, lastName } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const mutation = `
    mutation customerCreate($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      email,
      firstName,
      lastName,
      tags: 'B2B, Registered via custom form',
      emailMarketingConsent: {
        state: 'NOT_SUBSCRIBED',
        marketingOptInLevel: 'SINGLE_OPT_IN',
      }
    },
  };

  try {
    const shopifyRes = await fetch(SHOPIFY_ADMIN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const json = await shopifyRes.json();

    if (json.errors) {
      console.error('GraphQL top-level error:', json.errors);
      return res.status(500).json({ error: 'GraphQL error', details: json.errors });
    }

    const { customerCreate } = json.data;

    if (customerCreate.userErrors.length) {
      return res.status(400).json({ errors: customerCreate.userErrors });
    }

    return res.status(200).json({ customer: customerCreate.customer });
  } catch (err: any) {
    console.error('Request failed:', err);
    return res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}
