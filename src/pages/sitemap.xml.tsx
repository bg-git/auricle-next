// src/pages/sitemap.xml.tsx
import type { GetServerSideProps } from 'next';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const SF_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SF_VERSION = process.env.SHOPIFY_API_VERSION || '2024-04';
const SF_TOKEN =
  process.env.SHOPIFY_STOREFRONT_API_TOKEN ||
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
  '';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.auricle.co.uk';

type UrlEntry = { loc: string; lastmod?: string; changefreq?: string; priority?: string };

// Supabase row type for /piercing directory
type StudioRow = {
  area_slug: string | null;
  slug: string | null;
  updated_at?: string | null;
};

// ---------- Shopify helper ----------
async function sfFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
  const res = await fetch(`https://${SF_DOMAIN}/api/${SF_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SF_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---------- Products (retail only; exclude NOINDEX & custom.noindex) ----------
const Q_PRODUCTS = /* GraphQL */ `
  query RetailProducts($cursor: String) {
    products(
      first: 250
      after: $cursor
      query: "tag:'channel:retail' -tag:'NOINDEX'"
    ) {
      edges {
        cursor
        node {
          handle
          updatedAt
          tags
          metafield(namespace: "custom", key: "noindex") { value }
        }
      }
      pageInfo { hasNextPage }
    }
  }
`;

async function fetchRetailProductUrls(): Promise<UrlEntry[]> {
  const urls: UrlEntry[] = [];
  let cursor: string | null = null;

  for (let i = 0; i < 20; i++) {
    const json = await sfFetch<{
      data?: {
        products?: {
          edges?: Array<{
            cursor: string;
            node: {
              handle: string;
              updatedAt: string;
              tags?: string[] | null;
              metafield?: { value?: string | null } | null;
            };
          }>;
          pageInfo?: { hasNextPage?: boolean };
        };
      };
    }>(Q_PRODUCTS, { cursor });

    const edges = json?.data?.products?.edges ?? [];
    for (const e of edges) {
      const mfNoindex = e.node.metafield?.value === 'true';
      const tagNoindex = (e.node.tags ?? []).includes('NOINDEX');
      if (mfNoindex || tagNoindex) continue;
      urls.push({
        loc: `${BASE_URL}/product/${e.node.handle}`,
        lastmod: new Date(e.node.updatedAt).toISOString(),
        changefreq: 'weekly',
        priority: '0.8',
      });
    }

    const hasNext = Boolean(json?.data?.products?.pageInfo?.hasNextPage);
    if (!hasNext) break;
    cursor = edges[edges.length - 1]?.cursor ?? null;
    if (!cursor) break;
  }
  return urls;
}

// ---------- Collections (route: /collection/[handle]) ----------
const Q_COLLECTIONS = /* GraphQL */ `
  query Collections($cursor: String) {
    collections(first: 250, after: $cursor, sortKey: UPDATED_AT) {
      edges {
        cursor
        node { handle updatedAt }
      }
      pageInfo { hasNextPage }
    }
  }
`;

async function fetchCollectionUrls(): Promise<UrlEntry[]> {
  const urls: UrlEntry[] = [];
  let cursor: string | null = null;

  for (let i = 0; i < 20; i++) {
    const json = await sfFetch<{
      data?: {
        collections?: {
          edges?: Array<{ cursor: string; node: { handle: string; updatedAt: string } }>;
          pageInfo?: { hasNextPage?: boolean };
        };
      };
    }>(Q_COLLECTIONS, { cursor });

    const edges = json?.data?.collections?.edges ?? [];
    for (const e of edges) {
      urls.push({
        loc: `${BASE_URL}/collection/${e.node.handle}`,
        lastmod: new Date(e.node.updatedAt).toISOString(),
        changefreq: 'weekly',
        priority: '0.7',
      });
    }

    const hasNext = Boolean(json?.data?.collections?.pageInfo?.hasNextPage);
    if (!hasNext) break;
    cursor = edges[edges.length - 1]?.cursor ?? null;
    if (!cursor) break;
  }
  return urls;
}

// ---------- Piercing Magazine (filesystem: /content/piercing-magazine/*.md|.mdx) ----------
function fetchMagazineUrls(): UrlEntry[] {
  const urls: UrlEntry[] = [];

  // Index
  urls.push({
    loc: `${BASE_URL}/piercing-magazine/`,
    changefreq: 'weekly',
    priority: '0.5',
  });

  const dir = path.join(process.cwd(), 'content', 'piercing-magazine');
  if (!fs.existsSync(dir)) return urls;

  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && (d.name.endsWith('.md') || d.name.endsWith('.mdx')));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const slug = entry.name.replace(/\.(md|mdx)$/i, '');

    let lastmod: string | undefined;
    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const fm = matter(raw);

      // Prefer frontmatter dates if available
      const fmDate =
        (fm.data.updated as string | undefined) ||
        (fm.data.lastmod as string | undefined) ||
        (fm.data.date as string | undefined);

      if (fmDate) {
        const d = new Date(fmDate);
        if (!isNaN(d.getTime())) lastmod = d.toISOString();
      }

      // Fallback to file mtime
      if (!lastmod) {
        const stat = fs.statSync(fullPath);
        lastmod = stat.mtime.toISOString();
      }
    } catch {
      // If parsing fails, omit lastmod for this file
    }

    urls.push({
      loc: `${BASE_URL}/piercing-magazine/${encodeURIComponent(slug)}`,
      lastmod,
      changefreq: 'weekly',
      priority: '0.5',
    });
  }

  return urls;
}

// ---------- Piercing Directory (/piercing/[area] + /piercing/[area]/[company]) ----------
async function fetchPiercingUrls(): Promise<UrlEntry[]> {
  const urls: UrlEntry[] = [];

  const { data: studios } = await supabase
    .from('studios')
    .select('area_slug, slug, updated_at')
    .order('area_slug', { ascending: true });

  const rows: StudioRow[] = (studios ?? []) as StudioRow[];
  if (rows.length === 0) return urls;

  // Area index pages
  const areas = Array.from(
    new Set(rows.map((s) => s.area_slug).filter((v): v is string => Boolean(v)))
  );
  for (const area of areas) {
    urls.push({
      loc: `${BASE_URL}/piercing/${encodeURIComponent(area)}`,
      changefreq: 'weekly',
      priority: '0.6',
    });
  }

  // Studio detail pages
  for (const s of rows) {
    if (!s.area_slug || !s.slug) continue;
    const lastmod = s.updated_at ? new Date(s.updated_at).toISOString() : undefined;
    urls.push({
      loc: `${BASE_URL}/piercing/${encodeURIComponent(s.area_slug)}/${encodeURIComponent(
        s.slug
      )}`,
      lastmod,
      changefreq: 'weekly',
      priority: '0.5',
    });
  }

  return urls;
}

// ---------- XML builder ----------
function buildXml(urls: UrlEntry[]) {
  const items = urls
    .map(
      (u) => `
  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq ?? 'weekly'}</changefreq>
    <priority>${u.priority ?? '0.7'}</priority>
  </url>`.trim()
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${items}
</urlset>`;
}

// ---------- Route handler ----------
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const urls: UrlEntry[] = [];

  try {
    urls.push(...(await fetchCollectionUrls()));
  } catch { /* noop */ }

  try {
    urls.push(...(await fetchRetailProductUrls()));
  } catch { /* noop */ }

  try {
    urls.push(...fetchMagazineUrls());
  } catch { /* noop */ }

  try {
    urls.push(...(await fetchPiercingUrls()));
  } catch { /* noop */ }

  const xml = buildXml(urls);
  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();

  return { props: {} };
};

export default function SiteMap() {
  return null;
}
