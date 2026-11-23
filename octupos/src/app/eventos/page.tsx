import type { Metadata } from "next";
import { Suspense } from "react";
import { Carregando } from "@/components/octupos/base";
import { Eventos } from "@/components/paginas/eventos";

export const metadata: Metadata = { title: "Eventos" };

export default function PaginaEventos() {
  return (
    <Suspense fallback={<Carregando />}>
      <Eventos />
    </Suspense>
  );
}
