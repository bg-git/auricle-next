import type { NextApiRequest, NextApiResponse } from 'next';
import { COOKIE_NAME } from '@/lib/cookies';
import { getCustomerCountryCode } from '@/lib/market';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const VIP_DISCOUNT_CODE = process.env.VIP_DISCOUNT_CODE;
const SHOPIFY_API_URL = `https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`;

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

async function shopifyFetch(query: string, variables: Record<string, unknown>) {
  const res = await fetch(SHOPIFY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

const CART_FRAGMENT = `fragment CartFields on Cart {\n  id\n  checkoutUrl\n  lines(first: 250) {\n    edges {\n      node {\n        id\n        quantity\n        merchandise { ... on ProductVariant { id } }\n      }\n    }\n  }\n}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { checkoutId, items } = req.body as { checkoutId: string; items: { variantId: string; quantity: number }[] };
  if (!checkoutId) {
    return res.status(400).json({ message: 'Missing checkoutId' });
  }

  const customerAccessToken = req.cookies?.[COOKIE_NAME];
  let isVipMember = false;

  const GET_CART = `${CART_FRAGMENT}\nquery getCart($id: ID!) { cart(id: $id) { ...CartFields } }`;

  let json = await shopifyFetch(GET_CART, { id: checkoutId });
  let cart = json.data?.cart;
  if (!cart) {
    return res.status(404).json({ message: 'Cart not found', debug: json });
  }

  // Cart status field doesn't exist in current Shopify API
  // if (cart.status && cart.status !== 'ACTIVE') {
  //   return res.status(200).json({ completed: true });
  // }

  const existing: { [variantId: string]: { lineId: string; qty: number } } = {};
  for (const edge of cart.lines.edges as any[]) {
    existing[edge.node.merchandise.id] = { lineId: edge.node.id, qty: edge.node.quantity };
  }

  const desired = new Map<string, number>();
  for (const item of items as any[]) {
    if (item.quantity > 0) desired.set(item.variantId, item.quantity);
  }

  const toRemove: string[] = [];
  const toUpdate: { id: string; quantity: number }[] = [];

  for (const variantId in existing) {
    const line = existing[variantId];
    const qty = desired.get(variantId);
    if (qty == null) {
      toRemove.push(line.lineId);
    } else {
      if (qty !== line.qty) {
        toUpdate.push({ id: line.lineId, quantity: qty });
      }
      desired.delete(variantId);
    }
  }

  const toAdd = Array.from(desired.entries()).map(([variantId, quantity]) => ({ merchandiseId: variantId, quantity }));

  if (toRemove.length) {
    const MUTATION = `mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { id } userErrors { field message } } }`;
    await shopifyFetch(MUTATION, { cartId: checkoutId, lineIds: toRemove });
  }
  if (toUpdate.length) {
    const MUTATION = `mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { id } userErrors { field message } } }`;
    await shopifyFetch(MUTATION, { cartId: checkoutId, lines: toUpdate });
  }
  if (toAdd.length) {
    const MUTATION = `mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { id } userErrors { field message } } }`;
    await shopifyFetch(MUTATION, { cartId: checkoutId, lines: toAdd });
  }

  // Get customer's country code if authenticated
  let countryCode = 'GB'; // Default to UK
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

      const customerData = await shopifyFetch(customerQuery, { customerAccessToken });
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

  const IDENTITY_MUTATION = `mutation cartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) { cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) { cart { id } userErrors { field message } } }`;
  const buyerIdentity = {
    countryCode,
    ...(customerAccessToken ? { customerAccessToken } : {}),
  };
  const identityRes = await shopifyFetch(IDENTITY_MUTATION, {
    cartId: checkoutId,
    buyerIdentity,
  });
  const identityErrors = identityRes.data?.cartBuyerIdentityUpdate?.userErrors;
  if (identityErrors?.length) {
    console.error('Shopify cartBuyerIdentityUpdate user errors:', identityErrors);
  }

  json = await shopifyFetch(GET_CART, { id: checkoutId });
  cart = json.data?.cart;

  if (!cart) {
    return res.status(404).json({ message: 'Cart not found after update', debug: json });
  }

  // Apply VIP discount code if configured and the customer is tagged
  if (isVipMember && VIP_DISCOUNT_CODE) {
    const discountMutation = `${CART_FRAGMENT}
      mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
        cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
          cart { ...CartFields }
          userErrors { field message }
        }
      }
    `;

    const discountRes = await shopifyFetch(discountMutation, {
      cartId: checkoutId,
      discountCodes: [VIP_DISCOUNT_CODE],
    });

    const discountErrors = discountRes?.data?.cartDiscountCodesUpdate?.userErrors;
    if (discountErrors?.length) {
      console.error('Failed to apply VIP discount code on update:', discountErrors);
    }

    const discountedCart = discountRes?.data?.cartDiscountCodesUpdate?.cart;
    if (discountedCart) {
      cart = discountedCart;
    }
  }

  // Ensure checkout URL carries the VIP discount code for the redirect,
  // even if Shopify doesn't return a discounted URL in the mutation response.
  const checkoutWithDiscount = applyVipDiscountParam(
    cart.checkoutUrl as string,
    isVipMember
  );
  if (checkoutWithDiscount) {
    cart = { ...cart, checkoutUrl: checkoutWithDiscount };
  }

  return res.status(200).json({ cart });
}
