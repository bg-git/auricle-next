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
  const generated = crypto
    .createHmac('sha256', Buffer.from(secret, 'hex')) // IMPORTANT
    .update(rawBody)
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(generated),
    Buffer.from(hmacHeader || '')
  );
}


async function callAuricleGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(
    `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${process.env.SHOPIFY_ADMIN_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  if (!res.ok) {
    throw new Error(`Auricle GraphQL HTTP error ${res.status}`);
  }

  const json = await res.json();
  if (json.errors) {
    console.error('Auricle GraphQL errors:', JSON.stringify(json.errors, null, 2));
    throw new Error('Auricle GraphQL returned errors');
  }

  return json.data as T;
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const rawBody = await buffer(req);

  const topic = req.headers['x-shopify-topic'] as string | undefined;
  const shop = req.headers['x-shopify-shop-domain'] as string | undefined;
  const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string | undefined;

  if (!topic || topic !== 'orders/create') {
    return res.status(400).send('Unsupported topic');
  }

if (!shop || shop !== process.env.POA_SHOPIFY_STORE_DOMAIN) {
    return res.status(401).send('Unknown shop');
  }

  const secret = process.env.POA_WEBHOOK_SECRET;
  if (!secret) {
    console.error('POA_WEBHOOK_SECRET not set');
    return res.status(500).send('Config error');
  }

  const isValid = verifyShopifyWebhook({ rawBody, hmacHeader, secret });
  if (!isValid) {
    return res.status(401).send('Invalid HMAC');
  }

  const order = JSON.parse(rawBody.toString('utf8'));

  const lineItems = order.line_items || [];
  if (!lineItems.length) {
    // nothing to mirror, just exit ok
    return res.status(200).json({ status: 'no-line-items' });
  }

  // Build DraftOrder line items for Auricle
  const draftLineItems: Array<{ variantId: string; quantity: number }> = [];

  for (const item of lineItems) {
    const sku: string | undefined = item.sku;
    const quantity: number = item.quantity || 1;

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
    return res.status(200).json({ status: 'no-matching-items' });
  }

  const customerId = process.env.AURICLE_POA_CUSTOMER_ID;
  if (!customerId) {
    console.error('AURICLE_POA_CUSTOMER_ID not set');
    return res.status(500).send('Config error');
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

  const draftResult = await callAuricleGraphQL<{
    draftOrderCreate: {
      draftOrder: { id: string; name: string; invoiceUrl: string } | null;
      userErrors: { field: string[] | null; message: string }[];
    };
  }>(DRAFT_ORDER_CREATE_MUTATION, { input });

  const { draftOrderCreate } = draftResult;

  if (draftOrderCreate.userErrors?.length) {
    console.error('Draft order userErrors', draftOrderCreate.userErrors);
    return res.status(500).json({ status: 'userErrors', errors: draftOrderCreate.userErrors });
  }

  console.log('Created mirror draft order', draftOrderCreate.draftOrder);

  return res.status(200).json({
    status: 'ok',
    draftOrder: draftOrderCreate.draftOrder,
  });
}
