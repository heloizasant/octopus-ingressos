import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { menorPrecoOficial } from "@/lib/demo/actions";
import { brl, dataCurta, horario } from "@/lib/domain/format";
import type { Evento } from "@/lib/domain/types";
import { CapaEvento } from "./capa-evento";

/** Local e cidade numa linha só: "Arena Sul · Goiânia – GO". */
export const localCompleto = (evento: Pick<Evento, "local" | "cidade">) =>
  evento.cidade ? `${evento.local} · ${evento.cidade}` : evento.local;

/** Selo que diferencia evento fictício (padrão) de evento real verificado. */
export function SeloOrigem({ evento, className = "" }: { evento: Pick<Evento, "origem">; className?: string }) {
  const real = evento.origem === "real";
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        real ? "bg-success/15 text-success" : "bg-muted text-ink-3"
      } ${className}`}
    >
      {real ? "Evento real" : "Evento fictício (demonstração)"}
    </span>
  );
}

/**
 * Cartão de evento: imagem horizontal no topo e, abaixo, nome, local, data,
 * preço oficial e revendas disponíveis.
 */
export function CartaoEvento({ evento, revendas }: { evento: Evento; revendas: number }) {
  const menor = menorPrecoOficial(evento);
  return (
    <Link
      href={`/eventos/${evento.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md focus-visible:outline-2"
    >
      <CapaEvento
        evento={evento}
        className="aspect-[16/9] w-full transition-transform duration-300 group-hover:scale-[1.02]"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-[17px] font-bold leading-snug text-ink group-hover:text-brand">{evento.nome}</h3>
        <div className="flex flex-col gap-1 text-[13px] text-ink-3">
          <span className="inline-flex items-start gap-1.5">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {localCompleto(evento)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
            {dataCurta(evento.data_hora)} · {horario(evento.data_hora)}
          </span>
        </div>
        <SeloOrigem evento={evento} />
        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-2 pt-1">
          <p className="text-sm font-semibold text-brand">
            {menor !== null ? `Oficial a partir de ${brl(menor)}` : "Venda oficial esgotada"}
          </p>
          {revendas > 0 ? (
            <p className="text-xs font-semibold text-ink-3">
              {revendas} {revendas === 1 ? "revenda" : "revendas"}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
