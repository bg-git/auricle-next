// src/pages/api/stripe/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
const shopifyAdminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY in environment variables');
}

if (!shopifyDomain || !shopifyAdminToken) {
  throw new Error(
    'Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN in environment variables',
  );
}

const stripe = new Stripe(stripeSecretKey);

const VIP_TAG = 'VIP-MEMBER';

// Read raw body for Stripe webhook signature check
async function buffer(readable: NextApiRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// --- Shopify tag helpers ---

async function addVipTagToShopifyCustomer(shopifyCustomerId: string) {
  const url = `https://${shopifyDomain}/admin/api/2024-01/graphql.json`;

  const mutation = `
    mutation tagsAdd($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        userErrors {
          field
          message
        }
      }
    }
  `;

  const body = JSON.stringify({
    query: mutation,
    variables: {
      id: shopifyCustomerId,
      tags: [VIP_TAG],
    },
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': shopifyAdminToken as string,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!res.ok) {
    console.error(
      'Failed to add VIP tag in Shopify',
      res.status,
      await res.text(),
    );
  }
}

async function removeVipTagFromShopifyCustomer(shopifyCustomerId: string) {
  const url = `https://${shopifyDomain}/admin/api/2024-01/graphql.json`;

  const mutation = `
    mutation tagsRemove($id: ID!, $tags: [String!]!) {
      tagsRemove(id: $id, tags: $tags) {
        userErrors {
          field
          message
        }
      }
    }
  `;

  const body = JSON.stringify({
    query: mutation,
    variables: {
      id: shopifyCustomerId,
      tags: [VIP_TAG],
    },
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': shopifyAdminToken as string,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!res.ok) {
    console.error(
      'Failed to remove VIP tag in Shopify',
      res.status,
      await res.text(),
    );
  }
}

// Decide what to do based on subscription status
async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  let shopifyCustomerId = subscription.metadata?.shopify_customer_id;

  // If not on subscription metadata, check Stripe customer metadata
  if (!shopifyCustomerId && typeof subscription.customer === 'string') {
    const stripeCustomer = await stripe.customers.retrieve(
      subscription.customer,
    );
    if (!stripeCustomer.deleted) {
      shopifyCustomerId = stripeCustomer.metadata?.shopify_customer_id;
    }
  }

  if (!shopifyCustomerId) {
    console.warn(
      'No shopify_customer_id found in subscription/customer metadata',
    );
    return;
  }

  const status = subscription.status;

  if (status === 'active' || status === 'trialing') {
    await addVipTagToShopifyCustomer(shopifyCustomerId);
  } else if (
    status === 'canceled' ||
    status === 'unpaid' ||
    status === 'past_due'
  ) {
    await removeVipTagFromShopifyCustomer(shopifyCustomerId);
  }
}

// Tell Next.js not to parse body (Stripe needs raw body)
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).send('Missing Stripe signature');
  }

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).send('Webhook secret not configured');
  }

  let event: Stripe.Event;

  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown signature error';
    console.error(`Webhook signature verification failed: ${message}`);
    return res.status(400).send(`Webhook Error: ${message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionEvent(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Treat deleted as canceled for our purposes
        subscription.status = 'canceled';
        await handleSubscriptionEvent(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        // Extend type so TS knows about `subscription`
        type InvoiceWithSubscription = Stripe.Invoice & {
          subscription?: string | null;
        };

        const invoice = event.data.object as InvoiceWithSubscription;

        if (invoice.subscription) {
          const subscription = (await stripe.subscriptions.retrieve(
            invoice.subscription,
          )) as Stripe.Subscription;

          // Treat as unpaid so handler removes tag
          subscription.status = 'unpaid';
          await handleSubscriptionEvent(subscription);
        }
        break;
      }

      default:
        // Ignore other events
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown handler error';
    console.error(`Error handling Stripe webhook: ${message}`);
    return res.status(500).send('Webhook handler error');
  }
}
