import type { NextApiRequest, NextApiResponse } from 'next';
import { COOKIE_NAME } from '@/lib/cookies';
import { getCustomerCountryCode } from '@/lib/market';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { handle } = req.body;

  if (!handle) {
    return res.status(400).json({ message: 'Missing product handle' });
  }

  const customerAccessToken = req.cookies?.[COOKIE_NAME];

  // Get customer's country code if authenticated
  let countryCode = 'GB'; // Default to UK
  if (customerAccessToken) {
    try {
      const customerQuery = `
        query customer($customerAccessToken: String!) {
          customer(customerAccessToken: $customerAccessToken) {
            defaultAddress {
              country
            }
          }
        }
      `;

      const customerRes = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
        },
        body: JSON.stringify({
          query: customerQuery,
          variables: { customerAccessToken },
        }),
      });

      const customerData = await customerRes.json();
      const customer = customerData?.data?.customer;

      console.log('Customer address:', customer?.defaultAddress);

      if (customer?.defaultAddress?.country) {
        countryCode = getCustomerCountryCode(customer);
        console.log('Detected country code:', countryCode);
      }
    } catch (error) {
      console.error('Failed to fetch customer country:', error);
      // Continue with default country code
    }
  }

  // Fetch product with buyer context
  const query = `
    query ProductByHandle($handle: String!, $country: CountryCode!) @inContext(country: $country) {
      productByHandle(handle: $handle) {
        id
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        variants(first: 250) {
          edges {
            node {
              id
              price {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
      },
      body: JSON.stringify({
        query,
        variables: { handle, country: countryCode },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('Shopify API errors:', data.errors);
      return res.status(500).json({ message: 'Failed to fetch product prices', errors: data.errors });
    }

    const product = data.data?.productByHandle;

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log('Returning prices with country:', countryCode, 'Currency:', product.priceRange?.minVariantPrice?.currencyCode);

    return res.status(200).json({
      priceRange: product.priceRange,
      variants: product.variants.edges.map((edge: any) => ({
        id: edge.node.id,
        price: edge.node.price,
      })),
      countryCode,
    });
  } catch (error) {
    console.error('Failed to fetch product prices:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
