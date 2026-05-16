import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/admin',
  transpilePackages: ["@workspace/ui"],
};

export default nextConfig;
