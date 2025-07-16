import type {
  GetStaticProps,
  GetStaticPaths,
  GetStaticPropsContext,
} from 'next';
import { shopifyFetch } from '@/lib/shopify';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import Seo from '@/components/Seo';
import { useEffect } from 'react';

// Types

type Metafield = {
  key: string;
  value: string;
};

type ProductImage = {
  node: {
    url: string;
    altText: string | null;
  };
};

type Product = {
  id: string;
  title: string;
  handle: string;
  images?: {
    edges: ProductImage[];
  };
  metafields?: Metafield[];
};

type CollectionPageProps = {
  products: Product[];
  title: string;
  seoTitle?: string;
  seoDescription?: string;
};

export default function CollectionPage({ products, title, seoTitle, seoDescription }: CollectionPageProps) {
  const getMetafieldValue = (product: Product, key: string): string | null => {
    const validMetafields = (product.metafields || []).filter((f): f is Metafield => f != null);
    const field = validMetafields.find((f) => f.key === key);
    if (!field?.value) return null;

    try {
      const parsed = JSON.parse(field.value);
      return Array.isArray(parsed) ? parsed.join(', ') : String(parsed);
    } catch {
      return field.value;
    }
  };
  

  const extractOptions = (key: string): string[] => {
    const optionsSet = new Set<string>();
    products.forEach((p) => {
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
  const metalColourOptions = extractOptions('metal_colour');


  const [selectedMetals, setSelectedMetals] = useState<string[]>([]);
  const [selectedFinishes, setSelectedFinishes] = useState<string[]>([]);
  const [selectedGemColours, setSelectedGemColours] = useState<string[]>([]);
  const [selectedGemTypes, setSelectedGemTypes] = useState<string[]>([]);
  const [selectedFittings, setSelectedFittings] = useState<string[]>([]);
  const [selectedMetalColours, setSelectedMetalColours] = useState<string[]>([]);

  const [showFilters, setShowFilters] = useState(false);

useEffect(() => {
  document.body.style.overflow = showFilters ? 'hidden' : '';
  return () => {
    document.body.style.overflow = '';
  };
}, [showFilters]);

  const toggle = (
    value: string,
    selected: string[],
    setFn: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setFn(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  const filteredProducts = products.filter((p) => {
    const metal = getMetafieldValue(p, 'metal') || '';
    const finish = getMetafieldValue(p, 'finish') || '';
    const gemColour = getMetafieldValue(p, 'gem_colour') || '';
    const gemType = getMetafieldValue(p, 'gem_type') || '';
    const fitting = getMetafieldValue(p, 'fitting') || '';
        const metalColour = getMetafieldValue(p, 'metal_colour') || '';

    const metalMatch = selectedMetals.length ? selectedMetals.includes(metal) : true;
    const finishMatch = selectedFinishes.length ? selectedFinishes.includes(finish) : true;
    const gemColourMatch = selectedGemColours.length ? selectedGemColours.includes(gemColour) : true;
    const gemTypeMatch = selectedGemTypes.length ? selectedGemTypes.includes(gemType) : true;
    const fittingMatch = selectedFittings.length ? selectedFittings.includes(fitting) : true;
const metalColourMatch = selectedMetalColours.length ? selectedMetalColours.includes(metalColour) : true;


    return metalMatch && finishMatch && gemColourMatch && gemTypeMatch && fittingMatch &&
       metalColourMatch;
  });

  const renderFilterSection = (
    label: string,
    options: string[],
    selected: string[],
    setFn: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (options.length === 0) return null;
    return (
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{label}</p>
        {options.map((option) => (
          <button
            key={option}
            onClick={() => toggle(option, selected, setFn)}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              marginBottom: '6px',
              background: selected.includes(option) ? '#000' : '#f9f9f9',
              color: selected.includes(option) ? '#fff' : '#000',
              border: '1px solid #e0e0e0',
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
      <Seo title={seoTitle || title} description={seoDescription || undefined} />


      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 900 }}>{title}</h1>
      </div>

      <main className="collection-page">
        <aside className="filters-desktop">
          {renderFilterSection('Metal', metalOptions, selectedMetals, setSelectedMetals)}
          {renderFilterSection('Finish', finishOptions, selectedFinishes, setSelectedFinishes)}
          {renderFilterSection('Gem Colour', gemColourOptions, selectedGemColours, setSelectedGemColours)}
          {renderFilterSection('Gem Type', gemTypeOptions, selectedGemTypes, setSelectedGemTypes)}
          {renderFilterSection('Fitting', fittingOptions, selectedFittings, setSelectedFittings)}
          {renderFilterSection('Metal Colour', metalColourOptions, selectedMetalColours, setSelectedMetalColours)}

        </aside>

        <section className="product-grid">
          {filteredProducts.map((product, index) => {
  const image = product.images?.edges?.[0]?.node;

  return (
    <Link href={`/product/${product.handle}`} key={product.id} className="product-card">
      <div className="product-card-inner">
        <div style={{ position: 'relative', width: '100%', paddingTop: '125%', background: '#f9f9f9' }}>
          <Image
            src={image?.url || '/placeholder.png'}
            alt=""
            fill
            priority={index === 0}
            fetchPriority={index === 0 ? 'high' : undefined}
            style={{ objectFit: 'cover' }}
            sizes="(min-width: 800px) 25vw, 50vw"
          />
        </div>
        <h2 style={{ marginTop: '8px', fontSize: '13px', fontWeight: 400 }}>
          {product.title}
        </h2>
      </div>
    </Link>
  );
})}

        </section>

        <div className="mobile-filter-toggle">
          <button onClick={() => setShowFilters(true)}>Filters</button>
        </div>

        {showFilters && (
          <div className={`mobile-filter-drawer ${showFilters ? 'open' : ''}`}>
  <button onClick={() => setShowFilters(false)}>Close</button>
  {renderFilterSection('Metal', metalOptions, selectedMetals, setSelectedMetals)}
  {renderFilterSection('Finish', finishOptions, selectedFinishes, setSelectedFinishes)}
  {renderFilterSection('Gem Colour', gemColourOptions, selectedGemColours, setSelectedGemColours)}
  {renderFilterSection('Gem Type', gemTypeOptions, selectedGemTypes, setSelectedGemTypes)}
  {renderFilterSection('Fitting', fittingOptions, selectedFittings, setSelectedFittings)}
  {renderFilterSection('Metal Colour', metalColourOptions, selectedMetalColours, setSelectedMetalColours)}

  
</div>


        )}
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps<CollectionPageProps> = async (
  context: GetStaticPropsContext
) => {
  const handle = context.params?.handle;

  if (typeof handle !== 'string') {
    return { notFound: true };
  }

  const query = `
    query CollectionByHandle($handle: String!) {
      collectionByHandle(handle: $handle) {
        id
        title
        metafields(identifiers: [
          { namespace: "custom", key: "title" },
          { namespace: "custom", key: "description" }
        ]) {
          key
          value
        }
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
                { namespace: "custom", key: "fitting" },
                 { namespace: "custom", key: "metal_colour" }
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

  const products: Product[] = data.collectionByHandle.products.edges.map(
    (edge: { node: Product }) => ({
      ...edge.node,
      metafields: edge.node.metafields || [],
    })
  );

  const rawMetafields = data.collectionByHandle.metafields || [];
const validMetafields = rawMetafields.filter(
  (f: unknown): f is { key: string; value: string } =>

    typeof f === 'object' && f !== null && 'key' in f && 'value' in f
);


const seoTitle =
  validMetafields.find((f: { key: string; value: string }) => f.key === 'title')?.value ?? null;

const seoDescription =
  validMetafields.find((f: { key: string; value: string }) => f.key === 'description')?.value ?? null;




return {
  props: {
    products,
    title: data.collectionByHandle.title,
    seoTitle,
    seoDescription,
  },
  revalidate: 60,
};
};


export const getStaticPaths: GetStaticPaths = async () => {
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

  const paths = data.collections.edges.map(
    (edge: { node: { handle: string } }) => ({
      params: { handle: edge.node.handle },
    })
  );

  return {
    paths,
    fallback: 'blocking',
  };
  };

