import type { NextApiRequest, NextApiResponse } from 'next';
import { COOKIE_NAME, setCustomerCookie } from '@/lib/cookies';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/2025-07/graphql.json`;
const ADMIN_API_KEY = process.env.SHOPIFY_ADMIN_API_KEY!;
const ADMIN_GRAPHQL_URL = `https://${SHOPIFY_DOMAIN}/admin/api/2025-07/graphql.json`;

interface StorefrontCustomer {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { firstName, lastName, phone, password, website, social } = req.body;
  const token = req.cookies[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  const mutation = `
    mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
      customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
        customer {
          id
          firstName
          lastName
          email
          phone
        }
        customerUserErrors {
          field
          message
        }
      }
    }
  `;

  interface CustomerUpdateInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  password?: string;
}

const variables: {
  customerAccessToken: string;
  customer: CustomerUpdateInput;
} = {
  customerAccessToken: token,
  customer: {},
};

  if (firstName !== undefined) variables.customer.firstName = firstName;
  if (lastName !== undefined) variables.customer.lastName = lastName;
  if (phone !== undefined) variables.customer.phone = phone;
  if (password !== undefined) variables.customer.password = password;

  try {
    let storefrontCustomer: StorefrontCustomer | null = null;

    if (Object.keys(variables.customer).length > 0) {
      const response = await fetch(STOREFRONT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
        },
        body: JSON.stringify({ query: mutation, variables }),
      });

      const json = await response.json();

      if (
        json.errors ||
        json.data.customerUpdate.customerUserErrors.length > 0
      ) {
        const message =
          json.errors?.[0]?.message || json.data.customerUpdate.customerUserErrors[0]?.message;
        return res.status(400).json({ success: false, error: message });
      }
      storefrontCustomer = json.data.customerUpdate.customer;
    }

    if (website !== undefined || social !== undefined) {
      let email = storefrontCustomer?.email;
      if (!email) {
        const getCustomerQuery = `
          query customer($customerAccessToken: String!) {
            customer(customerAccessToken: $customerAccessToken) {
              email
            }
          }
        `;
        const getCustomerRes = await fetch(STOREFRONT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
          },
          body: JSON.stringify({ query: getCustomerQuery, variables: { customerAccessToken: token } }),
        });
        const getCustomerJson = await getCustomerRes.json();
        email = getCustomerJson.data?.customer?.email;
      }
      if (email) {
        const adminRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2025-07/customers/search.json?query=email:${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': ADMIN_API_KEY,
          },
        });
        const adminJson = await adminRes.json();
        if (adminJson.customers && adminJson.customers.length > 0) {
          const customerId = adminJson.customers[0].id;
          
          // Use Admin GraphQL API to update customer metafields
          const updateCustomerMutation = `
            mutation updateCustomerMetafields($input: CustomerInput!) {
              customerUpdate(input: $input) {
                customer {
                  id
                  metafields(first: 3) {
                    edges {
                      node {
                        id
                        namespace
                        key
                        value
                      }
                    }
                  }
                }
                userErrors {
                  message
                  field
                }
              }
            }
          `;

          const metafields: Array<{
            namespace: string;
            key: string;
            type: string;
            value: string;
          }> = [];
          
          if (website !== undefined) {
            metafields.push({
              namespace: 'custom',
              key: 'website',
              type: 'single_line_text_field',
              value: website
            });
          }
          
          if (social !== undefined) {
            metafields.push({
              namespace: 'custom',
              key: 'social',
              type: 'single_line_text_field',
              value: social
            });
          }

          // Since website and social are now mandatory, we no longer delete them when empty
          // Instead, we'll just update them with the provided values

          // Only update metafields if there are non-empty values to set
          if (metafields.length > 0) {
            const variables = {
              input: {
                id: `gid://shopify/Customer/${customerId}`,
                metafields
              }
            };

            const metafieldResponse = await fetch(ADMIN_GRAPHQL_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': ADMIN_API_KEY,
              },
              body: JSON.stringify({ 
                query: updateCustomerMutation, 
                variables 
              }),
            });

            const metafieldResult = await metafieldResponse.json();
            
            if (metafieldResult.errors) {
              const errorMessage = metafieldResult.errors[0]?.message || 'GraphQL request failed';
              return res.status(400).json({ success: false, error: errorMessage, errors: metafieldResult.errors });
            }
            
            if (!metafieldResult.data || !metafieldResult.data.customerUpdate) {
              return res.status(400).json({ success: false, error: 'Invalid response from Shopify API' });
            }
            
            if (metafieldResult.data.customerUpdate.userErrors && metafieldResult.data.customerUpdate.userErrors.length > 0) {
              const errorMessage = metafieldResult.data.customerUpdate.userErrors[0]?.message || 'Failed to save information';
              return res.status(400).json({ success: false, error: errorMessage });
            }
          }
        }
      }
    }

    setCustomerCookie(res, token);
    return res.status(200).json({ success: true, customer: storefrontCustomer });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ success: false, error: message });
  }
}
