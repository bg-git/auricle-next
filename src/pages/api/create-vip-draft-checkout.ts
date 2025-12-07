import type { NextApiRequest, NextApiResponse } from 'next';
import { COOKIE_NAME } from '@/lib/cookies';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const ADMIN_API_KEY = process.env.SHOPIFY_ADMIN_API_KEY!;

const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`;
const ADMIN_DRAFT_URL = `https://${SHOPIFY_DOMAIN}/admin/api/2024-07/draft_orders.json`;

interface CartItemInput {
  variantId: string;
  quantity: number;
  price?: string;
  basePrice?: string;
  memberPrice?: string;
}

const parsePrice = (value?: string) => {
  const parsed = parseFloat(value || '0');
  return Number.isFinite(parsed) ? parsed : 0;
};

const toVariantNumericId = (gid: string) => {
  const parts = gid.split('/');
  const last = parts.pop();
  const numericId = last ? Number(last) : NaN;
  return Number.isFinite(numericId) ? numericId : null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const items = (req.body?.items || []) as CartItemInput[];
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'No items provided' });
  }

  const customerAccessToken = req.cookies?.[COOKIE_NAME];
  if (!customerAccessToken) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const customerQuery = `
    query customer($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        id
        email
        tags
      }
    }
  `;

  const customerRes = await fetch(STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
    },
    body: JSON.stringify({
      query: customerQuery,
      variables: { customerAccessToken },
    }),
  });

  const customerJson = await customerRes.json();
  const customer = customerJson?.data?.customer;

  if (!customer) {
    return res.status(401).json({ message: 'Unable to load customer' });
  }

  const isVipMember = Array.isArray(customer.tags)
    ? customer.tags.includes('VIP-MEMBER')
    : false;

  if (!isVipMember) {
    return res.status(403).json({ message: 'Customer is not a VIP member' });
  }

  const adminCustomerId = (() => {
    const rawId: string | undefined = customer.id;
    if (!rawId) return null;
    const numeric = Number(rawId.split('/').pop());
    return Number.isFinite(numeric) ? numeric : null;
  })();

  const basePriceLookup = new Map<string, number>();

  const missingBaseIds = items
    .filter((item) => !item.basePrice)
    .map((item) => item.variantId);

  if (missingBaseIds.length) {
    const priceQuery = `
      query variantPrices($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on ProductVariant {
            id
            price {
              amount
            }
          }
        }
      }
    `;

    try {
      const priceRes = await fetch(STOREFRONT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
        },
        body: JSON.stringify({
          query: priceQuery,
          variables: { ids: missingBaseIds },
        }),
      });

      const priceJson = await priceRes.json();
      const nodes = priceJson?.data?.nodes as Array<{
        id?: string;
        price?: { amount?: string };
      }>;

      nodes?.forEach((node) => {
        if (node?.id && node?.price?.amount) {
          basePriceLookup.set(node.id, parsePrice(node.price.amount));
        }
      });
    } catch (error) {
      console.warn('Unable to load variant prices for draft order', error);
    }
  }

  const lineItems = items
    .map((item) => {
      const variantId = toVariantNumericId(item.variantId);
      if (!variantId || item.quantity <= 0) return null;

      const basePrice = parsePrice(
        item.basePrice ?? basePriceLookup.get(item.variantId)?.toString() ?? item.price
      );
      const targetPrice = parsePrice(item.memberPrice ?? item.price);
      const discountPercent =
        basePrice > 0
          ? Math.max(
              0,
              Math.min(100, ((basePrice - targetPrice) / basePrice) * 100)
            )
          : 0;

      const line: Record<string, unknown> = {
        variant_id: variantId,
        quantity: item.quantity,
      };

      if (discountPercent > 0) {
        line.applied_discount = {
          title: 'VIP Member Discount',
          description: 'VIP member pricing',
          value_type: 'percentage',
          value: discountPercent.toFixed(2),
        };
      }

      return line;
    })
    .filter(Boolean) as Record<string, unknown>[];

  if (!lineItems.length) {
    return res.status(400).json({ message: 'No valid line items for draft order' });
  }

  const draftPayload: Record<string, unknown> = {
    draft_order: {
      line_items: lineItems,
      tags: 'vip-checkout',
    },
  };

  if (adminCustomerId) {
    (draftPayload.draft_order as Record<string, unknown>).customer = {
      id: adminCustomerId,
    };
    (draftPayload.draft_order as Record<string, unknown>).use_customer_default_address =
      true;
  }

  const draftRes = await fetch(ADMIN_DRAFT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_API_KEY,
    },
    body: JSON.stringify(draftPayload),
  });

  const draftJson = await draftRes.json();
  const invoiceUrl = draftJson?.draft_order?.invoice_url as string | undefined;

  if (!draftRes.ok || !invoiceUrl) {
    return res.status(500).json({
      message: 'Failed to create draft order checkout',
      debug: draftJson,
    });
  }

  return res.status(200).json({
    invoiceUrl,
    draftCheckoutUrl: invoiceUrl,
    status: 'ready',
  });
}
