// src/components/Seo.tsx
import Head from 'next/head';

type SeoProps = {
  title: string;
  description?: string;
};

export default function Seo({ title, description }: SeoProps) {
  return (
    <Head>
      <title>{title} | AURICLE</title>
      {description && <meta name="description" content={description} />}
    </Head>
  );
}
