import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Turbopack/webpack from bundling these packages —
  // they must be required natively at runtime (pdfjs uses dynamic
  // class constructors that break when minified)
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
