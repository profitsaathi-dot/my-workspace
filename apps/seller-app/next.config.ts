import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
  localPatterns: [
    {
      pathname: "/api/products/image/**",
    },
  ],
},
};

export default nextConfig;
