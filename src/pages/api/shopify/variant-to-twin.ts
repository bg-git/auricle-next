import type { NextApiRequest, NextApiResponse } from 'next';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-04';
const URL = `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

type Opt = { name: string; value: string };

type VariantNode = {
  id: string;
  sku: string | null;
  selectedOptions: Opt[];
  availableForSale?: boolean | null;
};

type VariantEdgesResp = {
  data?: {
    node?: {
      // for Q_VARIANT
      id?: string;
      sku?: string | null;
      selectedOptions?: Opt[];
      product?: { metafield?: { value?: string | null } | null } | null;
      // for Q_TWIN
      variants?: { edges: { node: VariantNode }[] } | null;
    } | null;
  };
  errors?: unknown;
};

const Q_VARIANT = /* GraphQL */ `
  query VariantAndTwin($id: ID!) {
    node(id: $id) {
      ... on ProductVariant {
        id
        sku
        selectedOptions { name value }
        product {
          metafield(namespace: "custom", key: "twin_product") { value }
        }
      }
    }
  }
`;

const Q_TWIN = /* GraphQL */ `
  query TwinProduct($id: ID!) {
    node(id: $id) {
      ... on Product {
        variants(first: 100) {
          edges {
            node {
              id
              sku
              selectedOptions { name value }
              availableForSale
            }
          }
        }
      }
    }
  }
`;

function normalizeOptions(opts: Opt[]): string {
  return [...opts]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((o) => `${o.name.toLowerCase()}=${o.value.toLowerCase()}`)
    .join('|');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { variantId } = req.body as { variantId?: string };
  if (!variantId) return res.status(400).json({ error: 'Missing variantId' });

  try {
    // 1) Load source variant + its twin product id
    const vResp = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query: Q_VARIANT, variables: { id: variantId } }),
    });

    const vJson = (await vResp.json()) as VariantEdgesResp;
    const vNode = vJson.data?.node;
    const twinId = vNode?.product?.metafield?.value || null;
    if (!twinId) return res.status(200).json({ twinVariantId: null });

    const srcSku = vNode?.sku ?? null;
    const srcOpts = vNode?.selectedOptions ?? [];

    // 2) Load twin variants
    const tResp = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query: Q_TWIN, variables: { id: twinId } }),
    });

    const tJson = (await tResp.json()) as VariantEdgesResp;
    const tEdges = tJson.data?.node?.variants?.edges ?? [];
    const tVariants: VariantNode[] = tEdges.map((edge) => edge.node);

    // 3) Match by SKU first
    let match: VariantNode | undefined;
    if (srcSku) {
      const skuTrim = srcSku.trim();
      match = tVariants.find((tv) => (tv.sku || '').trim() === skuTrim);
    }

    // 4) Fallback: match by selectedOptions
    if (!match && srcOpts.length) {
      const key = normalizeOptions(srcOpts);
      match = tVariants.find((tv) => normalizeOptions(tv.selectedOptions) === key);
    }

    return res.status(200).json({ twinVariantId: match?.id ?? null });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: message });
  }
}
