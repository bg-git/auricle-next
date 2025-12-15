import Head from 'next/head'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { WHOLESALERS } from '@/lib/wholesalers'

export default function CompanyPage() {
  const { query } = useRouter()
  const country = query.country as string
  const slug = query.company as string

  const company = WHOLESALERS.find(w => w.slug === slug)

  // Guard: not found OR wrong country in URL
  if (!company || company.countrySlug !== country) {
    return <main className="piercing-wholesalers">Company not found</main>
  }

  return (
    <>
      <Head>
  <title>
    {company.name} | Piercing Wholesaler | {company.countryName}
  </title>

  <meta
    name="description"
    content={`${company.name} is a piercing jewellery wholesaler based in ${company.countryName}. Company profile, website link, and overview.`}
  />
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

        <h2>About</h2>
        <p className="about">{company.about}</p>

        <h2>Summary</h2>
        <p className="description">{company.description}</p>

        <a
          href={company.website}
          target="_blank"
          rel="noopener noreferrer"
          className="external-link"
        >
          Visit official website →
        </a>

        <p className="disclaimer">
          AURICLE is not affiliated with this company. All trademarks belong to
          their respective owners.
        </p>
        <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: company.name,
      url: company.website,
      logo: `https://www.auricle.co.uk${company.logo}`,
      sameAs: [company.website],
      address: {
        "@type": "PostalAddress",
        addressCountry: company.countryName,
      },
    }),
  }}
/>

      </main>
    </>
  )
}
