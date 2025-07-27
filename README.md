# Auricle Next.js Storefront

This repository contains the source code for **Auricle**, a Shopify powered ecommerce storefront built with [Next.js](https://nextjs.org/). It integrates with the Shopify Storefront API to fetch product and collection data and includes a small blog powered by local markdown files.

## Requirements

Before running the project you must provide the following environment variables in a `.env.local` file at the project root:

```
SHOPIFY_STORE_DOMAIN=your-shop.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SHOPIFY_ADMIN_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
SITE_DOMAIN=https://www.example.com   # used for sitemap generation
```

The Shopify variables are required to query the Storefront API and perform customer actions. The Supabase keys enable authentication features. `SITE_DOMAIN` is optional but recommended so that the sitemap generator produces correct URLs.

## Development

1. Install dependencies:
   ```bash
   yarn install
   ```
2. Start the development server:
   ```bash
   yarn dev
   ```
   The site will be available at [http://localhost:3000](http://localhost:3000).

## Building

Create an optimized production build with:

```bash
yarn build
```

This runs the sitemap generator and compiles the Next.js application into the `.next` folder.
You can then start the production server locally with:

```bash
yarn start
```

## Deployment

The project can be deployed to any Node.js environment that supports Next.js.
Common options include [Vercel](https://vercel.com/) or a custom server.
Ensure that the environment variables listed above are provided in your deployment platform.

