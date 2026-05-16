import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  basePath: '/user',
  transpilePackages: ["@workspace/ui"],
  allowedDevOrigins: ['plenty-allen-trout-mardi.trycloudflare.com'],
  // Pin Turbopack's workspace root explicitly — silences the
  // "multiple lockfiles detected" warning when a stray
  // package-lock.json lives next to the active pnpm-lock.yaml.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },

 images: {
  localPatterns: [
    {
      pathname: "/user/api/products/image/**",
    },
  ],
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

  
};

export default withNextIntl(nextConfig);