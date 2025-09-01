import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/fallback.html',
  },
  runtimeCaching: [
    {
      // Cache static and semi-static pages
      urlPattern: ({ url }) => {
        const blocked = [
          '/account',
          '/checkout',
          '/sign-in',
          '/register',
          '/reset-password',
          '/search',
        ];
        return (
          url.pathname.endsWith('.html') ||
          (!blocked.some((p) => url.pathname.startsWith(p)) &&
            url.pathname !== '/_next/image')
        );
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
      },
    },
    {
      // Cache Next.js generated static files
      urlPattern: /^https?.*\/_next\/static\/.*$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
    {
      // Cache image assets
      urlPattern: /^https?.*\.(png|jpg|jpeg|gif|webp|svg)/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
  ],
  buildExcludes: [
    /chunks\/pages\/account.*\.js$/,
    /chunks\/pages\/checkout.*\.js$/,
    /chunks\/pages\/sign-in.*\.js$/,
    /chunks\/pages\/register.*\.js$/,
    /chunks\/pages\/reset-password.*\.js$/,
    /chunks\/pages\/search.*\.js$/,
    /middleware-manifest\.json$/,
  ],
});

const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        pathname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 768, 1024, 1280, 1440, 1600, 1920],
    imageSizes: [300, 350, 400, 500, 600, 750, 900],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default pwaConfig(nextConfig);
