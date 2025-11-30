import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: false,
  // When proxied, assets should still load from the analytics service directly
  // This ensures _next/static files are served from the correct origin
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || '',
  async headers() {
    return [
      {
        // Apply CORS headers to all static assets
        source: '/_next/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Allow all origins for static assets
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;

