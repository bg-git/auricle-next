import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';
import Seo from '@/components/Seo';

interface QualityAssurancePreview {
  slug: string;
  title: string;
  description: string;
  order?: number;
}

export default function QualityAssuranceIndex({ pages }: { pages: QualityAssurancePreview[] }) {
  return (
    <main className="quality-assurance-index">
      <Seo title="Quality Assurance" description="Important quality assurance pages." />
      <h1>QUALITY ASSURANCE</h1>
      <p>
        AURICLE takes jewellery safety and quality assurance seriously. The statements below explain how materials are tested, verified, and assessed for professional use.
      </p>
      <br />
      <ul>
        {pages.map(({ slug, title, description }) => (
          <li key={slug}>
            <Link href={`/quality-assurance/${slug}`}>{title}</Link>
            {description && <p>{description}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}

export async function getStaticProps() {
  const dir = path.join(process.cwd(), 'content/quality-assurance');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

  // Group by base slug (before first ".")
  const bySlug: Record<string, QualityAssurancePreview> = {};

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
      order: typeof data.order === 'number' ? data.order : 999,
    };
  }

  const pages = Object.values(bySlug).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  return {
    props: {
      pages,
    },
  };
}
