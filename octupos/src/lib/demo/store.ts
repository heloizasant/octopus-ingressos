"use client";

/**
 * Armazenamento local do protótipo: o estado fica no localStorage do navegador.
 * Não há banco, servidor nem rede. "Restaurar demonstração" volta ao início.
 */
import { useSyncExternalStore } from "react";
import type { EstadoDemo } from "@/lib/domain/types";
import * as regras from "./actions";
import type { Resultado } from "./actions";
import { criarEstadoInicial, VERSAO_ESTADO } from "./seed";

const CHAVE = "octupos-demo-v1";

let estado: EstadoDemo | null = null;
const ouvintes = new Set<() => void>();

function estadoValido(x: unknown): x is EstadoDemo {
  const e = x as EstadoDemo | null;
  return (
    !!e &&
    e.versao === VERSAO_ESTADO &&
    Array.isArray(e.usuarios) &&
    Array.isArray(e.eventos) &&
    Array.isArray(e.ingressos) &&
    Array.isArray(e.anuncios) &&
    Array.isArray(e.pedidos) &&
    Array.isArray(e.validacoes)
  );
}

function gravar(e: EstadoDemo) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(e));
  } catch {
    // Armazenamento bloqueado ou cheio: o protótipo continua só em memória.
  }
}

function carregar(): EstadoDemo {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) {
      const lido: unknown = JSON.parse(bruto);
      if (estadoValido(lido)) return lido;
    }
  } catch {
    // Dados corrompidos: recomeça da demonstração original.
  }
  const inicial = criarEstadoInicial();
  gravar(inicial);
  return inicial;
}

function obter(): EstadoDemo | null {
  if (typeof window === "undefined") return null;
  if (!estado) estado = carregar();
  return estado;
}

function confirmar(novo: EstadoDemo) {
  estado = novo;
  gravar(novo);
  ouvintes.forEach((o) => o());
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  const aoMudarEmOutraAba = (ev: StorageEvent) => {
    if (ev.key !== CHAVE) return;
    estado = carregar();
    ouvinte();
  };
  window.addEventListener("storage", aoMudarEmOutraAba);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener("storage", aoMudarEmOutraAba);
  };
}

/** Estado da demonstração, ou `null` no servidor / antes de carregar. */
export function useDemo(): EstadoDemo | null {
  return useSyncExternalStore(assinar, obter, () => null);
}

interface Relogio {
  assinar: (ouvinte: () => void) => () => void;
  obter: () => number;
}

const relogios = new Map<number, Relogio>();

/** Um relógio compartilhado por intervalo; só roda enquanto houver quem o use. */
function obterRelogio(intervaloMs: number): Relogio {
  let existente = relogios.get(intervaloMs);
  if (existente) return existente;

  let agora = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const ouvintes = new Set<() => void>();

  existente = {
    obter: () => {
      if (agora === 0) agora = Date.now();
      return agora;
    },
    assinar: (ouvinte) => {
      ouvintes.add(ouvinte);
      if (!timer) {
        timer = setInterval(() => {
          agora = Date.now();
          ouvintes.forEach((o) => o());
        }, intervaloMs);
      }
      return () => {
        ouvintes.delete(ouvinte);
        if (ouvintes.size === 0 && timer) {
          clearInterval(timer);
          timer = null;
          agora = 0; // volta a ler o horário atual na próxima assinatura
        }
      };
    },
  };
  relogios.set(intervaloMs, existente);
  return existente;
}

/**
 * Horário atual (ms), atualizado a cada `intervaloMs`. No servidor devolve 0:
 * as telas só usam o valor depois de carregar o estado local, no navegador.
 */
export function useAgora(intervaloMs = 1000): number {
  const relogio = obterRelogio(intervaloMs);
  return useSyncExternalStore(relogio.assinar, relogio.obter, () => 0);
}

function executar<T>(fn: (e: EstadoDemo, agora: number) => Resultado<T>): Resultado<T> {
  const atual = obter();
  if (!atual) return { ok: false, erro: "A demonstração ainda não carregou." };
  const agora = Date.now();
  const r = fn(atual, agora);
  if (r.ok) confirmar(r.estado);
  return r;
}

/** Ações da interface. Cada uma aplica as regras de `actions.ts` e grava o resultado. */
export const acoes = {
  entrar: (id: string) => executar((e) => regras.entrar(e, id)),
  entrarPorEmail: (email: string) => executar((e) => regras.entrarPorEmail(e, email)),
  sair: () => executar((e) => regras.sair(e)),
  cadastrar: (nome: string, email: string) => executar((e) => regras.cadastrar(e, nome, email)),

  comprarLote: (eventId: string, loteId: string) => executar((e, agora) => regras.comprarLote(e, eventId, loteId, agora)),
  comprarRevenda: (anuncioId: string) => executar((e, agora) => regras.comprarRevenda(e, anuncioId, agora)),
  anunciarRevenda: (ingressoId: string, preco: number) =>
    executar((e, agora) => regras.anunciarRevenda(e, ingressoId, preco, agora)),
  cancelarAnuncio: (anuncioId: string) => executar((e, agora) => regras.cancelarAnuncio(e, anuncioId, agora)),

  validarCodigo: (codigo: string) => executar((e, agora) => regras.validarCodigo(e, codigo, agora)),
  registrarEntrada: (codigo: string) => executar((e, agora) => regras.registrarEntrada(e, codigo, agora)),

  criarEvento: (dados: regras.DadosEvento) => executar((e, agora) => regras.criarEvento(e, dados, agora)),

  /** Volta tudo ao estado original da demonstração (equivale ao seed). */
  restaurar: () => confirmar(criarEstadoInicial()),
};
