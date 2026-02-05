import Head from 'next/head';

type SeoSchemaData = {
  headline: string;
  description: string;
  datePublished: string;
  dateModified: string;
  slug: string;
  region: string;
  canonicalBase: string;
};

type SeoProps = {
  title: string;
  description?: string;
  canonical?: string;
  schemaType?: 'TechArticle' | 'WebPage';
  schemaData?: SeoSchemaData;
};

export default function Seo({ title, description, canonical, schemaType = 'WebPage', schemaData }: SeoProps) {
  const schema = schemaData && schemaType === 'TechArticle' ? {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${schemaData.canonicalBase}/quality-assurance/${schemaData.slug}#article`,
    "headline": schemaData.headline,
    "description": schemaData.description,
    "mainEntityOfPage": `${schemaData.canonicalBase}/quality-assurance/${schemaData.slug}`,
    "datePublished": schemaData.datePublished,
    "dateModified": schemaData.dateModified,
    "inLanguage": schemaData.region === 'us' ? "en-US" : "en-GB",
    "keywords": "body piercing jewellery, compliance, UK, EU, ASTM standards",
    "author": {
      "@type": "Organization",
      "name": "AURICLE",
      "url": "https://www.auricle.co.uk"
    },
    "publisher": {
      "@type": "Organization",
      "name": "AURICLE",
      "url": "https://www.auricle.co.uk"
    },
    "isPartOf": {
      "@type": "WebSite",
      "name": "AURICLE",
      "url": "https://www.auricle.co.uk"
    }
  } : null;

  return (
    <Head>
      <title>{`${title} | AURICLE`}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
    </Head>
  );
}
