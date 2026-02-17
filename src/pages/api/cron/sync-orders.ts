import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { auricleAdmin } from '@/lib/shopifyAdmin';

export const config = {
  maxDuration: 300,
};

interface ShopifyLineItem {
  id: number;
  title: string;
  variant_title: string | null;
  sku: string | null;
  quantity: number;
  price: string;
  total_discount: string;
  product_id: number | null;
  variant_id: number | null;
}

interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string | null;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  currency: string;
  tags: string;
  note: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  processed_at: string | null;
  closed_at: string | null;
  customer?: { id: number } | null;
  line_items: ShopifyLineItem[];
}

async function fetchAllOrders(): Promise<ShopifyOrder[]> {
  const all: ShopifyOrder[] = [];
  let nextUrl: string | null =
    `https://${auricleAdmin.domain}/admin/api/2025-01/orders.json?limit=250&status=any`;

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
    all.push(...(data.orders || []));

    const link = res.headers.get('link');
    nextUrl = null;
    if (link) {
      const match = link.match(/<([^>]+)>;\s*rel="next"/);
      if (match) nextUrl = match[1];
    }

    console.log(`Fetched ${all.length} orders so far...`);
  }

  return all;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting order sync from Shopify...');
    const orders = await fetchAllOrders();
    console.log(`Fetched ${orders.length} orders`);

    // Pre-fetch customer ID mappings (paginate to bypass row limits)
    const customerMap = new Map<string, number>();
    let customerOffset = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data: batch } = await supabaseAdmin
        .from('customers')
        .select('id, shopify_customer_id')
        .range(customerOffset, customerOffset + PAGE_SIZE - 1);

      if (!batch || batch.length === 0) break;
      for (const c of batch) {
        customerMap.set(c.shopify_customer_id, c.id);
      }
      if (batch.length < PAGE_SIZE) break;
      customerOffset += PAGE_SIZE;
    }

    // Pre-fetch product ID mappings (paginate to bypass row limits)
    const productMap = new Map<string, number>();
    let productOffset = 0;
    while (true) {
      const { data: batch } = await supabaseAdmin
        .from('products')
        .select('id, shopify_product_id')
        .range(productOffset, productOffset + PAGE_SIZE - 1);

      if (!batch || batch.length === 0) break;
      for (const p of batch) {
        if (p.shopify_product_id) {
          productMap.set(p.shopify_product_id, p.id);
        }
      }
      if (batch.length < PAGE_SIZE) break;
      productOffset += PAGE_SIZE;
    }

    let synced = 0;
    let errors = 0;

    for (const so of orders) {
      try {
        const shopifyCustomerId = so.customer?.id ? String(so.customer.id) : null;
        const customerId = shopifyCustomerId ? customerMap.get(shopifyCustomerId) ?? null : null;

        const orderData = {
          shopify_order_id: String(so.id),
          shopify_order_number: String(so.order_number),
          customer_id: customerId,
          shopify_customer_id: shopifyCustomerId,
          email: so.email,
          financial_status: so.financial_status || 'pending',
          fulfillment_status: so.fulfillment_status,
          total_price: parseFloat(so.total_price) || 0,
          subtotal_price: parseFloat(so.subtotal_price) || 0,
          total_tax: parseFloat(so.total_tax) || 0,
          total_discounts: parseFloat(so.total_discounts) || 0,
          currency: so.currency || 'GBP',
          tags: so.tags ? so.tags.split(', ').filter(Boolean) : [],
          note: so.note,
          cancel_reason: so.cancel_reason,
          cancelled_at: so.cancelled_at,
          processed_at: so.processed_at,
          closed_at: so.closed_at,
          updated_at: new Date().toISOString(),
        };

        const { data: order, error: orderError } = await supabaseAdmin
          .from('orders')
          .upsert(orderData, { onConflict: 'shopify_order_id' })
          .select('id')
          .single();

        if (orderError) {
          console.error(`Error upserting order ${so.id}:`, orderError.message);
          errors++;
          continue;
        }

        // Sync line items
        if (order && so.line_items?.length > 0) {
          await supabaseAdmin.from('order_line_items').delete().eq('order_id', order.id);

          const lineItems = so.line_items.map((li) => {
            const shopifyProductId = li.product_id ? String(li.product_id) : null;
            const productId = shopifyProductId ? productMap.get(shopifyProductId) ?? null : null;

            return {
              order_id: order.id,
              shopify_line_item_id: String(li.id),
              title: li.title,
              variant_title: li.variant_title,
              sku: li.sku,
              quantity: li.quantity,
              price: parseFloat(li.price) || 0,
              total_discount: parseFloat(li.total_discount) || 0,
              product_id: productId,
              shopify_product_id: shopifyProductId,
              shopify_variant_id: li.variant_id ? String(li.variant_id) : null,
              updated_at: new Date().toISOString(),
            };
          });

          const { error: lineItemError } = await supabaseAdmin
            .from('order_line_items')
            .insert(lineItems);

          if (lineItemError) {
            console.error(`Error inserting line items for order ${so.id}:`, lineItemError.message);
          }
        }

        synced++;
      } catch (err: any) {
        console.error(`Error processing order ${so.id}:`, err.message);
        errors++;
      }
    }

    console.log(`Order sync complete: ${synced} synced, ${errors} errors`);
    return res.status(200).json({
      success: true,
      total: orders.length,
      synced,
      errors,
      debug: {
        customersInMap: customerMap.size,
        productsInMap: productMap.size,
      },
    });
  } catch (error: any) {
    console.error('Order sync failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
