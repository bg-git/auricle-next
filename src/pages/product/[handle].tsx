import type { GetStaticProps, GetStaticPaths } from 'next';
import { shopifyFetch } from '@/lib/shopify';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';




export default function ProductPage({ product }: any) {
  const { addToCart } = useCart(); // ✅ Add this line right here
  const [selectedVariantId, setSelectedVariantId] = useState(
  product.variants?.edges?.[0]?.node?.id || null
);

  if (!product) {
    return <div style={{ padding: '16px' }}>Product not found.</div>;
  }


  const imageUrl = product.images?.edges?.[0]?.node?.url ?? '/placeholder.png';

const metafields = product.metafields || [];

const getFieldValue = (key: string): string | null => {
  const field = metafields.find((f: any) => f?.key === key);
  if (!field?.value) return null;

  const value = field.value.trim();

  // ✅ Don't try to parse if it's not JSON-looking
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
<main style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
  <div className="product-layout">
    {/* Image (Left on desktop) */}
    <div className="product-image" style={{ position: 'relative' }}>
      <Image
        src={imageUrl}
        alt={product.title}
        fill
        style={{ objectFit: 'cover' }}
        sizes="(min-width: 800px) 50vw, 100vw"
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          background: 'transparent',
          pointerEvents: 'auto',
        }}
      />
    </div>


          {/* Info (Right on desktop) */}
          <div className="product-info">
  <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
    {product.title}
  </h1>
  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
    <p style={{ fontSize: '14px', fontWeight: 500 }}>
      £{product.priceRange.minVariantPrice.amount}
    </p>
  </div>

{/* Variant Selector */}
{variantOptions.length > 0 && (
  <div style={{ marginTop: '24px' }}>
    <label htmlFor="variant" style={{ fontWeight: 500, fontSize: '14px' }}>
      Options & Choices:
    </label>
    <select
      id="variant"
      onChange={(e) => {
        if (e.target.value) window.location.href = e.target.value;
      }}
      defaultValue=""
      style={{
        display: 'block',
        marginTop: '8px',
        padding: '10px 12px',
        height: '44px',
        width: '100%',
        background: '#ffffff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '14px',
        color: '#000',
        appearance: 'none',
      }}
    >
      <option disabled value="">{currentVariantLabel}</option>
      {variantOptions.map((variant) => (
        <option key={variant.url} value={variant.url}>
          {variant.label}
        </option>
      ))}
    </select>
  </div>
)}

{product.variants?.edges?.length > 1 && (
  <div style={{ marginTop: '24px' }}>
    <label style={{ fontWeight: 500, fontSize: '14px' }}>Options & Choices:</label>
    <select
  value={selectedVariantId || ''}
  onChange={(e) => setSelectedVariantId(e.target.value)}
  style={{
    display: 'block',
    marginTop: '8px',
    padding: '10px 12px',
    height: '44px',
    width: '100%',
    background: '#ffffff',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#000',
    appearance: 'none',
  }}
>
  {product.variants.edges.map(({ node }: any) => (
    <option key={node.id} value={node.id}>
      {node.title}
    </option>
  ))}
</select>

  </div>
)}


<div className="desktop-add-to-cart" style={{ marginTop: '24px' }}>
  <div style={{ display: 'flex', gap: '12px' }}>
    {/* Quantity controls */}
    <div
  style={{
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #ccc',
    borderRadius: '4px',
    overflow: 'hidden',
    paddingInline: '4px', // ✅ horizontal padding inside the box
  }}
>

      <button
        style={{
          width: '32px',
          height: '40px',
          background: '#fff',
          border: 'none',
          fontSize: '18px',
          cursor: 'pointer',
        }}
        onClick={() => {
          const input = document.getElementById('qty') as HTMLInputElement;
          if (input) input.value = String(Math.max(1, parseInt(input.value || '1') - 1));
        }}
      >
        −
      </button>
      <input
        id="qty"
        type="number"
        defaultValue={1}
        min={1}
        style={{
          width: '100%',
          height: '40px',
          textAlign: 'center',
          border: 'none',
          fontSize: '14px',
        }}
      />
      <button
        style={{
          width: '32px',
          height: '40px',
          background: '#fff',
          border: 'none',
          fontSize: '18px',
          cursor: 'pointer',
        }}
        onClick={() => {
          const input = document.getElementById('qty') as HTMLInputElement;
          if (input) input.value = String(parseInt(input.value || '1') + 1);
        }}
      >
        +
      </button>
    </div>

    {/* Add to Bag button */}
    <button
  style={{
    flex: '3',
    height: '40px',
    background: '#000',
    color: '#fff',
    border: 'none',
    fontSize: '14px',
    fontWeight: 900,
    cursor: 'pointer',
    borderRadius: '4px',
  }}
  onClick={() => {
    const qtyInput = document.getElementById('qty') as HTMLInputElement;
    const qty = qtyInput ? parseInt(qtyInput.value || '1') : 1;
    const variantId = selectedVariantId;

    if (variantId) {
      addToCart(variantId, qty);
    }
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

        {/* Spacer to make room for sticky bar */}
        <div style={{ height: '80px' }} />
      </main>

      {/* Sticky Add to Cart — visible only on mobile */}
      <div className="sticky-add-to-cart">
        <input
          type="number"
          defaultValue={1}
          min={1}
          style={{
            width: '60px',
            padding: '8px',
            fontSize: '14px',
          }}
        />
        <button
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            background: '#000',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Add to Cart
        </button>
      </div>

      {/* Scoped styles */}
      <style jsx>{`
        .product-layout {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .product-image {
          position: relative;
          width: 100%;
          padding-top: 125%; /* 4:5 aspect ratio */
          background: #ececec;
        }

        .product-info {
          width: 100%;
        }

        .sticky-add-to-cart {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          background: #fff;
          border-top: 1px solid #e0e0e0;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 999;
        }

        @media (min-width: 800px) {
          .product-layout {
            flex-direction: row;
            align-items: flex-start;
          }

          .product-image {
            flex: 1;
            padding-top: 0;
            aspect-ratio: 4 / 5;
            height: auto;
          }

          .product-info {
            flex: 1;
          }

          .sticky-add-to-cart {
            display: none;
          }
        }
        /* Remove quantity input arrows */
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type='number'] {
  -moz-appearance: textfield;
}

      `}</style>
    </>
  );
}


export const getStaticPaths: GetStaticPaths = async () => {
  const query = `
    {
      products(first: 10) {
        edges {
          node {
            handle
          }
        }
      }
    }
  `;

  const data = await shopifyFetch({ query });

  const paths = data.products.edges.map(({ node }: any) => ({
    params: { handle: node.handle },
  }));

  return {
    paths,
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const handle = params?.handle;

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




  const data = await shopifyFetch({
    query,
    variables: { handle },
  });

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
