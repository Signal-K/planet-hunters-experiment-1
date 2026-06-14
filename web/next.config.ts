import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["web", "next-app", "localhost"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
