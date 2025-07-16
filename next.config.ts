import withPWA from 'next-pwa';
import type { NextConfig } from 'next';

const baseConfig: NextConfig = {
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
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
};

const nextConfig = withPWA({
  ...baseConfig,
  pwa: {
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
  },
});

export default nextConfig;
