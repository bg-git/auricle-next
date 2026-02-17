// src/pages/api/webhooks/product-sync.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import {
  syncProductToSupabase,
  syncProductImagesForShopifyId,
  syncVariantsForProduct,
  deleteProductByShopifyId,
  getProductByShopifyId
} from '@/lib/supabase';
import { shopifyAdminGraphql, auricleAdmin } from '@/lib/shopifyAdmin';

// Must disable body parsing — Shopify HMAC is computed on the raw request bytes
export const config = {
  api: {
    bodyParser: false,
  },
};

const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';

if (!WEBHOOK_SECRET) {
  console.warn('Warning: SHOPIFY_WEBHOOK_SECRET not set. Webhook signature verification disabled.');
}

function buffer(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk as Buffer));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifyWebhookSignature(rawBody: Buffer, hmacHeader: string | undefined, secret: string): boolean {
  if (!secret) {
    console.warn('Webhook secret not configured, skipping verification');
    return true;
  }

  if (!hmacHeader) {
    console.error('Missing X-Shopify-Hmac-SHA256 header');
    return false;
  }

  const generated = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(generated, 'base64'),
      Buffer.from(hmacHeader.trim(), 'base64'),
    );
  } catch {
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await buffer(req);
  const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string | undefined;

  try {
    // Verify webhook signature against raw bytes
    if (!verifyWebhookSignature(rawBody, hmacHeader, WEBHOOK_SECRET)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const topic = req.headers['x-shopify-topic'];
    const product = JSON.parse(rawBody.toString('utf8'));

    console.log('Received webhook:', { topic, productId: product.id, title: product.title });

    if (!product.id) {
      return res.status(400).json({ error: 'Missing product ID' });
    }

    // Handle product creation or update
    if (topic === 'products/create' || topic === 'products/update') {
      const syncedProduct = await syncProductToSupabase({
        id: product.id,
        title: product.title,
        handle: product.handle,
        bodyHtml: product.body_html,
        status: product.status,
      });

      // Sync product images
      const productImages = product.images?.map((img: any, idx: number) => ({
        id: img.id,
        src: img.src,
        alt: img.alt_text,
        position: img.position,
      })) || [];

      if (productImages.length > 0) {
        await syncProductImagesForShopifyId(String(product.id), productImages);
      }

      // Fetch full variant data (including costs and inventory) via GraphQL to ensure accuracy
      const graphqlQuery = `
        query GetProductVariants($id: ID!) {
          product(id: $id) {
            variants(first: 250) {
              nodes {
                id
                title
                sku
                price
                compareAtPrice
                barcode
                inventoryQuantity
                inventoryItem {
                  unitCost {
                    amount
                    currencyCode
                  }
                }
                metafield(namespace: "custom", key: "member_price") {
                  value
                }
              }
            }
          }
        }
      `;

      try {
        const response = await shopifyAdminGraphql<any>(
          auricleAdmin,
          graphqlQuery,
          { id: `gid://shopify/Product/${product.id}` }
        );

        const variants = response.product?.variants?.nodes?.map((v: any) => ({
          id: v.id,
          title: v.title,
          sku: v.sku,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          barcode: v.barcode,
          inventoryQuantity: v.inventoryQuantity ?? null,
          cost: v.inventoryItem?.unitCost?.amount ? parseFloat(v.inventoryItem.unitCost.amount) : null,
          memberPrice: v.metafield?.value,
        })) || [];

        const syncedVariants = await syncVariantsForProduct(syncedProduct.id, variants);

        console.log(`Product ${topic}: synced product ${product.id} (${product.title}) with ${productImages.length} images and ${syncedVariants.length} variants`);
        return res.status(200).json({ 
          success: true, 
          message: 'Product synced', 
          imagesCount: productImages.length,
          variantsCount: syncedVariants.length 
        });
      } catch (error) {
        console.error(`Error syncing product variants via GraphQL:`, error);
        // Fallback: sync with data from webhook payload
        const variants = product.variants?.map((variant: any) => {
          let memberPrice: string | undefined = undefined;
          if (variant.metafields && Array.isArray(variant.metafields)) {
            const memberPriceField = variant.metafields.find(
              (mf: any) => mf.namespace === 'custom' && mf.key === 'member_price'
            );
            memberPrice = memberPriceField?.value;
          }

          return {
            id: variant.id,
            title: variant.title,
            sku: variant.sku,
            price: variant.price,
            compareAtPrice: variant.compare_at_price,
            barcode: variant.barcode,
            inventoryQuantity: variant.inventory_quantity ?? null,
            memberPrice,
          };
        }) || [];

        const syncedVariants = await syncVariantsForProduct(syncedProduct.id, variants);
        console.log(`Product ${topic}: synced product ${product.id} (${product.title}) with ${productImages.length} images and ${syncedVariants.length} variants (fallback mode)`);
        return res.status(200).json({ 
          success: true, 
          message: 'Product synced (fallback)', 
          imagesCount: productImages.length,
          variantsCount: syncedVariants.length 
        });
      }
    }

    // Handle product deletion
    if (topic === 'products/delete') {
      await deleteProductByShopifyId(String(product.id));
      console.log(`Product deleted: removed product ${product.id}`);
      return res.status(200).json({ success: true, message: 'Product deleted' });
    }

    // Ignore other topics
    return res.status(200).json({ success: true, message: 'Webhook received but not processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
