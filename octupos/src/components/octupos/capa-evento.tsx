import type { Evento } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/**
 * Capa gráfica do evento, desenhada com gradiente da própria identidade.
 * É decorativa (sem foto de terceiros) e fica oculta para leitores de tela.
 */
export function CapaEvento({
  evento,
  className,
  mostrarCategoria = true,
}: {
  evento: Pick<Evento, "capa" | "categoria">;
  className?: string;
  mostrarCategoria?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden", className)}
      style={{ background: `linear-gradient(135deg, ${evento.capa.de}, ${evento.capa.para})` }}
    >
      <div className="absolute -right-10 -top-10 size-44 rounded-full bg-white/15" />
      <div className="absolute -bottom-12 left-8 size-36 rounded-full bg-white/10" />
      <div className="absolute right-16 top-1/2 size-14 rounded-full border-4 border-white/20" />
      {mostrarCategoria ? (
        <span className="absolute bottom-3 left-4 rounded-full bg-black/30 px-2.5 py-1 text-xs font-semibold text-white">
          {evento.categoria}
        </span>
      ) : null}
    </div>
  );
}

/** Paletas oferecidas no formulário de evento do administrador. */
export const PALETAS_CAPA: { nome: string; de: string; para: string }[] = [
  { nome: "Roxo Octopus", de: "#5B4FE9", para: "#9B8CFF" },
  { nome: "Noite", de: "#1F2937", para: "#5B4FE9" },
  { nome: "Pôr do sol", de: "#EC4899", para: "#F59E0B" },
  { nome: "Oceano", de: "#0EA5E9", para: "#5B4FE9" },
  { nome: "Floresta", de: "#10B981", para: "#0F766E" },
  { nome: "Brasa", de: "#F97316", para: "#DB2777" },
];
