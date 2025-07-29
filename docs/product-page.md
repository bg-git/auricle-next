# Product Page Rendering

The `src/pages/product/[handle].tsx` page is statically generated at build time using `getStaticPaths` and `getStaticProps`. Each product handle is prebuilt and revalidated periodically so the page can be served from the CDN.

Customer session data is **not** fetched during static generation. Instead, the `AuthProvider` checks for the `customer_session` cookie in the browser and calls the `/api/shopify/verify-customer` endpoint on the client to populate the user object. This means that session verification happens after the page loads and does not block static generation.

Because the page is fully static, Next.js can automatically prefetch the page when a `<Link>` to a product is in the viewport.
