import type { Metadata } from "next";
import { Suspense } from "react";
import { Carregando } from "@/components/octupos/base";
import { Entrar } from "@/components/paginas/auth";

export const metadata: Metadata = { title: "Entrar" };

export default function PaginaEntrar() {
  return (
    <Suspense fallback={<Carregando />}>
      <Entrar />
    </Suspense>
  );
}
