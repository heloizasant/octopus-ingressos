"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CircleUserRound, LogOut, ScanLine, Store, Ticket } from "lucide-react";
import { usuarioAtual } from "@/lib/demo/actions";
import { acoes, useDemo } from "@/lib/demo/store";
import { primeiroNome } from "@/lib/domain/format";
import type { Papel } from "@/lib/domain/types";
import { LinkBotao } from "@/components/octupos/base";

export const NOME_PAPEL: Record<Papel, string> = {
  usuario: "Comprador",
  produtor: "Produtor",
  admin: "Administração",
};

export function MenuConta() {
  const estado = useDemo();
  const roteador = useRouter();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  if (!estado) return <div className="h-10 w-24" aria-hidden="true" />;
  const usuario = usuarioAtual(estado);

  if (!usuario) {
    return (
      <LinkBotao href="/entrar" variant="outline" tamanho="sm">
        Entrar
      </LinkBotao>
    );
  }

  const outras = estado.usuarios.filter((u) => u.id !== usuario.id);
  const operaEventos = usuario.role === "produtor" || usuario.role === "admin";
  const item = "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-muted";

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        aria-label={`Conta de ${usuario.nome}`}
        className="flex h-10 items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 text-sm font-semibold text-ink hover:bg-muted"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
          {usuario.nome.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-28 truncate sm:inline">{primeiroNome(usuario.nome)}</span>
        <ChevronDown className="size-4 text-ink-3" aria-hidden="true" />
      </button>

      {aberto ? (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-border bg-card p-2 shadow-lg"
          onClick={() => setAberto(false)}
        >
          <div className="px-3 py-2">
            <p className="font-bold text-ink">{usuario.nome}</p>
            <p className="text-xs text-ink-3">{NOME_PAPEL[usuario.role]}</p>
          </div>
          <Link href="/meus-ingressos" role="menuitem" className={item}>
            <Ticket className="size-4" aria-hidden="true" /> Meus ingressos
          </Link>
          <Link href="/conta" role="menuitem" className={item}>
            <CircleUserRound className="size-4" aria-hidden="true" /> Conta e revendas
          </Link>
          {operaEventos ? (
            <>
              <Link href="/produtor" role="menuitem" className={item}>
                <Store className="size-4" aria-hidden="true" /> Painel do produtor
              </Link>
              <Link href="/validar" role="menuitem" className={item}>
                <ScanLine className="size-4" aria-hidden="true" /> Validação na entrada
              </Link>
            </>
          ) : null}

          <div className="my-1 border-t border-border" />
          <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-ink-3">
            Trocar perfil (demonstração)
          </p>
          {outras.map((u) => (
            <button
              key={u.id}
              type="button"
              role="menuitem"
              className={`${item} w-full text-left`}
              onClick={() => {
                acoes.entrar(u.id);
                roteador.refresh();
              }}
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">
                {u.nome.charAt(0)}
              </span>
              <span className="flex flex-col leading-tight">
                <span>{u.nome}</span>
                <span className="text-[11px] font-normal text-ink-3">{NOME_PAPEL[u.role]}</span>
              </span>
            </button>
          ))}

          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            className={`${item} w-full text-left`}
            onClick={() => {
              acoes.sair();
              roteador.push("/");
            }}
          >
            <LogOut className="size-4" aria-hidden="true" /> Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}
