import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { Cabecalho } from "@/components/layout/cabecalho";
import { CabecalhoEsqueleto } from "@/components/layout/cabecalho-esqueleto";
import { FaixaDemo } from "@/components/layout/faixa-demo";
import { NavegacaoInferior } from "@/components/layout/navegacao-inferior";
import { Rodape } from "@/components/layout/rodape";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Octopus Ingressos — compra e revenda com titularidade controlada",
    template: "%s · Octopus",
  },
  description:
    "Protótipo acadêmico: venda primária e revenda interna de ingressos, com titularidade e validação controladas pela plataforma. Pagamentos simulados.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5B4FE9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <FaixaDemo />
        <Suspense fallback={<CabecalhoEsqueleto />}>
          <Cabecalho />
        </Suspense>
        <main className="pb-nav flex-1">{children}</main>
        <Rodape />
        <Suspense fallback={null}>
          <NavegacaoInferior />
        </Suspense>
      </body>
    </html>
  );
}
