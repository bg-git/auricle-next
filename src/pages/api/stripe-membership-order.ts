// src/pages/api/stripe-membership-order.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  // Or omit apiVersion to use the account default
  apiVersion: '2025-11-17.clover',
});

export const config = {
  api: {
    bodyParser: false, // needed for Stripe signature verification
  },
};

function buffer(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Helpers to extend Stripe types without using `any`
type InvoiceLineItemWithPrice = Stripe.InvoiceLineItem & {
  price?: Stripe.Price | null;
};

type InvoiceWithLinesAndSub = Stripe.Invoice & {
  lines: Stripe.ApiList<Stripe.InvoiceLineItem>;
  subscription?: string | Stripe.Subscription | null;
};

type ShopifyCustomer = {
  id: number;
  email: string;
};

type CreateVipOrderInput = {
  shopifyCustomerId: number;
  email: string;
  stripeInvoiceId: string;
  stripeSubscriptionId: string;
  amountPaidMinor: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'] as string | undefined;
const webhookSecret = process.env.STRIPE_MEMBERSHIP_WEBHOOK_SECRET as string;


  if (!sig || !webhookSecret) {
    return res.status(400).send('Missing Stripe signature or webhook secret');
  }

  let event: Stripe.Event;

  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    return res.status(400).send('Webhook Error');
  }

  try {
    if (event.type === 'invoice.payment_succeeded') {
      let invoice = event.data.object as InvoiceWithLinesAndSub;

      // Always fetch full invoice with expanded line items to ensure we have price data
      invoice = (await stripe.invoices.retrieve(invoice.id, {
        expand: ['lines.data.price', 'subscription'],
      })) as InvoiceWithLinesAndSub;

      const lines = invoice.lines.data as InvoiceLineItemWithPrice[];

      // Optional: restrict to a specific Stripe price ID
      const vipPriceId = process.env.STRIPE_VIP_PRICE_ID || process.env.STRIPE_PRICE_ID_VIP;

      // Check both line.price?.id (expanded) and line.pricing?.price_details?.price (webhook format)
      const membershipLine = vipPriceId
        ? lines.find((line) => {
            const expandedPriceId = line.price?.id;
            const pricingPriceId = (line as any).pricing?.price_details?.price;
            return expandedPriceId === vipPriceId || pricingPriceId === vipPriceId;
          })
        : lines[0]; // if you only have one sub on the invoice

      if (!membershipLine) {
        // Not our VIP membership – ignore
        return res.status(200).json({ received: true, skipped: true });
      }

      // Try to get Shopify customer ID from line item metadata first (most reliable)
      const lineMetadata = (membershipLine as any).metadata;
      let shopifyCustomerId: number | null = null;

      if (lineMetadata?.shopify_customer_id) {
        // Extract numeric ID from GraphQL ID format: gid://shopify/Customer/26822726222149
        const gqlId = lineMetadata.shopify_customer_id as string;
        const numericId = Number(gqlId.split('/').pop());
        if (Number.isFinite(numericId)) {
          shopifyCustomerId = numericId;
        }
      }

      // Fallback: look up by email if we don't have the customer ID
      if (!shopifyCustomerId) {
        const stripeCustomerId = invoice.customer as string | null;

        if (!stripeCustomerId) {
          console.error('No Stripe customer on invoice');
          return res
            .status(200)
            .json({ received: true, no_stripe_customer: true });
        }

        const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);

        if (!('email' in stripeCustomer) || !stripeCustomer.email) {
          console.error('No email on Stripe customer, cannot map to Shopify');
          return res
            .status(200)
            .json({ received: true, no_email: true });
        }

        const email = stripeCustomer.email;

        // Find Shopify customer by email
        const shopifyCustomer = await findShopifyCustomerByEmail(email);

        if (!shopifyCustomer) {
          console.error('No Shopify customer found for email', email);
          return res
            .status(200)
            .json({ received: true, no_shopify_customer: true });
        }

        shopifyCustomerId = shopifyCustomer.id;
      }

      if (!shopifyCustomerId) {
        console.error('Could not determine Shopify customer ID');
        return res.status(200).json({ received: true, no_shopify_customer: true });
      }

      const stripeCustomerId = invoice.customer as string | null;
      if (!stripeCustomerId) {
        console.error('No Stripe customer on invoice');
        return res
          .status(200)
          .json({ received: true, no_stripe_customer: true });
      }

      const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);

      if (!('email' in stripeCustomer) || !stripeCustomer.email) {
        console.error('No email on Stripe customer, cannot map to Shopify');
        return res
          .status(200)
          .json({ received: true, no_email: true });
      }

      const email = stripeCustomer.email;

      // 2) Get subscription ID safely from the invoice
      const subscriptionValue = invoice.subscription;
      const stripeSubscriptionId =
        typeof subscriptionValue === 'string'
          ? subscriptionValue
          : subscriptionValue?.id ?? '';

      // 3) Create a paid + fulfilled order in Shopify
      try {
        const createdOrder = await createShopifyVipOrder({
          shopifyCustomerId,
          email,
          stripeInvoiceId: invoice.id,
          stripeSubscriptionId,
          amountPaidMinor: invoice.amount_paid ?? 0,
        });

        console.log('✅ Created VIP membership order', createdOrder.id);
      } catch (orderErr: unknown) {
        return res.status(200).json({ received: true, order_creation_failed: true });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: unknown) {
    return res.status(500).send('Webhook handler error');
  }
}

async function findShopifyCustomerByEmail(
  email: string
): Promise<ShopifyCustomer | null> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN; // e.g. mystore.myshopify.com
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!domain || !token) {
    console.error('Missing Shopify env vars');
    return null;
  }

  const url = `https://${domain}/admin/api/2024-07/customers/search.json?query=${encodeURIComponent(
    `email:${email}`
  )}`;

  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Shopify customer search failed', text);
    return null;
  }

  const data = (await res.json()) as {
    customers: Array<{ id: number; email: string | null }>;
  };

  const [first] = data.customers;

  if (!first || !first.email) {
    return null;
  }

  return {
    id: first.id,
    email: first.email,
  };
}

async function createShopifyVipOrder(input: CreateVipOrderInput) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const vipVariantIdRaw = process.env.SHOPIFY_VIP_MEMBERSHIP_VARIANT_ID;

  if (!domain || !token || !vipVariantIdRaw) {
    const missing: string[] = [];
    if (!domain) missing.push('SHOPIFY_STORE_DOMAIN');
    if (!token) missing.push('SHOPIFY_ADMIN_ACCESS_TOKEN');
    if (!vipVariantIdRaw) missing.push('SHOPIFY_VIP_MEMBERSHIP_VARIANT_ID');
    throw new Error(`Missing Shopify env vars: ${missing.join(', ')}`);
  }

  const vipVariantId = Number(vipVariantIdRaw);

  const orderBody = {
    order: {
      email: input.email,
      customer: {
        id: input.shopifyCustomerId,
      },
      financial_status: 'paid',
      fulfillment_status: 'fulfilled',
      send_receipt: false,
      send_fulfillment_receipt: false,
      tags: 'VIP-MEMBERSHIP',
      line_items: [
        {
          variant_id: vipVariantId,
          quantity: 1,
          price: (input.amountPaidMinor / 100).toFixed(2),
          title: 'VIP Membership',
        },
      ],
      note: `Stripe subscription: ${input.stripeSubscriptionId}, Stripe invoice: ${input.stripeInvoiceId}`,
      note_attributes: [
        { name: 'stripe_subscription_id', value: input.stripeSubscriptionId },
        { name: 'stripe_invoice_id', value: input.stripeInvoiceId },
      ],
    },
  };

  const res = await fetch(
    `https://${domain}/admin/api/2024-07/orders.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderBody),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('Shopify order create failed', text);
    throw new Error('Failed to create Shopify order');
  }

  const data = (await res.json()) as { order: { id: number } };
  return data.order;
}
