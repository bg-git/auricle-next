import type { GetStaticProps } from 'next';
import { shopifyFetch } from '@/lib/shopify';
import Link from 'next/link';
import Image from 'next/image';



export default function Home({ products }: any) {
  return (
    <main>
      <h1>Shop</h1>
      <ul>
  {products?.edges?.map(({ node }: any) => {
    const image = node.images.edges[0]?.node;

    return (
      <li key={node.id}>
        <Link href={`/product/${node.handle}`}>
          <div>
            {image ? (
             <Image
  src={image.url}
  alt={image.altText || node.title}
  width={200}
  height={200}
  style={{ objectFit: 'cover' }}
/>

            ) : (
              <div style={{ width: 200, height: 200, background: '#eee' }} />
            )}
            <p>{node.title} — £{node.priceRange.minVariantPrice.amount}</p>
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
    revalidate: 60, // ISR every 60 seconds (optional)
  };
};
