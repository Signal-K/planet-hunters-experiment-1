import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The editor Simple Browser and local Docker preview use these hosts.
  allowedDevOrigins: ["web", "localhost"],
  turbopack: {
    root: process.cwd(),
  },
  // Keep the game canvas clear in the editor preview. Compile/runtime errors
  // still surface in the terminal.
  devIndicators: false,
};

export default nextConfig;
