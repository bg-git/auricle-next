import { useEffect, useState } from 'react';
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

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductLite[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial query from URL
  useEffect(() => {
    const initial = typeof router.query.q === 'string' ? router.query.q : '';
    setQuery(initial);
    if (initial) setLoading(true);
  }, [router.query.q]);

  // Fetch results when query changes
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search-products?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          setResults(json.products || []);
        } else {
          console.error('Failed to search products');
          setResults([]);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('Search error:', err);
      }
      finally {
        setLoading(false);
      }
    };

    fetchResults();
    return () => {
      controller.abort();
      setLoading(false);
    };
  }, [query]);

  // Update URL when query changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLoading(true);
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
          {loading ? (
            <p style={{ marginTop: '8px' }}>Searching...</p>
          ) : results.length === 0 ? (
            <p style={{ marginTop: '8px' }}>No results found.</p>
          ) : (
            <p style={{ marginTop: '8px' }}>
              Matching products: {results.length}
            </p>
          )}
        </>
      )}

      <div className="search-results">
        {results.map((product) => (
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
