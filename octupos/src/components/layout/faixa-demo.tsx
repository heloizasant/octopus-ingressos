"use client";

import Link from "next/link";
import { ListChecks, RotateCcw } from "lucide-react";
import { acoes, useDemo } from "@/lib/demo/store";

/** Faixa fixa que deixa claro, em todas as telas, que tudo é demonstrativo. */
export function FaixaDemo() {
  const estado = useDemo();

  function restaurar() {
    if (
      window.confirm(
        "Restaurar a demonstração? As contas, anúncios, compras e eventos voltam ao estado original e o que você fez neste navegador é apagado.",
      )
    ) {
      acoes.restaurar();
    }
  }

  return (
    <div className="bg-ink text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-2 text-xs leading-snug">
        <p>
          <strong className="font-bold">Ambiente de demonstração</strong>
          <span className="hidden sm:inline">
            {" "}
            — pagamentos simulados; os dados ficam só neste navegador.
          </span>
          <span className="sm:hidden"> · pagamento simulado.</span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/demonstracao"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-semibold text-ink hover:bg-white/90"
          >
            <ListChecks className="size-3" aria-hidden="true" />
            Roteiro
          </Link>
          <button
            type="button"
            onClick={restaurar}
            disabled={!estado}
            aria-label="Restaurar demonstração"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-2.5 py-1 font-semibold hover:bg-white/10 disabled:opacity-50"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            <span className="hidden sm:inline">Restaurar demonstração</span>
            <span className="sm:hidden">Restaurar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
