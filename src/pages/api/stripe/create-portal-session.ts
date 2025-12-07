// src/pages/api/stripe/create-portal-session.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { COOKIE_NAME } from '@/lib/cookies';
import { verifyCustomerSession } from '@/lib/verifyCustomerSession';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const appUrl = process.env.APP_URL || 'http://localhost:3000';

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY in environment variables');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover' as Stripe.StripeConfig['apiVersion'],
});


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionCookie = req.cookies[COOKIE_NAME];
    if (!sessionCookie) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get Shopify customer (same as checkout-session)
    const customer = await verifyCustomerSession(sessionCookie);
    if (!customer || !customer.email) {
      return res.status(401).json({ error: 'Invalid Shopify session' });
    }

    // Find Stripe customer by email
    const existing = await stripe.customers.list({
      email: customer.email,
      limit: 1,
    });

    if (existing.data.length === 0) {
      return res
        .status(400)
        .json({ error: 'No Stripe customer found for this user' });
    }

    const stripeCustomer = existing.data[0];

    // Create a Billing Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomer.id,
      return_url: `${appUrl}/vip-membership`,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating Stripe Portal Session:', error);
    return res.status(500).json({ error: message });
  }
}
