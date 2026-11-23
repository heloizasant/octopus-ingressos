"use client";

import { useRouter } from "next/navigation";
import { LogOut, ScanLine, Store, Ticket } from "lucide-react";
import { Botao, Cartao, LinkBotao, Pagina, Secao, Selo, StatusSelo, Titulo, Vazio } from "@/components/octupos/base";
import { ExigirLogin } from "@/components/octupos/exigir-login";
import { NOME_PAPEL } from "@/components/layout/menu-conta";
import { eventoPorId, ingressoPorId, ingressosDoTitular, usuarioPorId } from "@/lib/demo/actions";
import { acoes } from "@/lib/demo/store";
import { brl, dataHoraNumerica, primeiroNome } from "@/lib/domain/format";
import { ROTULO_ANUNCIO } from "@/lib/domain/status";
import type { EstadoDemo, Usuario } from "@/lib/domain/types";

function Indicador({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold text-ink-3">{rotulo}</p>
      <p className="mt-1 text-2xl font-extrabold text-ink">{valor}</p>
    </div>
  );
}

function Conteudo({ estado, usuario }: { estado: EstadoDemo; usuario: Usuario }) {
  const roteador = useRouter();
  const anuncios = estado.anuncios.filter((a) => a.vendedor_id === usuario.id).sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  const vendas = estado.pedidos.filter((p) => p.tipo === "revenda" && p.vendedor_id === usuario.id);
  const compras = estado.pedidos.filter((p) => p.comprador_id === usuario.id).sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  const recebido = vendas.reduce((s, p) => s + p.valor_liquido_vendedor, 0);
  const operaEventos = usuario.role === "produtor" || usuario.role === "admin";

  return (
    <Pagina>
      <Titulo sub={`${NOME_PAPEL[usuario.role]} · ${usuario.email} · login simulado, sem senha`}>{usuario.nome}</Titulo>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Indicador rotulo="Ingressos como titular" valor={String(ingressosDoTitular(estado, usuario.id).length)} />
        <Indicador rotulo="Anúncios ativos" valor={String(anuncios.filter((a) => a.status === "ativo").length)} />
        <Indicador rotulo="Revendas concluídas" valor={String(vendas.length)} />
        <Indicador rotulo="Repasses recebidos (demonstração)" valor={brl(recebido)} />
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <LinkBotao href="/meus-ingressos" tamanho="md">
          <Ticket className="size-4" aria-hidden="true" /> Meus ingressos
        </LinkBotao>
        {operaEventos ? (
          <>
            <LinkBotao href="/produtor" variant="outline" tamanho="md">
              <Store className="size-4" aria-hidden="true" /> Painel do produtor
            </LinkBotao>
            <LinkBotao href="/validar" variant="outline" tamanho="md">
              <ScanLine className="size-4" aria-hidden="true" /> Validação na entrada
            </LinkBotao>
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-10">
        <Secao titulo="Minhas revendas">
          {anuncios.length === 0 ? (
            <Vazio titulo="Nenhum anúncio de revenda">Abra um ingresso em “Meus ingressos” para anunciar.</Vazio>
          ) : (
            <ul className="flex flex-col gap-3">
              {anuncios.map((a) => {
                const ingresso = ingressoPorId(estado, a.ingresso_id);
                const evento = ingresso ? eventoPorId(estado, ingresso.event_id) : undefined;
                const venda = vendas.find((p) => p.anuncio_id === a.id);
                const comprador = venda ? usuarioPorId(estado, venda.comprador_id) : undefined;
                return (
                  <li key={a.id}>
                    <Cartao className="flex flex-col gap-2 !p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1">
                        <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                          {evento?.nome} · {ingresso?.tipo} <StatusSelo rotulo={ROTULO_ANUNCIO[a.status]} />
                        </p>
                        <p className="text-sm text-ink-3">
                          Anunciado por {brl(a.preco)} em {dataHoraNumerica(a.criado_em)}
                          {venda
                            ? ` · comprado por ${comprador ? primeiroNome(comprador.nome) : "—"} · você recebeu ${brl(venda.valor_liquido_vendedor)} (demonstração)`
                            : ""}
                        </p>
                      </div>
                      {a.status === "ativo" && ingresso ? (
                        <LinkBotao href={`/meus-ingressos/${ingresso.id}`} variant="outline" tamanho="sm">
                          Gerenciar
                        </LinkBotao>
                      ) : null}
                    </Cartao>
                  </li>
                );
              })}
            </ul>
          )}
        </Secao>

        <Secao titulo="Minhas compras">
          {compras.length === 0 ? (
            <Vazio titulo="Nenhuma compra ainda" acao={<LinkBotao href="/eventos">Buscar eventos</LinkBotao>} />
          ) : (
            <ul className="flex flex-col gap-3">
              {compras.map((p) => {
                const evento = eventoPorId(estado, p.event_id);
                const ingresso = ingressoPorId(estado, p.ingresso_id);
                return (
                  <li key={p.id}>
                    <Cartao className="flex flex-col gap-2 !p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1">
                        <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                          {evento?.nome} · {ingresso?.tipo}
                          <Selo tom={p.tipo === "primaria" ? "sucesso" : "marca"}>{p.tipo === "primaria" ? "Venda oficial" : "Revenda"}</Selo>
                        </p>
                        <p className="text-sm text-ink-3">
                          Total {brl(p.valor_total)} (simulado) · {dataHoraNumerica(p.criado_em)}
                        </p>
                      </div>
                      {ingresso ? (
                        <LinkBotao href={`/meus-ingressos/${ingresso.id}`} variant="outline" tamanho="sm">
                          Ver ingresso
                        </LinkBotao>
                      ) : null}
                    </Cartao>
                  </li>
                );
              })}
            </ul>
          )}
        </Secao>

        <Secao titulo="Trocar perfil (demonstração)">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {estado.usuarios
              .filter((u) => u.id !== usuario.id)
              .map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => acoes.entrar(u.id)}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left hover:bg-muted"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft font-bold text-brand">{u.nome.charAt(0)}</span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-ink">{u.nome}</span>
                    <span className="text-xs text-ink-3">{NOME_PAPEL[u.role]}</span>
                  </span>
                </button>
              ))}
          </div>
          <Botao
            variant="outline"
            tamanho="md"
            className="w-fit"
            onClick={() => {
              acoes.sair();
              roteador.push("/");
            }}
          >
            <LogOut className="size-4" aria-hidden="true" /> Sair
          </Botao>
        </Secao>
      </div>
    </Pagina>
  );
}

export function Conta() {
  return <ExigirLogin>{({ estado, usuario }) => <Conteudo estado={estado} usuario={usuario} />}</ExigirLogin>;
}
