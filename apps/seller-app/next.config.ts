import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
   
   allowedDevOrigins: ['plenty-allen-trout-mardi.trycloudflare.com'],
};

export default nextConfig;
