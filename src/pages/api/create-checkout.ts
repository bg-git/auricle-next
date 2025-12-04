import type { NextApiRequest, NextApiResponse } from 'next';
import { COOKIE_NAME } from '@/lib/cookies';
import { getCustomerCountryCode } from '@/lib/market';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const VIP_DISCOUNT_CODE = process.env.VIP_DISCOUNT_CODE;

const applyVipDiscountParam = (url: string | undefined, isVipMember: boolean) => {
  if (!url || !VIP_DISCOUNT_CODE || !isVipMember) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('discount', VIP_DISCOUNT_CODE);
    return parsed.toString();
  } catch (error) {
    console.warn('Unable to append VIP discount param to checkout URL', error);
    return url;
  }
};

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

  // Get customer's country code and membership if authenticated
  let countryCode = 'GB'; // Default to UK
  let isVipMember = false;
  if (customerAccessToken) {
    try {
      const customerQuery = `
        query customer($customerAccessToken: String!) {
          customer(customerAccessToken: $customerAccessToken) {
            tags
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
          'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN!,
        },
        body: JSON.stringify({
          query: customerQuery,
          variables: { customerAccessToken },
        }),
      });

      const customerData = await customerRes.json();
      const customer = customerData?.data?.customer;

      if (customer?.defaultAddress?.country) {
        countryCode = getCustomerCountryCode(customer);
      }

      if (Array.isArray(customer?.tags)) {
        isVipMember = customer.tags.includes('VIP-MEMBER');
      }
    } catch (error) {
      console.error('Failed to fetch customer country:', error);
      // Continue with default country code
    }
  }

  const variables: {
    lines: { merchandiseId: string; quantity: number }[];
    buyerIdentity: {
      countryCode: string;
      customerAccessToken?: string;
    };
  } = {
    lines,
    buyerIdentity: {
      countryCode,
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

  let checkoutUrl = applyVipDiscountParam(cart.checkoutUrl as string, isVipMember);
  const checkoutId = cart.id as string;

  // Apply VIP discount code if configured and the customer is tagged
  if (isVipMember && VIP_DISCOUNT_CODE) {
    try {
      const discountMutation = `
        mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
          cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
            cart { id checkoutUrl }
            userErrors { field message }
          }
        }
      `;

      const discountRes = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN!,
        },
        body: JSON.stringify({
          query: discountMutation,
          variables: { cartId: checkoutId, discountCodes: [VIP_DISCOUNT_CODE] },
        }),
      });

      const discountJson = await discountRes.json();
      const updatedCheckoutUrl = applyVipDiscountParam(
        discountJson?.data?.cartDiscountCodesUpdate?.cart?.checkoutUrl,
        isVipMember
      );
      if (updatedCheckoutUrl) {
        checkoutUrl = updatedCheckoutUrl;
      }
      const userErrors = discountJson?.data?.cartDiscountCodesUpdate?.userErrors;
      if (userErrors?.length) {
        console.error('Failed to apply VIP discount code:', userErrors);
      }
    } catch (error) {
      console.error('Error applying VIP discount code:', error);
    }
  }

  return res.status(200).json({ checkoutUrl, checkoutId });
}
