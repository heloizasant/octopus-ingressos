import type { Metadata } from "next";
import { Suspense } from "react";
import { Carregando } from "@/components/octupos/base";
import { EventoDetalhe } from "@/components/paginas/evento-detalhe";

export const metadata: Metadata = { title: "Evento" };

export default function PaginaEvento() {
  return (
    <Suspense fallback={<Carregando />}>
      <EventoDetalhe />
    </Suspense>
  );
}
