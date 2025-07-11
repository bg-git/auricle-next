import type { GetStaticProps } from 'next';
import { shopifyFetch } from '@/lib/shopify';
import Link from 'next/link';
import Image from 'next/image';

interface ProductImage {
  node: {
    url: string;
    altText: string | null;
  };
}

interface Product {
  id: string;
  title: string;
  handle: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
    };
  };
  images: {
    edges: ProductImage[];
  };
}

interface HomePageProps {
  products: {
    edges: { node: Product }[];
  };
}

export default function Home({ products }: HomePageProps) {
  return (
    <main className="home-page">
      <h1 className="home-title">Shop</h1>
      <ul className="product-list">
        {products?.edges?.map(({ node }) => {
          const image = node.images.edges[0]?.node;

          return (
            <li key={node.id} className="product-item">
              <Link href={`/product/${node.handle}`}>
                <div className="product-card">
                  {image ? (
                    <Image
                      src={image.url}
                      alt={image.altText || node.title}
                      width={200}
                      height={200}
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="placeholder-image" />
                  )}
                  <p className="product-title">
                    {node.title} — £{node.priceRange.minVariantPrice.amount}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const query = `
  {
    products(first: 10) {
      edges {
        node {
          id
          title
          handle
          priceRange {
            minVariantPrice {
              amount
            }
          }
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;

  const data = await shopifyFetch({ query });

  return {
    props: {
      products: data.products,
    },
    revalidate: 60,
  };
};
