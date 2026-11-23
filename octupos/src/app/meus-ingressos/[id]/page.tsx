import type { Metadata } from "next";
import { Suspense } from "react";
import { Carregando } from "@/components/octupos/base";
import { MeuIngresso } from "@/components/paginas/meu-ingresso";

export const metadata: Metadata = { title: "Meu ingresso" };

export default function PaginaMeuIngresso() {
  return (
    <Suspense fallback={<Carregando />}>
      <MeuIngresso />
    </Suspense>
  );
}
