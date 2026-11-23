import Link from "next/link";
import { BUYER_FEE_RATE, SELLER_FEE_RATE, formatarTaxa } from "@/lib/domain/fees";

export function Rodape() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-ink-3 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-xl flex-col gap-2">
          <p className="font-bold text-ink-2">Octopus Ingressos · protótipo acadêmico</p>
          <p className="leading-relaxed">
            Venda primária e revenda interna de ingressos, com titularidade controlada pela plataforma.
            Pagamentos simulados; não há registro em blockchain nesta versão. Taxas demonstrativas:{" "}
            {formatarTaxa(BUYER_FEE_RATE)} do comprador e {formatarTaxa(SELLER_FEE_RATE)} de quem vende.
          </p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-wrap gap-5 font-semibold text-ink-2">
          <Link href="/como-funciona" className="hover:text-brand">
            Como funciona
          </Link>
          <Link href="/demonstracao" className="hover:text-brand">
            Roteiro da apresentação
          </Link>
          <Link href="/entrar" className="hover:text-brand">
            Perfis de demonstração
          </Link>
        </nav>
      </div>
    </footer>
  );
}
