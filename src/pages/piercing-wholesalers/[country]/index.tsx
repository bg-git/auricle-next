import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { WHOLESALERS, type Wholesaler } from '@/lib/wholesalers'

type CardCompany = Pick<Wholesaler, 'slug' | 'name' | 'description' | 'logo'>

export default function CountryPage() {
  const { query } = useRouter()
  const country = query.country as string

  const companies: CardCompany[] = WHOLESALERS
    .filter(w => w.countrySlug === country)
    .map(w => ({
      slug: w.slug,
      name: w.name,
      description: w.description,
      logo: w.logo,
    }))

  return (
    <>
      <Head>
  <title>
    Piercing Wholesalers in {country?.replace(/-/g, ' ')} | AURICLE Directory
  </title>

  <meta
    name="description"
    content={`Directory of piercing jewellery wholesalers based in ${country?.replace(
      /-/g,
      ' '
    )}. Browse suppliers by country.`}
  />
</Head>


      <main className="piercing-wholesalers">
        <h1>Piercing Wholesalers</h1>
        <h2>{country?.replace(/-/g, ' ')}</h2>

        <div className="company-grid">
          {companies.map(company => (
            <Link
              key={company.slug}
              href={`/piercing-wholesalers/${country}/${company.slug}`}
              className="wh-card"
            >
              <div className="wh-card__logo">
                <Image
                  src={company.logo}
                  alt={`${company.name} logo`}
                  width={88}
                  height={88}
                />
              </div>

              <div className="wh-card__main">
                <h3 className="wh-card__name">{company.name}</h3>
                <p className="wh-card__desc">{company.description}</p>
              </div>

              <div className="wh-card__action">
                <span>View →</span>
              </div>
            </Link>
          ))}
        </div>
        <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: companies.map((company, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: company.name,
        url: `https://www.auricle.co.uk/piercing-wholesalers/${country}/${company.slug}`,
      })),
    }),
  }}
/>

      </main>
    </>
  )
}
