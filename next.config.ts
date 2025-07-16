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
  }
};

// ✅ Fix: Pass pwa options as second argument to withPWA.createPWA
export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
}).withPlugins([], baseConfig);
