import { ArrowRight, Blocks, CircleCheck, CircleX, ShieldCheck, Ticket } from "lucide-react";
import { brl, dataHoraNumerica, primeiroNome } from "@/lib/domain/format";
import { ROTULO_REGISTRO } from "@/lib/domain/status";
import type { EstadoDemo, Ingresso, Pedido } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Selo } from "./base";

/** Cadeia de titulares do ingresso. Só a última titularidade vale; as anteriores ficam invalidadas. */
export function HistoricoTitularidade({
  ingresso,
  estado,
  destacarUsuario,
}: {
  ingresso: Ingresso;
  estado: EstadoDemo;
  destacarUsuario?: string;
}) {
  return (
    <ol className="flex flex-col" aria-label="Histórico de titularidade">
      {ingresso.titularidades.map((h, i) => {
        const titular = estado.usuarios.find((u) => u.id === h.titular_id);
        const vigente = h.status === "vigente";
        const ultimo = i === ingresso.titularidades.length - 1;
        return (
          <li key={h.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full",
                  vigente ? "bg-success text-white" : "bg-danger-soft text-danger",
                )}
              >
                {vigente ? <CircleCheck className="size-4" aria-hidden="true" /> : <CircleX className="size-4" aria-hidden="true" />}
              </span>
              {!ultimo ? <span className="my-1 w-0.5 flex-1 bg-border" aria-hidden="true" /> : null}
            </div>
            <div className={cn("flex min-w-0 flex-col gap-1", !ultimo && "pb-4")}>
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                {titular ? primeiroNome(titular.nome) : "—"}
                {h.titular_id === destacarUsuario ? <Selo tom="marca">você</Selo> : null}
                <Selo tom={vigente ? "sucesso" : "perigo"}>{vigente ? "Titular atual" : "Titularidade invalidada"}</Selo>
              </p>
              <p className="text-xs text-ink-3">
                {h.origem === "compra_primaria" ? "Comprou na venda oficial" : "Comprou na revenda"} ·{" "}
                {dataHoraNumerica(h.inicio)}
                {h.fim ? ` → transferido em ${dataHoraNumerica(h.fim)}` : ""}
              </p>
              <p className="text-xs">
                <span className="text-ink-3">Código: </span>
                <span className={cn("font-mono font-semibold", vigente ? "text-ink" : "text-ink-3 line-through")}>
                  {h.codigo}
                </span>
                <span className="text-ink-3"> · registro interno {h.registro_demo}</span>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Registros internos da operação (identificadores SIM-, nunca transações reais). */
export function RegistrosPedido({ pedido }: { pedido: Pedido }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {pedido.registros.map((r) => (
        <li key={r.id} className="flex items-start gap-3 text-sm">
          <CircleCheck
            className={cn("mt-0.5 size-4 shrink-0", r.tipo === "titularidade_invalidada" ? "text-danger" : "text-success")}
            aria-hidden="true"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-semibold text-ink">{ROTULO_REGISTRO[r.tipo]}</span>
              {r.valor !== null ? <span className="font-semibold text-ink">{brl(r.valor)}</span> : null}
            </p>
            <p className="text-xs text-ink-3">{r.descricao}</p>
            <p className="font-mono text-[11px] text-ink-3">{r.identificador_demo}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const PASSOS_SOLANA = [
  { icone: Ticket, titulo: "Emissão", texto: "Cada ingresso emitido ganharia um registro próprio na rede." },
  { icone: ArrowRight, titulo: "Transferência", texto: "Cada revenda registraria a troca de titular, de forma pública e auditável." },
  { icone: ShieldCheck, titulo: "Validação", texto: "A portaria poderia conferir o titular atual direto no registro." },
];

/** Como a Solana poderia entrar no futuro. NADA disto está implementado nesta versão. */
export function SolanaFuturo({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-noite-2/40 bg-gradient-to-br from-noite to-noite-2 p-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-bold">
          <Blocks className="size-5 text-ouro" aria-hidden="true" />
          Evolução futura: registro na Solana
        </p>
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">Ainda não implementado</span>
      </div>
      <ol className={cn("grid gap-3", compacto ? "sm:grid-cols-3" : "md:grid-cols-3")}>
        {PASSOS_SOLANA.map(({ icone: Icone, titulo, texto }, i) => (
          <li key={titulo} className="flex flex-col gap-1 rounded-xl bg-white/10 p-3">
            <span className="flex items-center gap-2 text-sm font-bold">
              <span className="flex size-6 items-center justify-center rounded-full bg-ouro text-xs font-extrabold text-noite">
                {i + 1}
              </span>
              <Icone className="size-4 text-ouro" aria-hidden="true" />
              {titulo}
            </span>
            <span className="text-xs leading-relaxed text-white/80">{texto}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs leading-relaxed text-white/75">
        Hoje a titularidade é controlada pelo banco interno do Octopus (nesta demonstração, no seu
        navegador). Os identificadores SIM-… são registros internos simulados, não transações de
        blockchain.
      </p>
    </div>
  );
}
