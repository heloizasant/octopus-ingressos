"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, CircleX, ScanLine } from "lucide-react";
import { Aviso, Botao, Cartao, Carregando, Pagina, Selo, Titulo } from "@/components/octupos/base";
import { consultarCodigo, eventoPorId, usuarioAtual, usuarioPorId } from "@/lib/demo/actions";
import { acoes, useDemo } from "@/lib/demo/store";
import { dataCompleta, dataHoraNumerica, primeiroNome } from "@/lib/domain/format";
import { ROTULO_VALIDACAO } from "@/lib/domain/status";
import type { EstadoDemo } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const COR = {
  sucesso: "border-success bg-success-soft text-success",
  alerta: "border-warning bg-warning-soft text-warning",
  perigo: "border-danger bg-danger-soft text-danger",
  neutro: "border-border bg-muted text-ink-2",
  marca: "border-brand bg-brand-soft text-brand",
} as const;

/** Códigos prontos para a apresentação: válidos, invalidados e bloqueados. */
function codigosDeExemplo(estado: EstadoDemo) {
  const lista: { codigo: string; rotulo: string }[] = [];
  for (const t of estado.ingressos) {
    const evento = eventoPorId(estado, t.event_id);
    for (const h of t.titularidades) {
      const dono = usuarioPorId(estado, h.titular_id);
      const r = consultarCodigo(estado, h.codigo).resultado;
      lista.push({
        codigo: h.codigo,
        rotulo: `${ROTULO_VALIDACAO[r].titulo} · ${dono ? primeiroNome(dono.nome) : "—"} · ${evento?.nome ?? ""}`,
      });
    }
  }
  return lista.sort((a, b) => a.rotulo.localeCompare(b.rotulo)).slice(0, 14);
}

export function Validar() {
  const estado = useDemo();
  const inicial = (useSearchParams().get("codigo") ?? "").toUpperCase();
  const [codigo, setCodigo] = useState(inicial);
  const [consultado, setConsultado] = useState(inicial);
  const [msg, setMsg] = useState<{ tom: "sucesso" | "perigo"; texto: string } | null>(null);
  const jaRegistrou = useRef(false);

  // Ao abrir pelo QR Code (?codigo=), a consulta é registrada uma vez no histórico.
  useEffect(() => {
    if (!estado || !inicial || jaRegistrou.current) return;
    jaRegistrou.current = true;
    acoes.validarCodigo(inicial);
  }, [estado, inicial]);

  if (!estado) return <Carregando />;
  const usuario = usuarioAtual(estado);
  const consulta = consultado ? consultarCodigo(estado, consultado) : null;
  const info = consulta ? ROTULO_VALIDACAO[consulta.resultado] : null;
  const evento = consulta?.ingresso ? eventoPorId(estado, consulta.ingresso.event_id) : undefined;
  const titularAtual = consulta?.ingresso ? usuarioPorId(estado, consulta.ingresso.titular_id) : undefined;
  const operador = usuario && (usuario.role === "admin" || (usuario.role === "produtor" && (!evento || evento.produtor_id === usuario.id)));

  function consultar(c: string) {
    const alvo = c.trim().toUpperCase();
    setMsg(null);
    setCodigo(alvo);
    setConsultado(alvo);
    if (alvo) acoes.validarCodigo(alvo);
  }

  function registrar() {
    const r = acoes.registrarEntrada(consultado);
    setMsg(r.ok ? { tom: "sucesso", texto: "Entrada registrada. Este código não passa uma segunda vez." } : { tom: "perigo", texto: r.erro });
  }

  const Icone = consulta?.resultado === "valido" ? CircleCheck : consulta?.resultado === "bloqueado_revenda" ? CircleAlert : CircleX;

  return (
    <Pagina>
      <Titulo sub="A portaria consulta o estado ATUAL do ingresso: só o código do titular vigente libera a entrada.">
        Validação na entrada
      </Titulo>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-4">
          <Cartao>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                consultar(codigo);
              }}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor="codigo" className="text-[13px] font-semibold text-ink-2">
                  Código do ingresso (lido do QR Code)
                </label>
                <input
                  id="codigo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="OCT-XXXX-XXXX"
                  autoComplete="off"
                  className="w-full rounded-[14px] border border-border bg-card px-4 py-3 font-mono text-[15px] uppercase tracking-wider text-ink placeholder:text-ink-3"
                />
              </div>
              <Botao type="submit" tamanho="lg">
                <ScanLine className="size-5" aria-hidden="true" /> Consultar
              </Botao>
            </form>
          </Cartao>

          {consulta && info ? (
            <div className={cn("flex flex-col gap-4 rounded-3xl border-2 p-6", COR[info.tom])} role="status" aria-live="polite">
              <div className="flex items-center gap-3">
                <Icone className="size-10 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-2xl font-extrabold">{info.titulo}</p>
                  <p className="font-mono text-sm font-semibold text-ink-2">{consultado}</p>
                </div>
              </div>
              <p className="text-sm text-ink-2">{info.explicacao}</p>
              {consulta.ingresso && evento ? (
                <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-white/70 p-4 text-sm text-ink">
                  <div className="col-span-2">
                    <dt className="text-xs text-ink-3">Evento</dt>
                    <dd className="font-bold">{evento.nome}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-3">Data</dt>
                    <dd>{dataCompleta(evento.data_hora)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-3">Tipo</dt>
                    <dd>{consulta.ingresso.tipo}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-3">Titular atual</dt>
                    <dd className="font-semibold">{titularAtual?.nome ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-3">Titularidades</dt>
                    <dd>{consulta.ingresso.titularidades.length}</dd>
                  </div>
                  {consulta.resultado === "invalidado" && consulta.titularidade?.fim ? (
                    <div className="col-span-2">
                      <dt className="text-xs text-ink-3">Invalidado em</dt>
                      <dd>{dataHoraNumerica(consulta.titularidade.fim)} (revenda concluída)</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              {consulta.resultado === "valido" ? (
                operador ? (
                  <Botao tamanho="lg" onClick={registrar} className="w-full sm:w-fit">
                    <CircleCheck className="size-5" aria-hidden="true" /> Registrar entrada
                  </Botao>
                ) : (
                  <p className="text-xs font-semibold text-ink-2">
                    Para registrar a entrada, entre como produtor deste evento (menu da conta → trocar perfil).
                  </p>
                )
              ) : null}
            </div>
          ) : (
            <Aviso tom="marca" titulo="Como testar">
              Digite um código, escolha um exemplo ao lado ou abra o QR Code de um ingresso em “Meus ingressos”.
            </Aviso>
          )}

          {msg ? (
            <Aviso tom={msg.tom} titulo={msg.tom === "sucesso" ? "Entrada registrada" : "Entrada recusada"}>
              {msg.texto}
            </Aviso>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <Cartao className="flex flex-col gap-3">
            <h2 className="font-bold text-ink">Códigos para testar</h2>
            <p className="text-xs text-ink-3">Gerados a partir dos dados atuais da demonstração.</p>
            <ul className="flex flex-col gap-1.5">
              {codigosDeExemplo(estado).map((c) => (
                <li key={c.codigo}>
                  <button
                    type="button"
                    onClick={() => consultar(c.codigo)}
                    className="flex w-full flex-col items-start rounded-xl border border-border px-3 py-2 text-left hover:bg-muted"
                  >
                    <span className="font-mono text-xs font-bold text-ink">{c.codigo}</span>
                    <span className="text-[11px] text-ink-3">{c.rotulo}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Cartao>

          <Cartao className="flex flex-col gap-3">
            <h2 className="font-bold text-ink">Últimas consultas</h2>
            {estado.validacoes.length === 0 ? (
              <p className="text-sm text-ink-3">Nenhuma consulta ainda.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {estado.validacoes.slice(0, 8).map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold text-ink">{v.codigo}</span>
                    <Selo tom={ROTULO_VALIDACAO[v.resultado].tom}>
                      {v.entrada_registrada ? "Entrada registrada" : ROTULO_VALIDACAO[v.resultado].titulo}
                    </Selo>
                    <span className="w-full text-ink-3">{dataHoraNumerica(v.em)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </aside>
      </div>
    </Pagina>
  );
}
