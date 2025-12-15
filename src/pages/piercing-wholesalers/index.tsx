import Head from 'next/head'
import Link from 'next/link'
import { WHOLESALERS } from '@/lib/wholesalers'

const COUNTRIES = Array.from(
  new Map(
    WHOLESALERS
      .map(w => [w.countrySlug, { slug: w.countrySlug, name: w.countryName }])
  ).values()
).sort((a, b) => a.name.localeCompare(b.name))


export default function PiercingWholesalersIndex() {
  return (
    <>
      <Head>
  <title>Piercing Wholesalers Directory | AURICLE</title>

  <meta
    name="description"
    content="A curated directory of piercing jewellery wholesalers and suppliers, organised by country."
  />
</Head>


      <main className="piercing-wholesalers">
        <h1>Piercing Wholesalers</h1>

        <p className="intro">
          A directory of piercing jewellery wholesalers, listed by country.
        </p>

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
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Piercing Wholesalers Directory",
      description:
        "A directory of piercing jewellery wholesalers organised by country.",
      url: "https://www.auricle.co.uk/piercing-wholesalers",
    }),
  }}
/>

      </main>
    </>
  )
}

