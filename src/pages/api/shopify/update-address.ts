import type { NextApiRequest, NextApiResponse } from 'next';
import { COOKIE_NAME, setCustomerCookie } from '@/lib/cookies';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { address, addressId } = req.body;
  const token = req.cookies[COOKIE_NAME];

  if (!token || !address) {
    return res.status(400).json({ success: false, error: 'Token and address are required' });
  }

  const mutation = addressId
    ? `mutation customerAddressUpdate($customerAccessToken: String!, $id: ID!, $address: MailingAddressInput!) {
        customerAddressUpdate(customerAccessToken: $customerAccessToken, id: $id, address: $address) {
          customerAddress {
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
          customerUserErrors {
            field
            message
          }
        }
      }`
    : `mutation customerAddressCreate($customerAccessToken: String!, $address: MailingAddressInput!) {
        customerAddressCreate(customerAccessToken: $customerAccessToken, address: $address) {
          customerAddress {
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
          customerUserErrors {
            field
            message
          }
        }
      }`;

  const variables: any = addressId
    ? { customerAccessToken: token, id: addressId, address }
    : { customerAccessToken: token, address };

  try {
    const response = await fetch(STOREFRONT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const json = await response.json();
    const data = addressId ? json.data.customerAddressUpdate : json.data.customerAddressCreate;

    if (json.errors || data.customerUserErrors.length > 0) {
      const message = json.errors?.[0]?.message || data.customerUserErrors[0]?.message;
      return res.status(400).json({ success: false, error: message });
    }

    setCustomerCookie(res, token);
    return res.status(200).json({ success: true, address: data.customerAddress });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ success: false, error: message });
  }
} 