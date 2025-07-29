import withPWA from 'next-pwa';

// PWA configuration with offline fallback support

const runtimeCaching = [
  {
    urlPattern: /^\/_next\/static\/.*$/i,
    handler: 'CacheFirst',
  },
  {
    urlPattern: /^\/$/,
    handler: 'CacheFirst',
  },
  {
    urlPattern: /^\/product\/.*$/,
    handler: 'CacheFirst',
  },
  {
    urlPattern: /^\/piercing-magazine\/.*$/,
    handler: 'CacheFirst',
  },
  {
    urlPattern: /^\/favourites$/,
    handler: 'CacheFirst',
  },
  {
    urlPattern: /^\/collection\/.*$/,
    handler: 'StaleWhileRevalidate',
  },
  {
    urlPattern: /^\/(checkout|sign-in|register|reset-password|account|search)$/,
    handler: 'NetworkOnly',
  }
];

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching,
  fallbacks: {
    document: '/fallback.html',
  },
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
    formats: ['image/webp'],
    deviceSizes: [360, 414, 768, 1024, 1280, 1440, 1600, 1920],
    imageSizes: [300, 350, 400, 500, 600, 750, 900],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default pwaConfig(nextConfig);
