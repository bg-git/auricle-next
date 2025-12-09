// src/pages/api/stripe/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { Resend } from 'resend';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;

// Support both names just in case
const shopifyAdminToken =
  process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN ??
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

if (!shopifyDomain || !shopifyAdminToken) {
  throw new Error(
    'Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_API_ACCESS_TOKEN in environment variables',
  );
}


const resendApiKey = process.env.RESEND_API_KEY;
const alertEmailTo = process.env.ALERT_EMAIL_TO;
const alertEmailFrom = process.env.ALERT_EMAIL_FROM;

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY in environment variables');
}

if (!shopifyDomain || !shopifyAdminToken) {
  throw new Error(
    'Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN in environment variables',
  );
}

if (!resendApiKey) {
  throw new Error('Missing RESEND_API_KEY in environment variables');
}

if (!alertEmailTo || !alertEmailFrom) {
  throw new Error('Missing ALERT_EMAIL_TO or ALERT_EMAIL_FROM in environment variables');
}

// ✅ Pin Stripe API version
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover' as Stripe.StripeConfig['apiVersion'],
});

const resend = new Resend(resendApiKey);

const VIP_TAG = 'VIP-MEMBER';

// Read raw body for Stripe webhook signature check
async function buffer(readable: NextApiRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// --- Shopify helpers ---

const SHOPIFY_GRAPHQL_URL = `https://${shopifyDomain}/admin/api/2024-01/graphql.json`;

async function shopifyGraphql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(SHOPIFY_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': shopifyAdminToken as string,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Shopify GraphQL error', res.status, text);
    throw new Error(`Shopify GraphQL error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

async function addVipTagToShopifyCustomer(shopifyCustomerId: string) {
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

  const data = await shopifyGraphql<{
    data?: { tagsAdd?: { userErrors: { field: string[]; message: string }[] } };
  }>(mutation, {
    id: shopifyCustomerId,
    tags: [VIP_TAG],
  });

  const userErrors = data?.data?.tagsAdd?.userErrors ?? [];
  if (userErrors.length) {
    console.error('Failed to add VIP tag in Shopify', userErrors);
  }
}

async function removeVipTagFromShopifyCustomer(shopifyCustomerId: string) {
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

  const data = await shopifyGraphql<{
    data?: { tagsRemove?: { userErrors: { field: string[]; message: string }[] } };
  }>(mutation, {
    id: shopifyCustomerId,
    tags: [VIP_TAG],
  });

  const userErrors = data?.data?.tagsRemove?.userErrors ?? [];
  if (userErrors.length) {
    console.error('Failed to remove VIP tag in Shopify', userErrors);
  }
}

// 🔍 Find Shopify customer ID from subscription
async function getShopifyCustomerIdFromSubscription(
  subscription: Stripe.Subscription,
): Promise<string | null> {
  // 1) Try subscription metadata
  if (subscription.metadata?.shopify_customer_id) {
    return subscription.metadata.shopify_customer_id;
  }

  // 2) Try Stripe customer metadata
  if (typeof subscription.customer === 'string') {
    const stripeCustomer = await stripe.customers.retrieve(subscription.customer);

    if (!stripeCustomer.deleted) {
      if (stripeCustomer.metadata?.shopify_customer_id) {
        return stripeCustomer.metadata.shopify_customer_id;
      }

      // 3) Fallback: look up by email in Shopify
      const email = stripeCustomer.email;
      if (email) {
        const query = `
          query customersByEmail($query: String!) {
            customers(first: 1, query: $query) {
              edges {
                node {
                  id
                  email
                }
              }
            }
          }
        `;

        const result = await shopifyGraphql<{
          data?: {
            customers?: {
              edges: { node: { id: string; email: string } }[];
            };
          };
        }>(query, {
          query: `email:${email}`,
        });

        const edges = result?.data?.customers?.edges ?? [];
        if (edges.length > 0) {
          const node = edges[0].node;
          console.log(
            `Matched Stripe customer ${email} to Shopify customer ${node.id}`,
          );
          return node.id;
        } else {
          console.warn(
            `No Shopify customer found for Stripe email ${email}`,
          );
        }
      } else {
        console.warn(
          'Stripe customer has no email, cannot look up Shopify customer by email',
        );
      }
    }
  }

  console.warn(
    'No shopify_customer_id found in subscription or Stripe customer metadata, and email lookup failed',
  );
  return null;
}

// ✉️ Send Resend email on subscribe / cancel
async function sendVipNotificationEmail(
  subscription: Stripe.Subscription,
  type: 'created' | 'cancelled',
): Promise<void> {
  const customerId = subscription.customer;
  let customerEmail = 'Unknown';
  let stripeCustomerId = 'Unknown';

  if (typeof customerId === 'string') {
    stripeCustomerId = customerId;
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && customer.email) {
      customerEmail = customer.email;
    }
  }

  const subject =
    type === 'created'
      ? 'New VIP subscription created'
      : 'VIP subscription cancelled';

  const lines = [
    `Type: ${type}`,
    `Subscription ID: ${subscription.id}`,
    `Status: ${subscription.status}`,
    `Stripe Customer ID: ${stripeCustomerId}`,
    `Customer email: ${customerEmail}`,
  ];

  try {
    await resend.emails.send({
      from: alertEmailFrom as string,
      to: alertEmailTo as string,
      subject,
      text: lines.join('\n'),
      html: `<pre>${lines.join('\n')}</pre>`,
    });
  } catch (error) {
    console.error('Failed to send VIP notification email', error);
  }
}

// Decide what to do based on subscription status
async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const shopifyCustomerId = await getShopifyCustomerIdFromSubscription(
    subscription,
  );

  if (!shopifyCustomerId) {
    return;
  }

  const status = subscription.status;
  console.log('🔔 Subscription status:', status, 'Shopify ID:', shopifyCustomerId);

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
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionEvent(subscription);

        // ✉️ New subscription email
        await sendVipNotificationEmail(subscription, 'created');
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionEvent(subscription);
        // No email on generic updates (to avoid noise)
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Treat deleted as canceled for our purposes
        subscription.status = 'canceled';
        await handleSubscriptionEvent(subscription);

        // ✉️ Cancelled subscription email
        await sendVipNotificationEmail(subscription, 'cancelled');
        break;
      }

      case 'invoice.payment_failed': {
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
