import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server in .next/standalone for the Docker image. Not on
  // Vercel (it sets VERCEL=1): its build step breaks on standalone output.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
