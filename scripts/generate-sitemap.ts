import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { SitemapStream, streamToPromise } from 'sitemap';
import { shopifyFetch } from '../src/lib/shopify.js';



const DOMAIN = process.env.SITE_DOMAIN || 'http://localhost:3000';

async function fetchShopifyHandles(type: 'products' | 'collections') {
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
  `;

  const data = await shopifyFetch({ query });
  return (data[type]?.edges || []).map((edge: { node: { handle: string } }) => edge.node.handle);

}

async function generateSitemap() {
  const smStream = new SitemapStream({ hostname: DOMAIN });

  // Static pages
  const staticPaths = [
    '',
    '/account',
    '/register',
    '/sign-in',
    '/favourites',
    '/piercing-magazine',
  ];

  staticPaths.forEach((url) => {
    smStream.write({ url, changefreq: 'weekly', priority: 0.8 });
  });

  // Blog posts
  const blogDir = path.join(process.cwd(), 'content/piercing-magazine');
  const blogFiles = fs.existsSync(blogDir) ? fs.readdirSync(blogDir) : [];

  blogFiles.forEach((file) => {
    if (file.endsWith('.md')) {
      const slug = file.replace(/\.md$/, '');
      smStream.write({
        url: `/piercing-magazine/${slug}`,
        changefreq: 'monthly',
        priority: 0.7,
      });
    }
  });

  // Shopify product pages
  const productHandles = await fetchShopifyHandles('products');
  productHandles.forEach((handle: string) => {
    smStream.write({
      url: `/product/${handle}`,
      changefreq: 'weekly',
      priority: 0.9,
    });
  });

  // Shopify collection pages
  const collectionHandles = await fetchShopifyHandles('collections');
  collectionHandles.forEach((handle: string) => {
    smStream.write({
      url: `/collection/${handle}`,
      changefreq: 'weekly',
      priority: 0.8,
    });
  });

  // Finalize
  smStream.end();
  const sitemap = await streamToPromise(smStream).then((data) => data.toString());
  fs.writeFileSync(path.join(process.cwd(), 'public/sitemap.xml'), sitemap);
}

generateSitemap().catch((err) => {
  console.error('❌ Error generating sitemap:', err);
});
