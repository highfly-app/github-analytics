import type { NextConfig } from "next";
import { withPostHogConfig } from "@posthog/nextjs-config";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: false,
  // When proxied, assets should still load from the analytics service directly
  // This ensures _next/static files are served from the correct origin
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || "",
  async headers() {
    return [
      {
        // Apply CORS headers to all static assets
        source: "/_next/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Allow all origins for static assets
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/relay-github-analytics/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/relay-github-analytics/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  skipTrailingSlashRedirect: true,
};

export default withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_API_KEY ?? "", // Server-side API key
  envId: process.env.POSTHOG_ENV_ID ?? "",
  sourcemaps: {
    enabled: process.env.NEXT_PUBLIC_VERCEL_ENV === "production", // Only enable in production
  },
});
