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
  if (!q) return res.status(200).json({ products: [] });

  try {
    const data = await shopifyFetch({
      query: SEARCH_QUERY,
      variables: { query: q, first: 20 },
    });

    const products = (data?.products?.edges || [])
      .map((edge: any) => {
        const variant = edge.node?.variants?.edges?.[0]?.node || {};
        return {
          id: edge.node?.id ?? '',
          title: edge.node?.title ?? '',
          handle: edge.node?.handle ?? '',
          image: edge.node?.images?.edges?.[0]?.node?.url ?? null,
          sku: (variant?.sku || '').trim(),
        };
      })
      .filter((p: any) => p.id && p.title && p.handle);

    return res.status(200).json({ products });
  } catch (err) {
    console.error('Search API error:', err);
    return res.status(500).json({ message: 'Failed to fetch products' });
  }
}
