import type {
  GetStaticProps,
  GetStaticPaths,
  GetStaticPropsContext,
} from 'next';
import { shopifyFetch } from '@/lib/shopify';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Seo from '@/components/Seo';
import Link from 'next/link';
import FavouriteToggle from '@/components/FavouriteToggle';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useMemo } from 'react';



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
}


export default function ProductPage({ product }: ProductPageProps) {
  if (!product) {
    return <div style={{ padding: '16px' }}>Product not found.</div>;
  }

  const { addToCart, openDrawer } = useCart();
  const { showToast } = useToast();
  const router = useRouter();

  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants?.edges?.[0]?.node?.id || null
  );
  const initialQty =
    product.variants?.edges?.[0]?.node?.quantityAvailable > 0 ? 1 : 0;
  const [qty, setQty] = useState(initialQty);

  const variantEdges = useMemo(() => product.variants?.edges || [], [product]);

  useEffect(() => {
    const first = variantEdges?.[0]?.node;
    setSelectedVariantId(first?.id || null);
    setQty(first && first.quantityAvailable > 0 ? 1 : 0);
  }, [router.asPath, product.id, variantEdges]);

  useEffect(() => {
    const variant = variantEdges.find(v => v.node.id === selectedVariantId)?.node;
    if (!variant) return;
    setQty(variant.quantityAvailable > 0 ? 1 : 0);
  }, [selectedVariantId, variantEdges]);

  const { user, refreshUser } = useAuth();
  const hasRefreshed = useRef(false);

  useEffect(() => {
    if (user && !user.approved && !hasRefreshed.current) {
      hasRefreshed.current = true;
      refreshUser();
    }
  }, [user, refreshUser]);

  const selectedVariant = product.variants?.edges?.find(
    v => v.node.id === selectedVariantId
  )?.node;

const isSoldOut =
  !selectedVariant?.availableForSale ||
  selectedVariant.quantityAvailable <= 0;

const maxQty = selectedVariant?.quantityAvailable ?? 9999;

const rawPrice = selectedVariant
  ? parseFloat(selectedVariant.price.amount)
  : parseFloat(product.priceRange.minVariantPrice.amount);
const formattedPrice = rawPrice % 1 === 0 ? rawPrice.toFixed(0) : rawPrice.toFixed(2);


  const imageUrl = product.images?.edges?.[0]?.node?.url ?? '/placeholder.png';
  const metafields = useMemo(
    () => product.metafields || [],
    [product.metafields]
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
  <Image
    src={imageUrl}
    alt={product.title}
    width={1200}
    height={1500}
    priority
    fetchPriority="high"
    sizes="(min-width: 1400px) 600px, (min-width: 1024px) 50vw, 100vw"
    style={{ objectFit: 'cover', width: '100%', height: 'auto', display: 'block' }}
  />

  <FavouriteToggle
    handle={router.query.handle as string}
    title={product.title}
    image={imageUrl}
    price={formattedPrice}
    metafields={metafields}
  />
</div>


          <div className="product-info">
            <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>{product.title}</h1>
            {user?.approved ? (
  <>
    {/* Price */}
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <p style={{ fontSize: '14px', fontWeight: 500 }}>
        £{formattedPrice}
      </p>
    </div>

    {/* Variant options */}
    {variantOptions.length > 0 && (
      <div style={{ marginTop: '24px' }}>
        <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Available in:</p>
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

    {/* Variant buttons */}
    {product.variants?.edges?.length > 1 && (
      <div className="variant-wrapper">
        <p className="variant-label">Select an option:</p>
        <div className="variant-grid">
          {product.variants.edges.map(({ node }) => {
            const isSelected = selectedVariantId === node.id;
            return (
              <button
                key={node.id}
                onClick={() => setSelectedVariantId(node.id)}
                className={`variant-button${isSelected ? ' selected' : ''}`}
              >
                {node.title}
              </button>
            );
          })}
        </div>
      </div>
    )}

    {/* Quantity + Add to Cart */}
    <div className="desktop-add-to-cart" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <label htmlFor="qty" style={{ position: 'absolute', left: '-9999px' }}>Quantity</label>
        <div
          style={{
            flex: '0 0 120px',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #ccc',
            borderRadius: '4px',
            overflow: 'hidden',
            paddingInline: '4px',
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
              cursor: 'pointer',
            }}
            onClick={() => setQty((prev) => Math.max(isSoldOut ? 0 : 1, prev - 1))}
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
              cursor: 'pointer',
            }}
            onClick={() => {
              if (maxQty <= 0) {
                showToast('More coming soon 😉');
                return;
              }
              if (qty >= maxQty) {
                showToast(`We only have ${maxQty} available. Sorry 😞`);
                return;
              }
              setQty((prev) => prev + 1);
            }}
          >
            +
          </button>
        </div>

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
          }}
          onClick={() => {
    if (isSoldOut) {
      showToast('SOLD OUT. More coming soon.');
      return;          // Prevent action when sold out
    }
    if (!selectedVariantId || !selectedVariant) {
      console.warn('No variant selected');
      return;
    }
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
>
  {isSoldOut ? 'SOLD OUT' : 'ADD TO BAG'}
</button>
      </div>
    </div>

    {/* VAT Note */}
    <p
      style={{
        fontSize: '12px',
        color: '#888',
        marginTop: '10px',
        marginBottom: '16px',
        textAlign: 'right',
      }}
    >
      VAT & shipping calculated at checkout
    </p>
  </>
) : (
  <div
  style={{
    marginTop: '24px',
    padding: '16px',
    background: '#f9f9f9',
    border: '1px solid #ddd',
    textAlign: 'center',
    fontSize: '14px',
  }}
>
  <p style={{ fontWeight: 600 }}>CATALOGUE VIEW</p><br />
  <p>Sign in to your wholesale account to view pricing.</p></div>

)}



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
        priceRange {
          minVariantPrice {
            amount
          }
        }
        images(first: 5) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              price {
                amount
              }
              availableForSale
              quantityAvailable
              selectedOptions {
                name
                value
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
      }
    }
  `;

  const data = await shopifyFetch({ query, variables: { handle } });

  if (!data.productByHandle) {
    return { notFound: true };
  }

return {
  props: {
    product: data.productByHandle,
  },
  revalidate: 60,
};

};

