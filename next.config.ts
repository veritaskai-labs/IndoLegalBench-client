import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server in .next/standalone for the Docker image.
  // Vercel ignores this and keeps building the way it always has.
  output: "standalone",
};

export default nextConfig;
