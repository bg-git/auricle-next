import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Link from 'next/link'
import type { GetStaticProps } from 'next'
import { shopifyFetch } from '@/lib/shopify'
import { WHOLESALERS, type Wholesaler } from '@/lib/wholesalers'

interface PageLink {
  href: string
  label: string
}

interface Props {
  staticLinks: PageLink[]
  blogLinks: PageLink[]
  termsLinks: PageLink[]
  qaLinks: PageLink[]
  collectionLinks: PageLink[]
  productLinks: PageLink[]
  wholesalerLinks: PageLink[]
}

export default function SitemapPage({
  staticLinks,
  blogLinks,
  termsLinks,
  qaLinks,
  collectionLinks,
  productLinks,
  wholesalerLinks,
}: Props) {
  return (
    <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>
        Sitemap
      </h1>

      <Section title="Main Pages" links={staticLinks} />
      <Section title="Collections" links={collectionLinks} />
      <Section title="Products" links={productLinks} />
      <Section title="Blog Posts" links={blogLinks} />
      <Section title="Terms & Conditions" links={termsLinks} />
      <Section title="Quality Assurance" links={qaLinks} />
      <Section title="Piercing Wholesalers" links={wholesalerLinks} />

      <p style={{ fontSize: '14px', marginTop: '40px' }}>
        View the <Link href="/sitemap.xml">sitemap.xml</Link> for search engines.
      </p>
    </main>
  )
}

function Section({ title, links }: { title: string; links: PageLink[] }) {
  if (links.length === 0) return null
  return (
    <section style={{ marginBottom: '48px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
        {title}
      </h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {links.map(link => (
          <li key={link.href} style={{ marginBottom: '8px', fontSize: '14px' }}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export const getStaticProps: GetStaticProps<Props> = async () => {
  const staticLinks: PageLink[] = [
    { href: '/', label: 'Home' },
    { href: '/favourites', label: 'Favourites' },
    { href: '/piercing-magazine', label: 'Piercing Magazine' },
    { href: '/sitemap.xml', label: 'Sitemap XML' },
  ]

  /* ---------- WHOLESALERS ---------- */

  const wholesalerLinks: PageLink[] = [
    { href: '/piercing-wholesalers', label: 'Piercing Wholesalers (Directory)' },
  ]

  const countries = Array.from(
    new Map(
      WHOLESALERS.map((w: Wholesaler) => [w.countrySlug, w.countryName])
    ).entries()
  )
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  countries.forEach(c => {
    wholesalerLinks.push({
      href: `/piercing-wholesalers/${c.slug}`,
      label: `Piercing Wholesalers – ${c.name}`,
    })
  })

  WHOLESALERS.forEach(w => {
    wholesalerLinks.push({
      href: `/piercing-wholesalers/${w.countrySlug}/${w.slug}`,
      label: `${w.name} (${w.countryName})`,
    })
  })

  /* ---------- BLOG ---------- */

  const blogDir = path.join(process.cwd(), 'content/piercing-magazine')
  const blogFiles = fs.existsSync(blogDir) ? fs.readdirSync(blogDir) : []

  const blogLinks: PageLink[] = blogFiles
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const slug = file.replace(/\.md$/, '')
      const raw = fs.readFileSync(path.join(blogDir, file), 'utf8')
      const { data } = matter(raw)
      return {
        href: `/piercing-magazine/${slug}`,
        label: data.title || slug,
      }
    })

  /* ---------- TERMS & CONDITIONS ---------- */

  const termsDir = path.join(process.cwd(), 'content/information')
  const termsFiles = fs.existsSync(termsDir) ? fs.readdirSync(termsDir) : []

  // Group by base slug (before language code) to avoid duplicates
  const uniqueTerms: Record<string, PageLink> = {}
  termsFiles
    .filter(file => file.endsWith('.md'))
    .forEach(file => {
      // Extract base slug (e.g., "about-us" from "about-us.gb-en.md")
      const baseSlug = file.replace(/\.[a-z]{2}-[a-z]{2}\.md$/, '').replace(/\.md$/, '')
      
      // Only process if we haven't seen this slug yet
      if (!uniqueTerms[baseSlug]) {
        const raw = fs.readFileSync(path.join(termsDir, file), 'utf8')
        const { data } = matter(raw)
        uniqueTerms[baseSlug] = {
          href: `/information/${baseSlug}`,
          label: data.title || baseSlug,
        }
      }
    })

  const termsLinks: PageLink[] = Object.values(uniqueTerms)

  /* ---------- QUALITY ASSURANCE ---------- */

  const qaDir = path.join(process.cwd(), 'content/quality-assurance')
  const qaFiles = fs.existsSync(qaDir) ? fs.readdirSync(qaDir) : []

  const qaLinks: PageLink[] = qaFiles
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const slug = file.replace(/\.md$/, '')
      const raw = fs.readFileSync(path.join(qaDir, file), 'utf8')
      const { data } = matter(raw)
      return {
        href: `/quality-assurance/${slug}`,
        label: data.title || slug,
      }
    })

  const collectionQuery = `
    {
      collections(first: 100) {
        edges {
          node {
            handle
            title
          }
        }
      }
    }
  `
  const collectionData = await shopifyFetch({ query: collectionQuery })

  const collectionLinks: PageLink[] =
    collectionData.collections.edges.map(
      ({ node }: { node: { handle: string; title: string } }) => ({
        href: `/collection/${node.handle}`,
        label: node.title,
      })
    )

  const productQuery = `
    {
      products(first: 100) {
        edges {
          node {
            handle
            title
          }
        }
      }
    }
  `
  const productData = await shopifyFetch({ query: productQuery })

  const productLinks: PageLink[] =
    productData.products.edges.map(
      ({ node }: { node: { handle: string; title: string } }) => ({
        href: `/product/${node.handle}`,
        label: node.title,
      })
    )

  return {
    props: {
      staticLinks,
      wholesalerLinks,
      blogLinks,
      termsLinks,
      qaLinks,
      collectionLinks,
      productLinks,
    },
  }
}
