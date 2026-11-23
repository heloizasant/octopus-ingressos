"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/octupos/logo";
import { cn } from "@/lib/utils";
import { MenuConta } from "./menu-conta";
import { NAVEGACAO, rotaAtiva } from "./navegacao";

/** Cabeçalho com as três áreas principais: Buscar eventos, Meus ingressos e Conta. */
export function Cabecalho() {
  const caminho = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" aria-label="Octopus, página inicial" className="rounded-lg">
          <Logo />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {NAVEGACAO.map(({ href, rotulo, icone: Icone }) => {
            const ativo = rotaAtiva(caminho, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  ativo ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-muted",
                )}
              >
                <Icone className="size-4" aria-hidden="true" />
                {rotulo}
              </Link>
            );
          })}
        </nav>

        <MenuConta />
      </div>
    </header>
  );
}
