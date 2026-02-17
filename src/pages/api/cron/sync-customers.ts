import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { auricleAdmin } from '@/lib/shopifyAdmin';

interface ShopifyAddress {
  id: number;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  province_code: string | null;
  country: string | null;
  country_code: string | null;
  zip: string | null;
  phone: string | null;
  default: boolean;
}

interface ShopifyCustomer {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  state: string;
  orders_count: number;
  total_spent: string;
  currency: string;
  accepts_marketing: boolean;
  tags: string;
  note: string | null;
  verified_email: boolean;
  tax_exempt: boolean;
  addresses: ShopifyAddress[];
}

async function fetchAllCustomers(): Promise<ShopifyCustomer[]> {
  const all: ShopifyCustomer[] = [];
  let nextUrl: string | null =
    `https://${auricleAdmin.domain}/admin/api/2025-01/customers.json?limit=250`;

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
    all.push(...(data.customers || []));

    const link = res.headers.get('link');
    nextUrl = null;
    if (link) {
      const match = link.match(/<([^>]+)>;\s*rel="next"/);
      if (match) nextUrl = match[1];
    }

    console.log(`Fetched ${all.length} customers so far...`);
  }

  return all;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting customer sync from Shopify...');
    const customers = await fetchAllCustomers();
    console.log(`Fetched ${customers.length} customers`);

    let synced = 0;
    let errors = 0;

    for (const sc of customers) {
      try {
        const customerData = {
          shopify_customer_id: String(sc.id),
          first_name: sc.first_name,
          last_name: sc.last_name,
          email: sc.email,
          phone: sc.phone,
          status: sc.state?.toUpperCase() || 'DISABLED',
          orders_count: sc.orders_count || 0,
          total_spent: sc.total_spent ? parseFloat(sc.total_spent) : 0,
          currency: sc.currency || 'GBP',
          accepts_marketing: sc.accepts_marketing || false,
          tags: sc.tags ? sc.tags.split(', ').filter(Boolean) : [],
          note: sc.note,
          verified_email: sc.verified_email || false,
          tax_exempt: sc.tax_exempt || false,
          updated_at: new Date().toISOString(),
        };

        const { data: customer, error: customerError } = await supabaseAdmin
          .from('customers')
          .upsert(customerData, { onConflict: 'shopify_customer_id' })
          .select('id')
          .single();

        if (customerError) {
          console.error(`Error upserting customer ${sc.id}:`, customerError.message);
          errors++;
          continue;
        }

        // Sync addresses
        if (sc.addresses?.length > 0 && customer) {
          await supabaseAdmin.from('customer_addresses').delete().eq('customer_id', customer.id);

          const addresses = sc.addresses.map((addr) => ({
            customer_id: customer.id,
            shopify_address_id: String(addr.id),
            first_name: addr.first_name,
            last_name: addr.last_name,
            company: addr.company,
            address1: addr.address1,
            address2: addr.address2,
            city: addr.city,
            province: addr.province,
            province_code: addr.province_code,
            country: addr.country,
            country_code: addr.country_code,
            zip: addr.zip,
            phone: addr.phone,
            is_default: addr.default || false,
            updated_at: new Date().toISOString(),
          }));

          const { error: addrError } = await supabaseAdmin
            .from('customer_addresses')
            .insert(addresses);

          if (addrError) {
            console.error(`Error inserting addresses for customer ${sc.id}:`, addrError.message);
          }
        }

        synced++;
      } catch (err: any) {
        console.error(`Error processing customer ${sc.id}:`, err.message);
        errors++;
      }
    }

    console.log(`Customer sync complete: ${synced} synced, ${errors} errors`);
    return res.status(200).json({ success: true, total: customers.length, synced, errors });
  } catch (error: any) {
    console.error('Customer sync failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
