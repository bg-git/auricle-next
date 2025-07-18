import type { GetStaticProps, GetStaticPaths, GetStaticPropsContext } from 'next';
import { shopifyFetch } from '@/lib/shopify';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';
import Seo from '@/components/Seo';
import Link from 'next/link';


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
  selectedOptions: {
    name: string;
    value: string;
  }[];
}

interface Product {
  id: string;
  title: string;
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
  const { addToCart, openDrawer } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants?.edges?.[0]?.node?.id || null
  );
const [qty, setQty] = useState(1);
  if (!product) {
    return <div style={{ padding: '16px' }}>Product not found.</div>;
  }

  const imageUrl = product.images?.edges?.[0]?.node?.url ?? '/placeholder.png';
  const metafields = product.metafields || [];

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
    name: 'Name',
    title: 'Title',
    sku: 'SKU',
    metal: 'Metal',
    alloy: 'Alloy',
    metal_colour: 'Metal Colour',
    thread_type: 'Thread Type',
    gem_type: 'Gem Type',
    gem_colour: 'Gem Colour',
    width: 'Width',
    height: 'Height',
    length: 'Length',
    gauge: 'Gauge',
    sold_as: 'Sold As',
    shipping: 'Shipping',
    fitting: 'Fitting',
    base_size: 'Base Size'
  };

  return (
    
    <>
    <Seo
    title={getFieldValue('title') || product.title}
    description={getFieldValue('description') || `Buy ${product.title} in 14k gold or titanium.`}
  />
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
        <div className="product-layout">
          <div className="product-image">
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


            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                background: 'transparent',
                pointerEvents: 'none',
              }}
            />
          </div>

          <div className="product-info">
            <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>{product.title}</h1>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <p style={{ fontSize: '14px', fontWeight: 500 }}>
                £{product.priceRange.minVariantPrice.amount}
              </p>
            </div>
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
              background: '#000',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              border: '2px solid #000',
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
              color: '#000',
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
                    onClick={() => setQty((prev) => Math.max(1, prev - 1))}

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
                    onClick={() => setQty((prev) => prev + 1)}

                  >
                    +
                  </button>
                </div>

                <button
                  style={{
                    flex: '1',
                    height: '48px',
                    minHeight: '48px',
                    background: '#000',
                    color: '#fff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => {
  if (!selectedVariantId) {
    console.warn('No variant ID selected');
    return;
  }

  addToCart(selectedVariantId, qty, {
    title: product.title,
    price: product.priceRange.minVariantPrice.amount,
    image: product.images?.edges?.[0]?.node?.url || undefined,
  });

  openDrawer();
}}
                >
                  ADD TO BAG
                </button>
              </div>
            </div>


            <div style={{ marginTop: '32px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Details</h2>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
                border: '1px solid #e0e0e0',
              }}>
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
