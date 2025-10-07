import type { NextApiRequest, NextApiResponse } from 'next';
import { COOKIE_NAME, setCustomerCookie } from '@/lib/cookies';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`;
const ADMIN_API_KEY = process.env.SHOPIFY_ADMIN_API_KEY!;

/** -------- In-memory cache for Admin tags (keyed by email) -------- */
type TagsCacheEntry = { tags: string[]; expiresAt: number };
const TAGS_TTL_MS = 0; // disable cache for instant tag updates
const tagsCache = new Map<string, TagsCacheEntry>();

function getCachedTags(email: string): string[] | null {
  if (TAGS_TTL_MS <= 0) return null;
  const key = email.toLowerCase();
  const hit = tagsCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    tagsCache.delete(key);
    return null;
  }
  return hit.tags;
}
function setCachedTags(email: string, tags: string[]) {
  if (TAGS_TTL_MS <= 0) return;
  const key = email.toLowerCase();
  tagsCache.set(key, { tags, expiresAt: Date.now() + TAGS_TTL_MS });
}

/** -------- Helpers -------- */
function parseTags(tagStr: unknown): string[] {
  if (typeof tagStr !== 'string') return [];
  return tagStr.split(',').map((t) => t.trim()).filter(Boolean);
}
function isApprovedTag(tags: string[], label = 'approved'): boolean {
  const lower = tags.map((t) => t.toLowerCase());
  return lower.includes(label.toLowerCase());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  // Optional ways to bypass cache if you really need fresh tags:
  // - Header: x-refresh-tags: 1
  // - Query:  ?refresh=1
  const forceRefresh =
    req.headers['x-refresh-tags'] === '1' ||
    req.query?.refresh === '1';

  // 1) Validate customer via Storefront
  const query = `
    query customer($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        id
        firstName
        lastName
        email
        phone
        acceptsMarketing
        createdAt
        updatedAt
        metafield(namespace: "custom", key: "approved") {
          value
        }
      }
    }
  `;
  try {
    const sfResp = await fetch(STOREFRONT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query, variables: { customerAccessToken: token } }),
    });
    const sfJson = await sfResp.json();

    if (sfJson.errors || !sfJson.data?.customer) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const customer = sfJson.data.customer as {
      id: string;
      email?: string | null;
      metafield?: { value?: string | null } | null;
      [k: string]: unknown;
    };

    // 2) Get tags (cached) via Admin, only if we have an email
    let tags: string[] = [];
    if (customer.email) {
      const cached = forceRefresh ? null : getCachedTags(customer.email);
      if (cached) {
        tags = cached;
      } else {
        const adminRes = await fetch(
          `https://${SHOPIFY_DOMAIN}/admin/api/2023-01/customers/search.json?query=email:${encodeURIComponent(
            customer.email
          )}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': ADMIN_API_KEY,
            },
          }
        );
        // If Admin is down or rate limited, degrade gracefully
        if (adminRes.ok) {
          const adminJson = await adminRes.json();
          const adminCustomer = Array.isArray(adminJson?.customers) ? adminJson.customers[0] : null;
          if (adminCustomer?.tags) {
            tags = parseTags(adminCustomer.tags);
            setCachedTags(customer.email, tags);
          }
        }
      }
    }

    // 3) Determine approval (either metafield approved=true OR tag includes "approved")
    const metaApproved = customer.metafield?.value === 'true';
    const tagApproved = isApprovedTag(tags, 'approved');
    const approved = Boolean(metaApproved || tagApproved);

    // Extend cookie lifetime on success
    setCustomerCookie(res, token);

    return res.status(200).json({
      success: true,
      customer: {
        ...customer,
        tags,
        approved,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ success: false, error: message });
  }
}
