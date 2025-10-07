import type { GetServerSideProps, GetServerSidePropsContext } from 'next';
import ProductPage from '@/pages/product/[handle]'; // reuse your existing UI
import { shopifyFetch } from '@/lib/shopify';
import { mapStyledByYou } from '@/lib/mapStyledByYou';
import type { ComponentProps } from 'react';

type PDPProps = ComponentProps<typeof ProductPage>;
type PDPProduct = PDPProps extends { product: infer T } ? T : never;


// Safely parse middleware header
function safeParse<T>(s: string | string[] | undefined): T | null {
  if (typeof s !== 'string') return null;
  try { return JSON.parse(s) as T; } catch { return null; }
}

// Minimal shapes for local normalization (avoid importing PDP internals)
type MF = { key?: string | null; value?: string | null } | null | undefined;
type VariantNodeRaw = {
  id: string;
  title: string;
  price: { amount: string };
  availableForSale: boolean;
  quantityAvailable: number | null;
  selectedOptions: { name: string; value: string }[];
  sku: string | null;
  image?: { url: string; width: number; height: number; altText: string | null } | null;
};
type ProductRaw = {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  tags?: string[];
  priceRange: { minVariantPrice: { amount: string } };
  images: { edges: { node: { url: string; width: number; height: number; altText: string | null } }[] };
  variants: { edges: { node: VariantNodeRaw }[] };
  metafields: MF[];
  twin?: { value?: string | null } | null;
  styledByYou?: { references?: { edges?: unknown[] } | null } | null;
};

// Normalize product so it matches PDP expectations (no nulls for quantityAvailable, etc.)
function normalizeProduct(p: ProductRaw): PDPProduct {
  return {
    ...p,
    tags: Array.isArray(p.tags) ? p.tags : [],
    images: {
      edges: (p.images?.edges ?? []).map((e) => ({
        node: {
          url: e.node.url,
          width: e.node.width,
          height: e.node.height,
          altText: e.node.altText ?? null,
        },
      })),
    },
    variants: {
      edges: (p.variants?.edges ?? []).map((e) => ({
        node: {
          ...e.node,
          // PDP type expects number, not number | null
          quantityAvailable: e.node.quantityAvailable ?? 0,
          sku: e.node.sku ?? '',
          image: e.node.image
            ? {
                url: e.node.image.url,
                width: e.node.image.width,
                height: e.node.image.height,
                altText: e.node.image.altText ?? null,
              }
            : null,
          selectedOptions: (e.node.selectedOptions ?? []).map((o) => ({
            name: o.name,
            value: o.value,
          })),
        },
      })),
    },
    metafields: (p.metafields ?? []).filter(Boolean),
    twin: p.twin ?? null,
    styledByYou: p.styledByYou ?? { references: { edges: [] } },
  } as unknown as PDPProduct;
}

type CustomerHint = { approved?: boolean; tags?: string[] };

export default function WholesaleProduct(props: PDPProps) {
  return <ProductPage {...props} />;
}



export const getServerSideProps: GetServerSideProps<PDPProps> = async (
  ctx: GetServerSidePropsContext
) => {
  const handle = ctx.params?.handle as string;

  // Read approval from middleware header
  const raw = ctx.req.headers['x-customer'];
  const customer = safeParse<CustomerHint>(Array.isArray(raw) ? raw[0] : raw);
  const hasApprovedTag =
    Array.isArray(customer?.tags) &&
    customer!.tags.map((t) => t.toLowerCase()).includes('approved');
  const isApproved = Boolean(customer?.approved === true || hasApprovedTag);

  // 1) Fetch RETAIL product (same as PDP)
  const retailQuery = `
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id handle title descriptionHtml tags
        priceRange { minVariantPrice { amount } }
        twin: metafield(namespace: "custom", key: "twin_product") { value }

        images(first: 5) {
          edges { node { url(transform: { maxWidth: 1600, preferredContentType: WEBP }) width height altText } }
        }

        variants(first: 10) {
          edges { node {
            id title price { amount } availableForSale quantityAvailable
            selectedOptions { name value }
            sku
            image { url width height altText }
          } }
        }

        metafields(identifiers: [
          { namespace: "custom", key: "alloy" },
          { namespace: "custom", key: "metal" },
          { namespace: "custom", key: "metal_colour" },
          { namespace: "custom", key: "thread_type" },
          { namespace: "custom", key: "gem_type" },
          { namespace: "custom", key: "gem_colour" },
          { namespace: "custom", key: "name" },
          { namespace: "custom", key: "title" },
          { namespace: "custom", key: "sku" },
          { namespace: "custom", key: "width" },
          { namespace: "custom", key: "height" },
          { namespace: "custom", key: "length" },
          { namespace: "custom", key: "gauge" },
          { namespace: "custom", key: "sold_as" },
          { namespace: "custom", key: "shipping" },
          { namespace: "custom", key: "base_size" },
          { namespace: "custom", key: "variants" },
          { namespace: "custom", key: "variant_label" },
          { namespace: "custom", key: "fitting" },
          { namespace: "custom", key: "noindex" },
          { namespace: "custom", key: "redirect_handle" }
        ]) { key value }

        styledByYou: metafield(namespace: "custom", key: "styled_by_you") {
          references(first: 50) { edges { node { __typename } } }
        }
      }
    }
  `;
  const retailRes = await shopifyFetch({ query: retailQuery, variables: { handle } });
  const retail = retailRes?.productByHandle as ProductRaw | null;
  if (!retail) return { notFound: true };

  // Redirect if product-level redirect is set
  const redirectHandle =
    (retail.metafields ?? []).find((m) => m?.key === 'redirect_handle')?.value ?? null;
  if (redirectHandle && redirectHandle !== retail.handle) {
    const destination = /^https?:\/\//i.test(redirectHandle)
      ? (redirectHandle as string)
      : `/product/${encodeURIComponent(redirectHandle as string)}`;
    return { redirect: { destination, permanent: true } };
  }

  // noindex logic (match PDP) — set header, don't redeclare later
  const mfNoindex = (retail.metafields ?? []).some(
    (m) => m?.key === 'noindex' && m?.value === 'true'
  );
  const tagNoindex =
    (retail.tags ?? []).includes('NOINDEX') ||
    (retail.tags ?? []).includes('channel:wholesale');
  const noindex = mfNoindex || tagNoindex;
  if (noindex) {
    ctx.res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }

  // 2) Choose product: retail by default, twin if approved
  const twinId = retail.twin?.value ?? null;
  let product: PDPProduct = normalizeProduct(retail);

  if (isApproved && twinId) {
    const twinQuery = `
      query TwinById($id: ID!) {
        node(id: $id) {
          ... on Product {
            id handle title descriptionHtml tags
            priceRange { minVariantPrice { amount } }
            images(first: 5) { edges { node { url width height altText } } }
            variants(first: 10) {
              edges { node {
                id title price { amount } availableForSale quantityAvailable
                selectedOptions { name value }
                sku
                image { url width height altText }
              } }
            }
            metafields(identifiers: [
              { namespace: "custom", key: "alloy" },
              { namespace: "custom", key: "metal" },
              { namespace: "custom", key: "metal_colour" },
              { namespace: "custom", key: "thread_type" },
              { namespace: "custom", key: "gem_type" },
              { namespace: "custom", key: "gem_colour" },
              { namespace: "custom", key: "name" },
              { namespace: "custom", key: "title" },
              { namespace: "custom", key: "sku" },
              { namespace: "custom", key: "width" },
              { namespace: "custom", key: "height" },
              { namespace: "custom", key: "length" },
              { namespace: "custom", key: "gauge" },
              { namespace: "custom", key: "sold_as" },
              { namespace: "custom", key: "shipping" },
              { namespace: "custom", key: "base_size" },
              { namespace: "custom", key: "variants" },
              { namespace: "custom", key: "variant_label" },
              { namespace: "custom", key: "fitting" }
            ]) { key value }
          }
        }
      }
    `;
    const twinRes = await shopifyFetch({ query: twinQuery, variables: { id: twinId } });
    const twinNode = twinRes?.node as ProductRaw | null;
    if (twinNode) product = normalizeProduct(twinNode);
  }

  // 3) UGC items from retail metaobject (same as PDP)
  const ugcItems = mapStyledByYou(
    (retail.styledByYou?.references?.edges ?? []) as Parameters<typeof mapStyledByYou>[0],
    retail.id
  );

  const props: PDPProps = {
  product,
  ugcItems,
  twinId,
  retailTitle: retail.title,
  retailMinPrice: retail.priceRange?.minVariantPrice?.amount ?? '0',
};
return { props };

};
