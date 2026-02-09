import type { NextApiRequest, NextApiResponse } from 'next';
import { auricleAdmin } from '@/lib/shopifyAdmin';

type VipStats = {
  totalSavings: number;
  averageSavings: number;
  orderCount: number;
  currency: string;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VipStats | ErrorResponse>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Cache response for 60 seconds
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

  const shopifyDomain = auricleAdmin.domain;
  const shopifyAdminToken = auricleAdmin.token;
  const apiVersion = '2024-07';

  if (!shopifyDomain || !shopifyAdminToken) {
    console.error('Missing Shopify Admin credentials');
    return res.status(500).json({ error: 'Missing Shopify credentials' });
  }

  const graphqlEndpoint = `https://${shopifyDomain}/admin/api/${apiVersion}/graphql.json`;

  try {
    // Fetch recent orders to calculate VIP savings
    const ordersQuery = `
      query RecentOrders($first: Int!) {
        orders(first: $first, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              createdAt
              email
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              subtotalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              lineItems(first: 250) {
                edges {
                  node {
                    id
                    title
                    quantity
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    customAttributes {
                      key
                      value
                    }
                  }
                }
              }
              customer {
                id
                email
                tags
              }
            }
          }
        }
      }
    `;

    const ordersRes = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shopifyAdminToken,
      },
      body: JSON.stringify({
        query: ordersQuery,
        variables: { first: 100 },
      }),
    });

    if (!ordersRes.ok) {
      const text = await ordersRes.text();
      console.error('Shopify API HTTP error:', {
        status: ordersRes.status,
        statusText: ordersRes.statusText,
        body: text.substring(0, 500),
      });
      return res.status(500).json({ error: `Shopify API error: ${ordersRes.status}` });
    }

    const ordersData = (await ordersRes.json()) as {
      data?: {
        orders?: {
          edges: Array<{
            node: {
              id: string;
              createdAt: string;
              email: string;
              totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
              subtotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
              lineItems: {
                edges: Array<{
                  node: {
                    id: string;
                    title: string;
                    quantity: number;
                    originalUnitPriceSet: { shopMoney: { amount: string; currencyCode: string } };
                    customAttributes: Array<{ key: string; value: string }>;
                  };
                }>;
              };
              customer: { id: string; email: string; tags: string[] } | null;
            };
          }>;
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (ordersData.errors) {
      console.error('GraphQL errors:', ordersData.errors);
      return res.status(500).json({
        error: `GraphQL error: ${ordersData.errors.map((e) => e.message).join(', ')}`,
      });
    }

    const orders = ordersData.data?.orders?.edges ?? [];
    let totalSavings = 0;
    let vipOrderCount = 0;
    let currency = 'GBP';

    // For now, calculate savings assuming 15% discount on orders
    // (This is a placeholder - in reality you'd need to track member prices paid)
    // Skip VIP subscription orders (£11.99 + VAT ≈ £14-15) from stats
    orders.forEach((orderEdge) => {
      const order = orderEdge.node;
      const customer = order.customer;
      const total = parseFloat(order.totalPriceSet.shopMoney.amount);

      // Skip subscription-only orders (filter out ~£14.39 with VAT)
      if (total < 20) {
        return; // Skip this order
      }

      // Check if this looks like a VIP order
      const isVipCustomer = customer?.tags?.includes('VIP-MEMBER') || 
                            customer?.email?.includes('vip');

      if (isVipCustomer || order.email?.includes('vip')) {
        // Assume 15% VIP discount including VAT (adjust based on your actual discount rate)
        const estimatedSavings = total * 0.15;

        totalSavings += estimatedSavings;
        vipOrderCount += 1;
        currency = order.totalPriceSet.shopMoney.currencyCode;
      }
    });

    const averageSavings = vipOrderCount > 0 ? totalSavings / vipOrderCount : 0;

    return res.status(200).json({
      totalSavings: Math.round(totalSavings * 100) / 100,
      averageSavings: Math.round(averageSavings * 100) / 100,
      orderCount: vipOrderCount,
      currency,
    });
  } catch (error) {
    console.error('Error calculating VIP stats:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
