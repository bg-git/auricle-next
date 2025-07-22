import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';
import type { GetStaticProps } from 'next';
import { shopifyFetch } from '@/lib/shopify'; // assumes you already have this

interface PageLink {
  href: string;
  label: string;
}

interface Props {
  staticLinks: PageLink[];
  blogLinks: PageLink[];
  collectionLinks: PageLink[];
  productLinks: PageLink[];
}

export default function SitemapPage({
  staticLinks,
  blogLinks,
  collectionLinks,
  productLinks,
}: Props) {
  return (
    <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Sitemap</h1>

      <Section title="Main Pages" links={staticLinks} />
      <Section title="Collections" links={collectionLinks} />
      <Section title="Products" links={productLinks} />
      <Section title="Blog Posts" links={blogLinks} />

      <p style={{ fontSize: '14px', marginTop: '40px' }}>
        View the <Link href="/sitemap.xml">sitemap.xml</Link> for search engines.
      </p>
    </main>
  );
}

function Section({ title, links }: { title: string; links: PageLink[] }) {
  if (links.length === 0) return null;
  return (
    <section style={{ marginBottom: '48px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>{title}</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {links.map((link) => (
          <li key={link.href} style={{ marginBottom: '8px', fontSize: '14px' }}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const staticLinks: PageLink[] = [
    { href: '/', label: 'Home' },
    { href: '/favourites', label: 'Favourites' },
    { href: '/piercing-magazine', label: 'Piercing Magazine' },
    { href: '/sitemap.xml', label: 'Sitemap XML' },
  ];

  const blogDir = path.join(process.cwd(), 'content/piercing-magazine');
  const blogFiles = fs.existsSync(blogDir) ? fs.readdirSync(blogDir) : [];

  const blogLinks: PageLink[] = blogFiles
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const slug = file.replace(/\.md$/, '');
      const raw = fs.readFileSync(path.join(blogDir, file), 'utf8');
      const { data } = matter(raw);
      return {
        href: `/piercing-magazine/${slug}`,
        label: data.title || slug,
      };
    });

  // === ✅ Fetch collections ===
  const collectionQuery = `
    {
      collections(first: 100) {
        edges {
          node {
            handle
            title
          }
        }
      }
    }
  `;
  const collectionData = await shopifyFetch({ query: collectionQuery });
  const collectionLinks: PageLink[] =
    collectionData.collections.edges.map(({ node }: { node: { handle: string; title: string } }) => ({
      href: `/collection/${node.handle}`,
      label: node.title,
    })) || [];

  // === ✅ Fetch products ===
  const productQuery = `
    {
      products(first: 100) {
        edges {
          node {
            handle
            title
          }
        }
      }
    }
  `;
  const productData = await shopifyFetch({ query: productQuery });
  const productLinks: PageLink[] =
  productData.products.edges.map(
    ({ node }: { node: { handle: string; title: string } }) => ({
      href: `/product/${node.handle}`,
      label: node.title,
    })
  ) || [];


  return {
    props: {
      staticLinks,
      blogLinks,
      collectionLinks,
      productLinks,
    },
  };
};
