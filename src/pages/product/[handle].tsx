import type {
  GetStaticProps,
  GetStaticPaths,
  GetStaticPropsContext,
} from 'next';
import { shopifyFetch } from '@/lib/shopify';
import { useCart } from '@/context/CartContext';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Seo from '@/components/Seo';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useMemo } from 'react';
import { mapStyledByYou } from "@/lib/mapStyledByYou";
import type { UGCItem } from "@/components/StyledByYou";
import ProductGallery from "@/components/ProductGallery";
import dynamic from 'next/dynamic';


// ✅ Lazy-loaded, non-critical UI
const StyledByYouLazy = dynamic(() => import('@/components/StyledByYou'), {
  ssr: false,
  loading: () => null,
});
const FavouriteToggleLazy = dynamic(() => import('@/components/FavouriteToggle'), {
  ssr: false,
  loading: () => null,
});

// TYPES
interface Metafield {
  key?: string | null;
  value?: string | null;
}
type StrictMetafield = { key: string; value: string };

function isStrictMetafield(m: Metafield | null | undefined): m is StrictMetafield {
  return !!m && typeof m.key === 'string' && typeof m.value === 'string';
}


interface ProductVariantNode {
  id: string;
  title: string;
  price: {
    amount: string;
  };
  availableForSale: boolean;
  quantityAvailable: number;
  selectedOptions: {
    name: string;
    value: string;
  }[];
  image?: {
    url: string;
    width: number;
    height: number;
    altText: string | null;
  } | null;
  sku: string;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  tags?: string[];
  priceRange: {
    minVariantPrice: {
      amount: string;
    };
  };
  images: {
    edges: {
      node: {
        url: string;
        altText: string | null;
        width: number;
        height: number;
      };
    }[];
  };
  variants: {
    edges: {
      node: ProductVariantNode;
    }[];
  };
  metafields: Metafield[];
}
interface ProductPageProps {
  product: Product;
  ugcItems: UGCItem[];
  twinId?: string | null;
 /** Optional: when wholesale SSR is used, keep retail title & retail schema price */
retailTitle?: string;
retailMinPrice?: string; // number as string, like Shopify
}

type GalleryImage = {
  url: string;
  width: number;
  height: number;
  alt?: string | null;
  isUGC?: boolean;
  credit?: string;
};

export default function ProductPage({ product, ugcItems, twinId }: ProductPageProps) {
  
  const { isApproved, authReady } = useAuth();

  // wholesale override (when user is Approved)
const [overrideProduct, setOverrideProduct] = useState<Product | null>(null);

// fetch wholesale twin after mount if allowed
useEffect(() => {
  let cancelled = false;
  (async () => {
    if (isApproved && twinId) {
      try {
        const res = await fetch('/api/shopify/product-by-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: twinId }),
        });
        const json = await res.json();
        const twin = json?.product as Product | null;
        if (!cancelled && twin) setOverrideProduct(twin);
      } catch {
        // fail silently; stay on retail
      }
    } else {
      // if user lost approval or no twin, revert to retail
      setOverrideProduct(null);
    }
  })();
  return () => { cancelled = true; };
}, [isApproved, twinId]);

// use P everywhere instead of product
const P: Product = (overrideProduct ?? product) as Product;

  const { addToCart, openDrawer } = useCart();
  const { showToast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);


// Price is safe to show when:
// - auth has hydrated, AND
// - user is not approved (retail), OR there's no twin to fetch, OR we've loaded the twin
const priceReady =
  authReady && (!isApproved || !twinId || overrideProduct !== null);

  
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [showVariantImage, setShowVariantImage] = useState(false);
  const [qty, setQty] = useState(0);

  const variantEdges = useMemo(() => P?.variants?.edges || [], [P]);
  const defaultVariant = useMemo<ProductVariantNode | null>(() => {
  const nodes = (variantEdges || []).map(v => v.node);
  if (nodes.length === 0) return null;

  // Prefer first in-stock variant; otherwise fall back to the first variant
  const firstInStock = nodes.find(
    v => v.availableForSale && (v.quantityAvailable ?? 0) > 0
  );
  return firstInStock ?? nodes[0];
}, [variantEdges]);


  useEffect(() => {
    if (!defaultVariant) {
      setSelectedVariantId(null);
      setQty(0);
      return;
    }
    setSelectedVariantId(defaultVariant.id);
    setShowVariantImage(false);
    setQty(
      defaultVariant.availableForSale && (defaultVariant.quantityAvailable ?? 0) > 0
        ? 1
        : 0
    );
  }, [router.asPath, P?.id, defaultVariant]);



  
  useEffect(() => {
    const v = variantEdges.find(e => e.node.id === selectedVariantId)?.node;
    if (!v) return;
    setQty((v.quantityAvailable ?? 0) > 0 ? 1 : 0);
    if (!v.image) {
      setShowVariantImage(false);
    }
  }, [selectedVariantId, variantEdges]);


  const selectedVariant = P?.variants?.edges?.find(
    v => v.node.id === selectedVariantId
  )?.node;

  // Build the combined gallery: official image first, optional variant image,
  // then up to 2 “Styled By You” images
  const galleryImages = useMemo<GalleryImage[]>(() => {
    const official: GalleryImage[] =
  (P.images?.edges || [])
    .slice(0, 1)
    .map(({ node }) => ({
      url: node.url,
      width: node.width,
      height: node.height,
      alt: node.altText || product.title,

      isUGC: false,
    }));

const variantImg: GalleryImage[] =
  showVariantImage && selectedVariant?.image
    ? [{
        url: selectedVariant.image.url,
        width: selectedVariant.image.width,
        height: selectedVariant.image.height,
        alt: selectedVariant.image.altText || product.title,

        isUGC: false,
      }]
    : [];


    const sby: GalleryImage[] = (ugcItems || []).slice(0, 2).map((it) => ({
      url: it.image.url,
      width: it.image.width,
      height: it.image.height,
      alt: it.alt || "Styled by you",
      isUGC: true,
      credit: it.credit || undefined,
    }));

    // De-dupe by base URL, preserving order
    const seen = new Set<string>();
    return [...official, ...variantImg, ...sby].filter((img) => {
      const base = img.url.split("?")[0];
      if (seen.has(base)) return false;
      seen.add(base);
      return true;
    });
  },[ P.images, product.title, ugcItems, selectedVariant?.image, showVariantImage ]
);


  const isSoldOut =
    !selectedVariant?.availableForSale ||
    selectedVariant?.quantityAvailable <= 0;

  const maxQty = selectedVariant?.quantityAvailable ?? 9999;

  const rawPrice = selectedVariant
  ? parseFloat(selectedVariant.price.amount)
  : parseFloat(P?.priceRange?.minVariantPrice?.amount || '0');

  const formattedPrice = rawPrice % 1 === 0 ? rawPrice.toFixed(0) : rawPrice.toFixed(2);

  const metafields = useMemo<StrictMetafield[]>(
  () => (Array.isArray(P?.metafields) ? P.metafields.filter(isStrictMetafield) : []),
  [P?.metafields]
);


  const getFieldValue = (key: string): string | null => {
  const field = metafields.find((f) => f.key === key);
  if (!field?.value) return null;
  const value = field.value.trim();
    if (!value.startsWith('{') && !value.startsWith('[')) {
      return value;
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.join(', ') : String(parsed);
    } catch {
      return value;
    }
  };

  const selectedSku = selectedVariant?.sku || getFieldValue('sku');

  const currentVariantLabel = getFieldValue('variant_label') || 'Select an option';
  const rawVariants = getFieldValue('variants');

  const variantOptions = rawVariants
    ? rawVariants.split(',').map((entry: string) => {
        const [label, url] = entry.trim().split('::');
        return { label: label?.trim(), url: url?.trim() };
      })
    : [];

  const cellLabelStyle = {
    padding: '8px',
    fontWeight: 500,
    background: '#f9f9f9',
    border: '1px solid #e0e0e0',
    textTransform: 'uppercase' as const,
    fontSize: '12px',
    width: '40%',
  };

  const cellValueStyle = {
    padding: '8px',
    border: '1px solid #e0e0e0',
    fontSize: '14px',
    width: '60%',
  };

  const fieldLabels = {
    title: 'Title',
    name: 'Name',
    sku: 'SKU',
    metal: 'Metal',
    alloy: 'Alloy',
    metal_colour: 'Metal Colour',
    thread_type: 'Thread Type',
    fitting: 'Fitting',
    gem_type: 'Gem Type',
    gem_colour: 'Gem Colour',
    gauge: 'Gauge',
    base_size: 'Base Size',
    length: 'Length',
    width: 'Width',
    height: 'Height',
    sold_as: 'Sold As',
    shipping: 'Shipping'
  };




  // ✅ Viewport-gate "Styled By You"
  const sbyAnchorRef = useRef<HTMLDivElement | null>(null);
  const [showSBY, setShowSBY] = useState(false);

  useEffect(() => {
    const el = sbyAnchorRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowSBY(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ✅ Idle-load FavouriteToggle (with proper typing from src/types/idle-callback.d.ts)
  const [showFav, setShowFav] = useState(false);
  useEffect(() => {
    let cancel: (() => void) | undefined;

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setShowFav(true));
      cancel = () => {
        if (typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(id as number);
        }
      };
    } else {
      const t = window.setTimeout(() => setShowFav(true), 300);
      cancel = () => window.clearTimeout(t);
    }

    return () => { if (cancel) cancel(); };
  }, []);

  if (!product) {
    return <div style={{ padding: '16px' }}>Product not found.</div>;
  }

  return (
    <>
      <Seo
  title={getFieldValue('title') || product.title}

  description={getFieldValue('description') || `Buy ${product.title} in 14k gold or titanium.`}

  canonical={`https://www.auricle.co.uk/product/${P.handle ?? router.query.handle}`}
/>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.title,

            "image": P.images?.edges?.map(img => img?.node?.url).filter(Boolean),
            "description": P.metafields?.find((m) => m?.key === "description")?.value || "",
            "sku": P.metafields?.find((m) => m?.key === "sku")?.value || "",
            "brand": {
              "@type": "Brand",
              "name": "AURICLE"
            },
            "offers": {
              "@type": "Offer",
              "url": `https://www.auricle.co.uk/product/${P.handle ?? router.query.handle}`,
              "priceCurrency": "GBP",
              "price": "0.01",
              "availability": "https://schema.org/InStock",
              "priceSpecification": {
                "@type": "UnitPriceSpecification",
                "priceCurrency": "GBP",
                "price": "0.01"
              }
            }
          })
        }}
      />

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
        <div className="product-layout">
          <div className="product-image" style={{ position: 'relative' }}>
            <ProductGallery
              images={galleryImages}
              defaultActive={showVariantImage ? 1 : 0}
            />

            <div className="fav-wrapper">
              {showFav ? (
                <FavouriteToggleLazy
  handle={router.query.handle as string}
  title={product.title}

  image={galleryImages[0]?.url || '/placeholder.png'}
  price={formattedPrice}
  metafields={metafields}   // now StrictMetafield[]
/>
              ) : (
                <span className="fav-placeholder" />
              )}
            </div>
          </div>

          <div className="product-info">
  <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
    {product.title}


  </h1>

  <p
    style={{
      fontSize: '12px',
      color: '#666',
      marginTop: '10px',
      marginBottom: '16px',
      textAlign: 'left',
      minHeight: 18,
    }}
  >
    {selectedSku || ''}
  </p>

    {/* Price */}
        {/* Price (always visible) */}
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
  <div style={{ width: '80px', height: '24px', position: 'relative' }}>
    {mounted && priceReady ? (
      <span
        aria-live="polite"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          fontSize: '14px',
          fontWeight: 500,
          lineHeight: '24px',
        }}
      >
        £{formattedPrice}
      </span>
    ) : (
      // placeholder to reserve space; renders nothing visible
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          fontSize: '14px',
          fontWeight: 500,
          lineHeight: '24px',
          visibility: 'hidden',
        }}
      >
        £0
      </span>
    )}
  </div>
</div>




  {/* Variant options (unchanged) */}
  {variantOptions.length > 0 && (
    <div style={{ marginTop: '24px' }}>
      <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
        Available in:
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {variantOptions.map((variant) => {
          const isCurrent = variant.label === currentVariantLabel;
          return isCurrent ? (
            <span
              key={variant.label}
              style={{
                padding: '8px 12px',
                borderRadius: '5px',
                background: '#181818',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                border: '2px solid #181818',
              }}
            >
              {variant.label}
            </span>
          ) : (
            <Link
              key={variant.url}
              href={variant.url}
              style={{
                padding: '8px 12px',
                borderRadius: '5px',
                background: '#fff',
                color: '#181818',
                fontSize: '14px',
                fontWeight: 500,
                border: '1px solid #ccc',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              {variant.label}
            </Link>
          );
        })}
      </div>
    </div>
  )}

  {/* Variant buttons (optional: disable OOS) */}
  {P.variants?.edges?.length > 1 && (
    <div className="variant-wrapper">
      <p className="variant-label">Select an option:</p>
      <div className="variant-grid">
        {P.variants.edges.map(({ node }) => {
          const isSelected = selectedVariantId === node.id;
          const oos = !node.availableForSale || (node.quantityAvailable ?? 0) <= 0;
            return (
              <button
                key={node.id}
                onClick={() => {
                  setSelectedVariantId(node.id);
                  setShowVariantImage(true);
                }}
                className={`variant-button${isSelected ? ' selected' : ''}${oos ? ' is-disabled' : ''}`}
                disabled={oos}
                aria-disabled={oos}
                title={oos ? 'Sold out' : undefined}
                aria-label={oos ? `${node.title} (Sold out)` : undefined}
              >
                {node.title}
              </button>
            );
          })}
      </div>
    </div>
  )}

  {/* Quantity + Add to Cart (always rendered; masked when not approved) */}
  <div className="desktop-add-to-cart" style={{ marginTop: '24px' }}>
    <div style={{ display: 'flex', gap: '12px' }}>
      <label htmlFor="qty" style={{ position: 'absolute', left: '-9999px' }}>
        Quantity
      </label>

   {/* Qty control */}
<div
  style={{
    flex: '0 0 120px',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #ccc',
    borderRadius: '4px',
    overflow: 'hidden',
    paddingInline: '4px',
    opacity: isSoldOut ? 0.6 : 1,
  }}
>
  <button
    style={{
      width: '48px',
      height: '48px',
      minWidth: '48px',
      minHeight: '48px',
      background: '#fff',
      border: 'none',
      fontSize: '20px',
      cursor: isSoldOut ? 'not-allowed' : 'pointer',
    }}
    onClick={() => setQty((prev) => Math.max(isSoldOut ? 0 : 1, prev - 1))}
    disabled={isSoldOut}
    aria-disabled={isSoldOut}
    title={isSoldOut ? 'Sold out' : undefined}
  >
    −
  </button>

  <span
    id="qty"
    style={{
      width: '100%',
      height: '40px',
      textAlign: 'center',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none',
    }}
  >
    {qty}
  </span>

  <button
    style={{
      width: '48px',
      height: '48px',
      minWidth: '48px',
      minHeight: '48px',
      fontSize: '20px',
      background: '#fff',
      border: 'none',
      cursor: isSoldOut ? 'not-allowed' : 'pointer',
    }}
    onClick={() => {
      if (isSoldOut) return;
      if (maxQty <= 0) { showToast('More coming soon 😉'); return; }
      if (qty >= maxQty) { showToast(`We only have ${maxQty} available. Sorry 😞`); return; }
      setQty((prev) => prev + 1);
    }}
    disabled={isSoldOut}
    aria-disabled={isSoldOut}
    title={isSoldOut ? 'Sold out' : undefined}
  >
    +
  </button>
</div>



      {/* CTA */}
      <button
  style={{
    flex: '1',
    height: '48px',
    minHeight: '48px',
    background: '#181818',
    color: '#fff',
    border: 'none',
    fontSize: '14px',
    fontWeight: 900,
    cursor: isSoldOut ? 'not-allowed' : 'pointer',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
    opacity: isSoldOut ? 0.85 : 1,
  }}
  onClick={() => {
    if (isSoldOut) { showToast('SOLD OUT. More coming soon.'); return; }
    if (!selectedVariantId || !selectedVariant) return;

    addToCart(selectedVariantId, qty, {
  handle: router.query.handle as string,
  title: product.title,

  variantTitle: selectedVariant.title,
  selectedOptions: selectedVariant.selectedOptions,
  price: selectedVariant.price.amount,
  image: P.images?.edges?.[0]?.node?.url || undefined,
  metafields, // StrictMetafield[]
  quantityAvailable: selectedVariant.quantityAvailable,
});
    openDrawer();
  }}
  disabled={isSoldOut}
  aria-disabled={isSoldOut}
>
  {isSoldOut ? 'SOLD OUT' : 'ADD TO BAG'}
</button>


    </div>
  </div>

  {/* VAT note: show only for wholesale; keep height to avoid CLS */}
<div
  style={{
    marginTop: '10px',
    marginBottom: '16px',
    textAlign: 'right',
    minHeight: 18, // reserve space
  }}
>
  <span
    style={{
      fontSize: '12px',
      color: '#666',
      visibility: isApproved ? 'visible' : 'hidden', // no layout shift
    }}
  >
    VAT &amp; shipping calculated at checkout
  </span>
</div>


  {/* Details block (unchanged) */}
  <div style={{ marginTop: '32px' }}>
    <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Details</h2>
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '14px',
        border: '1px solid #e0e0e0',
      }}
    >
      <tbody>
        {Object.entries(fieldLabels).map(([key, label]) => {
          const value = getFieldValue(key);
          return value ? (
            <tr key={key}>
              <td style={cellLabelStyle}>{label.toUpperCase()}</td>
              <td style={cellValueStyle}>{value}</td>
            </tr>
          ) : null;
        })}
      </tbody>
    </table>

    {product.descriptionHtml && (
      <div
        style={{ marginTop: '24px', fontSize: '14px', lineHeight: '1.6' }}
        dangerouslySetInnerHTML={{ __html: P.descriptionHtml }}
      />
    )}
  </div>
</div>
</div>

        {/* ✅ Styled By You (renders when near viewport) */}
        <div
          ref={sbyAnchorRef}
          style={{ minHeight: showSBY ? undefined : '400px' }}
        >
          {showSBY ? <StyledByYouLazy items={ugcItems} /> : null}
        </div>

        <div style={{ height: '80px' }} />
        
      </main>

    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const query = `
    {
      products(first: 250, query: "tag:'channel:retail'") {
        edges { node { handle } }
      }
    }
  `;
  const data = await shopifyFetch({ query });
  const paths = data.products.edges.map(
    ({ node }: { node: { handle: string } }) => ({ params: { handle: node.handle } })
  );
  return { paths, fallback: 'blocking' };
};


export const getStaticProps: GetStaticProps<ProductPageProps> = async (
  context: GetStaticPropsContext
) => {
  const handle = context.params?.handle;

  const query = `
  query ProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      handle
      title
      descriptionHtml
      tags
      priceRange { minVariantPrice { amount } }

      twin: metafield(namespace: "custom", key: "twin_product") {
  value
}

      images(first: 5) {
        edges {
          node {
            url(transform: { maxWidth: 1600, preferredContentType: WEBP })
            width
            height
            altText
          }
        }
      }

      variants(first: 10) {
        edges {
          node {
            id
            title
            price { amount }
            availableForSale
            quantityAvailable
            selectedOptions { name value }
            sku
            image {
              url
              width
              height
              altText
            }
          }
        }
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
      ]) {
        key
        value
      }

      styledByYou: metafield(namespace: "custom", key: "styled_by_you") {
        references(first: 50) {
          edges {
            node {
              ... on Metaobject {
                id
                type
                fields {
                  key
                  value
                  reference {
                    __typename
                    ... on MediaImage {
                      image {
                        url(transform: { maxWidth: 1200, preferredContentType: WEBP })
                        width
                        height
                        altText
                      }
                    }
                    ... on Product { id }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

  const data = await shopifyFetch({ query, variables: { handle } });

const p = data?.productByHandle;
if (!p) {
  return { notFound: true };
}

const ugcItems = mapStyledByYou(
  p.styledByYou?.references?.edges ?? [],
  p.id
);
// Normalize metafields: drop nulls/empties
const metafields: Metafield[] = Array.isArray(p.metafields)
  ? (p.metafields.filter(Boolean) as Metafield[])
  : [];

// Read redirect handle from metafields
// Read redirect handle from metafields (safe)
const redirectHandle = metafields.find((m) => m?.key === 'redirect_handle')?.value?.trim();

// If redirect_handle is present and isn't the current handle, redirect
if (redirectHandle && redirectHandle !== p.handle) {
  const destination = /^https?:\/\//i.test(redirectHandle)
    ? redirectHandle
    : `/product/${encodeURIComponent(redirectHandle)}`;

  return {
    redirect: { destination, permanent: true },
  };
}

// Derive noindex flag (safe)
const mfNoindex = metafields.some((m) => m?.key === 'noindex' && m?.value === 'true');
const tags = Array.isArray(p.tags) ? p.tags : [];
const tagNoindex = tags.includes('NOINDEX') || tags.includes('channel:wholesale');
const noindex = mfNoindex || tagNoindex;


  return {
    props: {
      product: p,
      ugcItems,
      twinId: p.twin?.value ?? null,
      meta: { noindex },
    },
    revalidate: 60,
  };
};
