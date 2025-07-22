import { useEffect, useState } from 'react';
import { shopifyFetch } from '@/lib/shopify';
import { GET_ALL_PRODUCTS } from '@/lib/shopify-queries';
import Image from 'next/image';
import Link from 'next/link';

type ProductLite = {
  id: string;
  title: string;
  handle: string;
  image: string | null;
  sku: string;
};

// This runs at build time
export async function getStaticProps() {
  const { data } = await shopifyFetch({
    query: GET_ALL_PRODUCTS,
    variables: { first: 250 },
  });

  const products: ProductLite[] = (data?.products?.edges || [])
    .map((edge): ProductLite => {

      const variant = edge.node?.variants?.edges?.[0]?.node || {};
      return {
        id: edge.node?.id ?? '',
        title: edge.node?.title ?? '',
        handle: edge.node?.handle ?? '',
        image: edge.node?.images?.edges?.[0]?.node?.url ?? null,
        sku: variant?.sku ?? '',
      };
    })
    .filter(
      (p) => p.id && p.title && p.handle
    ); // Ensure all essential fields exist

  return {
    props: { products },
    revalidate: 60 * 5,
  };
}


export default function SearchPage({ products }: { products: ProductLite[] }) {
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState<ProductLite[]>([]);


  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q === '') {
      setFiltered([]);
    } else {
      setFiltered(
        products.filter((p) =>
  (p.title || '').toLowerCase().includes(q) ||
  (p.sku || '').toLowerCase().includes(q)
)

      );
    }
  }, [query, products]);

  return (
    <div style={{ padding: '32px 16px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Search Products</h1>

      <input
        type="text"
        placeholder="Search by name or SKU..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          maxWidth: '500px',
          padding: '12px',
          fontSize: '16px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          marginBottom: '24px',
        }}
      />
<p>Matching products: {filtered.length}</p>

      {query && filtered.length === 0 && (
        <p style={{ marginTop: '8px' }}>No results found.</p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '24px',
          marginTop: '16px',
        }}
      >
        {filtered.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.handle}`}
            style={{ textDecoration: 'none', color: '#000' }}
          >
            <div>
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.title}
                  width={400}
                  height={500}
                  style={{
                    width: '100%',
                    height: 'auto',
                    objectFit: 'cover',
                    aspectRatio: '4 / 5',
                    border: '1px solid #ececec',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '4 / 5',
                    background: '#f2f2f2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: '#999',
                    border: '1px solid #ececec',
                  }}
                >
                  No image
                </div>
              )}
              <div style={{ marginTop: '8px', fontSize: '14px' }}>{product.title}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{product.sku}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
