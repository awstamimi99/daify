import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@daify/types", "@daify/ui"],
  typedRoutes: true,
  async headers() {
    return [{ source: "/dashboard/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] }, { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] }];
  },
};

export default nextConfig;
