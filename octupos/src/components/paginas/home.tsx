"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeftRight, BadgeCheck, ScanLine, Search, Ticket } from "lucide-react";
import { Carregando, LinkBotao, Pagina, Secao } from "@/components/octupos/base";
import { CartaoEvento } from "@/components/octupos/cartao-evento";
import { anunciosAtivosDoEvento, eventosFuturos } from "@/lib/demo/actions";
import { useAgora, useDemo } from "@/lib/demo/store";

const PASSOS = [
  { icone: Ticket, titulo: "Venda oficial", texto: "O produtor disponibiliza os ingressos e o Octopus emite cada um." },
  { icone: BadgeCheck, titulo: "Ingresso na sua conta", texto: "O ingresso fica associado a você, com um código único." },
  { icone: ArrowLeftRight, titulo: "Revenda interna", texto: "Na revenda, o código antigo é invalidado e o novo titular recebe outro." },
  { icone: ScanLine, titulo: "Validação na entrada", texto: "A portaria consulta o estado atual: só o titular vigente entra." },
];

export function Home() {
  const estado = useDemo();
  const agora = useAgora(60_000);
  const roteador = useRouter();
  const [busca, setBusca] = useState("");

  const futuros = useMemo(() => (estado ? eventosFuturos(estado, agora) : []), [estado, agora]);
  const destaques = futuros.filter((e) => e.destaque);
  const vitrine = (destaques.length > 0 ? destaques : futuros).slice(0, 6);

  if (!estado) return <Carregando texto="Carregando a demonstração…" />;

  function buscar(ev: React.FormEvent) {
    ev.preventDefault();
    const termo = busca.trim();
    roteador.push(termo ? `/eventos?busca=${encodeURIComponent(termo)}` : "/eventos");
  }

  return (
    <div className="flex flex-col">
      {/* Faixa principal nas cores do logo */}
      <section className="bg-gradient-to-br from-noite via-noite-2 to-brand text-white">
        <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
          <div className="flex max-w-3xl flex-col gap-4">
            {/* Tentáculo segurando um ingresso, logo acima do selo. É decorativo: não recebe
                cliques e mantém a proporção (só a altura é fixada). No celular fica menor. */}
            <div className="flex flex-col items-start">
              <Image
                src="/images/tentaculo-ingresso.png"
                alt=""
                aria-hidden="true"
                width={624}
                height={204}
                loading="eager"
                draggable={false}
                sizes="(min-width: 768px) 150px, 110px"
                className="pointer-events-none -mb-1 h-9 w-auto select-none drop-shadow-lg md:h-12"
              />
              <span className="relative w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                Venda oficial e revenda no mesmo lugar
              </span>
            </div>
            <h1 className="text-[30px] font-extrabold leading-tight tracking-tight md:text-5xl">
              Ingressos com <span className="text-ouro">titularidade</span> do começo ao fim.
            </h1>
            <p className="max-w-xl text-[15px] text-white/85 md:text-lg">
              Compre do produtor, revenda para outra pessoa sem risco de golpe e entre no evento com
              um código que só vale para o titular atual.
            </p>
            <form onSubmit={buscar} role="search" className="mt-2 flex flex-col gap-3 sm:flex-row">
              <label htmlFor="busca-home" className="sr-only">
                Buscar evento
              </label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
                <input
                  id="busca-home"
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome do evento, artista ou local"
                  className="w-full rounded-[14px] border-0 bg-white py-3.5 pl-11 pr-4 text-[15px] text-ink placeholder:text-ink-3"
                />
              </div>
              <button type="submit" className="h-[50px] rounded-[14px] bg-ouro px-6 text-[15px] font-bold text-noite hover:brightness-95">
                Buscar eventos
              </button>
            </form>
          </div>
        </div>
      </section>

      <Pagina className="flex flex-col gap-10">
        <Secao
          titulo={destaques.length > 0 ? "Em destaque" : "Próximos eventos"}
          acao={
            <Link href="/eventos" className="text-sm font-semibold text-brand hover:underline">
              Ver todos
            </Link>
          }
        >
          {vitrine.length === 0 ? (
            <p className="text-sm text-ink-3">Nenhum evento disponível no momento.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vitrine.map((ev) => (
                <CartaoEvento key={ev.id} evento={ev} revendas={anunciosAtivosDoEvento(estado, ev.id).length} />
              ))}
            </div>
          )}
        </Secao>

        <Secao
          titulo="Como funciona"
          acao={
            <Link href="/como-funciona" className="text-sm font-semibold text-brand hover:underline">
              Saiba mais
            </Link>
          }
        >
          <ol className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {PASSOS.map(({ icone: Icone, titulo, texto }, i) => (
              <li key={titulo} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icone className="size-5" aria-hidden="true" />
                </span>
                <p className="font-bold text-ink">
                  {i + 1}. {titulo}
                </p>
                <p className="text-sm leading-relaxed text-ink-3">{texto}</p>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-3 sm:flex-row">
            <LinkBotao href="/demonstracao" variant="outline" tamanho="md">
              Ver o roteiro da demonstração
            </LinkBotao>
          </div>
        </Secao>
      </Pagina>
    </div>
  );
}
