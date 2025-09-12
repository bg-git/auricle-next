import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import Seo from '@/components/Seo';
import type { GetStaticPaths, GetStaticProps } from 'next';

interface InfoPageProps {
  title: string;
  description?: string;
  content: string;
  slug: string;
}

export default function InformationPage({ title, description, content, slug }: InfoPageProps) {
  return (
    <main className="info-page">
      <Seo
        title={title}
        description={description || ''}
        canonical={`https://www.auricle.co.uk/information/${slug}`}
      />
      <h1>{title}</h1>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </main>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const dir = path.join(process.cwd(), 'content/information');
  const files = fs.readdirSync(dir);
  const paths = files.map((file) => ({
    params: { slug: file.replace(/\.md$/, '') },
  }));
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string;
  const file = fs.readFileSync(
    path.join(process.cwd(), 'content/information', `${slug}.md`),
    'utf8'
  );
  const { data, content } = matter(file);

  return {
    props: {
      title: data.title || slug,
      description: data.description || null,
      content: marked.parse(content),
      slug,
    },
  };
};

