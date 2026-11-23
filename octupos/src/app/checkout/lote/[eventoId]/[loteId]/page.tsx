import type { Metadata } from "next";
import { Suspense } from "react";
import { Carregando } from "@/components/octupos/base";
import { Checkout } from "@/components/paginas/checkout";

export const metadata: Metadata = { title: "Comprar ingresso" };

export default function PaginaCheckoutLote() {
  return (
    <Suspense fallback={<Carregando />}>
      <Checkout />
    </Suspense>
  );
}
