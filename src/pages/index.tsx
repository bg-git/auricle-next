import type { GetStaticProps } from 'next';
import { shopifyFetch } from '@/lib/shopify';
import Link from 'next/link';
import Image from 'next/image';

interface CollectionImage {
  url: string;
  altText: string | null;
}

interface Collection {
  id: string;
  title: string;
  handle: string;
  image?: CollectionImage;
}

interface HomePageProps {
  collections: Collection[];
}

export default function Home({ collections }: HomePageProps) {
  return (
    <main className="home-page">
      <section className="hero-block">
        <h1 className="hero-heading">Dainty 14k Gold Piercing Jewellery</h1>
        <p className="hero-sub">Wholesale only. Small batch. Fast dispatch.</p>
        <Link href="/collection/all" className="hero-cta">
          Browse collections
        </Link>
      </section>

      <section className="collection-section">
        <ul className="collection-grid">
          {collections.map((collection) => (
            <li key={collection.id} className="collection-card">
              <Link href={`/collection/${collection.handle}`} className="collection-link">
                {collection.image ? (
                  <Image
                    src={collection.image.url}
                    alt={collection.image.altText || collection.title}
                    width={800}
                    height={600}
                    className="collection-image"
                  />
                ) : (
                  <div className="placeholder-image" />
                )}
                <h2 className="collection-title">{collection.title}</h2>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const query = `
    {
      collections(first: 6) {
        edges {
          node {
            id
            title
            handle
            image {
              url
              altText
            }
          }
        }
      }
    }
  `;

  const data = await shopifyFetch({ query });

  const collections: Collection[] = data.collections.edges.map((edge: any) => edge.node);

  return {
    props: {
      collections,
    },
    revalidate: 60,
  };
};
