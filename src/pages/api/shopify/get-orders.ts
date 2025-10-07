import type { NextApiRequest, NextApiResponse } from 'next';
import { COOKIE_NAME, setCustomerCookie } from '@/lib/cookies';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`;

/** ---- Minimal types for the bits of Shopify response we use ---- */
type CurrencyCode = string;

interface MoneyV2 {
  amount: string;
  currencyCode: CurrencyCode;
}

interface LineItemNode {
  title: string;
  quantity: number;
  originalTotalPrice: MoneyV2;
}

interface Edge<T> {
  node: T;
}

interface OrderNode {
  id: string;
  name: string;
  orderNumber: number;
  processedAt: string;
  totalPriceV2: MoneyV2;
  lineItems: {
    edges: Array<Edge<LineItemNode>>;
  };
  fulfillmentStatus: string | null;
  financialStatus: string | null;
}

interface OrdersConnection {
  edges: Array<Edge<OrderNode>>;
}

interface Customer {
  orders: OrdersConnection;
}

interface StorefrontData {
  customer: Customer | null;
}

interface StorefrontResponse {
  data: StorefrontData;
  errors?: Array<unknown>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ success: false, error: 'Method not allowed' });
  }

  const token = req.cookies[COOKIE_NAME];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, error: 'Not authenticated' });
  }

  const query = `
    query getOrders($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        orders(first: 10, sortKey: PROCESSED_AT, reverse: true) {
          edges {
            node {
              id
              name
              orderNumber
              processedAt
              totalPriceV2 {
                amount
                currencyCode
              }
              lineItems(first: 10) {
                edges {
                  node {
                    title
                    quantity
                    originalTotalPrice {
                      amount
                      currencyCode
                    }
                  }
                }
              }
              fulfillmentStatus
              financialStatus
            }
          }
        }
      }
    }
  `;

  const variables = { customerAccessToken: token };

  try {
    const response = await fetch(STOREFRONT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = (await response.json()) as StorefrontResponse;

    if (json.errors || !json.data?.customer) {
      return res
        .status(401)
        .json({ success: false, error: 'Invalid token or no orders found' });
    }

    const orders = json.data.customer.orders.edges.map(
      (edge: Edge<OrderNode>) => edge.node
    );

    // Refresh cookie to extend session
    setCustomerCookie(res, token);

    return res.status(200).json({ success: true, orders });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ success: false, error: message });
  }
}
