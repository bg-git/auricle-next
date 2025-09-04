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
  key: string;
  value: string;
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
}

type GalleryImage = {
  url: string;
  width: number;
  height: number;
  alt?: string | null;
  isUGC?: boolean;
  credit?: string;
};

export default function ProductPage({ product, ugcItems }: ProductPageProps) {

  const { addToCart, openDrawer } = useCart();
  const { showToast } = useToast();
  const router = useRouter();

  
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [showVariantImage, setShowVariantImage] = useState(false);
  const [qty, setQty] = useState(0);

  const variantEdges = useMemo(() => product?.variants?.edges || [], [product]);
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
  }, [router.asPath, product?.id, defaultVariant]);


  const { user, refreshUser, loading } = useAuth();
  const hasRefreshed = useRef(false); 
const approved: true | false | null = loading ? null : Boolean(user?.approved);


  useEffect(() => {
    if (user && !user.approved && !hasRefreshed.current) {
      hasRefreshed.current = true;
      refreshUser();
    }
  }, [user, refreshUser]);

  useEffect(() => {
    const v = variantEdges.find(e => e.node.id === selectedVariantId)?.node;
    if (!v) return;
    setQty((v.quantityAvailable ?? 0) > 0 ? 1 : 0);
    if (!v.image) {
      setShowVariantImage(false);
    }
  }, [selectedVariantId, variantEdges]);


  const selectedVariant = product?.variants?.edges?.find(
    v => v.node.id === selectedVariantId
  )?.node;

  // Build the combined gallery: official image first, optional variant image,
  // then up to 2 “Styled By You” images
  const galleryImages = useMemo<GalleryImage[]>(() => {
    const official: GalleryImage[] =
      (product.images?.edges || [])
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
  }, [product.images, product.title, ugcItems, selectedVariant?.image, showVariantImage]);

  const isSoldOut =
    !selectedVariant?.availableForSale ||
    selectedVariant?.quantityAvailable <= 0;

  const maxQty = selectedVariant?.quantityAvailable ?? 9999;

  const rawPrice = selectedVariant
    ? parseFloat(selectedVariant.price.amount)
    : parseFloat(product?.priceRange?.minVariantPrice?.amount || '0');
  const formattedPrice = rawPrice % 1 === 0 ? rawPrice.toFixed(0) : rawPrice.toFixed(2);

  const metafields = useMemo(
    () => product?.metafields || [],
    [product?.metafields]
  );

  const getFieldValue = (key: string): string | null => {
    const field = metafields.find((f: Metafield) => f?.key === key);
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
        description={
          getFieldValue('description') || `Buy ${product.title} in 14k gold or titanium.`
        }
        canonical={`https://www.auricle.co.uk/product/${product.handle}`}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.title,
            "image": product.images?.edges?.map(img => img?.node?.url).filter(Boolean),
            "description":
              product.metafields?.find((m) => m?.key === "description")?.value || "",
            "sku": product.metafields?.find((m) => m?.key === "sku")?.value || "",
            "brand": {
              "@type": "Brand",
              "name": "AURICLE"
            },
            "offers": {
              "@type": "Offer",
              "url": `https://www.auricle.co.uk/product/${product.handle}`,
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
                  metafields={metafields}
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
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div
        style={{
          width: '80px',
          height: '24px',
          position: 'relative',
        }}
      >
        <span
          aria-live="polite"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: '24px',
            visibility: approved === true ? 'visible' : 'hidden',
            opacity: approved === true ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          £{formattedPrice}
        </span>
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
  {product.variants?.edges?.length > 1 && (
    <div className="variant-wrapper">
      <p className="variant-label">Select an option:</p>
      <div className="variant-grid">
        {product.variants.edges.map(({ node }) => {
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
          opacity: approved !== true ? 0.6 : 1,
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
            cursor: approved === true ? 'pointer' : 'not-allowed',
          }}
          onClick={() => setQty((prev) => Math.max(isSoldOut ? 0 : 1, prev - 1))}
          disabled={approved !== true}
          aria-disabled={approved !== true}
          title={approved !== true ? 'Sign in to purchase' : undefined}
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
            cursor: approved === true ? 'pointer' : 'not-allowed',
          }}
          onClick={() => {
            if (approved !== true) return;
            if (maxQty <= 0) { showToast('More coming soon 😉'); return; }
            if (qty >= maxQty) { showToast(`We only have ${maxQty} available. Sorry 😞`); return; }
            setQty((prev) => prev + 1);
          }}
          disabled={approved !== true}
          aria-disabled={approved !== true}
          title={approved !== true ? 'Sign in to purchase' : undefined}
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
          cursor: 'pointer',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          opacity: approved !== true ? 0.85 : 1,
        }}
        onClick={() => {
          if (approved !== true) {
            router.push(`/sign-in?next=${encodeURIComponent(router.asPath)}`);
            return;
          }
          if (isSoldOut) { showToast('SOLD OUT. More coming soon.'); return; }
          if (!selectedVariantId || !selectedVariant) return;

          addToCart(selectedVariantId, qty, {
            handle: router.query.handle as string,
            title: product.title,
            variantTitle: selectedVariant.title,
            selectedOptions: selectedVariant.selectedOptions,
            price: selectedVariant.price.amount,
            image: product.images?.edges?.[0]?.node?.url || undefined,
            metafields: product.metafields,
            quantityAvailable: selectedVariant.quantityAvailable,
          });
          openDrawer();
        }}
        disabled={approved !== true || isSoldOut}
        aria-disabled={approved !== true || isSoldOut}
      >
        {approved !== true ? 'SIGN IN' : (isSoldOut ? 'SOLD OUT' : 'ADD TO BAG')}
      </button>
    </div>
  </div>

  {/* VAT Note (reserve height to avoid CLS) */}
  <p
    style={{
      fontSize: '12px',
      color: '#666',
      marginTop: '10px',
      marginBottom: '16px',
      textAlign: 'right',
      minHeight: 18,
    }}
  >
    VAT & shipping calculated at checkout
  </p>

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
        dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
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
      products(first: 250) {
        edges {
          node {
            handle
          }
        }
      }
    }
  `;

  const data = await shopifyFetch({ query });

  const paths = data.products.edges.map(
    ({ node }: { node: { handle: string } }) => ({
      params: { handle: node.handle },
    })
  );

  return {
    paths,
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<ProductPageProps> = async (
  context: GetStaticPropsContext
) => {
  const handle = context.params?.handle;

  const query = `
  query ProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      descriptionHtml
      priceRange { minVariantPrice { amount } }

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
        { namespace: "custom", key: "fitting" }
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

  const ugcItems = mapStyledByYou(
    data.productByHandle.styledByYou?.references?.edges ?? [],
    data.productByHandle.id
  );

  return {
    props: {
      product: data.productByHandle,
      ugcItems,
    },
    revalidate: 60,
  };
};
