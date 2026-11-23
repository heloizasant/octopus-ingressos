"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarDays, MapPin, ScanLine, Tag } from "lucide-react";
import { Aviso, Botao, Campo, Cartao, ENTRADA, LinkBotao, Pagina, Selo, StatusSelo } from "@/components/octupos/base";
import { CapaEvento } from "@/components/octupos/capa-evento";
import { ExigirLogin } from "@/components/octupos/exigir-login";
import { HistoricoTitularidade, SolanaFuturo } from "@/components/octupos/ingresso";
import { NaoEncontrado } from "@/components/octupos/nao-encontrado";
import { QrDemonstrativo } from "@/components/octupos/qr";
import { anuncioAtivoDoIngresso, eventoEstaAberto, eventoPorId, ingressoPorId } from "@/lib/demo/actions";
import { acoes, useAgora } from "@/lib/demo/store";
import { calcularValores, formatarTaxa, SELLER_FEE_RATE, tetoRevenda } from "@/lib/domain/fees";
import { brl, dataCompleta, dataHoraNumerica } from "@/lib/domain/format";
import { ROTULO_INGRESSO } from "@/lib/domain/status";
import type { EstadoDemo, Usuario } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

function Conteudo({ estado, usuario }: { estado: EstadoDemo; usuario: Usuario }) {
  const { id } = useParams<{ id: string }>();
  const agora = useAgora(60_000);
  const ingresso = ingressoPorId(estado, id);
  const [preco, setPreco] = useState(() => (ingresso ? String(ingresso.valor_face) : ""));
  const [msg, setMsg] = useState<{ tom: "sucesso" | "perigo"; texto: string } | null>(null);

  const jaFoiDono = ingresso?.titularidades.some((h) => h.titular_id === usuario.id);
  if (!ingresso || (!jaFoiDono && usuario.role !== "admin")) {
    return <NaoEncontrado titulo="Ingresso não encontrado" texto="Este ingresso não existe ou nunca foi seu." href="/meus-ingressos" rotulo="Meus ingressos" />;
  }
  const evento = eventoPorId(estado, ingresso.event_id)!;
  const titular = ingresso.titular_id === usuario.id;
  const anuncio = anuncioAtivoDoIngresso(estado, ingresso.id);
  const aberto = eventoEstaAberto(evento, agora);
  const teto = tetoRevenda(ingresso.valor_face);
  const valor = Number(preco.replace(",", "."));
  const simulacao = Number.isFinite(valor) && valor > 0 ? calcularValores(valor) : null;
  const codigoAntigo = ingresso.titularidades.filter((h) => h.titular_id === usuario.id).at(-1)?.codigo;

  function anunciar(e: React.FormEvent) {
    e.preventDefault();
    const r = acoes.anunciarRevenda(ingresso!.id, valor);
    setMsg(r.ok ? { tom: "sucesso", texto: "Anúncio publicado. O ingresso fica bloqueado para entrada até ser vendido ou você cancelar." } : { tom: "perigo", texto: r.erro });
  }
  function cancelar() {
    if (!anuncio) return;
    const r = acoes.cancelarAnuncio(anuncio.id);
    setMsg(r.ok ? { tom: "sucesso", texto: "Anúncio cancelado. O ingresso voltou a valer para entrada." } : { tom: "perigo", texto: r.erro });
  }

  return (
    <Pagina className="max-w-5xl">
      <Link href="/meus-ingressos" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-3 hover:text-brand">
        <ArrowLeft className="size-4" aria-hidden="true" /> Meus ingressos
      </Link>

      {!titular ? (
        <Aviso tom="perigo" className="mb-5" titulo="Você não é mais o titular deste ingresso">
          Ele foi revendido. O seu código <span className="font-mono font-bold">{codigoAntigo}</span> foi invalidado e
          não passa mais na entrada.
        </Aviso>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        {/* Bilhete */}
        <article aria-label={`Ingresso de ${evento.nome}`} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm lg:self-start">
          <div className="relative">
            <CapaEvento evento={evento} mostrarCategoria={false} className="h-32" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-5 pt-10 text-white">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-90">{ingresso.tipo}</p>
              <h1 className="text-xl font-extrabold leading-tight">{evento.nome}</h1>
            </div>
          </div>
          <div className="flex flex-col gap-3 p-5">
            <StatusSelo rotulo={titular ? ROTULO_INGRESSO[ingresso.status] : { texto: "Titularidade transferida", tom: "perigo" }} />
            <ul className="flex flex-col gap-1.5 text-sm text-ink-2">
              <li className="flex items-center gap-2">
                <CalendarDays className="size-4 text-brand" aria-hidden="true" />
                {dataCompleta(evento.data_hora)}
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-brand" aria-hidden="true" />
                {evento.local}
              </li>
              <li className="flex items-center gap-2">
                <Tag className="size-4 text-brand" aria-hidden="true" />
                Valor original {brl(ingresso.valor_face)}
              </li>
            </ul>
          </div>
          <div className="relative border-t-2 border-dashed border-border">
            <span className="absolute -left-3 -top-3 size-6 rounded-full bg-background" aria-hidden="true" />
            <span className="absolute -right-3 -top-3 size-6 rounded-full bg-background" aria-hidden="true" />
          </div>
          <div className="flex flex-col items-center gap-3 p-6">
            {titular ? (
              <>
                <div className={cn("relative", ingresso.status !== "valido" && "opacity-30")}>
                  <QrDemonstrativo codigo={ingresso.codigo_atual} tamanho={180} />
                </div>
                <p className="font-mono text-sm font-bold tracking-wider text-ink">{ingresso.codigo_atual}</p>
                {ingresso.status === "em_revenda" ? (
                  <p className="text-center text-xs font-semibold text-warning">Bloqueado para entrada enquanto estiver anunciado.</p>
                ) : ingresso.status === "utilizado" ? (
                  <p className="text-center text-xs font-semibold text-ink-3">
                    Entrada registrada em {ingresso.utilizado_em ? dataHoraNumerica(ingresso.utilizado_em) : "—"}.
                  </p>
                ) : (
                  <p className="text-center text-xs text-ink-3">Apresente na entrada. O código vale só para você.</p>
                )}
                <LinkBotao href={`/validar?codigo=${ingresso.codigo_atual}`} variant="outline" tamanho="sm">
                  <ScanLine className="size-4" aria-hidden="true" /> Testar na validação
                </LinkBotao>
              </>
            ) : (
              <>
                <p className="font-mono text-sm text-ink-3 line-through">{codigoAntigo}</p>
                <LinkBotao href={`/validar?codigo=${codigoAntigo}`} variant="outline" tamanho="sm">
                  <ScanLine className="size-4" aria-hidden="true" /> Testar o código antigo
                </LinkBotao>
              </>
            )}
          </div>
        </article>

        <div className="flex flex-col gap-4">
          {/* Revenda */}
          {titular && ingresso.status === "valido" && aberto ? (
            <Cartao>
              <form onSubmit={anunciar} className="flex flex-col gap-4" noValidate>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold text-ink">Anunciar para revenda</h2>
                  <p className="text-sm text-ink-3">
                    Quando alguém comprar, seu código é invalidado e o comprador recebe um código novo.
                  </p>
                </div>
                <Campo rotulo="Preço de revenda (R$)" htmlFor="r-preco" dica={`Máximo de ${brl(teto)} (1,5× o valor original).`}>
                  <input id="r-preco" type="number" min="1" step="0.01" max={teto} value={preco} onChange={(e) => setPreco(e.target.value)} className={ENTRADA} />
                </Campo>
                {simulacao ? (
                  <p className="text-sm text-ink-2">
                    Você recebe <strong>{brl(simulacao.valor_liquido_vendedor)}</strong> (preço − {formatarTaxa(SELLER_FEE_RATE)}, demonstração).
                  </p>
                ) : null}
                <Botao type="submit" tamanho="lg">
                  Anunciar para revenda
                </Botao>
              </form>
            </Cartao>
          ) : null}

          {titular && anuncio ? (
            <Cartao className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-ink">Anunciado por {brl(anuncio.preco)}</h2>
                <Selo tom="alerta">Bloqueado para entrada</Selo>
              </div>
              <p className="text-sm text-ink-3">
                O anúncio aparece na página do evento. Se você desistir, o ingresso volta a valer na entrada.
              </p>
              <Botao variant="outline" tamanho="md" onClick={cancelar} className="w-fit">
                Cancelar anúncio
              </Botao>
            </Cartao>
          ) : null}

          {msg ? (
            <Aviso tom={msg.tom} titulo={msg.tom === "sucesso" ? "Feito" : "Não foi possível"}>
              {msg.texto}
            </Aviso>
          ) : null}

          <Cartao className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-ink">Histórico de titularidade</h2>
            <p className="text-sm text-ink-3">Cada revenda invalida o código anterior. Só o titular atual entra no evento.</p>
            <HistoricoTitularidade ingresso={ingresso} estado={estado} destacarUsuario={usuario.id} />
          </Cartao>

          <SolanaFuturo compacto />
        </div>
      </div>
    </Pagina>
  );
}

export function MeuIngresso() {
  return <ExigirLogin>{({ estado, usuario }) => <Conteudo estado={estado} usuario={usuario} />}</ExigirLogin>;
}
