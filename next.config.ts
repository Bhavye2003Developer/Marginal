import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // jsdom must be bundled (not external) so Vercel's serverless runtime
  // can load it. canvas is jsdom's optional peer dep — keep it external
  // so the bundler doesn't error when it's not installed.
  serverExternalPackages: ["pdfjs-dist", "canvas"],
};

export default nextConfig;
