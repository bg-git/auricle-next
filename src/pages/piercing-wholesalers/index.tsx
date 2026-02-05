import Head from 'next/head'
import Link from 'next/link'
import { WHOLESALERS } from '@/lib/wholesalers'

const SITE = 'https://www.auricle.co.uk'

const COUNTRIES = Array.from(
  new Map(
    WHOLESALERS.map(w => [w.countrySlug, { slug: w.countrySlug, name: w.countryName }])
  ).values()
).sort((a, b) => a.name.localeCompare(b.name))

export default function PiercingWholesalersIndex() {
  const canonical = `${SITE}/piercing-wholesalers`

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Piercing Wholesalers Directory",
    description: "A directory of piercing jewellery wholesalers organised by country.",
    url: canonical,
    isPartOf: { "@type": "WebSite", name: "AURICLE", url: SITE },
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Piercing Wholesalers", item: canonical },
    ],
  }

  return (
    <>
      <Head>
        <title>Piercing Wholesalers Directory | AURICLE</title>
        <meta
          name="description"
          content="A curated directory of piercing jewellery wholesalers and suppliers, organised by country."
        />
        <link rel="canonical" href={canonical} />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Piercing Wholesalers Directory | AURICLE" />
        <meta property="og:description" content="A curated directory of piercing jewellery wholesalers organised by country." />
        <meta property="og:url" content={canonical} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      </Head>

      <main className="piercing-wholesalers">
        <h1>Piercing Wholesalers</h1>
        <p className="intro">A directory of piercing jewellery wholesalers, listed by country.</p>

        <div className="country-grid">
          {COUNTRIES.map(country => (
            <Link
              key={country.slug}
              href={`/piercing-wholesalers/${country.slug}`}
              className="country-card"
            >
              <div className="country-card__main">
                <h3 className="country-card__name">{country.name}</h3>
                <p className="country-card__meta">View wholesalers →</p>
              </div>
              <div className="country-card__action">→</div>
            </Link>
          ))}
        </div>
      </main>
    </>
  )
}
