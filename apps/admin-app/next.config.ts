import type { NextConfig } from "next";

// Bundle analyzer (run with ANALYZE=true npm run build)
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  basePath: '/admin',
  transpilePackages: ["@workspace/ui"],
  
  // Turbopack config (empty to silence Next.js 16 warning)
  turbopack: {},
  
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
        pathname: "/admin/api/products/image/**",
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
    optimizePackageImports: ['lucide-react'],
  },
};

export default withBundleAnalyzer(nextConfig);
