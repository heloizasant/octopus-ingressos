"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Carregando, Pagina, Titulo, Vazio } from "@/components/octupos/base";
import { CartaoEvento } from "@/components/octupos/cartao-evento";
import { anunciosAtivosDoEvento, eventosFuturos, usuarioPorId } from "@/lib/demo/actions";
import { useAgora, useDemo } from "@/lib/demo/store";
import { normalizar, plural } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

export function Eventos() {
  const estado = useDemo();
  const agora = useAgora(60_000);
  const parametros = useSearchParams();
  const roteador = useRouter();
  const caminho = usePathname();

  const [busca, setBusca] = useState(parametros.get("busca") ?? "");
  const [categoria, setCategoria] = useState<string | null>(null);

  const futuros = useMemo(() => (estado ? eventosFuturos(estado, agora) : []), [estado, agora]);
  const categorias = useMemo(() => [...new Set(futuros.map((e) => e.categoria))].sort(), [futuros]);

  const resultado = useMemo(() => {
    const termo = normalizar(busca.trim());
    return futuros.filter((e) => {
      if (categoria && e.categoria !== categoria) return false;
      if (!termo) return true;
      const produtor = estado ? (usuarioPorId(estado, e.produtor_id)?.nome ?? "") : "";
      return [e.nome, e.local, produtor, e.categoria, e.descricao].some((campo) => normalizar(campo).includes(termo));
    });
  }, [futuros, busca, categoria, estado]);

  function mudarBusca(valor: string) {
    setBusca(valor);
    const termo = valor.trim();
    roteador.replace(termo ? `${caminho}?busca=${encodeURIComponent(termo)}` : caminho, {
      scroll: false,
    });
  }

  if (!estado) return <Carregando />;

  return (
    <Pagina>
      <Titulo sub="Ingressos oficiais do produtor e revendas entre pessoas, no mesmo lugar.">Buscar eventos</Titulo>

      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="busca-eventos" className="text-[13px] font-semibold text-ink-2">
            Buscar evento
          </label>
          <div className="relative md:max-w-xl">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-3"
              aria-hidden="true"
            />
            <input
              id="busca-eventos"
              type="search"
              value={busca}
              onChange={(e) => mudarBusca(e.target.value)}
              placeholder="Nome do evento, artista ou local"
              className="w-full rounded-[14px] border border-border bg-card py-3.5 pl-11 pr-11 text-[15px] text-ink placeholder:text-ink-3 focus-visible:border-brand"
            />
            {busca ? (
              <button
                type="button"
                onClick={() => mudarBusca("")}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-3 hover:bg-muted"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
          {[null, ...categorias].map((c) => (
            <button
              key={c ?? "todas"}
              type="button"
              aria-pressed={categoria === c}
              onClick={() => setCategoria(c)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                categoria === c
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-card text-ink-2 hover:bg-muted",
              )}
            >
              {c ?? "Todas"}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-3 text-sm text-ink-3" aria-live="polite">
        {plural(resultado.length, "evento encontrado", "eventos encontrados")}
      </p>

      {resultado.length === 0 ? (
        <Vazio titulo="Nenhum evento encontrado">
          Tente outro nome, artista ou local, ou limpe os filtros.
        </Vazio>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resultado.map((ev) => (
            <CartaoEvento key={ev.id} evento={ev} revendas={anunciosAtivosDoEvento(estado, ev.id).length} />
          ))}
        </div>
      )}
    </Pagina>
  );
}
