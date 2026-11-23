"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Aviso, Botao, Cartao, Carregando, Pagina, Titulo } from "@/components/octupos/base";
import { NOME_PAPEL } from "@/components/layout/menu-conta";
import { anuncioAtivoDoIngresso, ingressosDoTitular, usuarioPorId } from "@/lib/demo/actions";
import { acoes, useDemo } from "@/lib/demo/store";
import type { EstadoDemo } from "@/lib/domain/types";

interface Passo {
  titulo: string;
  conta: string;
  destino: (e: EstadoDemo) => string;
  roteiro: string[];
}

/** Primeiro ingresso do Diego para a Virada Calourus (o que será revendido na demonstração). */
const ingressoDoDiego = (e: EstadoDemo) =>
  ingressosDoTitular(e, "usr-comprador").find((t) => t.event_id === "evt-calourus");

const PASSOS: Passo[] = [
  {
    titulo: "O produtor disponibiliza os ingressos",
    conta: "usr-prod-atletica",
    destino: () => "/produtor",
    roteiro: [
      "Mostre os eventos, os lotes e quantos já foram vendidos.",
      "Opcional: “Cadastrar evento” e publique um evento novo com lotes.",
    ],
  },
  {
    titulo: "O comprador adquire um ingresso oficial",
    conta: "usr-carla",
    destino: () => "/eventos/evt-calourus",
    roteiro: [
      "Em “Ingressos oficiais”, clique em “Comprar ingresso” no lote Pista.",
      "Continue para o pagamento e confirme o Pix simulado.",
      "Mostre o que foi registrado: pagamento, emissão e titularidade.",
    ],
  },
  {
    titulo: "O ingresso aparece na conta",
    conta: "usr-carla",
    destino: () => "/meus-ingressos",
    roteiro: [
      "Abra o ingresso novo: QR Code, código único e histórico com 1 titular.",
      "Clique em “Testar na validação”: aparece Ingresso válido.",
    ],
  },
  {
    titulo: "O titular anuncia para revenda",
    conta: "usr-comprador",
    destino: (e) => {
      const t = ingressoDoDiego(e);
      return t ? `/meus-ingressos/${t.id}` : "/meus-ingressos";
    },
    roteiro: [
      "Anote o código atual do Diego (aparece embaixo do QR).",
      "Em “Anunciar para revenda”, informe um preço até o teto (1,5×) e anuncie.",
      "Mostre que o ingresso fica bloqueado para entrada enquanto está anunciado.",
    ],
  },
  {
    titulo: "Outro perfil compra na revenda",
    conta: "usr-bruno",
    destino: () => "/eventos/evt-calourus",
    roteiro: [
      "Em “Revenda entre pessoas”, compre o anúncio do Diego.",
      "Na conclusão, veja “Titularidade anterior invalidada” e o código novo do Bruno.",
    ],
  },
  {
    titulo: "A titularidade foi atualizada",
    conta: "usr-comprador",
    destino: () => "/meus-ingressos",
    roteiro: [
      "O ingresso saiu dos válidos do Diego e foi para “Repassados”.",
      "Abra: o código do Diego aparece riscado e o histórico mostra 2 titulares.",
    ],
  },
  {
    titulo: "Validação na entrada",
    conta: "usr-prod-atletica",
    destino: () => "/validar",
    roteiro: [
      "Consulte o código antigo do Diego: Código invalidado.",
      "Consulte o código novo do Bruno: Ingresso válido → “Registrar entrada”.",
      "Consulte de novo: Entrada já registrada. Use os códigos prontos ao lado se preferir.",
    ],
  },
  {
    titulo: "Futuro: registro na Solana",
    conta: "usr-comprador",
    destino: () => "/como-funciona",
    roteiro: [
      "Mostre a seção “Solana: como poderá entrar no futuro”.",
      "Deixe claro: ainda não implementado; hoje o registro é interno.",
    ],
  },
];

export function Demonstracao() {
  const estado = useDemo();
  const roteador = useRouter();
  if (!estado) return <Carregando />;

  function ir(p: Passo) {
    acoes.entrar(p.conta);
    roteador.push(p.destino(estado!));
  }

  const diego = ingressoDoDiego(estado);
  const anunciado = diego ? anuncioAtivoDoIngresso(estado, diego.id) : undefined;

  return (
    <Pagina>
      <Titulo sub="Produtor disponibiliza → comprador adquire → ingresso na conta → revenda → nova titularidade → validação na entrada.">
        Roteiro da apresentação
      </Titulo>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Aviso tom="marca" className="flex-1" titulo="Cada botão troca de perfil e abre a tela do passo">
          Os dados mudam de verdade (no navegador): o que você faz em um passo aparece nos seguintes.
          {diego ? ` Código atual do Diego para a Calourus: ${diego.codigo_atual}${anunciado ? " (anunciado)" : ""}.` : ""}
        </Aviso>
        <Botao
          variant="outline"
          tamanho="md"
          onClick={() => {
            if (window.confirm("Restaurar a demonstração ao estado inicial?")) acoes.restaurar();
          }}
        >
          <RotateCcw className="size-4" aria-hidden="true" /> Restaurar antes de começar
        </Botao>
      </div>

      <ol className="flex flex-col gap-3">
        {PASSOS.map((p, i) => {
          const conta = usuarioPorId(estado, p.conta);
          return (
            <li key={p.titulo}>
              <Cartao className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
                  <div className="flex flex-col gap-1.5">
                    <h2 className="text-[17px] font-bold text-ink">{p.titulo}</h2>
                    <p className="text-xs font-semibold text-ink-3">
                      Perfil: {conta?.nome} ({conta ? NOME_PAPEL[conta.role] : ""})
                    </p>
                    <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-2">
                      {p.roteiro.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Botao tamanho="md" className="shrink-0 md:ml-4" onClick={() => ir(p)}>
                  Ir para o passo <ArrowRight className="size-4" aria-hidden="true" />
                </Botao>
              </Cartao>
            </li>
          );
        })}
      </ol>
    </Pagina>
  );
}
