import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist", "jsdom", "canvas"],
};

export default nextConfig;
