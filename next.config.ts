import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
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
