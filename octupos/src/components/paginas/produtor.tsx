"use client";

import { useState } from "react";
import { Plus, ScanLine, Trash2 } from "lucide-react";
import { Aviso, Botao, Campo, Cartao, ENTRADA, LinkBotao, Pagina, Secao, Selo, Titulo, Vazio } from "@/components/octupos/base";
import { CapaEvento, PALETAS_CAPA } from "@/components/octupos/capa-evento";
import { ExigirLogin } from "@/components/octupos/exigir-login";
import type { DadosLote } from "@/lib/demo/actions";
import { acoes } from "@/lib/demo/store";
import { brl, dataHoraNumerica, deInputLocal } from "@/lib/domain/format";
import type { EstadoDemo, Usuario } from "@/lib/domain/types";

function Indicador({ rotulo, valor, dica }: { rotulo: string; valor: string; dica?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold text-ink-3">{rotulo}</p>
      <p className="mt-1 text-2xl font-extrabold text-ink">{valor}</p>
      {dica ? <p className="mt-0.5 text-xs text-ink-3">{dica}</p> : null}
    </div>
  );
}

function NovoEvento({ aoCriar }: { aoCriar: (nome: string) => void }) {
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [local, setLocal] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [paleta, setPaleta] = useState(0);
  const [lotes, setLotes] = useState<{ nome: string; preco: string; quantidade: string }[]>([
    { nome: "Pista", preco: "50", quantidade: "100" },
  ]);
  const [erro, setErro] = useState<string | null>(null);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return setErro("Informe a data e a hora.");
    const dados: DadosLote[] = lotes.map((l) => ({ nome: l.nome, preco: Number(l.preco.replace(",", ".")), quantidade: Number(l.quantidade) }));
    const p = PALETAS_CAPA[paleta];
    const r = acoes.criarEvento({ nome, descricao, data_hora: deInputLocal(data), local, categoria, capa: { de: p.de, para: p.para }, lotes: dados });
    if (r.ok) {
      setErro(null);
      aoCriar(r.valor.nome);
    } else setErro(r.erro);
  }

  const mudarLote = (i: number, campo: "nome" | "preco" | "quantidade", valor: string) =>
    setLotes((ls) => ls.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));

  return (
    <Cartao>
      <form onSubmit={salvar} className="flex flex-col gap-4" noValidate>
        <h2 className="text-lg font-bold text-ink">Cadastrar evento e disponibilizar ingressos</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Campo rotulo="Nome do evento" htmlFor="p-nome">
            <input id="p-nome" value={nome} onChange={(e) => setNome(e.target.value)} className={ENTRADA} />
          </Campo>
          <Campo rotulo="Data e hora (Brasília)" htmlFor="p-data">
            <input id="p-data" type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} className={ENTRADA} />
          </Campo>
          <Campo rotulo="Local" htmlFor="p-local">
            <input id="p-local" value={local} onChange={(e) => setLocal(e.target.value)} className={ENTRADA} />
          </Campo>
          <Campo rotulo="Categoria" htmlFor="p-cat">
            <input id="p-cat" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Show, Festival…" className={ENTRADA} />
          </Campo>
        </div>
        <Campo rotulo="Descrição" htmlFor="p-desc">
          <textarea id="p-desc" rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} className={ENTRADA} />
        </Campo>
        <Campo rotulo="Cores da capa" htmlFor="p-capa">
          <select id="p-capa" value={paleta} onChange={(e) => setPaleta(Number(e.target.value))} className={ENTRADA}>
            {PALETAS_CAPA.map((p, i) => (
              <option key={p.nome} value={i}>
                {p.nome}
              </option>
            ))}
          </select>
        </Campo>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-[13px] font-semibold text-ink-2">Lotes (de 1 a 4)</legend>
          {lotes.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-border p-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
              <Campo rotulo="Nome do lote" htmlFor={`l-nome-${i}`}>
                <input id={`l-nome-${i}`} value={l.nome} onChange={(e) => mudarLote(i, "nome", e.target.value)} className={ENTRADA} />
              </Campo>
              <Campo rotulo="Preço (R$)" htmlFor={`l-preco-${i}`}>
                <input id={`l-preco-${i}`} type="number" min="1" step="0.01" value={l.preco} onChange={(e) => mudarLote(i, "preco", e.target.value)} className={ENTRADA} />
              </Campo>
              <Campo rotulo="Quantidade" htmlFor={`l-qtd-${i}`}>
                <input id={`l-qtd-${i}`} type="number" min="1" step="1" value={l.quantidade} onChange={(e) => mudarLote(i, "quantidade", e.target.value)} className={ENTRADA} />
              </Campo>
              <Botao
                type="button"
                variant="ghost"
                tamanho="sm"
                aria-label={`Remover lote ${i + 1}`}
                disabled={lotes.length === 1}
                onClick={() => setLotes((ls) => ls.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Botao>
            </div>
          ))}
          {lotes.length < 4 ? (
            <Botao type="button" variant="outline" tamanho="sm" className="w-fit" onClick={() => setLotes((ls) => [...ls, { nome: "", preco: "", quantidade: "" }])}>
              <Plus className="size-4" aria-hidden="true" /> Adicionar lote
            </Botao>
          ) : null}
        </fieldset>

        {erro ? (
          <Aviso tom="perigo" titulo="Corrija para salvar">
            {erro}
          </Aviso>
        ) : null}
        <Botao type="submit" tamanho="lg">
          Publicar evento
        </Botao>
      </form>
    </Cartao>
  );
}

function Conteudo({ estado, usuario }: { estado: EstadoDemo; usuario: Usuario }) {
  const [criando, setCriando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const eventos = estado.eventos
    .filter((e) => usuario.role === "admin" || e.produtor_id === usuario.id)
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  const ids = new Set(eventos.map((e) => e.id));
  const primarias = estado.pedidos.filter((p) => p.tipo === "primaria" && ids.has(p.event_id));
  const revendas = estado.pedidos.filter((p) => p.tipo === "revenda" && ids.has(p.event_id));
  const entradas = estado.ingressos.filter((t) => ids.has(t.event_id) && t.status === "utilizado").length;

  return (
    <Pagina>
      <Titulo sub="O produtor disponibiliza os ingressos; o Octopus emite, controla a titularidade e valida na entrada.">
        Painel do produtor · {usuario.nome}
      </Titulo>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Indicador rotulo="Ingressos vendidos" valor={String(primarias.length)} dica="Venda oficial" />
        <Indicador rotulo="Receita líquida" valor={brl(primarias.reduce((s, p) => s + p.valor_liquido_vendedor, 0))} dica="Demonstração, após 2%" />
        <Indicador rotulo="Revendas internas" valor={String(revendas.length)} dica="Titularidade transferida" />
        <Indicador rotulo="Entradas registradas" valor={String(entradas)} />
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <Botao tamanho="md" onClick={() => { setCriando((v) => !v); setMsg(null); }}>
          <Plus className="size-4" aria-hidden="true" /> {criando ? "Fechar cadastro" : "Cadastrar evento"}
        </Botao>
        <LinkBotao href="/validar" variant="outline" tamanho="md">
          <ScanLine className="size-4" aria-hidden="true" /> Abrir validação na entrada
        </LinkBotao>
      </div>

      {msg ? (
        <Aviso tom="sucesso" className="mb-6" titulo="Evento publicado">
          {msg}
        </Aviso>
      ) : null}

      {criando ? (
        <div className="mb-8">
          <NovoEvento
            aoCriar={(nome) => {
              setCriando(false);
              setMsg(`“${nome}” já está à venda na busca de eventos.`);
            }}
          />
        </div>
      ) : null}

      <Secao titulo="Meus eventos">
        {eventos.length === 0 ? (
          <Vazio titulo="Nenhum evento cadastrado" />
        ) : (
          <ul className="flex flex-col gap-4">
            {eventos.map((ev) => {
              const vendidos = ev.lotes.reduce((s, l) => s + l.vendidos, 0);
              const total = ev.lotes.reduce((s, l) => s + l.quantidade, 0);
              const rev = revendas.filter((p) => p.event_id === ev.id).length;
              const ent = estado.ingressos.filter((t) => t.event_id === ev.id && t.status === "utilizado").length;
              return (
                <li key={ev.id}>
                  <Cartao className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <CapaEvento evento={ev} mostrarCategoria={false} className="hidden size-14 shrink-0 rounded-xl sm:block" />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                          {ev.nome}
                          {ev.destaque ? <Selo tom="marca">Destaque</Selo> : null}
                        </p>
                        <p className="text-sm text-ink-3">
                          {dataHoraNumerica(ev.data_hora)} · {ev.local} · {vendidos} de {total} vendidos · {rev} revenda(s) · {ent} entrada(s)
                        </p>
                      </div>
                      <LinkBotao href={`/eventos/${ev.id}`} variant="outline" tamanho="sm">
                        Ver página do evento
                      </LinkBotao>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {ev.lotes.map((l) => (
                        <div key={l.id} className="flex flex-col gap-1.5 rounded-xl bg-muted p-3">
                          <p className="text-sm font-semibold text-ink">
                            {l.nome} · {brl(l.preco)}
                          </p>
                          <div className="h-2 overflow-hidden rounded-full bg-white" aria-hidden="true">
                            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round((l.vendidos / l.quantidade) * 100)}%` }} />
                          </div>
                          <p className="text-xs text-ink-3">
                            {l.vendidos} de {l.quantidade} vendidos
                          </p>
                        </div>
                      ))}
                    </div>
                  </Cartao>
                </li>
              );
            })}
          </ul>
        )}
      </Secao>
    </Pagina>
  );
}

export function Produtor() {
  return <ExigirLogin papel="produtor">{({ estado, usuario }) => <Conteudo estado={estado} usuario={usuario} />}</ExigirLogin>;
}
