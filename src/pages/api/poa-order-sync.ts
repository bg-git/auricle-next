import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false, // we need raw body for HMAC verification
  },
};

function buffer(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk as Buffer));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifyShopifyWebhook({
  rawBody,
  hmacHeader,
  secret,
}: {
  rawBody: Buffer;
  hmacHeader?: string;
  secret: string;
}) {
  if (!hmacHeader) {
    console.error('Missing X-Shopify-Hmac-Sha256 header');
    return false;
  }

  // Use the Shopify secret EXACTLY as provided in the admin ("Your webhooks will be signed with ...")
  const generated = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');

  const valid = crypto.timingSafeEqual(
    Buffer.from(generated),
    Buffer.from(hmacHeader),
  );

  if (!valid) {
    console.error('HMAC mismatch', { generated, hmacHeader });
  }

  return valid;
}

async function callAuricleGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  // Support either name, just in case
  const token =
    process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN ??
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ??
    '';
  const apiVersion =
    process.env.SHOPIFY_ADMIN_API_VERSION &&
    process.env.SHOPIFY_ADMIN_API_VERSION.trim().length > 0
      ? process.env.SHOPIFY_ADMIN_API_VERSION
      : '2025-01';

  if (!domain || !token || !apiVersion) {
    console.error('Missing Auricle env vars', {
      domain,
      hasToken: Boolean(token),
      apiVersion,
    });
    throw new Error('Auricle env vars not configured');
  }

  const res = await fetch(
    `https://${domain}/admin/api/${apiVersion}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('Auricle GraphQL HTTP error', res.status, text);
    throw new Error(`Auricle GraphQL HTTP error ${res.status}`);
  }

  const json = (await res.json()) as {
    data?: T;
    errors?: unknown;
  };

  if (json.errors) {
    console.error(
      'Auricle GraphQL errors:',
      JSON.stringify(json.errors, null, 2),
    );
    throw new Error('Auricle GraphQL returned errors');
  }

  if (!json.data) {
    throw new Error('Auricle GraphQL has no data');
  }

  return json.data;
}

const VARIANT_BY_SKU_QUERY = `
  query VariantBySku($query: String!) {
    productVariants(first: 1, query: $query) {
      edges {
        node {
          id
          sku
        }
      }
    }
  }
`;

const DRAFT_ORDER_CREATE_MUTATION = `
  mutation CreateMirrorDraftOrder($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        name
        invoiceUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// New: complete draft → real order, marked as payment pending
const DRAFT_ORDER_COMPLETE_MUTATION = `
  mutation CompleteMirrorDraftOrder($id: ID!, $paymentPending: Boolean) {
    draftOrderComplete(id: $id, paymentPending: $paymentPending) {
      draftOrder {
        id
        name
        order {
          id
          name
          displayFinancialStatus
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

type PoaLineItem = {
  sku?: string;
  quantity?: number;
  title?: string;
  [key: string]: unknown;
};

type PoaOrderPayload = {
  id: number | string;
  name: string;
  line_items?: PoaLineItem[];
  [key: string]: unknown;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const rawBody = await buffer(req);

  const topic = req.headers['x-shopify-topic'] as string | undefined;
  const shop = req.headers['x-shopify-shop-domain'] as string | undefined;
  const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string | undefined;

  console.log('Incoming webhook', { topic, shop });

  if (!topic) {
    return res.status(400).send('Missing topic');
  }

  if (topic !== 'orders/create') {
    console.warn('Ignoring unsupported topic', topic);
    return res.status(200).json({ status: 'ignored-topic', topic });
  }

  if (!shop) {
    console.error('Missing shop domain header');
    return res.status(400).send('Missing shop');
  }

  const expectedShop = process.env.POA_SHOPIFY_STORE_DOMAIN;
  if (!expectedShop) {
    console.error('POA_SHOPIFY_STORE_DOMAIN not set');
    return res.status(500).send('Config error - shop domain');
  }

  if (shop !== expectedShop) {
    console.error('Shop mismatch', { received: shop, expected: expectedShop });
    return res.status(401).send('Unknown shop');
  }

  const secret = process.env.POA_WEBHOOK_SECRET;
  if (!secret) {
    console.error('POA_WEBHOOK_SECRET not set');
    return res.status(500).send('Config error - webhook secret');
  }

  const isValid = verifyShopifyWebhook({ rawBody, hmacHeader, secret });
  if (!isValid) {
    return res.status(401).send('Invalid HMAC');
  }

  const order = JSON.parse(rawBody.toString('utf8')) as PoaOrderPayload;
  const lineItems = order.line_items ?? [];

  console.log('POA order payload', {
    id: order.id,
    name: order.name,
    lineItemCount: lineItems.length,
  });

  if (!lineItems.length) {
    console.warn('Order has no line_items');
    return res.status(200).json({ status: 'no-line-items' });
  }

  // Build DraftOrder line items for Auricle
  const draftLineItems: Array<{ variantId: string; quantity: number }> = [];

  for (const item of lineItems) {
    const sku = item.sku;
    const quantity = item.quantity ?? 1;

    console.log('Processing line item', {
      title: item.title,
      sku,
      quantity,
    });

    if (!sku) {
      console.warn('Skipping line without SKU', item);
      continue;
    }

    // Find Auricle variant by SKU
    const data = await callAuricleGraphQL<{
      productVariants: { edges: { node: { id: string; sku: string } }[] };
    }>(VARIANT_BY_SKU_QUERY, { query: `sku:${sku}` });

    const edge = data.productVariants.edges[0];
    if (!edge) {
      console.warn(`No Auricle variant found for SKU ${sku}`);
      continue;
    }

    draftLineItems.push({
      variantId: edge.node.id,
      quantity,
    });
  }

  if (!draftLineItems.length) {
    console.warn('No matching line items found for mirror order');
    return res
      .status(200)
      .json({ status: 'no-matching-items', orderId: order.id });
  }

  const customerId = process.env.AURICLE_POA_CUSTOMER_ID;
  if (!customerId) {
    console.error('AURICLE_POA_CUSTOMER_ID not set');
    return res.status(500).send('Config error - customer ID');
  }

  const input = {
    customerId,
    useCustomerDefaultAddress: true,
    tags: ['POA MIRROR ORDER'],
    note: `Mirror of POA order ${order.name} (${order.id})`,
    lineItems: draftLineItems.map((li) => ({
      variantId: li.variantId,
      quantity: li.quantity,
    })),
  };

  console.log('Creating Auricle draft order with input', input);

  const draftResult = await callAuricleGraphQL<{
    draftOrderCreate: {
      draftOrder: { id: string; name: string; invoiceUrl: string } | null;
      userErrors: { field: string[] | null; message: string }[];
    };
  }>(DRAFT_ORDER_CREATE_MUTATION, { input });

  const { draftOrderCreate } = draftResult;

  if (draftOrderCreate.userErrors?.length) {
    console.error(
      'Draft order userErrors',
      JSON.stringify(draftOrderCreate.userErrors, null, 2),
    );
    return res
      .status(500)
      .json({ status: 'userErrors', errors: draftOrderCreate.userErrors });
  }

  if (!draftOrderCreate.draftOrder) {
    console.error('Draft order not returned from draftOrderCreate');
    return res.status(500).json({ status: 'no-draft-order-returned' });
  }

  const draftOrderId = draftOrderCreate.draftOrder.id;
  console.log('Created mirror draft order', draftOrderCreate.draftOrder);

  // 🔥 New: complete the draft order as a real order with payment pending
  const completeResult = await callAuricleGraphQL<{
    draftOrderComplete: {
      draftOrder: {
        id: string;
        name: string;
        order: { id: string; name: string; displayFinancialStatus: string } | null;
      } | null;
      userErrors: { field: string[] | null; message: string }[];
    };
  }>(DRAFT_ORDER_COMPLETE_MUTATION, {
    id: draftOrderId,
    paymentPending: true, // this makes the resulting order "Payment due"
  });

  const { draftOrderComplete } = completeResult;

  if (draftOrderComplete.userErrors?.length) {
    console.error(
      'Draft order complete userErrors',
      JSON.stringify(draftOrderComplete.userErrors, null, 2),
    );
    // We already have a draft order; so we don't 500 hard, just report
    return res.status(500).json({
      status: 'draft-order-created-but-complete-failed',
      draftOrder: draftOrderCreate.draftOrder,
      errors: draftOrderComplete.userErrors,
    });
  }

  console.log('Completed draft order into real order', draftOrderComplete);

  return res.status(200).json({
    status: 'ok',
    draftOrder: draftOrderComplete.draftOrder,
    order: draftOrderComplete.draftOrder?.order ?? null,
  });
}
