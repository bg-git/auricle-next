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
import FavouriteToggle from '@/components/FavouriteToggle';


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
  variants?: {
    edges: {
      node: {
        price: {
          amount: string;
        };
      };
    }[];
  };
};


type CollectionPageProps = {
  products: Product[];
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  collectionDescription?: string;
  deepLinks?: { label: string; href: string }[];
  collectionImage?: string;
  handle: string;
};


export default function CollectionPage({ products, title, seoTitle, seoDescription, collectionDescription, deepLinks, collectionImage, handle }: CollectionPageProps) {
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
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": title,
      "description": seoDescription || "",
      "url": `https://www.auricle.co.uk/collection/${handle}`,
      ...(collectionImage && { image: collectionImage }),
      "itemListElement": products.map((product, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `https://www.auricle.co.uk/product/${product.handle}`,
        "item": {
          "@type": "Product",
          "name": product.title,
          "image": product.images?.edges?.[0]?.node?.url || undefined,
          "brand": {
            "@type": "Brand",
            "name": "AURICLE"
          },
          "offers": {
            "@type": "Offer",
            "priceCurrency": "GBP",
            "price": "0.01",
            "availability": "https://schema.org/InStock"
          }
        }
      }))
    })
  }}
/>




      <div style={{ maxWidth: '870px', margin: '0 auto', padding: '16px 16px 0' }}>
  <h1 style={{ fontSize: '30px', fontWeight: 900 }}>{title}</h1>

  {Array.isArray(deepLinks) && deepLinks.length > 0 && (
    <div style={{ marginTop: '16px', marginBottom: '24px' }}>
      <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Also see</p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        {deepLinks.map(({ label, href }) => (
          <Link key={href} href={href} legacyBehavior>
            <a
              style={{
                flex: '1 0 auto',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                padding: '10px 16px',
                fontSize: '14px',
                background: '#f0f0f0',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
                textDecoration: 'none',
                color: '#000',
              }}
            >
              {label}
            </a>
          </Link>
        ))}
      </div>
    </div>
  )}
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
  <div className="product-image-wrapper">
    <Image
      src={image?.url || '/placeholder.png'}
      alt=""
      width={1200}
      height={1500}
      priority={index === 0}
      fetchPriority={index === 0 ? 'high' : undefined}
      style={{ objectFit: 'cover', width: '100%', height: 'auto', display: 'block' }}
      sizes="(min-width: 1400px) 350px, (min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
    />

    <FavouriteToggle
  handle={product.handle}
  title={product.title}
  image={image?.url}
  price={product.variants?.edges?.[0]?.node?.price.amount}
  metafields={product.metafields}
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

        <button
  className="filter-drawer-toggle"
  onClick={() => setShowFilters(true)}
  aria-label="Open filters"
>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#181818" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <line x1="4" y1="21" x2="4" y2="14"/>
    <line x1="4" y1="10" x2="4" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12" y2="3"/>
    <line x1="20" y1="21" x2="20" y2="16"/>
    <line x1="20" y1="12" x2="20" y2="3"/>
    <circle cx="4" cy="12" r="2"/>
    <circle cx="12" cy="10" r="2"/>
    <circle cx="20" cy="14" r="2"/>
  </svg>
</button>


        {showFilters && (
  <div className={`filter-drawer-backdrop open`} onClick={() => setShowFilters(false)}>
    <div className="filter-drawer open" onClick={(e) => e.stopPropagation()}>
      <button className="filter-drawer-close" onClick={() => setShowFilters(false)}>Close</button>

      {renderFilterSection('Metal', metalOptions, selectedMetals, setSelectedMetals)}
      {renderFilterSection('Finish', finishOptions, selectedFinishes, setSelectedFinishes)}
      {renderFilterSection('Gem Colour', gemColourOptions, selectedGemColours, setSelectedGemColours)}
      {renderFilterSection('Gem Type', gemTypeOptions, selectedGemTypes, setSelectedGemTypes)}
      {renderFilterSection('Fitting', fittingOptions, selectedFittings, setSelectedFittings)}
      {renderFilterSection('Metal Colour', metalColourOptions, selectedMetalColours, setSelectedMetalColours)}
    </div>
  </div>
)}

      </main>

  {collectionDescription && (
  <div
    style={{
      padding: '24px 16px',
      maxWidth: '1400px',
      margin: '32px auto 0',
    }}
  >
    <div
      style={{ fontSize: '14px', lineHeight: '1.6' }}
      dangerouslySetInnerHTML={{ __html: collectionDescription }}
    />
  </div>
)}

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
        descriptionHtml
        image {
    url
    altText
  }
        metafields(identifiers: [
          { namespace: "custom", key: "title" },
          { namespace: "custom", key: "description" },
          { namespace: "custom", key: "deep_links" }
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
  const collectionImage = data.collectionByHandle.image?.url || null;
const validMetafields = rawMetafields.filter(
  (f: unknown): f is { key: string; value: string } =>

    typeof f === 'object' && f !== null && 'key' in f && 'value' in f
);


const seoTitle =
  validMetafields.find((f: { key: string; value: string }) => f.key === 'title')?.value ?? null;

const seoDescription =
  validMetafields.find((f: { key: string; value: string }) => f.key === 'description')?.value ?? null;

const deepLinksRaw =
  validMetafields.find((f) => f.key === 'deep_links')?.value ?? null;

let deepLinks: { label: string; href: string }[] = [];

if (deepLinksRaw) {
  deepLinks = deepLinksRaw.split(',').map(entry => {
    const [label, href] = entry.split('::');
    return { label: label?.trim(), href: href?.trim() };
  }).filter(link => link.label && link.href);
}



return {
  props: {
    products,
    title: data.collectionByHandle.title,
    collectionDescription: data.collectionByHandle.descriptionHtml || null,
    seoTitle,
    seoDescription,
    deepLinks,
    collectionImage,
    handle,
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

