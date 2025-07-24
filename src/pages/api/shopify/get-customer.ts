import type { NextApiRequest, NextApiResponse } from 'next';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`;
const ADMIN_API_KEY = process.env.SHOPIFY_ADMIN_API_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: 'Token is required' });
  }

  const query = `
    query customer($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        id
        firstName
        lastName
        email
        phone
        acceptsMarketing
        createdAt
        updatedAt
        metafield(namespace: "custom", key: "approved") {
      value
    }
        defaultAddress {
          id
          firstName
          lastName
          company
          address1
          address2
          city
          province
          country
          zip
          phone
        }
        addresses(first: 10) {
          edges {
            node {
              id
              firstName
              lastName
              company
              address1
              address2
              city
              province
              country
              zip
              phone
            }
          }
        }
      }
    }
  `;

  const variables = {
    customerAccessToken: token,
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

    if (json.errors || !json.data.customer) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const customer = json.data.customer;

    let note = '';
    let tags: string[] = [];
    if (customer.email) {
      const adminRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2023-01/customers/search.json?query=email:${encodeURIComponent(customer.email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': ADMIN_API_KEY,
        },
      });
      const adminJson = await adminRes.json();
      if (adminJson.customers && adminJson.customers.length > 0) {
        const adminCustomer = adminJson.customers[0];
        note = adminCustomer.note || '';
        if (adminCustomer.tags) {
          tags = adminCustomer.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        }
      }
    }

    const isApproved = (t: string[]) =>
      t.map((tag) => tag.toLowerCase()).includes('approved');

    return res.status(200).json({
      success: true,
      customer: {
        ...customer,
        note,
        tags,
        approved: isApproved(tags),
      },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ success: false, error: message });
  }
} 