import Head from 'next/head';

type SeoProps = {
  title: string;
  description?: string;
  canonical?: string;
};

export default function Seo({ title, description, canonical }: SeoProps) {
  return (
    <Head>
      <title>{`${title} | AURICLE`}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}
    </Head>
  );
}
