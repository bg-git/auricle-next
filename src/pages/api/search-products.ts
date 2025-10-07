import type { NextApiRequest, NextApiResponse } from 'next';
import { shopifyFetch } from '@/lib/shopify';

const SEARCH_QUERY = `
  query searchProducts($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          handle
          images(first: 1) {
            edges {
              node { url }
            }
          }
          variants(first: 1) {
            edges {
              node { sku }
            }
          }
        }
      }
    }
  }
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

/** Build a retail-only scoped query */
const base = q
  ? `(title:*${q}* OR product_type:*${q}* OR tag:*${q}*)`
  : `*`;
const scoped = `${base} AND tag:'channel:retail'`; // ← key line: only retail

try {
  const data = await shopifyFetch({
    query: SEARCH_QUERY,
    variables: { query: scoped, first: 20 }, // ← use scoped
  });


    type ImageEdge = { node: { url: string | null } };
type VariantEdge = { node: { sku: string | null } };
type ProductNode = {
  id: string;
  title: string;
  handle: string;
  images?: { edges?: ImageEdge[] };
  variants?: { edges?: VariantEdge[] };
};

const edges: { node: ProductNode }[] = data?.products?.edges ?? [];

const products = edges
  .map(({ node }) => {
    const firstImage = node.images?.edges?.[0]?.node?.url ?? null;
    const firstSku = node.variants?.edges?.[0]?.node?.sku ?? '';
    return {
      id: node.id || '',
      title: node.title || '',
      handle: node.handle || '',
      image: firstImage,
      sku: (firstSku || '').trim(),
    };
  })
  .filter(
    (p): p is { id: string; title: string; handle: string; image: string | null; sku: string } =>
      Boolean(p.id && p.title && p.handle)
  );


    return res.status(200).json({ products });
  } catch (err) {
    console.error('Search API error:', err);
    return res.status(500).json({ message: 'Failed to fetch products' });
  }
}
