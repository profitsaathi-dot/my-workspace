import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = createNextIntlPlugin();

// Bundle analyzer (run with ANALYZE=true npm run build)
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  basePath: '/user',
  transpilePackages: ["@workspace/ui"],
 
  // Pin Turbopack's workspace root explicitly — silences the
  // "multiple lockfiles detected" warning when a stray
  // package-lock.json lives next to the active pnpm-lock.yaml.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },

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
        pathname: "/user/api/products/image/**",
      },
    ],
    // Optimize caching
    minimumCacheTTL: 31536000, // 1 year in seconds
    formats: ['image/webp', 'image/avif'],
  },

  // Optional but recommended when using basePath
  async redirects() {
    return [
      {
        source: '/',
        destination: '/user',
        basePath: false,
        permanent: false,
      },
    ]
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
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));