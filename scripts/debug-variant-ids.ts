/**
 * Debug script to check variant ID formats
 * Compares GraphQL IDs stored in DB vs REST API numeric IDs
 */

import 'dotenv/config';
import { shopifyAdminGetProductVariantCosts, auricleAdmin } from '../src/lib/shopifyAdmin.js';
import { supabaseAdmin } from '../src/lib/supabase.js';

async function main() {
  // Get first product from Supabase
  const { data: products, error: err } = await supabaseAdmin
    .from('products')
    .select('*')
    .limit(1);

  if (err || !products || products.length === 0) {
    console.error('No products found:', err);
    return;
  }

  const product = products[0];
  console.log('📦 Product:', product.title);
  console.log('   Shopify ID:', product.shopify_product_id);

  // Get variants from Supabase
  const { data: variants, error: varErr } = await supabaseAdmin
    .from('variants')
    .select('*')
    .eq('product_id', product.id);

  if (varErr) {
    console.error('Error fetching variants:', varErr);
    return;
  }

  console.log(`\n📊 Variants in Supabase (${variants?.length || 0}):`);
  variants?.forEach((v) => {
    console.log(`   - SKU: ${v.sku || 'NO_SKU'}`);
    console.log(`     shopify_variant_id = "${v.shopify_variant_id}"`);
    console.log(`     cost = ${v.cost}`);
  });

  // Get variant costs from REST API
  console.log('\n🔄 Calling REST API for variant costs...');
  const restCosts = await shopifyAdminGetProductVariantCosts(auricleAdmin, product.shopify_product_id);
  console.log(`   Returned ${restCosts.length} variant costs:`);
  restCosts.forEach((c) => {
    console.log(`   - Numeric ID: "${c.id}", cost = ${c.cost}`);
  });

  if (restCosts.length > 0 && variants && variants.length > 0) {
    console.log('\n🔍 ID Format Match Check:');
    const supabaseId = variants[0].shopify_variant_id;
    const restId = restCosts[0].id;
    
    console.log(`   Supabase stores: "${supabaseId}"`);
    console.log(`   REST API returns: "${restId}"`);
    
    if (supabaseId === restId) {
      console.log('\n   ✅ IDs MATCH! Database updates will now work correctly.');
    } else {
      console.log('\n   ❌ IDs do NOT match - database updates will fail');
    }
  }
}

main().catch(console.error);
