import type { NextApiRequest, NextApiResponse } from 'next';
import { COOKIE_NAME, setCustomerCookie } from '@/lib/cookies';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!; // keep your existing var name
const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`;
const ADMIN_API_KEY = process.env.SHOPIFY_ADMIN_API_KEY!;
const WHOLESALE_TAG = (process.env.NEXT_PUBLIC_WHOLESALE_TAG || 'Approved').toLowerCase();

/** ---- Types ---- */
type SFMetafield = { value?: string | null } | null | undefined;

type StorefrontCustomer = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  tags?: string[];
  phone?: string | null;
  acceptsMarketing?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
  defaultAddress?: unknown;
  addresses?: unknown;
  metafield?: SFMetafield;
  websiteMetafield?: SFMetafield;
  socialMetafield?: SFMetafield;
};

type StorefrontResp = {
  data?: { customer?: StorefrontCustomer | null };
  errors?: unknown;
};

type AdminSearchCustomer = { id: number; tags?: string };
type AdminSearchResp = { customers?: AdminSearchCustomer[] };

type AdminMetafield = { key: string; value?: string | null };
type AdminMetafieldsResp = { metafields?: AdminMetafield[] };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  const query = /* GraphQL */ `
    query customer($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        id
        firstName
        lastName
        tags
        email
        phone
        acceptsMarketing
        createdAt
        updatedAt

        metafield(namespace: "custom", key: "approved") { value }
        websiteMetafield: metafield(namespace: "custom", key: "website") { value }
        socialMetafield:  metafield(namespace: "custom", key: "social")  { value }

        defaultAddress {
          id firstName lastName company address1 address2 city province country zip phone
        }
        addresses(first: 10) {
          edges { node { id firstName lastName company address1 address2 city province country zip phone } }
        }
      }
    }
  `;

  const variables = { customerAccessToken: token };

  try {
    // ---- Storefront fetch (base customer) ----
    const response = await fetch(STOREFRONT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = (await response.json()) as StorefrontResp;
    const sfCustomer = json.data?.customer ?? null;

    if (json.errors || !sfCustomer) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Prefer Storefront tags first (they might already be there)
    let tags: string[] = Array.isArray(sfCustomer.tags) ? sfCustomer.tags : [];

    // Optional extra fields
    let website = sfCustomer.websiteMetafield?.value || '';
    let social  = sfCustomer.socialMetafield?.value  || '';

    // ---- Admin API enrichment (reliable tags + metafields fallback) ----
    if (sfCustomer.email) {
      const adminSearchUrl =
        `https://${SHOPIFY_DOMAIN}/admin/api/2024-04/customers/search.json?query=email:${encodeURIComponent(sfCustomer.email)}`;

      const adminRes = await fetch(adminSearchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': ADMIN_API_KEY,
        },
      });

      const adminJson = (await adminRes.json()) as AdminSearchResp;
      const adminCustomer = adminJson.customers?.[0];

      if (adminCustomer) {
        // Tags from Admin (CSV → array)
        if (adminCustomer.tags && typeof adminCustomer.tags === 'string') {
          tags = adminCustomer.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        }

        // If website/social missing, check Admin metafields
        if (!website || !social) {
          const mfUrl =
            `https://${SHOPIFY_DOMAIN}/admin/api/2024-07/customers/${adminCustomer.id}/metafields.json?namespace=custom`;

          const metafieldRes = await fetch(mfUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': ADMIN_API_KEY,
            },
          });

          const metafieldJson = (await metafieldRes.json()) as AdminMetafieldsResp;
          const mfs = metafieldJson.metafields ?? [];

          for (const mf of mfs) {
            if (!website && mf.key === 'website') website = mf.value || '';
            if (!social  && mf.key === 'social')  social  = mf.value || '';
          }
        }
      }
    }

    // ---- Approval flag (case-insensitive, driven by env) ----
    const approved = (tags ?? []).some((t) => (t || '').toLowerCase() === WHOLESALE_TAG);

    // Refresh cookie lifetime
    setCustomerCookie(res, token);

    // Return merged customer (ensure tags + approved are present)
    return res.status(200).json({
      success: true,
      customer: {
        ...sfCustomer,
        website,
        social,
        tags,
        approved,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}
