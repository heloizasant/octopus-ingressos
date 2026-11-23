"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAVEGACAO, rotaAtiva } from "./navegacao";

/** Navegação fixa no rodapé, em celular e tablet. A partir de 1024 px vale o cabeçalho. */
export function NavegacaoInferior() {
  const caminho = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {NAVEGACAO.map(({ href, curto, icone: Icone }) => {
          const ativo = rotaAtiva(caminho, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                  ativo ? "text-brand" : "text-ink-3",
                )}
              >
                <Icone className="size-5" aria-hidden="true" />
                {curto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
