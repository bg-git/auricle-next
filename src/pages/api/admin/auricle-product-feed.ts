// src/pages/api/admin/auricle-product-feed.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { auricleAdmin, shopifyAdminGraphql } from '@/lib/shopifyAdmin';

type FeedVariant = {
  id: number;
  gid: string;
  sku: string | null;
  price: string;           // Auricle wholesale price
  title: string;
  poaEnabled: boolean;     // from custom.poa_enabled metafield
  poaPrice: string;        // from custom.poa_price or fallback to price
};

type FeedProduct = {
  id: number;
  gid: string;
  title: string;
  handle: string;
  status: string;
  variants: FeedVariant[];
};

type MetafieldNode = {
  key: string;
  value: string;
  type: string;
};

type MetafieldEdge = {
  node: MetafieldNode;
};

type VariantNode = {
  id: string;
  sku: string | null;
  price: string;
  title: string;
  metafields: {
    edges: MetafieldEdge[];
  };
};

type VariantEdge = {
  node: VariantNode;
};

type ProductNode = {
  id: string;
  title: string;
  handle: string;
  status: string;
  variants: {
    edges: VariantEdge[];
  };
};

type ProductEdge = {
  node: ProductNode;
};

type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

type ProductsConnection = {
  edges: ProductEdge[];
  pageInfo: PageInfo;
};

type AuricleFeedQueryResult = {
  products: ProductsConnection;
};

function extractNumericId(gid: string): number {
  const parts = gid.split('/');
  const last = parts[parts.length - 1];
  const asNumber = Number(last);
  if (Number.isNaN(asNumber)) {
    throw new Error(`Cannot extract numeric ID from gid: ${gid}`);
  }
  return asNumber;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const query = `
      query AuriclePoaFeed($after: String) {
        products(first: 100, query: "status:active", after: $after) {
          edges {
            cursor
            node {
              id
              title
              handle
              status
              variants(first: 100) {
                edges {
                  node {
                    id
                    sku
                    price
                    title
                    metafields(first: 10, namespace: "custom") {
                      edges {
                        node {
                          key
                          value
                          type
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const products: ProductNode[] = [];

    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      const data = await shopifyAdminGraphql<AuricleFeedQueryResult>(
        auricleAdmin,
        query,
        { after: cursor },
      );

      products.push(...data.products.edges.map((edge) => edge.node));

      hasNextPage = data.products.pageInfo.hasNextPage;
      cursor = data.products.pageInfo.endCursor;
    }

    const feed: FeedProduct[] = products
      .filter((p) => p.status === 'ACTIVE') // ✅ only active Auricle products
      .map((p) => {
        const productId = extractNumericId(p.id);

        const variants: FeedVariant[] = p.variants.edges.map((variantEdge) => {
          const v = variantEdge.node;
          const variantId = extractNumericId(v.id);

          // Defaults if metafields are missing
          let poaEnabled = false;
          let poaPrice: string | null = null;

          for (const mfEdge of v.metafields.edges) {
            const mf = mfEdge.node;

            if (mf.key === 'poa_enabled') {
              // Boolean metafield stored as "true"/"false"
              poaEnabled = mf.value === 'true';
            }

            if (mf.key === 'poa_price') {
              poaPrice = mf.value; // decimal string like "39.95"
            }
          }

          // Fallback: if no POA price set yet, use Auricle price
          const effectivePoaPrice = poaPrice ?? v.price;

          return {
            id: variantId,
            gid: v.id,
            sku: v.sku,
            price: v.price,
            title: v.title,
            poaEnabled,
            poaPrice: effectivePoaPrice,
          };
        });

        return {
          id: productId,
          gid: p.id,
          title: p.title,
          handle: p.handle,
          status: p.status,
          variants,
        };
      });

    return res.status(200).json({ products: feed });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error building feed';

    console.error('Error building Auricle product feed', err);
    return res.status(500).json({ error: message });
  }
}
