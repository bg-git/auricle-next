import { createClient } from '@supabase/supabase-js';

// Public client for frontend (anonymous access)
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
  : ({} as any); // Placeholder for server-only environments

// Service role client for backend (full access)
const SUPABASE_URL = process.env.SHOPIFY_SUPABASE_CLONE_URL;
const SUPABASE_SERVICE_KEY = process.env.SHOPIFY_SUPABASE_CLONE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Missing Supabase environment variables: SHOPIFY_SUPABASE_CLONE_URL and SHOPIFY_SUPABASE_CLONE_SECRET_KEY'
  );
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export type Product = {
  id: number;
  shopify_product_id: string;
  title: string;
  handle: string | null;
  description: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductImage = {
  id: number;
  product_id: number;
  shopify_image_id: string | null;
  src: string;
  alt_text: string | null;
  position: number | null;
  created_at: string;
  updated_at: string;
};

export type Variant = {
  id: number;
  product_id: number;
  shopify_variant_id: string;
  sku: string | null;
  title: string | null;
  price: number | null;
  compare_at_price: number | null;
  cost: number | null;
  member_price: number | null;
  created_at: string;
  updated_at: string;
};

export type Inventory = {
  id: number;
  variant_id: number;
  location_id: string;
  quantity: number;
  updated_at: string;
};

/**
 * Sync a product from Shopify to Supabase
 * Creates new product or updates existing one
 */
export async function syncProductToSupabase(shopifyProduct: {
  id: string | number;
  title: string;
  handle?: string;
  bodyHtml?: string;
  status?: string;
}): Promise<Product> {
  const shopifyId = String(shopifyProduct.id);

  const upsertData: Partial<Product> = {
    shopify_product_id: shopifyId,
    title: shopifyProduct.title,
    handle: shopifyProduct.handle || null,
    description: shopifyProduct.bodyHtml || null,
    status: shopifyProduct.status || 'active',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('products')
    .upsert(upsertData, {
      onConflict: 'shopify_product_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase upsert error:', error);
    throw new Error(`Failed to sync product: ${error.message}`);
  }

  return data;
}

/**
 * Get a product from Supabase by Shopify ID
 */
export async function getProductByShopifyId(
  shopifyId: string
): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('shopify_product_id', shopifyId)
    .single();

  if (error?.code === 'PGRST116') {
    return null; // Not found
  }

  if (error) {
    console.error('Supabase query error:', error);
    throw new Error(`Failed to get product: ${error.message}`);
  }

  return data;
}

/**
 * Delete a product from Supabase by Shopify ID
 */
export async function deleteProductByShopifyId(shopifyId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('shopify_product_id', shopifyId);

  if (error) {
    console.error('Supabase delete error:', error);
    throw new Error(`Failed to delete product: ${error.message}`);
  }
}

/**
 * Get all products from Supabase
 */
export async function getAllProducts(): Promise<Product[]> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase query error:', error);
    throw new Error(`Failed to get products: ${error.message}`);
  }

  return data || [];
}

/**
 * Sync product images from Shopify to Supabase
 * Deletes existing images for the product and inserts new ones
 */
export async function syncProductImagesForShopifyId(
  shopifyProductId: string,
  images: Array<{
    id?: string | number;
    src: string;
    alt?: string;
    position?: number;
  }>
): Promise<ProductImage[]> {
  // First, get the product ID from Supabase
  const product = await getProductByShopifyId(shopifyProductId);
  if (!product) {
    throw new Error(`Product not found: ${shopifyProductId}`);
  }

  // Delete existing images for this product
  const { error: deleteError } = await supabaseAdmin
    .from('product_images')
    .delete()
    .eq('product_id', product.id);

  if (deleteError) {
    console.error('Failed to delete existing images:', deleteError);
    throw new Error(`Failed to delete existing images: ${deleteError.message}`);
  }

  // Insert new images
  if (images.length === 0) {
    return [];
  }

  const imagesToInsert = images.map((img, idx) => ({
    product_id: product.id,
    shopify_image_id: img.id ? String(img.id) : null,
    src: img.src,
    alt_text: img.alt || null,
    position: img.position ?? idx + 1,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabaseAdmin
    .from('product_images')
    .insert(imagesToInsert)
    .select();

  if (error) {
    console.error('Supabase image insert error:', error);
    throw new Error(`Failed to sync images: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all images for a product
 */
export async function getProductImages(productId: number): Promise<ProductImage[]> {
  const { data, error } = await supabaseAdmin
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('position', { ascending: true });

  if (error) {
    console.error('Supabase query error:', error);
    throw new Error(`Failed to get product images: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all images for a product by Shopify ID
 */
export async function getProductImagesByShopifyId(
  shopifyProductId: string
): Promise<ProductImage[]> {
  const product = await getProductByShopifyId(shopifyProductId);
  if (!product) {
    return [];
  }

  return getProductImages(product.id);
}

/**
 * Sync variants for a product
 * Deletes existing variants and inserts new ones
 */
export async function syncVariantsForProduct(
  productId: number,
  variants: Array<{
    id: string | number;
    title?: string;
    sku?: string;
    price?: string | number | null;
    compareAtPrice?: string | number | null;
    cost?: string | number | null;
    memberPrice?: string | number | null;
    inventoryQuantity?: number | null;
    barcode?: string | null;
  }>
): Promise<Variant[]> {
  // Delete existing variants for this product
  const { error: deleteError } = await supabaseAdmin
    .from('variants')
    .delete()
    .eq('product_id', productId);

  if (deleteError) {
    console.error('Failed to delete existing variants:', deleteError);
    throw new Error(`Failed to delete existing variants: ${deleteError.message}`);
  }

  if (variants.length === 0) {
    return [];
  }

  const variantsToInsert = variants.map((v) => ({
    product_id: productId,
    shopify_variant_id: String(v.id),
    sku: v.sku || null,
    title: v.title || null,
    price: v.price ? parseFloat(String(v.price)) : null,
    compare_at_price: v.compareAtPrice ? parseFloat(String(v.compareAtPrice)) : null,
    cost: v.cost ? parseFloat(String(v.cost)) : null,
    member_price: v.memberPrice ? parseFloat(String(v.memberPrice)) : null,
    inventory_quantity: v.inventoryQuantity ?? null,
    barcode: v.barcode || null,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabaseAdmin
    .from('variants')
    .insert(variantsToInsert)
    .select();

  if (error) {
    console.error('Supabase variant insert error:', error);
    throw new Error(`Failed to sync variants: ${error.message}`);
  }

  return data || [];
}

/**
 * Sync inventory for a variant
 */
export async function syncInventoryForVariant(
  variantId: number,
  inventory: Array<{
    locationId: string;
    quantity: number;
  }>
): Promise<Inventory[]> {
  // Delete existing inventory for this variant
  const { error: deleteError } = await supabaseAdmin
    .from('inventory')
    .delete()
    .eq('variant_id', variantId);

  if (deleteError) {
    console.error('Failed to delete existing inventory:', deleteError);
    throw new Error(`Failed to delete existing inventory: ${deleteError.message}`);
  }

  if (inventory.length === 0) {
    return [];
  }

  const inventoryToInsert = inventory.map((inv) => ({
    variant_id: variantId,
    location_id: inv.locationId,
    quantity: inv.quantity,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabaseAdmin
    .from('inventory')
    .insert(inventoryToInsert)
    .select();

  if (error) {
    console.error('Supabase inventory insert error:', error);
    throw new Error(`Failed to sync inventory: ${error.message}`);
  }

  return data || [];
}

/**
 * Get variants for a product
 */
export async function getVariantsByProductId(productId: number): Promise<Variant[]> {
  const { data, error } = await supabaseAdmin
    .from('variants')
    .select('*')
    .eq('product_id', productId)
    .order('created_at');

  if (error) {
    console.error('Supabase query error:', error);
    throw new Error(`Failed to get variants: ${error.message}`);
  }

  return data || [];
}

/**
 * Get inventory for a variant
 */
export async function getInventoryByVariantId(variantId: number): Promise<Inventory[]> {
  const { data, error } = await supabaseAdmin
    .from('inventory')
    .select('*')
    .eq('variant_id', variantId);

  if (error) {
    console.error('Supabase query error:', error);
    throw new Error(`Failed to get inventory: ${error.message}`);
  }

  return data || [];
}

/**
 * Update variant costs
 */
export async function updateVariantCosts(
  variantCosts: Array<{
    shopifyVariantId: string;
    cost: number | null;
  }>
): Promise<void> {
  for (const vc of variantCosts) {
    const { error } = await supabaseAdmin
      .from('variants')
      .update({ cost: vc.cost, updated_at: new Date().toISOString() })
      .eq('shopify_variant_id', vc.shopifyVariantId);

    if (error) {
      console.error(`Failed to update cost for variant ${vc.shopifyVariantId}:`, error);
    }
  }
}
