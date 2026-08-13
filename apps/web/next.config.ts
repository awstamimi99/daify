import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@daify/types", "@daify/ui"],
  typedRoutes: true,
};

export default nextConfig;
