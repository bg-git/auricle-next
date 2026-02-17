import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { auricleAdmin } from '@/lib/shopifyAdmin';

export const config = {
  maxDuration: 300,
};

interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  sku: string | null;
  barcode: string | null;
  inventory_quantity: number;
}

interface ShopifyImage {
  id: number;
  src: string;
  alt: string | null;
  position: number;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string | null;
  status: string;
  vendor: string | null;
  product_type: string | null;
  tags: string;
  published_at: string | null;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
}

async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  let nextUrl: string | null =
    `https://${auricleAdmin.domain}/admin/api/2025-01/products.json?limit=250&status=any`;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, {
      headers: {
        'X-Shopify-Access-Token': auricleAdmin.token,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Shopify API error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    all.push(...(data.products || []));

    const link = res.headers.get('link');
    nextUrl = null;
    if (link) {
      const match = link.match(/<([^>]+)>;\s*rel="next"/);
      if (match) nextUrl = match[1];
    }

    console.log(`Fetched ${all.length} products so far...`);
  }

  return all;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting product sync from Shopify...');
    const products = await fetchAllProducts();
    console.log(`Fetched ${products.length} products`);

    let synced = 0;
    let errors = 0;

    for (const sp of products) {
      try {
        const productData = {
          shopify_product_id: String(sp.id),
          title: sp.title,
          handle: sp.handle,
          description: sp.body_html,
          status: sp.status?.toUpperCase() ?? 'DRAFT',
          vendor: sp.vendor,
          product_type: sp.product_type,
          tags: sp.tags ? sp.tags.split(', ').filter(Boolean) : [],
          published_at: sp.published_at,
          updated_at: new Date().toISOString(),
        };

        const { data: product, error: productError } = await supabaseAdmin
          .from('products')
          .upsert(productData, { onConflict: 'shopify_product_id' })
          .select('id')
          .single();

        if (productError) {
          console.error(`Error upserting product ${sp.id}:`, productError.message);
          errors++;
          continue;
        }

        // Sync variants
        if (product && sp.variants?.length > 0) {
          for (const sv of sp.variants) {
            const { error: variantError } = await supabaseAdmin
              .from('variants')
              .upsert(
                {
                  product_id: product.id,
                  shopify_variant_id: String(sv.id),
                  title: sv.title,
                  price: sv.price ? parseFloat(sv.price) : null,
                  compare_at_price: sv.compare_at_price ? parseFloat(sv.compare_at_price) : null,
                  sku: sv.sku || null,
                  barcode: sv.barcode || null,
                  inventory_quantity: sv.inventory_quantity ?? 0,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'shopify_variant_id' }
              );

            if (variantError) {
              console.error(`Error upserting variant ${sv.id}:`, variantError.message);
            }
          }
        }

        // Sync images
        if (product && sp.images?.length > 0) {
          await supabaseAdmin.from('product_images').delete().eq('product_id', product.id);

          const images = sp.images.map((img, idx) => ({
            product_id: product.id,
            shopify_image_id: String(img.id),
            src: img.src,
            alt_text: img.alt || null,
            position: img.position ?? idx + 1,
            updated_at: new Date().toISOString(),
          }));

          const { error: imgError } = await supabaseAdmin.from('product_images').insert(images);
          if (imgError) {
            console.error(`Error inserting images for product ${sp.id}:`, imgError.message);
          }
        }

        synced++;
      } catch (err: any) {
        console.error(`Error processing product ${sp.id}:`, err.message);
        errors++;
      }
    }

    console.log(`Product sync complete: ${synced} synced, ${errors} errors`);
    return res.status(200).json({ success: true, total: products.length, synced, errors });
  } catch (error: any) {
    console.error('Product sync failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
