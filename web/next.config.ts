import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["web"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
