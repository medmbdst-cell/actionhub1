import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignorer ESLint pendant le build (évite les échecs sur warnings)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorer TypeScript errors pendant le build (si nécessaire)
    ignoreBuildErrors: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Augmenté pour supporter les gros fichiers Excel
    },
  },
};

export default nextConfig;
