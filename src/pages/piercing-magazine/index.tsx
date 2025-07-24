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
    <main className="blog-index">
  <Seo
    title="Piercing Magazine | AURICLE"
    description="Read expert articles about body piercing, aftercare, and jewellery from the AURICLE team."
  />

  <h1>PIERCING MAGAZINE</h1>

  <div className="blog-grid">
    {posts.map(({ slug, title, description, image }) => (
      <Link key={slug} href={`/piercing-magazine/${slug}`} className="blog-preview-card">
        <div className="card-image">
          <Image
            src={image || '/placeholder.png'}
            alt={title}
            width={1200}
            height={1200}
            quality={80}
            priority={false}
          />
        </div>
        <div className="card-body">
          <h2>{title}</h2>
          <p>{description}</p>
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
