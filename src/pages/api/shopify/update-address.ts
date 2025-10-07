import type { NextApiRequest, NextApiResponse } from 'next';
import { COOKIE_NAME, setCustomerCookie } from '@/lib/cookies';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`;

/** ---- Minimal types for request/response ---- */
type MailingAddressInput = {
  firstName?: string;
  lastName?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
  phone?: string;
};

type CustomerUserError = {
  field?: string[] | null;
  message: string;
};

type CustomerAddress = MailingAddressInput & { id: string };

type AddressUpdateData = {
  customerAddressUpdate: {
    customerAddress: CustomerAddress | null;
    customerUserErrors: CustomerUserError[];
  };
};

type AddressCreateData = {
  customerAddressCreate: {
    customerAddress: CustomerAddress | null;
    customerUserErrors: CustomerUserError[];
  };
};

type GraphQLError = { message: string };

type GraphQLResponse<T> = {
  data: T;
  errors?: GraphQLError[];
};

type RequestBody = {
  address?: MailingAddressInput;
  addressId?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { address, addressId } = (req.body ?? {}) as RequestBody;
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

  const variables = addressId
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

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ success: false, error: `Storefront error: ${text}` });
    }

    // Narrow response type based on branch we called
    const json = (await response.json()) as GraphQLResponse<
      AddressUpdateData | AddressCreateData
    >;

    const payload = addressId
      ? (json.data as AddressUpdateData).customerAddressUpdate
      : (json.data as AddressCreateData).customerAddressCreate;

    if (json.errors?.length || payload.customerUserErrors.length > 0) {
      const message =
        json.errors?.[0]?.message || payload.customerUserErrors[0]?.message || 'Unknown error';
      return res.status(400).json({ success: false, error: message });
    }

    setCustomerCookie(res, token);
    return res.status(200).json({ success: true, address: payload.customerAddress });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ success: false, error: message });
  }
}
