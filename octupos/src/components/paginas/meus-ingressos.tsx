"use client";

import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { Cartao, LinkBotao, Pagina, Secao, Selo, StatusSelo, Titulo, Vazio } from "@/components/octupos/base";
import { CapaEvento } from "@/components/octupos/capa-evento";
import { ExigirLogin } from "@/components/octupos/exigir-login";
import { anuncioAtivoDoIngresso, eventoPorId, ingressosDoTitular, ingressosRepassados } from "@/lib/demo/actions";
import { brl, dataCurta, horario } from "@/lib/domain/format";
import { ROTULO_INGRESSO } from "@/lib/domain/status";
import type { EstadoDemo, Ingresso, Usuario } from "@/lib/domain/types";

function LinhaIngresso({ estado, ingresso, usuario }: { estado: EstadoDemo; ingresso: Ingresso; usuario: Usuario }) {
  const evento = eventoPorId(estado, ingresso.event_id);
  if (!evento) return null;
  const titular = ingresso.titular_id === usuario.id;
  const anuncio = anuncioAtivoDoIngresso(estado, ingresso.id);
  const meuCodigo = ingresso.titularidades.filter((h) => h.titular_id === usuario.id).at(-1)?.codigo;

  return (
    <li>
      <Cartao className="flex flex-col gap-4 !p-4 sm:flex-row sm:items-center">
        <CapaEvento evento={evento} mostrarCategoria={false} className="hidden size-20 shrink-0 rounded-xl sm:block" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[17px] font-bold text-ink">{evento.nome}</h3>
            {titular ? (
              <StatusSelo rotulo={ROTULO_INGRESSO[ingresso.status]} />
            ) : (
              <Selo tom="perigo">Titularidade transferida</Selo>
            )}
          </div>
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
          <p className="text-sm text-ink-2">
            {ingresso.tipo} ·{" "}
            <span className={titular ? "font-mono font-semibold" : "font-mono text-ink-3 line-through"}>{meuCodigo}</span>
            {anuncio ? <span className="text-ink-3"> · anunciado por {brl(anuncio.preco)}</span> : null}
          </p>
        </div>
        <LinkBotao
          href={`/meus-ingressos/${ingresso.id}`}
          variant={titular && ingresso.status === "valido" ? "default" : "outline"}
          className="w-full sm:w-auto"
        >
          {titular ? "Abrir ingresso" : "Ver histórico"}
        </LinkBotao>
      </Cartao>
    </li>
  );
}

function Lista({ titulo, itens, estado, usuario }: { titulo: string; itens: Ingresso[]; estado: EstadoDemo; usuario: Usuario }) {
  if (itens.length === 0) return null;
  return (
    <Secao titulo={`${titulo} (${itens.length})`}>
      <ul className="flex flex-col gap-3">
        {itens.map((t) => (
          <LinhaIngresso key={t.id} estado={estado} ingresso={t} usuario={usuario} />
        ))}
      </ul>
    </Secao>
  );
}

function Conteudo({ estado, usuario }: { estado: EstadoDemo; usuario: Usuario }) {
  const meus = ingressosDoTitular(estado, usuario.id).sort((a, b) => {
    const ea = eventoPorId(estado, a.event_id)?.data_hora ?? "";
    const eb = eventoPorId(estado, b.event_id)?.data_hora ?? "";
    return ea.localeCompare(eb);
  });
  const repassados = ingressosRepassados(estado, usuario.id);
  const por = (s: Ingresso["status"]) => meus.filter((t) => t.status === s);

  return (
    <Pagina>
      <Titulo sub={`Ingressos de que ${usuario.nome} é o titular atual. Cada um tem um código único de entrada.`}>
        Meus ingressos
      </Titulo>

      {meus.length === 0 && repassados.length === 0 ? (
        <Vazio titulo="Você ainda não tem ingressos" acao={<LinkBotao href="/eventos">Buscar eventos</LinkBotao>}>
          Compre um ingresso oficial ou na revenda. Ele aparece aqui na hora.
        </Vazio>
      ) : (
        <div className="flex flex-col gap-8">
          <Lista titulo="Válidos para entrada" itens={por("valido")} estado={estado} usuario={usuario} />
          <Lista titulo="Anunciados para revenda" itens={por("em_revenda")} estado={estado} usuario={usuario} />
          <Lista titulo="Entrada registrada" itens={por("utilizado")} estado={estado} usuario={usuario} />
          <Lista titulo="Repassados (seu código foi invalidado)" itens={repassados} estado={estado} usuario={usuario} />
        </div>
      )}

      <p className="mt-8 text-sm text-ink-3">
        Para revender, abra o ingresso e use “Anunciar para revenda”.{" "}
        <Link href="/como-funciona" className="font-semibold text-brand hover:underline">
          Como funciona a titularidade
        </Link>
      </p>
    </Pagina>
  );
}

export function MeusIngressos() {
  return <ExigirLogin>{({ estado, usuario }) => <Conteudo estado={estado} usuario={usuario} />}</ExigirLogin>;
}
