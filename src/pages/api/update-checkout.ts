import type { NextApiRequest, NextApiResponse } from 'next';
import { COOKIE_NAME } from '@/lib/cookies';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const URL = `https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`;

async function shopifyFetch(query: string, variables: Record<string, unknown>) {
  const res = await fetch(URL, {
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

  const IDENTITY_MUTATION = `mutation cartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) { cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) { cart { id } userErrors { field message } } }`;
  const buyerIdentity = {
    countryCode: 'GB',
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

  return res.status(200).json({ cart });
}
