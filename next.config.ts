import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Aplicação 100% autenticada e dinâmica: não usamos Cache Components (ver docs/DECISOES.md).
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Upload de certificado A1, logotipo e XML de NF-e de compra.
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
