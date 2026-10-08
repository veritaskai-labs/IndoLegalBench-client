import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server in .next/standalone for the Docker image. Not on
  // Vercel (it sets VERCEL=1): its build step breaks on standalone output.
  output: process.env.VERCEL ? undefined : "standalone",
  // SCRUM-117 and the UAT sheet write /admin/ai-products; the page lives at
  // /admin/providers like the API and the sidebar. Not permanent, so it can
  // change once the name is settled.
  async redirects() {
    return [{ source: "/admin/ai-products", destination: "/admin/providers", permanent: false }];
  },
};

export default nextConfig;
