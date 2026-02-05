import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { WHOLESALERS } from '@/lib/wholesalers'
import type { GetStaticPaths, GetStaticProps } from 'next'

const SITE = 'https://www.auricle.co.uk'

interface Props {
  countryName: string
  countrySlug: string
  companies: Array<{
    slug: string
    name: string
    countryName: string
    logo: string
    description: string
  }>
}

export default function CountryWholesalersPage({ countryName, countrySlug, companies }: Props) {
  const router = useRouter()
  const canonical = `${SITE}/piercing-wholesalers/${countrySlug}`

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Piercing Wholesalers", item: `${SITE}/piercing-wholesalers` },
      { "@type": "ListItem", position: 3, name: countryName, item: canonical },
    ],
  }

  if (router.isFallback) {
    return <div>Loading...</div>
  }

  return (
    <>
      <Head>
        <title>{`Piercing Wholesalers in ${countryName} | AURICLE`}</title>
        <meta
          name="description"
          content={`Find piercing jewellery wholesalers and suppliers in ${countryName}. Browse our curated directory of professional piercing wholesalers.`}
        />
        <link rel="canonical" href={canonical} />

        <meta property="og:type" content="website" />
        <meta property="og:title" content={`Piercing Wholesalers in ${countryName} | AURICLE`} />
        <meta
          property="og:description"
          content={`Find piercing jewellery wholesalers and suppliers in ${countryName}.`}
        />
        <meta property="og:url" content={canonical} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      </Head>

      <main className="piercing-wholesalers">
        <h1>Piercing Wholesalers in {countryName}</h1>
        <p className="intro">Find professional piercing jewellery wholesalers and suppliers in {countryName}.</p>

        <div className="company-grid">
          {companies.map(company => (
            <Link
              key={company.slug}
              href={`/piercing-wholesalers/${countrySlug}/${company.slug}`}
              className="company-card"
            >
              {company.logo && (
                <div className="company-card__logo">
                  <img src={company.logo} alt={company.name} />
                </div>
              )}
              <div className="company-card__main">
                <h3 className="company-card__name">{company.name}</h3>
                <p className="company-card__description">{company.description}</p>
              </div>
              <div className="company-card__action">→</div>
            </Link>
          ))}
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Link href="/piercing-wholesalers">← Back to all countries</Link>
        </div>
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const countries = Array.from(
    new Map(
      WHOLESALERS.map(w => [w.countrySlug, w.countrySlug])
    ).values()
  )

  return {
    paths: countries.map(slug => ({
      params: { country: slug },
    })),
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const countrySlug = params?.country as string

  const companies = WHOLESALERS.filter(w => w.countrySlug === countrySlug).map(w => ({
    slug: w.slug,
    name: w.name,
    countryName: w.countryName,
    logo: w.logo,
    description: w.description,
  }))

  if (companies.length === 0) {
    return { notFound: true }
  }

  const countryName = companies[0]?.countryName || ''

  return {
    props: {
      countryName,
      countrySlug,
      companies,
    },
    revalidate: 86400,
  }
}
