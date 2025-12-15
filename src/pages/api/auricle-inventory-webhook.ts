import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

import {
  auricleAdmin,
  poaAdmin,
  shopifyAdminGet,
  shopifyAdminGraphql,
  shopifyAdminPost,
} from '@/lib/shopifyAdmin';

export const config = {
  api: {
    bodyParser: false,
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
}): boolean {
  if (!hmacHeader) {
    console.error('Missing X-Shopify-Hmac-Sha256 header');
    return false;
  }

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

function extractNumericId(gid: string): number {
  const parts = gid.split('/');
  const last = parts[parts.length - 1];
  const asNumber = Number(last);

  if (Number.isNaN(asNumber)) {
    throw new Error(`Cannot extract numeric ID from gid: ${gid}`);
  }

  return asNumber;
}

const AURICLE_VARIANT_BY_INVENTORY_QUERY = `
  query VariantByInventoryItem($id: ID!) {
    inventoryItem(id: $id) {
      id
      sku
      variant {
        id
        sku
      }
    }
  }
`;

const POA_VARIANT_BY_SKU_QUERY = `
  query PoaVariantBySku($query: String!) {
    productVariants(first: 1, query: $query) {
      edges {
        node {
          id
          sku
          inventoryItem {
            id
          }
        }
      }
    }
  }
`;

type InventoryWebhookPayload = {
  inventory_item_id?: number;
  available?: number;
  location_id?: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const rawBody = await buffer(req);

  const topic = req.headers['x-shopify-topic'] as string | undefined;
  const shop = req.headers['x-shopify-shop-domain'] as string | undefined;
  const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string | undefined;

  console.log('Incoming Auricle inventory webhook', { topic, shop });

  if (!topic) {
    return res.status(400).send('Missing topic');
  }

  const supportedTopics = [
    'inventory_levels/update',
    'inventory_levels/connect',
    'inventory_levels/adjustment',
  ];

  if (!supportedTopics.includes(topic)) {
    console.warn('Ignoring unsupported topic', topic);
    return res.status(200).json({ status: 'ignored-topic', topic });
  }

  if (!shop) {
    console.error('Missing shop domain header');
    return res.status(400).send('Missing shop');
  }

  const expectedShop =
    process.env.AURICLE_SHOPIFY_STORE_DOMAIN ?? process.env.SHOPIFY_STORE_DOMAIN;

  if (!expectedShop) {
    console.error('Auricle shop domain not configured');
    return res.status(500).send('Config error - shop domain');
  }

  if (shop !== expectedShop) {
    console.error('Shop mismatch', { received: shop, expected: expectedShop });
    return res.status(401).send('Unknown shop');
  }

  const secret =
    process.env.AURICLE_WEBHOOK_SECRET ?? process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('AURICLE_WEBHOOK_SECRET not set');
    return res.status(500).send('Config error - webhook secret');
  }

  const isValid = verifyShopifyWebhook({ rawBody, hmacHeader, secret });
  if (!isValid) {
    return res.status(401).send('Invalid HMAC');
  }

  const payload = JSON.parse(rawBody.toString('utf8')) as InventoryWebhookPayload;

  const inventoryItemId = payload.inventory_item_id;
  const available = payload.available;

  if (typeof inventoryItemId !== 'number' || typeof available !== 'number') {
    console.warn('Webhook missing inventory data', payload);
    return res
      .status(200)
      .json({ status: 'missing-inventory-data', payload });
  }

  const inventoryItemGid = `gid://shopify/InventoryItem/${inventoryItemId}`;

  const auricleVariantResult = await shopifyAdminGraphql<{
    inventoryItem: {
      id: string;
      sku: string | null;
      variant: { id: string; sku: string | null } | null;
    } | null;
  }>(auricleAdmin, AURICLE_VARIANT_BY_INVENTORY_QUERY, {
    id: inventoryItemGid,
  });

  const auricleSku =
    auricleVariantResult.inventoryItem?.variant?.sku ||
    auricleVariantResult.inventoryItem?.sku;

  if (!auricleSku) {
    console.warn('No SKU found for inventory item', inventoryItemId);
    return res.status(200).json({ status: 'no-sku', inventoryItemId });
  }

  const poaVariantResult = await shopifyAdminGraphql<{
    productVariants: {
      edges: { node: { id: string; sku: string | null; inventoryItem: { id: string } | null } }[];
    };
  }>(poaAdmin, POA_VARIANT_BY_SKU_QUERY, { query: `sku:${auricleSku}` });

  const poaVariant = poaVariantResult.productVariants.edges[0]?.node;

  if (!poaVariant?.inventoryItem?.id) {
    console.warn('No POA variant found for SKU', auricleSku);
    return res.status(200).json({ status: 'no-poa-variant', sku: auricleSku });
  }

  const poaInventoryItemId = extractNumericId(poaVariant.inventoryItem.id);

  const poaLocations = (await shopifyAdminGet(poaAdmin, 'locations.json')) as {
    locations?: { id: number; name: string }[];
  };

  const onlineWarehouse = poaLocations.locations?.find(
    (loc) => loc.name.toLowerCase().includes('online warehouse'),
  );

  if (!onlineWarehouse) {
    throw new Error('Pierce of Art location ONLINE WAREHOUSE not found');
  }

  await shopifyAdminPost(poaAdmin, 'inventory_levels/set.json', {
    location_id: onlineWarehouse.id,
    inventory_item_id: poaInventoryItemId,
    available,
  });

  console.log('POA inventory updated from Auricle webhook', {
    sku: auricleSku,
    available,
    poaInventoryItemId,
    location: onlineWarehouse.id,
  });

  return res.status(200).json({ status: 'inventory-updated', sku: auricleSku });
}
