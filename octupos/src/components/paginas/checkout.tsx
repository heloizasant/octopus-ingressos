"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, CircleCheck, Lock, ShieldCheck, Wallet } from "lucide-react";
import { Aviso, Botao, Cartao, LinkBotao, Pagina, Selo, Simulacao } from "@/components/octupos/base";
import { CapaEvento } from "@/components/octupos/capa-evento";
import { ExigirLogin } from "@/components/octupos/exigir-login";
import { RegistrosPedido } from "@/components/octupos/ingresso";
import { NaoEncontrado } from "@/components/octupos/nao-encontrado";
import {
  anuncioPorId,
  disponiveisNoLote,
  eventoPorId,
  ingressoPorId,
  pedidoPorId,
  usuarioPorId,
} from "@/lib/demo/actions";
import { acoes } from "@/lib/demo/store";
import { BUYER_FEE_RATE, calcularValores, formatarTaxa } from "@/lib/domain/fees";
import { brl, dataCompleta, primeiroNome } from "@/lib/domain/format";
import type { EstadoDemo, Usuario } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const PASSOS = ["Resumo", "Pagamento", "Concluído"] as const;

function Passos({ atual }: { atual: 1 | 2 | 3 }) {
  return (
    <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Etapas da compra">
      {PASSOS.map((nome, i) => {
        const n = i + 1;
        const feito = n < atual || atual === 3;
        const ativo = n === atual && atual !== 3;
        return (
          <li key={nome} aria-current={ativo ? "step" : undefined} className="flex flex-col gap-2">
            <span className={cn("h-1.5 rounded-full", feito || ativo ? "bg-brand" : "bg-border")} aria-hidden="true" />
            <span className="flex items-center gap-1.5 text-[13px] font-semibold">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px] font-bold",
                  feito ? "bg-brand text-white" : ativo ? "bg-brand-soft text-brand" : "bg-muted text-ink-3",
                )}
              >
                {feito ? <Check className="size-3" aria-hidden="true" /> : n}
              </span>
              <span className={ativo || feito ? "text-ink" : "text-ink-3"}>{nome}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

interface Oferta {
  eventoId: string;
  titulo: string;
  preco: number;
  origem: "primaria" | "revenda";
  vendedor: string;
  bloqueio: string | null;
  comprar: () => ReturnType<typeof acoes.comprarLote>;
}

function montarOferta(
  estado: EstadoDemo,
  usuario: Usuario,
  params: { eventoId?: string; loteId?: string; anuncioId?: string },
): Oferta | null {
  if (params.anuncioId) {
    const anuncio = anuncioPorId(estado, params.anuncioId);
    const ingresso = anuncio ? ingressoPorId(estado, anuncio.ingresso_id) : undefined;
    if (!anuncio || !ingresso) return null;
    const vendedor = usuarioPorId(estado, anuncio.vendedor_id);
    let bloqueio: string | null = null;
    if (anuncio.vendedor_id === usuario.id) bloqueio = "Você não pode comprar o seu próprio anúncio.";
    else if (anuncio.status !== "ativo") bloqueio = "Este anúncio não está mais disponível.";
    return {
      eventoId: ingresso.event_id,
      titulo: `${ingresso.tipo} · revenda`,
      preco: anuncio.preco,
      origem: "revenda",
      vendedor: vendedor ? primeiroNome(vendedor.nome) : "—",
      bloqueio,
      comprar: () => acoes.comprarRevenda(anuncio.id),
    };
  }
  const evento = params.eventoId ? eventoPorId(estado, params.eventoId) : undefined;
  const lote = evento?.lotes.find((l) => l.id === params.loteId);
  if (!evento || !lote) return null;
  let bloqueio: string | null = null;
  if (evento.produtor_id === usuario.id) bloqueio = "O produtor não compra ingressos do próprio evento.";
  else if (disponiveisNoLote(lote) <= 0) bloqueio = "Este lote está esgotado.";
  return {
    eventoId: evento.id,
    titulo: `${lote.nome} · venda oficial`,
    preco: lote.preco,
    origem: "primaria",
    vendedor: usuarioPorId(estado, evento.produtor_id)?.nome ?? "—",
    bloqueio,
    comprar: () => acoes.comprarLote(evento.id, lote.id),
  };
}

function Conteudo({ estado, usuario }: { estado: EstadoDemo; usuario: Usuario }) {
  const params = useParams<{ eventoId?: string; loteId?: string; anuncioId?: string }>();
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const pedido = pedidoId ? pedidoPorId(estado, pedidoId) : undefined;
  const oferta = montarOferta(estado, usuario, params);
  if (!oferta && !pedido) {
    return <NaoEncontrado titulo="Oferta não encontrada" texto="Este ingresso não existe nesta demonstração." href="/eventos" rotulo="Buscar eventos" />;
  }
  const evento = eventoPorId(estado, pedido?.event_id ?? oferta!.eventoId)!;
  const preco = pedido?.valor_base ?? oferta!.preco;
  const v = calcularValores(preco);
  const revenda = (pedido?.tipo ?? oferta!.origem) === "revenda";

  function pagar() {
    setErro(null);
    const r = oferta!.comprar();
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setPedidoId(r.valor.pedido.id);
    setPasso(3);
  }

  const ingresso = pedido ? ingressoPorId(estado, pedido.ingresso_id) : undefined;

  return (
    <Pagina className="max-w-5xl">
      <Link href={`/eventos/${evento.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-3 hover:text-brand">
        <ArrowLeft className="size-4" aria-hidden="true" /> Voltar ao evento
      </Link>
      <h1 className="mb-1 text-[26px] font-extrabold tracking-tight text-ink md:text-3xl">
        {revenda ? "Comprar na revenda" : "Comprar ingresso oficial"}
      </h1>
      <p className="mb-5 flex items-center gap-2 text-[15px] text-ink-3">
        Pagamento demonstrativo <Simulacao />
      </p>

      <Passos atual={passo} />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-4">
          {passo === 1 && oferta ? (
            <>
              <Cartao className="flex flex-col gap-4">
                <h2 className="text-lg font-bold text-ink">1. Resumo</h2>
                <div className="flex gap-3">
                  <CapaEvento evento={evento} mostrarCategoria={false} className="size-16 shrink-0 rounded-xl" />
                  <div className="min-w-0">
                    <p className="font-bold text-ink">{evento.nome}</p>
                    <p className="text-sm text-ink-3">{dataCompleta(evento.data_hora)}</p>
                    <p className="text-sm text-ink-3">
                      {oferta.titulo} · {revenda ? "vendido por" : "produtor"} {oferta.vendedor}
                    </p>
                  </div>
                </div>
              </Cartao>
              <Cartao className="flex flex-col gap-3">
                <h3 className="font-bold text-ink">O que acontece ao pagar</h3>
                <ol className="flex flex-col gap-2.5 text-sm text-ink-2">
                  {(revenda
                    ? [
                        "O pagamento simulado é confirmado e o valor fica retido.",
                        "A titularidade do vendedor é invalidada: o código dele deixa de valer.",
                        "Uma nova titularidade é registrada para você, com código novo.",
                        "Só então o repasse ao vendedor é liberado (demonstração).",
                      ]
                    : [
                        "O pagamento simulado é confirmado.",
                        "O Octopus emite o ingresso com um código único.",
                        "O ingresso fica associado à sua conta, em “Meus ingressos”.",
                      ]
                  ).map((t, i) => (
                    <li key={t} className="flex gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                        {i + 1}
                      </span>
                      {t}
                    </li>
                  ))}
                </ol>
              </Cartao>
              {oferta.bloqueio ? (
                <Aviso tom="perigo" titulo="Não é possível comprar">
                  {oferta.bloqueio}
                </Aviso>
              ) : (
                <Botao tamanho="lg" className="w-full" onClick={() => setPasso(2)}>
                  <Lock className="mr-1 size-5" aria-hidden="true" /> Continuar para o pagamento
                </Botao>
              )}
            </>
          ) : null}

          {passo === 2 && oferta ? (
            <Cartao className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-ink">2. Pix (simulado)</h2>
                <Simulacao />
              </div>
              <div className="flex flex-col gap-2 rounded-xl border border-dashed border-brand/50 bg-brand-soft p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-secondary-foreground">Pagamento fictício</p>
                <p className="text-2xl font-extrabold text-ink">{brl(v.valor_total)}</p>
                <p className="text-xs text-ink-3">Nenhum valor é cobrado. Não informe dados bancários.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Botao tamanho="lg" className="w-full sm:flex-1" onClick={pagar}>
                  <Wallet className="mr-1 size-5" aria-hidden="true" /> Confirmar pagamento (simulação)
                </Botao>
                <Botao tamanho="lg" variant="outline" className="w-full sm:w-auto" onClick={() => setPasso(1)}>
                  Voltar
                </Botao>
              </div>
            </Cartao>
          ) : null}

          {passo === 3 && pedido && ingresso ? (
            <>
              <Cartao className="flex flex-col items-start gap-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
                  <ShieldCheck className="size-6" aria-hidden="true" />
                </span>
                <h2 className="text-xl font-bold text-ink">
                  {revenda ? "Titularidade transferida para você" : "Ingresso emitido na sua conta"}
                </h2>
                <p className="text-sm text-ink-3">
                  Seu código de entrada é <span className="font-mono font-bold text-ink">{ingresso.codigo_atual}</span>.
                  {revenda ? " O código do vendedor foi invalidado e não passa mais na portaria." : ""}
                </p>
                <LinkBotao href={`/meus-ingressos/${ingresso.id}`} tamanho="lg" className="w-full sm:w-auto">
                  Ver meu ingresso
                </LinkBotao>
              </Cartao>
              <Cartao className="flex flex-col gap-3">
                <h3 className="font-bold text-ink">O que foi registrado</h3>
                <RegistrosPedido pedido={pedido} />
              </Cartao>
            </>
          ) : null}

          {erro ? (
            <Aviso tom="perigo" titulo="Não foi possível concluir">
              {erro}
            </Aviso>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Cartao className="flex flex-col gap-3">
            <h2 className="font-bold text-ink">Valores</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-3">{revenda ? "Preço da revenda" : "Ingresso"}</dt>
                <dd className="font-semibold text-ink">{brl(preco)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-3">Taxa do comprador ({formatarTaxa(BUYER_FEE_RATE)})</dt>
                <dd className="font-semibold text-ink">{brl(v.buyer_fee)}</dd>
              </div>
              <div className="mt-1 flex items-baseline justify-between border-t border-border pt-2">
                <dt className="font-bold text-ink">Total (simulado)</dt>
                <dd className="text-2xl font-extrabold text-ink">{brl(v.valor_total)}</dd>
              </div>
            </dl>
            <p className="text-xs leading-relaxed text-ink-3">
              Quem vende ({revenda ? "o titular" : "o produtor"}) paga {formatarTaxa(BUYER_FEE_RATE)} à parte e recebe{" "}
              {brl(v.valor_liquido_vendedor)} (demonstração).
            </p>
            <Selo tom="marca" className="w-fit">
              <CircleCheck className="size-3.5" aria-hidden="true" /> Nenhum valor é cobrado
            </Selo>
          </Cartao>
        </aside>
      </div>
    </Pagina>
  );
}

export function Checkout() {
  return <ExigirLogin>{({ estado, usuario }) => <Conteudo estado={estado} usuario={usuario} />}</ExigirLogin>;
}
