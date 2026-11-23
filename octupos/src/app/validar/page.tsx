import type { Metadata } from "next";
import { Suspense } from "react";
import { Carregando } from "@/components/octupos/base";
import { Validar } from "@/components/paginas/validar";

export const metadata: Metadata = { title: "Validação na entrada" };

export default function PaginaValidar() {
  return (
    <Suspense fallback={<Carregando />}>
      <Validar />
    </Suspense>
  );
}
