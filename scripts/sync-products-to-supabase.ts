// scripts/sync-products-to-supabase.ts
/**
 * Bulk sync all products from Shopify to Supabase
 * Run: node --loader ts-node/esm scripts/sync-products-to-supabase.ts
 */

import 'dotenv/config';
import { shopifyAdminGraphql, auricleAdmin } from '../src/lib/shopifyAdmin.js';
import {
  syncProductToSupabase,
  syncProductImagesForShopifyId,
  syncVariantsForProduct,
  syncInventoryForVariant,
  getProductByShopifyId,
  getVariantsByProductId,
  getAllProducts,
} from '../src/lib/supabase.js';

const BATCH_SIZE = 50; // Shopify GraphQL batch size

interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  bodyHtml: string;
  status: string;
  images: {
    edges: Array<{
      node: {
        id: string;
        src: string;
        altText: string | null;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string | null;
        sku: string | null;
        price: string;
        compareAtPrice: string | null;
        inventoryItem: {
          unitCost: {
            amount: string | null;
            currencyCode: string;
          } | null;
        } | null;
        metafield: {
          value: string | null;
        } | null;
      };
    }>;
  };
}

interface ProductsQueryResponse {
  products: {
    edges: Array<{
      node: ShopifyProduct;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

async function fetchAllProductsFromShopify(
  cursor: string | null = null
): Promise<ProductsQueryResponse> {
  const query = `
    query GetProducts($first: Int!, $after: String) {
      products(first: $first, after: $after) {
        edges {
          node {
            id
            title
            handle
            bodyHtml
            status
            images(first: 250) {
              edges {
                node {
                  id
                  src
                  altText
                }
              }
            }
            variants(first: 250) {
              edges {
                node {
                  id
                  title
                  sku
                  price
                  compareAtPrice
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
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  return shopifyAdminGraphql<ProductsQueryResponse>(auricleAdmin, query, {
    first: BATCH_SIZE,
    after: cursor,
  });
}

async function main() {
  console.log('🚀 Starting product sync from Shopify to Supabase...\n');

  let totalSynced = 0;
  let hasNextPage = true;
  let cursor: string | null = null;

  try {
    // Get existing products in Supabase
    const existingProducts = await getAllProducts();
    const existingIds = new Set(existingProducts.map((p) => p.shopify_product_id));
    console.log(`📊 Found ${existingProducts.length} existing products in Supabase\n`);

    // Fetch and sync products in batches
    while (hasNextPage) {
      console.log(`📥 Fetching batch (cursor: ${cursor || 'null'})...`);

      const response = await fetchAllProductsFromShopify(cursor);
      const products = response.products.edges.map((edge) => edge.node);

      console.log(`   Got ${products.length} products from Shopify`);

      // Sync each product
      for (const product of products) {
        try {
          const syncedProduct = await syncProductToSupabase({
            id: product.id,
            title: product.title,
            handle: product.handle,
            bodyHtml: product.bodyHtml,
            status: product.status,
          });

          // Sync product images
          const productImages = (product.images?.edges || []).map((edge: any, idx: number) => ({
            id: edge.node.id,
            src: edge.node.src,
            alt: edge.node.altText,
            position: idx + 1,
          }));

          if (productImages.length > 0) {
            await syncProductImagesForShopifyId(product.id, productImages);
          }

          // Sync variants with pricing
          const variants = (product.variants?.edges || []).map((edge: any) => ({
            id: edge.node.id,
            title: edge.node.title,
            sku: edge.node.sku,
            price: edge.node.price,
            compareAtPrice: edge.node.compareAtPrice,
            cost: edge.node.inventoryItem?.unitCost?.amount ? parseFloat(edge.node.inventoryItem.unitCost.amount) : null,
            memberPrice: edge.node.metafield?.value,
          }));

          const syncedVariants = await syncVariantsForProduct(syncedProduct.id, variants);

          totalSynced++;
          const isNew = !existingIds.has(product.id);
          console.log(
            `   ✅ ${isNew ? '✨ NEW' : '🔄 UPDATED'}: ${product.title} (${product.id}) [${productImages.length} images, ${syncedVariants.length} variants]`
          );
        } catch (error) {
          console.error(
            `   ❌ Failed to sync ${product.title}:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      hasNextPage = response.products.pageInfo.hasNextPage;
      cursor = response.products.pageInfo.endCursor || null;

      if (hasNextPage) {
        console.log('   → More pages to fetch...\n');
      }
    }

    console.log('\n✅ Sync complete!');
    console.log(`📈 Total products synced: ${totalSynced}`);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

main();
