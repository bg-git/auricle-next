import withPWA from 'next-pwa';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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

  // ✅ pwa config goes directly inside the object passed to withPWA
  pwa: {
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
  },
};

export default withPWA(nextConfig);
