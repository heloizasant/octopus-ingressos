import type { Metadata } from "next";
import { Suspense } from "react";
import { Carregando } from "@/components/octupos/base";
import { Cadastro } from "@/components/paginas/auth";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCadastro() {
  return (
    <Suspense fallback={<Carregando />}>
      <Cadastro />
    </Suspense>
  );
}
