"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BadgeCheck, Building2, CalendarDays, MapPin, Repeat, Tag } from "lucide-react";
import { Aviso, Cartao, Carregando, LinkBotao, Pagina, Selo, Vazio } from "@/components/octupos/base";
import { CapaEvento } from "@/components/octupos/capa-evento";
import { localCompleto, SeloOrigem } from "@/components/octupos/cartao-evento";
import { NaoEncontrado } from "@/components/octupos/nao-encontrado";
import {
  anunciosAtivosDoEvento,
  disponiveisNoLote,
  eventoEstaAberto,
  eventoPorId,
  ingressoPorId,
  usuarioAtual,
  usuarioPorId,
} from "@/lib/demo/actions";
import { useAgora, useDemo } from "@/lib/demo/store";
import { BUYER_FEE_RATE, calcularValores, formatarTaxa } from "@/lib/domain/fees";
import { brl, dataCompleta, primeiroNome } from "@/lib/domain/format";

export function EventoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const estado = useDemo();
  const agora = useAgora(60_000);

  if (!estado) return <Carregando />;
  const evento = eventoPorId(estado, id);
  if (!evento) {
    return (
      <NaoEncontrado
        titulo="Evento não encontrado"
        texto="Este evento não existe nesta demonstração."
        href="/eventos"
        rotulo="Ver todos os eventos"
      />
    );
  }

  const usuario = usuarioAtual(estado);
  const produtor = usuarioPorId(estado, evento.produtor_id);
  const aberto = eventoEstaAberto(evento, agora);
  const anuncios = anunciosAtivosDoEvento(estado, evento.id).sort((a, b) => a.preco - b.preco);

  return (
    <Pagina>
      <Link href="/eventos" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-3 hover:text-brand">
        <ArrowLeft className="size-4" aria-hidden="true" /> Buscar eventos
      </Link>

      <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
        <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <figure className="flex flex-col gap-1.5">
            <CapaEvento
              evento={evento}
              className="aspect-[16/9] w-full rounded-2xl"
              sizes="(min-width: 1024px) 40vw, 100vw"
              prioridade
            />
            {evento.imagem?.credito ? (
              <figcaption className="text-[11px] text-ink-3">{evento.imagem.credito}</figcaption>
            ) : null}
          </figure>
          <div className="flex flex-col gap-3">
            <SeloOrigem evento={evento} />
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink md:text-3xl">{evento.nome}</h1>
            <ul className="flex flex-col gap-2 text-[15px] text-ink-2">
              <li className="flex items-center gap-2.5">
                <CalendarDays className="size-4 text-brand" aria-hidden="true" />
                {dataCompleta(evento.data_hora)}
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="size-4 shrink-0 text-brand" aria-hidden="true" />
                {localCompleto(evento)}
              </li>
              <li className="flex items-center gap-2.5">
                <Building2 className="size-4 text-brand" aria-hidden="true" />
                Produzido por {produtor?.nome ?? "—"}
              </li>
              <li className="flex items-center gap-2.5">
                <Tag className="size-4 text-brand" aria-hidden="true" />
                {evento.categoria}
              </li>
            </ul>
            <p className="text-[15px] leading-relaxed text-ink-3">{evento.descricao}</p>
            {evento.origem === "real" ? (
              <p className="text-[13px] leading-relaxed text-ink-3">
                Data e local conferidos em{" "}
                {evento.fonte ? (
                  <a href={evento.fonte} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
                    fonte pública
                  </a>
                ) : (
                  "fonte pública"
                )}
                . O Octopus não é o canal oficial deste evento; lotes e preços aqui são demonstrativos.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {!aberto ? (
            <Aviso tom="alerta" titulo="Vendas encerradas">
              O evento já aconteceu ou foi cancelado.
            </Aviso>
          ) : null}

          {/* Venda primária */}
          <section aria-labelledby="titulo-oficial" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="titulo-oficial" className="text-xl font-bold text-ink">
                Ingressos oficiais
              </h2>
              <Selo tom="sucesso">
                <BadgeCheck className="size-3.5" aria-hidden="true" /> Vendidos pelo produtor
              </Selo>
            </div>
            <p className="text-sm text-ink-3">
              O Octopus emite o ingresso na hora da compra e o associa à sua conta.
            </p>
            <ul className="flex flex-col gap-3">
              {evento.lotes.map((lote) => {
                const restantes = disponiveisNoLote(lote);
                const v = calcularValores(lote.preco);
                return (
                  <li key={lote.id}>
                    <Cartao className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-[17px] font-bold text-ink">{lote.nome}</h3>
                        <p className="text-sm text-ink-3">
                          {restantes > 0 ? `${restantes} de ${lote.quantidade} disponíveis` : "Esgotado"}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:items-end">
                        <div className="sm:text-right">
                          <p className="text-2xl font-extrabold text-ink">{brl(lote.preco)}</p>
                          <p className="text-xs text-ink-3">
                            + {brl(v.buyer_fee)} de taxa ({formatarTaxa(BUYER_FEE_RATE)}) = <strong>{brl(v.valor_total)}</strong>
                          </p>
                        </div>
                        {aberto && restantes > 0 && usuario?.id !== evento.produtor_id ? (
                          <LinkBotao href={`/checkout/lote/${evento.id}/${lote.id}`} tamanho="md" className="w-full sm:w-auto">
                            Comprar ingresso
                          </LinkBotao>
                        ) : usuario?.id === evento.produtor_id ? (
                          <Selo tom="neutro">Seu evento</Selo>
                        ) : null}
                      </div>
                    </Cartao>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Revenda interna */}
          <section aria-labelledby="titulo-revenda" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="titulo-revenda" className="text-xl font-bold text-ink">
                Revenda entre pessoas
              </h2>
              <Selo tom="marca">
                <Repeat className="size-3.5" aria-hidden="true" /> Titularidade transferida pelo Octopus
              </Selo>
            </div>
            <p className="text-sm text-ink-3">
              Todo ingresso revendido aqui foi emitido pelo Octopus. Na compra, o código do vendedor é
              invalidado e você recebe um código novo.
            </p>
            {anuncios.length === 0 ? (
              <Vazio titulo="Nenhum ingresso na revenda">
                Quem tem ingresso para este evento pode anunciar em “Meus ingressos”.
              </Vazio>
            ) : (
              <ul className="flex flex-col gap-3">
                {anuncios.map((a) => {
                  const ingresso = ingressoPorId(estado, a.ingresso_id);
                  const vendedor = usuarioPorId(estado, a.vendedor_id);
                  const v = calcularValores(a.preco);
                  const meu = usuario?.id === a.vendedor_id;
                  return (
                    <li key={a.id}>
                      <Cartao className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col gap-1">
                          <h3 className="text-[17px] font-bold text-ink">{ingresso?.tipo}</h3>
                          <p className="text-sm text-ink-3">
                            Vendido por {vendedor ? primeiroNome(vendedor.nome) : "—"} · valor original{" "}
                            {ingresso ? brl(ingresso.valor_face) : "—"}
                          </p>
                          <Selo tom="sucesso" className="mt-1">
                            <BadgeCheck className="size-3.5" aria-hidden="true" /> Emitido pelo Octopus
                          </Selo>
                        </div>
                        <div className="flex flex-col gap-2 sm:items-end">
                          <div className="sm:text-right">
                            <p className="text-2xl font-extrabold text-ink">{brl(a.preco)}</p>
                            <p className="text-xs text-ink-3">
                              + {brl(v.buyer_fee)} de taxa = <strong>{brl(v.valor_total)}</strong>
                            </p>
                          </div>
                          {meu ? (
                            <Selo tom="neutro">Seu anúncio</Selo>
                          ) : aberto ? (
                            <LinkBotao href={`/checkout/revenda/${a.id}`} variant="outline" tamanho="md" className="w-full sm:w-auto">
                              Comprar na revenda
                            </LinkBotao>
                          ) : null}
                        </div>
                      </Cartao>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Pagina>
  );
}
