import { useEffect, useState } from 'react';
import { shopifyFetch } from '@/lib/shopify';
import { GET_ALL_PRODUCTS } from '@/lib/shopify-queries';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';

type ProductLite = {
  id: string;
  title: string;
  handle: string;
  image: string | null;
  sku: string;
};

export async function getStaticProps() {
  const data = await shopifyFetch({
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
        sku: variant?.sku?.trim() ?? '',
      };
    })
    .filter((p) => p.id && p.title && p.handle);

  return {
    props: { products },
    revalidate: 60 * 5,
  };
}

export default function SearchPage({ products }: { products: ProductLite[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState<ProductLite[]>([]);

  // Load initial query from URL
  useEffect(() => {
    const initial = typeof router.query.q === 'string' ? router.query.q : '';
    setQuery(initial);
  }, [router.query.q]);

  // Filter products when query changes
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

  // Update URL when query changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    router.replace(
      {
        pathname: '/search',
        query: value ? { q: value } : {},
      },
      undefined,
      { shallow: true }
    );
  };

  return (
    <div className="page-content">

    <div style={{
  padding: '32px 16px',
  maxWidth: '870px',
  margin: '0 auto',
  minHeight: '600px' 
}}>

      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>SEARCH</h1>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Search by product name or SKU..."
          value={query}
          onChange={handleInputChange}
          style={{
            width: '100%',
            maxWidth: '870px',
            padding: '12px',
            fontSize: '16px',
            border: '1px solid #181818',
            borderRadius: '0',
            outline: 'none',
          }}
        />
      </div>

      {query && (
        <>
          {filtered.length === 0 ? (
            <p style={{ marginTop: '8px' }}>No results found.</p>
          ) : (
            <p style={{ marginTop: '8px' }}>
              Matching products: {filtered.length}
            </p>
          )}
        </>
      )}

      <div className="search-results">
        {filtered.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.handle}`}
            prefetch={true}
            style={{ textDecoration: 'none', color: '#181818' }}
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
    </div>
  );
}
