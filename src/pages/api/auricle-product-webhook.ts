import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

import {
  auricleAdmin,
  poaAdmin,
  shopifyAdminGet,
  shopifyAdminGraphql,
  shopifyAdminPost,
  shopifyAdminPut,
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

  try {
    // Both generated and hmacHeader are base64-encoded strings
    // Decode both to binary buffers for secure comparison
    const generatedBuffer = Buffer.from(generated, 'base64');
    const hmacBuffer = Buffer.from(hmacHeader.trim(), 'base64');

    const valid = crypto.timingSafeEqual(generatedBuffer, hmacBuffer);

    if (!valid) {
      console.error('HMAC mismatch', { 
        generated: generated.substring(0, 20) + '...', 
        hmacHeader: hmacHeader.substring(0, 20) + '...' 
      });
    }

    return valid;
  } catch (err) {
    // If buffers have different lengths or decoding fails, it's an invalid HMAC
    console.error('HMAC verification error', { 
      error: err instanceof Error ? err.message : String(err),
      generatedLen: generated.length,
      headerLen: hmacHeader.length,
    });
    return false;
  }
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

type Metafield = {
  key: string;
  value: string;
  type: string;
};

type PoaVariant = {
  id: number;
  sku: string | null;
  price: string;
  title: string;
  inventory_item_id?: number;
  inventory_management?: string;
  inventory_quantity?: number;
};

type PoaProduct = {
  id: number;
  title: string;
  handle: string;
  status: string;
  variants: PoaVariant[];
};

type PoaProductsResponse = {
  products: PoaProduct[];
};

type ProductWebhookPayload = {
  id: number;
  handle: string;
  title: string;
  status: 'active' | 'draft' | 'archived';
  body_html: string | null;
  images?: { src: string }[];
  variants: Array<{
    id: number;
    sku: string | null;
    price: string;
    title: string;
    inventory_quantity: number;
  }>;
};

const PRODUCT_METAFIELDS_QUERY = `
  query ProductMetafields($id: ID!) {
    product(id: $id) {
      id
      handle
      title
      status
      descriptionHtml
      images(first: 5) {
        edges {
          node {
            url
          }
        }
      }
      metafields(first: 25) {
        edges {
          node {
            key
            value
            type
          }
        }
      }
      variants(first: 50) {
        edges {
          node {
            id
            sku
            price
            title
            inventoryQuantity
            metafields(first: 25) {
              edges {
                node {
                  key
                  value
                  type
                }
              }
            }
          }
        }
      }
    }
  }
`;

const POA_PRODUCT_METAFIELDS_MUTATION = `
  mutation UpdateProductMetafields($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id }
      userErrors { field message }
    }
  }
`;

function toInventoryItemGid(inventoryItemId: number): string {
  return `gid://shopify/InventoryItem/${inventoryItemId}`;
}

async function syncProductMetafields(
  poaProductGid: string,
  metafields: Metafield[],
): Promise<void> {
  if (metafields.length === 0) {
    console.log('No product metafields to sync');
    return;
  }

  // Filter out problematic metafields that can't be synced
  // Skip complex types like metaobjects and list types that need special handling
  const filteredMetafields = metafields.filter(mf => {
    // Skip list types (they need special validation structure)
    if (mf.type.startsWith('list.')) {
      console.log(`Skipping list-type metafield: ${mf.key} (type: ${mf.type})`);
      return false;
    }
    return true;
  });
  
  if (filteredMetafields.length === 0) {
    console.log('No syncable metafields after filtering. Skipping sync.');
    return;
  }

  const metafieldsPayload = filteredMetafields.map((mf) => ({
    namespace: 'custom',
    key: mf.key,
    value: mf.value,
    type: mf.type,
  }));

  try {
    console.log('Syncing product metafields', { poaProductGid, metafieldCount: metafieldsPayload.length, keys: metafieldsPayload.map(m => m.key) });
    const result = await shopifyAdminGraphql<{
      productUpdate: { product: { id: string } | null; userErrors: unknown[] };
    }>(poaAdmin, POA_PRODUCT_METAFIELDS_MUTATION, {
      input: {
        id: poaProductGid,
        metafields: metafieldsPayload,
      },
    });
    console.log('Product metafields sync result', { 
      productId: result.productUpdate?.product?.id, 
      userErrorCount: result.productUpdate?.userErrors?.length ?? 0,
      userErrors: result.productUpdate?.userErrors?.length ? result.productUpdate.userErrors : 'none'
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `Failed to sync metafields for product ${poaProductGid}: ${msg}`,
    );
  }
}

async function syncVariantMetafields(
  poaVariantGid: string,
  metafields: Metafield[],
): Promise<void> {
  // TODO: Shopify's GraphQL Admin API does not support updating variant metafields directly
  // Consider using REST API or updating variant via productUpdate instead
  if (metafields.length === 0) return;
  
  console.log('Variant metafields sync skipped - not supported by Shopify GraphQL API', { poaVariantGid });
}

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

  console.log('Incoming Auricle product webhook', { topic, shop });

  if (topic !== 'products/update') {
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
  
  // Allow bypass for local testing
  const isTestMode = hmacHeader === 'test-hmac' && process.env.NODE_ENV !== 'production';
  
  if (!isValid && !isTestMode) {
    return res.status(401).send('Invalid HMAC');
  }

  const payload = JSON.parse(rawBody.toString('utf8')) as ProductWebhookPayload;
  const productHandle = payload.handle;
  const productId = payload.id;

  console.log('Processing product update webhook', { productHandle, productId });

  try {
    // Fetch full product data with metafields from Auricle
    const productGid = `gid://shopify/Product/${productId}`;
    const auricleProduct = await shopifyAdminGraphql<{
      product: {
        id: string;
        handle: string;
        title: string;
        status: string;
        descriptionHtml: string | null;
        images: { edges: Array<{ node: { url: string } }> };
        metafields: {
          edges: Array<{ node: { key: string; value: string; type: string } }>;
        };
        variants: {
          edges: Array<{
            node: {
              id: string;
              sku: string | null;
              price: string;
              title: string;
              inventoryQuantity: number;
              metafields: {
                edges: Array<{
                  node: { key: string; value: string; type: string };
                }>;
              };
            };
          }>;
        };
      } | null;
    }>(auricleAdmin, PRODUCT_METAFIELDS_QUERY, { id: productGid });

    if (!auricleProduct.product) {
      console.warn('Product not found in Auricle', { productHandle });
      return res
        .status(200)
        .json({ status: 'product-not-found', handle: productHandle });
    }

    const p = auricleProduct.product;
    console.log('Fetched Auricle product:', { handle: p.handle, variantCount: p.variants.edges.length });

    if (p.status !== 'ACTIVE') {
      console.log('Product is not active, skipping sync', {
        handle: productHandle,
        status: p.status,
      });
      return res.status(200).json({ status: 'product-not-active', handle: productHandle });
    }

    // Check if any variant is POA enabled
    const variantsWithMetafields = p.variants.edges.map((edge) => {
      const v = edge.node;
      const variantMetafields: Metafield[] = v.metafields.edges.map((mfEdge) => ({
        key: mfEdge.node.key,
        value: mfEdge.node.value,
        type: mfEdge.node.type,
      }));

      let poaEnabled = false;
      let poaPrice: string | null = null;

      for (const mf of variantMetafields) {
        if (mf.key === 'poa_enabled') {
          poaEnabled = mf.value === 'true';
        }
        if (mf.key === 'poa_price') {
          poaPrice = mf.value;
        }
      }

      console.log('Variant:', { sku: v.sku, poaEnabled, poaPrice, metafieldCount: variantMetafields.length, allMetafields: variantMetafields.map(m => ({ key: m.key, value: m.value })) });

      return {
        id: extractNumericId(v.id),
        gid: v.id,
        sku: v.sku,
        price: v.price,
        inventoryQuantity: v.inventoryQuantity,
        title: v.title,
        poaEnabled,
        poaPrice: poaPrice ?? v.price,
        metafields: variantMetafields,
      };
    });

    const enabledVariants = variantsWithMetafields.filter((v) => v.poaEnabled);

    console.log('Variants analysis:', {
      total: variantsWithMetafields.length,
      poaEnabled: enabledVariants.length,
    });

    if (enabledVariants.length === 0) {
      console.log('No POA-enabled variants found', { handle: productHandle });
      return res
        .status(200)
        .json({ status: 'no-poa-variants', handle: productHandle });
    }

    // Extract product metafields
    const productMetafields: Metafield[] = p.metafields.edges.map((edge) => ({
      key: edge.node.key,
      value: edge.node.value,
      type: edge.node.type,
    }));

    console.log('Product metafields extracted:', { count: productMetafields.length, keys: productMetafields.map(m => m.key) });

    // Get image URLs
    const imageUrls = p.images.edges.map((edge) => edge.node.url);

    // Load existing POA product
    const poaData = (await shopifyAdminGet(
      poaAdmin,
      `products.json?handle=${productHandle}`,
    )) as PoaProductsResponse;

    const existingPoaProduct = poaData.products?.[0];

    if (!existingPoaProduct) {
      // Create new product on POA
      console.log('Creating new POA product from webhook', { handle: productHandle });

      const variantsPayload = enabledVariants.map((v) => ({
        sku: v.sku ?? undefined,
        price: v.poaPrice,
        inventory_policy: 'deny',
        inventory_management: 'shopify',
        inventory_quantity: v.inventoryQuantity,
        title: v.title || 'Default',
        option1: v.title || 'Default',
      }));

      const created = (await shopifyAdminPost(poaAdmin, 'products.json', {
        product: {
          title: p.title,
          handle: p.handle,
          status: 'active',
          body_html: p.descriptionHtml ?? '',
          images: imageUrls.map((url) => ({ src: url })),
          variants: variantsPayload,
        },
      })) as { product: PoaProduct };

      const createdProduct = created.product;

      // Track inventory for created variants
      for (const cv of createdProduct.variants) {
        if (!cv.inventory_item_id) continue;

        await shopifyAdminGraphql<{
          inventoryItemUpdate: {
            inventoryItem: { id: string; tracked: boolean } | null;
            userErrors: unknown[];
          };
        }>(poaAdmin, 'mutation TrackInventoryItem($id: ID!, $input: InventoryItemInput!) { inventoryItemUpdate(id: $id, input: $input) { inventoryItem { id tracked } userErrors { field message } } }', {
          id: toInventoryItemGid(cv.inventory_item_id),
          input: { tracked: true },
        });
      }

      // Sync product metafields
      const productGidPoa = `gid://shopify/Product/${createdProduct.id}`;
      console.log('About to sync product metafields for new product:', { productGidPoa, metafieldCount: productMetafields.length, keys: productMetafields.map(m => m.key) });
      await syncProductMetafields(productGidPoa, productMetafields);

      // Sync variant metafields
      const createdVariantsBySkuMap = new Map<string, PoaVariant>();
      for (const cv of createdProduct.variants) {
        if (cv.sku) {
          createdVariantsBySkuMap.set(cv.sku, cv);
        }
      }
      for (const v of enabledVariants) {
        if (!v.sku) continue;
        const createdVariant = createdVariantsBySkuMap.get(v.sku);
        if (createdVariant) {
          const variantGidPoa = `gid://shopify/ProductVariant/${createdVariant.id}`;
          await syncVariantMetafields(variantGidPoa, v.metafields);
        }
      }

      console.log('POA product created from webhook', {
        handle: productHandle,
        productId: createdProduct.id,
      });

      return res.status(200).json({
        status: 'product-created',
        handle: productHandle,
        poaProductId: createdProduct.id,
      });
    } else {
      // Update existing product
      console.log('Updating existing POA product from webhook', {
        handle: productHandle,
      });

      // Update variant prices
      const updates: { id: number; price: string }[] = [];

      const existingVariantsBySkuMap = new Map<string, PoaVariant>();
      for (const v of existingPoaProduct.variants) {
        if (v.sku) {
          existingVariantsBySkuMap.set(v.sku, v);
        }
      }

      for (const v of enabledVariants) {
        if (!v.sku) continue;
        const existingVariant = existingVariantsBySkuMap.get(v.sku);
        if (existingVariant && existingVariant.price !== v.poaPrice) {
          updates.push({
            id: existingVariant.id,
            price: v.poaPrice,
          });
        }
      }

      if (updates.length > 0) {
        await shopifyAdminPut(
          poaAdmin,
          `products/${existingPoaProduct.id}.json`,
          {
            product: {
              id: existingPoaProduct.id,
              variants: updates,
            },
          },
        );
      }

      // Sync product metafields
      const productGidPoa = `gid://shopify/Product/${existingPoaProduct.id}`;
      console.log('About to sync product metafields for existing product:', { productGidPoa, metafieldCount: productMetafields.length, keys: productMetafields.map(m => m.key) });
      await syncProductMetafields(productGidPoa, productMetafields);

      // Sync variant metafields
      for (const v of enabledVariants) {
        if (!v.sku) continue;
        const existingVariant = existingVariantsBySkuMap.get(v.sku);
        if (existingVariant) {
          const variantGidPoa = `gid://shopify/ProductVariant/${existingVariant.id}`;
          await syncVariantMetafields(variantGidPoa, v.metafields);
        }
      }

      console.log('POA product updated from webhook', {
        handle: productHandle,
        pricesUpdated: updates.length,
      });

      return res.status(200).json({
        status: 'product-updated',
        handle: productHandle,
        pricesUpdated: updates.length,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error processing product webhook', {
      handle: productHandle,
      error: message,
    });
    return res.status(500).json({ error: message, handle: productHandle });
  }
}
