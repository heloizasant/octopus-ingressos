import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  /** Rotas da versão anterior (revenda externa) apontam para as equivalentes atuais. */
  async redirects() {
    return [
      { source: "/vender", destination: "/meus-ingressos", permanent: false },
      { source: "/painel-vendedor", destination: "/conta", permanent: false },
      { source: "/pedidos/:id", destination: "/conta", permanent: false },
      { source: "/admin", destination: "/produtor", permanent: false },
      { source: "/admin/:caminho*", destination: "/produtor", permanent: false },
      { source: "/verificar/:codigo", destination: "/validar?codigo=:codigo", permanent: false },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
