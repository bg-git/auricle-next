// src/pages/api/stripe/create-checkout-session.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { COOKIE_NAME } from '@/lib/cookies';
import { verifyCustomerSession } from '@/lib/verifyCustomerSession';

interface ShopifyCustomer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  tags?: string[];
  [key: string]: unknown;
}

// --- Stripe init ---
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const priceIdVip = process.env.STRIPE_PRICE_ID_VIP;
const appUrl = process.env.APP_URL || 'http://localhost:3000';

if (!stripeSecretKey || !priceIdVip) {
  throw new Error(
    'Missing STRIPE_SECRET_KEY or STRIPE_PRICE_ID_VIP in environment variables',
  );
}

// Let Stripe pick the API version configured on your account
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover' as Stripe.StripeConfig['apiVersion'],
});


// --- Helper: get Shopify customer from session cookie ---
async function getShopifyCustomerFromRequest(
  req: NextApiRequest,
): Promise<ShopifyCustomer | null> {
  const sessionCookie = req.cookies[COOKIE_NAME];
  if (!sessionCookie) return null;

  // Reuse the same logic as middleware
  const customer = await verifyCustomerSession(sessionCookie);
  if (!customer || !customer.email) {
    return null;
  }

  return {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    tags: customer.tags,
  };
}

// --- API handler ---
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1) Get logged-in Shopify customer
    const shopifyCustomer = await getShopifyCustomerFromRequest(req);

    if (!shopifyCustomer) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id: shopifyCustomerId, email } = shopifyCustomer;

    if (!email) {
      return res
        .status(400)
        .json({ error: 'Customer email is required' });
    }

    // 2) Find or create matching Stripe customer
    let stripeCustomer: Stripe.Customer | null = null;

    // Try to find an existing customer by email
    const existing = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existing.data.length > 0) {
      stripeCustomer = existing.data[0];

      // Ensure shopify_customer_id is set in metadata
      if (stripeCustomer.metadata?.shopify_customer_id !== shopifyCustomerId) {
        stripeCustomer = await stripe.customers.update(stripeCustomer.id, {
          metadata: {
            ...stripeCustomer.metadata,
            shopify_customer_id: shopifyCustomerId,
          },
        });
      }
    } else {
      // No Stripe customer yet – create one
      stripeCustomer = await stripe.customers.create({
        email,
        name: [shopifyCustomer.firstName, shopifyCustomer.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || undefined,
        metadata: {
          shopify_customer_id: shopifyCustomerId,
        },
      });
    }

    // 3) Create Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomer.id,
      line_items: [
        {
          price: priceIdVip,
          quantity: 1,
        },
      ],
      client_reference_id: shopifyCustomerId,
      metadata: {
        shopify_customer_id: shopifyCustomerId,
      },
      subscription_data: {
        metadata: {
          shopify_customer_id: shopifyCustomerId,
        },
      },
      success_url: `${appUrl}/vip-membership?subscription=success`,
      cancel_url: `${appUrl}/vip-membership?subscription=cancelled`,
    });

    if (!session.url) {
      return res
        .status(500)
        .json({ error: 'Stripe did not return a checkout URL.' });
    }

    return res.status(200).json({ url: session.url });
  } catch (error: unknown) {
    console.error('Error creating Stripe Checkout Session:', error);

    const message =
      error instanceof Error ? error.message : 'Unknown error';

    return res.status(500).json({
      error: 'Failed to create checkout session',
      details: message,
    });
  }
}
