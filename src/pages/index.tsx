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

      <section className="info-grid">
  <Link href="/first-timer" className="info-link">
    <div className="info-block">NEW HERE?<br/>GET YOUR FIRST-TIMER DISCOUNT</div>
  </Link>
  <Link href="/shipping" className="info-link">
    <div className="info-block">FAST SHIPPING<br/>FROM UNITED KINGDOM</div>
  </Link>
  <Link href="/register" className="info-link">
    <div className="info-block">REGISTER YOUR<br/>FREE B2B ACCOUNT</div>
  </Link>
  <Link href="/collection/gold" className="info-link">
    <div className="info-block">SEARCH DAINTY GOLD PIERCING JEWELLERY</div>
  </Link>
</section>



      {/*<section className="hero-block">
        <h1 className="hero-heading">LUXURY BODY JEWELLERY</h1>
        <p className="hero-sub">Wholesale only. Small batch. Fast dispatch.</p>
      </section>
      <section className="collection-section">
  <ul className="collection-grid">
    {collections.map((collection) => (
      <li key={collection.id} className="collection-card">
        <Link href={`/collection/${collection.handle}`} className="collection-link">
          <div className="collection-image-wrapper">
            <Image
              src={collection.image?.url || '/placeholder.png'}
              alt={collection.image?.altText || collection.title}
              fill
              sizes="(min-width: 800px) 20vw, 50vw"
              style={{ objectFit: 'cover' }}
            />
            <div className="collection-label">{collection.title}</div>
          </div>
        </Link>
      </li>
    ))}
  </ul>
</section>*/}

<section className="custom-grid">
  <div className="custom-card">
    <div className="image-container">
      <Image
        src="/images/piercing_ends_and_gems_wholesale_uk.jpg"
        alt="Gold Ends"
        fill
        style={{ objectFit: 'cover' }}
        sizes="(max-width: 800px) 50vw, 600px"
      />
      <div className="overlay">
        <h2 className="overlay-title">ENDS & GEMS</h2>
        <p className="overlay-subtitle">Browse our collection of ends & gems</p>
        <div className="overlay-buttons">
          <Link href="/collection/ends-gems" className="button">VIEW ALL ENDS & GEMS &#x27F6;</Link>
          <Link href="/collection/new" className="button secondary">VIEW</Link>
        </div>
      </div>
    </div>
  </div>

  <div className="custom-card">
    <div className="image-container">
      <Image
        src="/images/Titanium_and_gold_rings_for_piercing.jpg"
        alt="Gold Twist Ring Made from Titanium with pave gems"
        fill
        style={{ objectFit: 'cover' }}
        sizes="(max-width: 800px) 50vw, 600px"
      />
      <div className="overlay">
        <h2 className="overlay-title">RINGS</h2>
        <p className="overlay-subtitle">View our collection of rings</p>
        <div className="overlay-buttons">
          <Link href="/collection/rings" className="button">VIEW ALL RINGS &#x27F6;</Link>
          
        </div>
      </div>
    </div>
  </div>

  <div className="custom-card">
    <div className="image-container">
      <Image
        src="/images/piercing_chains_and_charms_wholesale_uk.jpg"
        alt="Gold Twist Ring Made from Titanium with pave gems"
        fill
        style={{ objectFit: 'cover' }}
        sizes="(max-width: 800px) 50vw, 600px"
      />
      <div className="overlay">
        <h2 className="overlay-title">CHAINS & CHARMS</h2>
        <p className="overlay-subtitle">View our collection of chains & charms</p>
        <div className="overlay-buttons">
          <Link href="/collection/chains-charms" className="button">VIEW ALL CHAINS & CHARMS &#x27F6;</Link>
          
        </div>
      </div>
    </div>
  </div>

  <div className="custom-card">
    <div className="image-container">
      <Image
        src="/images/high_polish_titanium_and_gold_labret_base_wholesale_uk.jpg"
        alt="Gold Twist Ring Made from Titanium with pave gems"
        fill
        style={{ objectFit: 'cover' }}
        sizes="(max-width: 800px) 50vw, 600px"
      />
      <div className="overlay">
        <h2 className="overlay-title">BASE</h2>
        <p className="overlay-subtitle">View our collection of labret bases</p>
        <div className="overlay-buttons">
          <Link href="/collection/base" className="button">VIEW ALL LABRET BASES &#x27F6;</Link>
          
        </div>
      </div>
    </div>
  </div>
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
