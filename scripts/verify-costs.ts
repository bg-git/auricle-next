/**
 * Verify variant costs after sync
 */

import 'dotenv/config';
import { supabaseAdmin } from '../src/lib/supabase.js';

async function main() {
  // Get all variants to count costs
  const { data: allVariants, error: allErr, count: totalCount } = await supabaseAdmin
    .from('variants')
    .select('*', { count: 'exact' });

  if (allErr) {
    console.error('Error fetching variants:', allErr);
    return;
  }

  const variants = allVariants || [];
  const withCosts = variants.filter((v) => v.cost !== null && v.cost > 0).length;
  const nullCosts = variants.filter((v) => v.cost === null).length;

  console.log('📊 Cost Distribution:');
  console.log(`   Total variants: ${variants.length}`);
  console.log(`   With costs (> 0): ${withCosts}`);
  console.log(`   NULL costs: ${nullCosts}`);

  if (withCosts > 0) {
    console.log('\n✅ SUCCESS! Some variants now have costs.');

    const samplesWithCost = variants
      .filter((v) => v.cost !== null && v.cost > 0)
      .slice(0, 3);

    console.log(`\n   Sample variants with costs:`);
    samplesWithCost.forEach((s) => {
      console.log(`   - ${s.sku}: cost=$${s.cost} member_price=$${s.member_price}`);
    });
  } else {
    console.log('\n⚠️  No variants have costs > 0');
    console.log('   This likely means Shopify variants don\'t have costs configured.');

    const samples = variants.slice(0, 3);
    console.log(`\n   Sample variants:`);
    samples.forEach((s) => {
      console.log(`   - ${s.sku}: price=$${s.price}, cost=${s.cost}, member_price=$${s.member_price}`);
    });
  }
}

main().catch(console.error);
