import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { menorPrecoOficial } from "@/lib/demo/actions";
import { brl, dataCurta, horario } from "@/lib/domain/format";
import type { Evento } from "@/lib/domain/types";
import { CapaEvento } from "./capa-evento";

/** Cartão de evento: capa, nome, data · local, preço oficial e revendas disponíveis. */
export function CartaoEvento({ evento, revendas }: { evento: Evento; revendas: number }) {
  const menor = menorPrecoOficial(evento);
  return (
    <Link
      href={`/eventos/${evento.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md focus-visible:outline-2"
    >
      <CapaEvento evento={evento} className="h-28" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-[17px] font-bold leading-snug text-ink group-hover:text-brand">{evento.nome}</h3>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {dataCurta(evento.data_hora)} · {horario(evento.data_hora)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden="true" />
            {evento.local}
          </span>
        </p>
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
