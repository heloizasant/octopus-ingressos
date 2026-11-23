import { CircleUserRound, Search, Ticket } from "lucide-react";

/** As três áreas principais do Octopus (cabeçalho no desktop, barra inferior no celular). */
export const NAVEGACAO = [
  { href: "/eventos", rotulo: "Buscar eventos", curto: "Buscar", icone: Search },
  { href: "/meus-ingressos", rotulo: "Meus ingressos", curto: "Ingressos", icone: Ticket },
  { href: "/conta", rotulo: "Conta", curto: "Conta", icone: CircleUserRound },
] as const;

/** Rotas internas que pertencem a cada área, para destacar o item certo. */
const AREAS: Record<string, string[]> = {
  "/eventos": ["/eventos", "/checkout"],
  "/meus-ingressos": ["/meus-ingressos"],
  "/conta": ["/conta", "/produtor", "/validar", "/entrar", "/cadastro"],
};

export function rotaAtiva(caminho: string, href: string): boolean {
  return (AREAS[href] ?? [href]).some((r) => caminho === r || caminho.startsWith(`${r}/`));
}
