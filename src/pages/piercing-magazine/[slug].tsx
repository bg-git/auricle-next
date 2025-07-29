import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import Image from 'next/image';
import Link from 'next/link';
import Head from 'next/head';
import Seo from '@/components/Seo';
import type { GetStaticProps, GetStaticPaths } from 'next';

interface BlogPostProps {
  title: string;
  description?: string;
  content: string;
  image: string | null;
  slug: string;
  prev?: { slug: string; title: string };
  next?: { slug: string; title: string };
  datePublished?: string;
}

export default function BlogPost({ title, description, content, image, slug, prev, next, datePublished }: BlogPostProps) {
  return (
    <>
      <Seo
        title={title}
        description={description || `Read ${title} on the AURICLE piercing magazine.`}
        canonical={`https://www.auricle.co.uk/piercing-magazine/${slug}`}
      />
      <Head>
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description || ''} />
        <meta property="og:image" content={image || '/placeholder.png'} />
        <meta property="og:url" content={`https://www.yoursite.com/piercing-magazine/${slug}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description || ''} />
        <meta name="twitter:image" content={image || '/placeholder.png'} />

        <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": title,
      "description": description || `Read ${title} on the AURICLE piercing magazine.`,
      "datePublished": datePublished || new Date().toISOString(),// Optional: set manually if available in frontmatter
      "dateModified": new Date().toISOString(), // Same here
      "author": {
        "@type": "Person",
        "name": "Wayne Grant"
      },
      "publisher": {
        "@type": "Organization",
        "name": "AURICLE",
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.auricle.co.uk/auricle-logo.png"
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://www.auricle.co.uk/piercing-magazine/${slug}`
      },
      ...(image && {
        image: {
          "@type": "ImageObject",
          "url": image,
        }
      })
    })
  }}
/>

      </Head>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
        <article className="blog-post">
          <h1>{title}</h1>

          <div className="blog-layout">
            {image && (
              <div className="blog-image">
                <Image
                  src={image}
                  alt={title}
                  width={1200}
                  height={1200}
                  style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
                />
              </div>
            )}

            <div
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>

          <div className="blog-nav">
            {prev && (
              <Link href={`/piercing-magazine/${prev.slug}`}>
                ← {prev.title}
              </Link>
            )}
            {next && (
              <Link href={`/piercing-magazine/${next.slug}`}>
                {next.title} →
              </Link>
            )}
          </div>
        </article>

      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const dir = path.join(process.cwd(), 'content/piercing-magazine');
  const files = fs.readdirSync(dir);
  const paths = files.map((file) => ({
    params: { slug: file.replace(/\.md$/, '') },
  }));
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string;
  const dir = path.join(process.cwd(), 'content/piercing-magazine');
  const files = fs.readdirSync(dir);
  const index = files.findIndex((f) => f.replace(/\.md$/, '') === slug);

  const file = fs.readFileSync(path.join(dir, `${slug}.md`), 'utf8');
  const { data, content } = matter(file);

  const prev = files[index - 1]
    ? {
        slug: files[index - 1].replace(/\.md$/, ''),
        title: matter(fs.readFileSync(path.join(dir, files[index - 1]), 'utf8')).data.title,
      }
    : null;

  const next = files[index + 1]
    ? {
        slug: files[index + 1].replace(/\.md$/, ''),
        title: matter(fs.readFileSync(path.join(dir, files[index + 1]), 'utf8')).data.title,
      }
    : null;

  return {
  props: {
    title: data.title || slug,
    description: data.description || null,
    content: marked.parse(content),
    image: data.image || '/placeholder.png',
    slug,
    prev,
    next,
    datePublished: data.date ? new Date(data.date).toISOString() : null,
  },
};
};
