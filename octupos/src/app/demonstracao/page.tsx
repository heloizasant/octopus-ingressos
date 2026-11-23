import type { Metadata } from "next";
import { Demonstracao } from "@/components/paginas/demonstracao";

export const metadata: Metadata = { title: "Roteiro da apresentação" };

export default function PaginaDemonstracao() {
  return <Demonstracao />;
}
