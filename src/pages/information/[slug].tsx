import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import Seo from '@/components/Seo';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useRegion } from '@/context/RegionContext';

interface InfoVariant {
  title: string;
  description: string | null;
  html: string;
}

interface InfoPageProps {
  slug: string;
  gbEn: InfoVariant | null;
  usEn: InfoVariant | null;
}

export default function InformationPage({ slug, gbEn, usEn }: InfoPageProps) {
  const region = useRegion();

  // Pick the appropriate variant based on region, with sensible fallbacks
  const variant =
    region === 'us'
      ? usEn || gbEn // .com prefers US-EN, falls back to GB-EN
      : gbEn || usEn; // .co.uk prefers GB-EN, falls back to US-EN

  if (!variant) {
    return (
      <main className="info-page">
        <h1>Page not found</h1>
      </main>
    );
  }

  const canonicalBase =
    region === 'us'
      ? 'https://www.auriclejewelry.com'
      : 'https://www.auricle.co.uk';

  return (
    <main className="info-page">
      <Seo
        title={variant.title}
        description={variant.description || ''}
        canonical={`${canonicalBase}/information/${slug}`}
      />
      <h1>{variant.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: variant.html }} />

      {/* Global translations / localisation notice */}
      <section className="info-page__translation-note">
        <h2>Local language and translations</h2>
        {region === 'us' ? (
          <p>
            We aim to provide localized and translated versions of this page so
            information is easier to understand. Translations are offered for
            convenience only and may not always be complete or fully accurate.
            If there is any difference or uncertainty between a translated
            version and the original UK English version of these terms or
            policies, the UK English version will take priority and will govern
            your use of our services. If anything in a translation is unclear,
            email <strong>info@auricle.co.uk</strong> so we can assist.
          </p>
        ) : (
          <p>
            We aim to provide localised and translated versions of this page so
            information is easier to follow. Translations are offered for
            convenience only and may not always be complete or fully accurate.
            If there is any difference or uncertainty between a translated
            version and the UK English version of these terms or policies, the
            UK English version takes priority and governs your use of our
            services. If anything in a translation is unclear, email{' '}
            <strong>info@auricle.co.uk</strong> so we can help.
          </p>
        )}
      </section>
    </main>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const dir = path.join(process.cwd(), 'content/information');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

  const slugs = Array.from(
    new Set(
      files
        .map((file) => {
          const base = file.replace(/\.md$/i, '');
          const [slug] = base.split('.');
          return slug || null;
        })
        .filter((slug): slug is string => Boolean(slug))
    )
  );

  const paths = slugs.map((slug) => ({
    params: { slug },
  }));

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<InfoPageProps> = async ({ params }) => {
  const slug = params?.slug as string;
  const baseDir = path.join(process.cwd(), 'content/information');

  const loadMarkdown = (filename: string): InfoVariant | null => {
    const fullPath = path.join(baseDir, filename);
    if (!fs.existsSync(fullPath)) return null;

    const raw = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(raw);

    return {
      title: (data.title as string) || slug,
      description: (data.description as string) || null,
      html: marked.parse(content) as string,
    };
  };

  const defaultVariant = loadMarkdown(`${slug}.md`);

  const gbEn = loadMarkdown(`${slug}.gb-en.md`) || defaultVariant;
  const usEn = loadMarkdown(`${slug}.us-en.md`) || defaultVariant;

  if (!gbEn && !usEn) {
    return { notFound: true };
  }

  return {
    props: {
      slug,
      gbEn: gbEn || null,
      usEn: usEn || null,
    },
    revalidate: 60,
  };
};
