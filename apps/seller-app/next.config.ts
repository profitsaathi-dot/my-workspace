import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Bundle analyzer (run with ANALYZE=true npm run build)
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
    // Allow images from backend API
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9097',
        pathname: '/api/v1/product/*/image',
      },
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS domains for production
        pathname: '/api/v1/product/*/image',
      },
    ],
    // Local patterns for proxied images
    localPatterns: [
      {
        pathname: "/api/products/image/**",
      },
    ],
    // Optimize caching
    minimumCacheTTL: 31536000, // 1 year in seconds
    formats: ['image/webp', 'image/avif'],
  },

  // Webpack optimization for smaller bundles
  webpack: (config, { isServer }) => {
    // Tree shaking optimization
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
    };
    
    return config;
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'axios'],
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the Sentry DSN in `sentry.client.config.ts` is also set to use the tunnel.
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // NEW: Webpack-specific options (not supported with Turbopack)
  webpack: {
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
    // Automatically annotate React components to show their full name in breadcrumbs and session replay
    reactComponentAnnotation: {
      enabled: true,
    },
    // Enables automatic instrumentation of Vercel Cron Monitors
    automaticVercelMonitors: true,
  },
};

// Make sure adding Sentry options is the last code to run before exporting
export default withBundleAnalyzer(withSentryConfig(nextConfig, sentryWebpackPluginOptions));
