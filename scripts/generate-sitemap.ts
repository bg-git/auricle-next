import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { SitemapStream, streamToPromise } from 'sitemap'
import { shopifyFetch } from '../src/lib/shopify.js'
import { WHOLESALERS } from '../src/lib/wholesalers.js'
import type { Wholesaler } from '../src/lib/wholesalers.js'

const DOMAIN = process.env.SITE_DOMAIN || 'http://localhost:3000'

type ShopifyHandleEdge = {
  node: {
    handle: string
  }
}

type ShopifyHandlesResponse = {
  products?: { edges?: ShopifyHandleEdge[] }
  collections?: { edges?: ShopifyHandleEdge[] }
}

async function fetchShopifyHandles(
  type: 'products' | 'collections'
): Promise<string[]> {
  const query = `
    {
      ${type}(first: 250) {
        edges {
          node {
            handle
          }
        }
      }
    }
  `

  const data = (await shopifyFetch({ query })) as ShopifyHandlesResponse
  const edges = data[type]?.edges ?? []
  return edges.map(edge => edge.node.handle)
}

async function generateSitemap() {
  const smStream = new SitemapStream({ hostname: DOMAIN })

  // Static pages
  const staticPaths: string[] = [
    '',
    '/account',
    '/register',
    '/sign-in',
    '/favourites',
    '/piercing-magazine',
    '/piercing-wholesalers',
  ]

  staticPaths.forEach(url => {
    smStream.write({ url, changefreq: 'weekly', priority: 0.8 })
  })

  // Blog posts
  const blogDir = path.join(process.cwd(), 'content/piercing-magazine')
  const blogFiles = fs.existsSync(blogDir) ? fs.readdirSync(blogDir) : []

  blogFiles.forEach(file => {
    if (file.endsWith('.md')) {
      const slug = file.replace(/\.md$/, '')
      smStream.write({
        url: `/piercing-magazine/${slug}`,
        changefreq: 'monthly',
        priority: 0.7,
      })
    }
  })

  // Terms & Conditions pages
  const termsDir = path.join(process.cwd(), 'content/information')
  const termsFiles = fs.existsSync(termsDir) ? fs.readdirSync(termsDir) : []

  // Group by base slug (before language code) to avoid duplicates
  const uniqueTermsSlugs = new Set<string>()
  termsFiles.forEach(file => {
    if (file.endsWith('.md')) {
      // Extract base slug (e.g., "about-us" from "about-us.gb-en.md")
      const baseSlug = file.replace(/\.[a-z]{2}-[a-z]{2}\.md$/, '').replace(/\.md$/, '')
      uniqueTermsSlugs.add(baseSlug)
    }
  })

  uniqueTermsSlugs.forEach(slug => {
    smStream.write({
      url: `/information/${slug}`,
      changefreq: 'monthly',
      priority: 0.6,
    })
  })

  // Quality Assurance pages
  const qaDir = path.join(process.cwd(), 'content/quality-assurance')
  const qaFiles = fs.existsSync(qaDir) ? fs.readdirSync(qaDir) : []

  qaFiles.forEach(file => {
    if (file.endsWith('.md')) {
      const slug = file.replace(/\.md$/, '')
      smStream.write({
        url: `/quality-assurance/${slug}`,
        changefreq: 'monthly',
        priority: 0.6,
      })
    }
  })

  // Shopify product pages
  const productHandles = await fetchShopifyHandles('products')
  productHandles.forEach(handle => {
    smStream.write({
      url: `/product/${handle}`,
      changefreq: 'weekly',
      priority: 0.9,
    })
  })

  // Shopify collection pages
  const collectionHandles = await fetchShopifyHandles('collections')
  collectionHandles.forEach(handle => {
    smStream.write({
      url: `/collection/${handle}`,
      changefreq: 'weekly',
      priority: 0.8,
    })
  })

  // Wholesalers: country pages + company pages (at the end)
  const countrySlugs = Array.from(
    new Set(WHOLESALERS.map((w: Wholesaler) => w.countrySlug))
  ).sort()

  countrySlugs.forEach(countrySlug => {
    smStream.write({
      url: `/piercing-wholesalers/${countrySlug}`,
      changefreq: 'monthly',
      priority: 0.7,
    })
  })

  WHOLESALERS.forEach((w: Wholesaler) => {
    smStream.write({
      url: `/piercing-wholesalers/${w.countrySlug}/${w.slug}`,
      changefreq: 'monthly',
      priority: 0.6,
    })
  })

  // Finalize
  smStream.end()
  const sitemap = await streamToPromise(smStream).then(data => data.toString())
  fs.writeFileSync(path.join(process.cwd(), 'public/sitemap.xml'), sitemap)
}

generateSitemap().catch(err => {
  console.error('❌ Error generating sitemap:', err)
})
