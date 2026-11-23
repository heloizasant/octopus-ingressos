import type { Metadata } from "next";
import { MeusIngressos } from "@/components/paginas/meus-ingressos";

export const metadata: Metadata = { title: "Meus ingressos" };

export default function PaginaMeusIngressos() {
  return <MeusIngressos />;
}
