import type { Metadata } from "next";
import { Produtor } from "@/components/paginas/produtor";

export const metadata: Metadata = { title: "Painel do produtor" };

export default function PaginaProdutor() {
  return <Produtor />;
}
