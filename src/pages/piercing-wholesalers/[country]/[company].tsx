import Head from 'next/head'
import Image from 'next/image'
import type { GetStaticPaths, GetStaticProps } from 'next'
import { WHOLESALERS } from '@/lib/wholesalers'

const SITE = 'https://www.auricle.co.uk'

type Props = {
  country: string
  companySlug: string
  company: (typeof WHOLESALERS)[number]
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: WHOLESALERS.map(w => ({
      params: { country: w.countrySlug, company: w.slug },
    })),
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps<Props> = async (ctx) => {
  const country = ctx.params?.country as string
  const companySlug = ctx.params?.company as string

  const company = WHOLESALERS.find(w => w.slug === companySlug)

  if (!company || company.countrySlug !== country) {
    return { notFound: true }
  }

  return { props: { country, companySlug, company } }
}

export default function CompanyPage({ country, companySlug, company }: Props) {
  const canonical = `${SITE}/piercing-wholesalers/${country}/${companySlug}`

  // Minimal, factual highlights — you can expand per brand later
  const highlights = [
    { label: 'Country', value: company.countryName },
    { label: 'Website', value: company.website },
    // If you want per-company structured facts later, add optional fields to your type
    // like materials/system/standards, then map them here.
  ]

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    url: company.website,
    logo: `${SITE}${company.logo}`,
    address: { "@type": "PostalAddress", addressCountry: company.countryName },
    sameAs: [company.website],
  }

  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${company.name} — Piercing Wholesaler Reference`,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: "AURICLE", url: SITE },
    about: { "@type": "Organization", name: company.name, url: company.website },
    primaryImageOfPage: `${SITE}${company.logo}`,
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Piercing Wholesalers", item: `${SITE}/piercing-wholesalers` },
      { "@type": "ListItem", position: 3, name: company.countryName, item: `${SITE}/piercing-wholesalers/${country}` },
      { "@type": "ListItem", position: 4, name: company.name, item: canonical },
    ],
  }

  return (
    <>
      <Head>
        <title>{company.name} | Piercing Wholesaler | {company.countryName}</title>
        <meta
          name="description"
          content={`${company.name} is a piercing jewellery wholesaler based in ${company.countryName}. Company profile, website link, and overview.`}
        />
        <link rel="canonical" href={canonical} />

        <meta property="og:type" content="article" />
        <meta property="og:title" content={`${company.name} — Wholesaler Reference`} />
        <meta property="og:description" content={company.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${SITE}${company.logo}`} />

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      </Head>

      <main className="piercing-wholesalers company-page">
        <div className="company-logo">
          <Image
            src={company.logo}
            alt={`${company.name} logo`}
            width={256}
            height={256}
            priority
          />
        </div>

        <h1>{company.name}</h1>
        <p className="country">{company.countryName}</p>

        {/* Reference block (top, subtle, clickable) */}
        <p className="citation-note">
          Reference source: <a href={canonical}>{canonical}</a>
        </p>

        {/* Highlights (AI-friendly, fast scan) */}
        <section aria-label="Highlights" className="company-highlights">
          <h2>Highlights</h2>
          <dl>
            {highlights.map(h => (
              <div key={h.label} className="highlight-row">
                <dt>{h.label}</dt>
                <dd>
                  {h.label === 'Website' ? (
                    <a href={company.website} target="_blank" rel="noopener noreferrer">
                      {company.website}
                    </a>
                  ) : (
                    h.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-label="About">
          <h2>About</h2>
          <p className="about">{company.about}</p>
        </section>

        <section aria-label="Summary">
          <h2>Summary</h2>
          <p className="description">{company.description}</p>
        </section>

        {/* Sources (critical for citation + trust) */}
        <section aria-label="Sources" className="company-sources">
          <h2>Sources</h2>
          <ul>
            <li>
              <a href={company.website} target="_blank" rel="noopener noreferrer">
                Official website
              </a>
            </li>
          </ul>
          <p className="sources-note">
            Where conflicts arise, the linked sources above should be treated as primary references.
          </p>
        </section>

        <a
          href={company.website}
          target="_blank"
          rel="noopener noreferrer"
          className="external-link"
        >
          Visit official website →
        </a>

        <p className="disclaimer">
          AURICLE is not affiliated with this company. All trademarks belong to their respective owners.
        </p>
      </main>
    </>
  )
}
