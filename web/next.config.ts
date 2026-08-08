import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["web", "next-app", "localhost"],
  turbopack: {
    root: process.cwd(),
  },
  // The dev-mode route indicator (bottom-left "N" badge) overlays real UI —
  // it was intercepting Cypress clicks on the bottom tab bar in dev-mode e2e
  // runs (KES-42). Compile/runtime errors still surface in the terminal.
  devIndicators: false,
};

export default nextConfig;
