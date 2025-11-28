import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';
import Seo from '@/components/Seo';

interface InfoPreview {
  slug: string;
  title: string;
  description: string;
}

export default function InformationIndex({ pages }: { pages: InfoPreview[] }) {
  return (
    <main className="information-index">
      <Seo title="Information" description="Important information pages." />
      <h1>ALL TERMS & POLICIES</h1>
      <p>
        All AURICLE legal pages in one place. All terms and policies are
        non-negotiable; to use the website or place orders you must accept
        them. Cookies are required for site and checkout (all-or-nothing
        consent)
      </p>
      <br />
      <ul>
        {pages.map(({ slug, title, description }) => (
          <li key={slug}>
            <Link href={`/information/${slug}`}>{title}</Link>
            {description && <p>{description}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}

export async function getStaticProps() {
  const dir = path.join(process.cwd(), 'content/information');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

  // Group by base slug (before first ".")
  const bySlug: Record<string, InfoPreview> = {};

  for (const filename of files) {
    // Strip .md
    const base = filename.replace(/\.md$/i, '');
    // Drop suffix like ".gb-en" / ".us-en"
    const [slug] = base.split('.');
    if (!slug) continue;

    // If we already have this slug, keep the first one for now
    if (bySlug[slug]) continue;

    const file = fs.readFileSync(path.join(dir, filename), 'utf8');
    const { data } = matter(file);

    bySlug[slug] = {
      slug,
      title: (data.title as string) || slug,
      description: (data.description as string) || '',
    };
  }

  const pages = Object.values(bySlug);

  return {
    props: {
      pages,
    },
  };
}
