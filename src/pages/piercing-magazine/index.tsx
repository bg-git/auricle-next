import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';
import Image from 'next/image';
import Seo from '@/components/Seo';

interface BlogPreview {
  slug: string;
  title: string;
  description: string;
  image: string | null;
}

export default function PiercingMagazineIndex({ posts }: { posts: BlogPreview[] }) {
  return (
    <main style={{ maxWidth: '870px', margin: '0 auto', padding: '16px' }}>
      <Seo
        title="Piercing Magazine | AURICLE"
        description="Read expert articles about body piercing, aftercare, and jewellery from the AURICLE team."
      />

      <h1 style={{ fontSize: '30px', fontWeight: 900, marginBottom: '24px' }}>
        Piercing Magazine
      </h1>

      <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: '1fr', marginTop: '24px' }}>
        {posts.map(({ slug, title, description, image }) => (
          <Link key={slug} href={`/piercing-magazine/${slug}`} className="blog-preview-card">
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              {image && (
                <div style={{ flex: '0 0 120px' }}>
                  <Image
                    src={image}
                    alt={title}
                    width={120}
                    height={120}
                    style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
                  />
                </div>
              )}
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{title}</h2>
                <p style={{ fontSize: '14px', color: '#555' }}>{description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

export async function getStaticProps() {
  const dir = path.join(process.cwd(), 'content/piercing-magazine');
  const files = fs.readdirSync(dir);

  const posts: BlogPreview[] = files.map((filename) => {
    const slug = filename.replace(/\.md$/, '');
    const file = fs.readFileSync(path.join(dir, filename), 'utf8');
    const { data } = matter(file);

    return {
      slug,
      title: data.title || slug,
      description: data.description || '',
      image: data.image || null,
    };
  });

  return {
    props: {
      posts,
    },
  };
}
