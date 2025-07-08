import type { GetStaticProps } from 'next';
import { shopifyFetch } from '@/lib/shopify';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function CollectionPage({ products, title }: any) {
  const getMetafieldValue = (product: any, key: string): string | null => {
    const field = product.metafields?.find((f: any) => f?.key === key);
    if (!field?.value) return null;

    try {
      const parsed = JSON.parse(field.value);
      return Array.isArray(parsed) ? parsed.join(', ') : parsed;
    } catch {
      return field.value;
    }
  };

  const extractOptions = (key: string): string[] => {
    const optionsSet = new Set<string>();
    products.forEach((p: any) => {
      const value = getMetafieldValue(p, key);
      if (value) optionsSet.add(value);
    });
    return Array.from(optionsSet).sort();
  };

  const metalOptions = extractOptions('metal');
  const finishOptions = extractOptions('finish');
  const gemColourOptions = extractOptions('gem_colour');
  const gemTypeOptions = extractOptions('gem_type');
  const fittingOptions = extractOptions('fitting');

  const [selectedMetals, setSelectedMetals] = useState<string[]>([]);
  const [selectedFinishes, setSelectedFinishes] = useState<string[]>([]);
  const [selectedGemColours, setSelectedGemColours] = useState<string[]>([]);
  const [selectedGemTypes, setSelectedGemTypes] = useState<string[]>([]);
  const [selectedFittings, setSelectedFittings] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const toggle = (value: string, setFn: Function, selected: string[]) => {
    setFn(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  const filteredProducts = products.filter((p: any) => {
    const metal = getMetafieldValue(p, 'metal') || '';
    const finish = getMetafieldValue(p, 'finish') || '';
    const gemColour = getMetafieldValue(p, 'gem_colour') || '';
    const gemType = getMetafieldValue(p, 'gem_type') || '';
    const fitting = getMetafieldValue(p, 'fitting') || '';

    const metalMatch = selectedMetals.length ? selectedMetals.includes(metal) : true;
    const finishMatch = selectedFinishes.length ? selectedFinishes.includes(finish) : true;
    const gemColourMatch = selectedGemColours.length ? selectedGemColours.includes(gemColour) : true;
    const gemTypeMatch = selectedGemTypes.length ? selectedGemTypes.includes(gemType) : true;
    const fittingMatch = selectedFittings.length ? selectedFittings.includes(fitting) : true;

    return metalMatch && finishMatch && gemColourMatch && gemTypeMatch && fittingMatch;
  });

  const renderFilterSection = (
    label: string,
    options: string[],
    selected: string[],
    setFn: Function
  ) => {
    if (options.length === 0) return null;
    return (
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{label}</p>
        {options.map((option) => (
          <button
            key={option}
            onClick={() => toggle(option, setFn, selected)}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              marginBottom: '6px',
              background: selected.includes(option) ? '#000' : '#f9f9f9',
              color: selected.includes(option) ? '#fff' : '#000',
              border: '1px solid #ccc',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {option}
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600 }}>{title}</h1>
      </div>

      <main className="collection-page">
        <aside className="filters-desktop">
          <p style={{ fontWeight: 600, fontSize: '14px' }}>Filters</p>
          {renderFilterSection('Metal', metalOptions, selectedMetals, setSelectedMetals)}
          {renderFilterSection('Finish', finishOptions, selectedFinishes, setSelectedFinishes)}
          {renderFilterSection('Gem Colour', gemColourOptions, selectedGemColours, setSelectedGemColours)}
          {renderFilterSection('Gem Type', gemTypeOptions, selectedGemTypes, setSelectedGemTypes)}
          {renderFilterSection('Fitting', fittingOptions, selectedFittings, setSelectedFittings)}

        </aside>

        <section className="product-grid">
          {filteredProducts.map((product: any) => {
            const image = product.images?.edges?.[0]?.node;

            return (
              <Link
                href={`/product/${product.handle}`}
                key={product.id}
                className="product-card"
              >
                <div className="product-card-inner">
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      paddingTop: '125%',
                      background: '#f9f9f9',
                    }}
                  >
                    <Image
                      src={image?.url || '/placeholder.png'}
                      alt={image?.altText || product.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(min-width: 800px) 25vw, 50vw"
                    />
                  </div>
                  <h3
                    style={{
                      marginTop: '8px',
                      fontSize: '13px',
                      fontWeight: 400,
                      textDecoration: 'none',
                    }}
                  >
                    {product.title}
                  </h3>
                </div>
              </Link>
            );
          })}
        </section>

        {/* Mobile Filter Button */}
        <div className="mobile-filter-toggle">
          <button onClick={() => setShowFilters(true)}>Filters</button>
        </div>

        {/* Mobile Drawer */}
        {showFilters && (
          <div className="mobile-filter-drawer">
            <button onClick={() => setShowFilters(false)}>Close</button>
            {renderFilterSection('Metal', metalOptions, selectedMetals, setSelectedMetals)}
            {renderFilterSection('Finish', finishOptions, selectedFinishes, setSelectedFinishes)}
            {renderFilterSection('Gem Colour', gemColourOptions, selectedGemColours, setSelectedGemColours)}
            {renderFilterSection('Gem Type', gemTypeOptions, selectedGemTypes, setSelectedGemTypes)}
          </div>
        )}
      </main>

      <style jsx>{`
        .collection-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px;
        }

        .filters-desktop {
          width: 100%;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .product-card {
          text-decoration: none;
          color: inherit;
        }

        .product-card-inner {
          cursor: pointer;
        }

        .product-card h3 {
          margin-top: 8px;
          font-size: 13px;
          font-weight: 400;
        }

        .mobile-filter-toggle {
          display: block;
          margin-top: 24px;
        }

        .mobile-filter-drawer {
          background: #fff;
          padding: 16px;
          border-top: 1px solid #ccc;
        }

        @media (min-width: 800px) {
          .collection-page {
            flex-direction: row;
          }

          .filters-desktop {
            width: 240px;
          }

          .product-grid {
            flex: 1;
            grid-template-columns: repeat(4, 1fr);
          }

          .mobile-filter-toggle,
          .mobile-filter-drawer {
            display: none;
          }
        }
      `}</style>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const handle = params?.handle;

  const query = `
    query CollectionByHandle($handle: String!) {
      collectionByHandle(handle: $handle) {
        id
        title
        products(first: 250) {
          edges {
            node {
              id
              title
              handle
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              metafields(identifiers: [
                { namespace: "custom", key: "metal" },
                { namespace: "custom", key: "finish" },
                { namespace: "custom", key: "gem_colour" },
                { namespace: "custom", key: "gem_type" },
                 { namespace: "custom", key: "fitting" } 
              ]) {
                key
                value
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyFetch({ query, variables: { handle } });

  if (!data.collectionByHandle) {
    return { notFound: true };
  }

  const products = data.collectionByHandle.products.edges.map((edge: any) => ({
    ...edge.node,
    metafields: edge.node.metafields || [],
  }));

  return {
    props: {
      products,
      title: data.collectionByHandle.title,
    },
    revalidate: 60,
  };
};

export const getStaticPaths = async () => {
  const query = `
    {
      collections(first: 10) {
        edges {
          node {
            handle
          }
        }
      }
    }
  `;

  const data = await shopifyFetch({ query });

  const paths = data.collections.edges.map(({ node }: any) => ({
    params: { handle: node.handle },
  }));

  return {
    paths,
    fallback: 'blocking',
  };
};
