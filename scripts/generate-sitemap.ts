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

  // Wholesalers: country pages + company pages
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

  // Finalize
  smStream.end()
  const sitemap = await streamToPromise(smStream).then(data => data.toString())
  fs.writeFileSync(path.join(process.cwd(), 'public/sitemap.xml'), sitemap)
}

generateSitemap().catch(err => {
  console.error('❌ Error generating sitemap:', err)
})
