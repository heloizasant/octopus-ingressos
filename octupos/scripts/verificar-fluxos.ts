/**
 * Testes das regras do Octopus (venda primária, revenda interna, titularidade,
 * validação na entrada, produtor). Uso: `npm run test:fluxos`.
 * Sem navegador, banco ou rede.
 */
import assert from "node:assert/strict";
import { calcularValores, tetoRevenda } from "../src/lib/domain/fees";
import {
  anunciarRevenda,
  anuncioAtivoDoIngresso,
  buscarPorCodigo,
  cadastrar,
  cancelarAnuncio,
  comprarLote,
  comprarRevenda,
  consultarCodigo,
  criarEvento,
  entrar,
  ingressoPorId,
  ingressosDoTitular,
  ingressosRepassados,
  registrarEntrada,
  titularidadeVigente,
  validarCodigo,
  type DadosEvento,
  type Resultado,
} from "../src/lib/demo/actions";
import { criarEstadoInicial, semanasDeDeslocamento } from "../src/lib/demo/seed";
import type { EstadoDemo, Ingresso } from "../src/lib/domain/types";

let passou = 0;
const falhas: string[] = [];
function teste(nome: string, fn: () => void) {
  try {
    fn();
    passou++;
    console.log(`  ok   ${nome}`);
  } catch (e) {
    falhas.push(nome);
    console.log(`  FALHA ${nome}\n       ${(e as Error).message}`);
  }
}
function ok<T>(r: Resultado<T>): { estado: EstadoDemo; valor: T } {
  assert.equal(r.ok, true, r.ok ? "" : `esperava sucesso, veio erro: ${r.erro}`);
  return r as { ok: true; estado: EstadoDemo; valor: T };
}
function erro(r: Resultado<unknown>, trecho: RegExp) {
  assert.equal(r.ok, false, "esperava erro, mas deu certo");
  assert.match((r as { erro: string }).erro, trecho);
}

const AGORA = Date.parse("2026-11-19T12:00:00-03:00");
const base = () => criarEstadoInicial(AGORA);
const como = (e: EstadoDemo, id: string) => ok(entrar(e, id)).estado;
const doTitular = (e: EstadoDemo, user: string, evento: string): Ingresso =>
  ingressosDoTitular(e, user).find((t) => t.event_id === evento)!;
const anuncioDe = (e: EstadoDemo, user: string, evento: string) =>
  anuncioAtivoDoIngresso(e, doTitular(e, user, evento).id)!;

// ---------------------------------------------------------------------------
console.log("\nTaxas e teto de revenda");
teste("R$ 100: taxa 2% de cada lado, total 102, líquido 98", () => {
  assert.deepEqual(calcularValores(100), { buyer_fee: 2, seller_fee: 2, valor_total: 102, valor_liquido_vendedor: 98 });
});
teste("teto de revenda = 1,5× o valor de face", () => {
  assert.equal(tetoRevenda(60), 90);
  assert.equal(tetoRevenda(45), 67.5);
});

// ---------------------------------------------------------------------------
console.log("\nDados de demonstração");
teste("7 contas (2 produtores), 6 eventos, 8 ingressos emitidos, 9 pedidos", () => {
  const e = base();
  assert.equal(e.usuarios.length, 7);
  assert.equal(e.usuarios.filter((u) => u.role === "produtor").length, 2);
  assert.equal(e.eventos.length, 6);
  assert.equal(e.ingressos.length, 8);
  assert.equal(e.pedidos.length, 9);
  assert.equal(e.pedidos.filter((p) => p.tipo === "revenda").length, 1);
});
teste("lotes contam os ingressos vendidos de verdade", () => {
  const e = base();
  const vendidos = e.eventos.flatMap((ev) => ev.lotes).reduce((s, l) => s + l.vendidos, 0);
  assert.equal(vendidos, e.ingressos.length);
});
teste("3 anúncios ativos e 1 revenda concluída", () => {
  const e = base();
  assert.equal(e.anuncios.filter((a) => a.status === "ativo").length, 3);
  assert.equal(e.anuncios.filter((a) => a.status === "vendido").length, 1);
});
teste("revenda concluída: código da Carla invalidado, código da Ana válido", () => {
  const e = base();
  const t = doTitular(e, "usr-ana", "evt-primavera");
  assert.equal(t.titularidades.length, 2);
  const [antiga, atual] = t.titularidades;
  assert.equal(antiga.titular_id, "usr-carla");
  assert.equal(consultarCodigo(e, antiga.codigo).resultado, "invalidado");
  assert.equal(consultarCodigo(e, atual.codigo).resultado, "valido");
  assert.ok(ingressosRepassados(e, "usr-carla").some((x) => x.id === t.id));
});
teste("datas: 28/11, 11/12 e 20/12/2026, sábado, sexta e domingo", () => {
  const e = base();
  assert.equal(semanasDeDeslocamento(AGORA), 0);
  const f = (iso: string, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ...o }).format(new Date(iso));
  assert.deepEqual(e.eventos.slice(0, 3).map((x) => f(x.data_hora, {})), ["28/11/2026", "11/12/2026", "20/12/2026"]);
  assert.deepEqual(e.eventos.slice(0, 3).map((x) => f(x.data_hora, { weekday: "long" })), ["sábado", "sexta-feira", "domingo"]);
});

// ---------------------------------------------------------------------------
console.log("\nVenda primária (emissão)");
teste("compra emite o ingresso, associado ao comprador, com código único", () => {
  const r = ok(comprarLote(como(base(), "usr-carla"), "evt-sarau", "lot-sar-plateia", AGORA));
  const t = r.valor.ingresso;
  assert.equal(t.titular_id, "usr-carla");
  assert.equal(t.status, "valido");
  assert.match(t.codigo_atual, /^OCT-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.equal(titularidadeVigente(t).origem, "compra_primaria");
  assert.equal(r.estado.eventos.find((x) => x.id === "evt-sarau")!.lotes[0].vendidos, 2);
  assert.equal(r.valor.pedido.valor_total, 40.8);
  assert.equal(r.valor.pedido.registros.length, 6);
  assert.equal(consultarCodigo(r.estado, t.codigo_atual).resultado, "valido");
});
teste("sem login não compra; produtor não compra do próprio evento", () => {
  erro(comprarLote(base(), "evt-sarau", "lot-sar-plateia", AGORA), /Entre na sua conta/);
  erro(comprarLote(como(base(), "usr-prod-atletica"), "evt-sarau", "lot-sar-plateia", AGORA), /produtor/);
});
teste("lote esgotado não vende", () => {
  let e = base();
  e.eventos.find((x) => x.id === "evt-sarau")!.lotes[0].vendidos = 120;
  e = como(e, "usr-carla");
  erro(comprarLote(e, "evt-sarau", "lot-sar-plateia", AGORA), /esgotado/);
});
teste("evento passado não vende", () => {
  erro(comprarLote(como(base(), "usr-carla"), "evt-sarau", "lot-sar-plateia", Date.parse("2027-06-01")), /não está mais à venda/);
});

// ---------------------------------------------------------------------------
console.log("\nRevenda interna e titularidade");
teste("só o titular anuncia; preço respeita o teto; anúncio bloqueia a entrada", () => {
  const e0 = base();
  const t = doTitular(e0, "usr-comprador", "evt-calourus");
  erro(anunciarRevenda(como(e0, "usr-ana"), t.id, 70, AGORA), /titular atual/);
  erro(anunciarRevenda(como(e0, "usr-comprador"), t.id, 91, AGORA), /preço máximo/);
  erro(anunciarRevenda(como(e0, "usr-comprador"), t.id, 0, AGORA), /maior que zero/);
  const e = ok(anunciarRevenda(como(e0, "usr-comprador"), t.id, 80, AGORA)).estado;
  assert.equal(ingressoPorId(e, t.id)!.status, "em_revenda");
  assert.equal(consultarCodigo(e, t.codigo_atual).resultado, "bloqueado_revenda");
});
teste("cancelar o anúncio devolve o ingresso ao estado válido", () => {
  const e0 = como(base(), "usr-ana");
  const anuncio = anuncioDe(e0, "usr-ana", "evt-calourus");
  const e = ok(cancelarAnuncio(e0, anuncio.id, AGORA)).estado;
  assert.equal(ingressoPorId(e, anuncio.ingresso_id)!.status, "valido");
  erro(cancelarAnuncio(como(e0, "usr-bruno"), anuncio.id, AGORA), /Só quem anunciou/);
});
teste("compra da revenda: invalida o código antigo, registra a nova titularidade", () => {
  const e0 = base();
  const anuncio = anuncioDe(e0, "usr-ana", "evt-calourus");
  const codigoAntigo = ingressoPorId(e0, anuncio.ingresso_id)!.codigo_atual;
  const r = ok(comprarRevenda(como(e0, "usr-comprador"), anuncio.id, AGORA));
  const t = r.valor.ingresso;
  assert.equal(t.titular_id, "usr-comprador");
  assert.notEqual(t.codigo_atual, codigoAntigo);
  assert.equal(consultarCodigo(r.estado, codigoAntigo).resultado, "invalidado");
  assert.equal(consultarCodigo(r.estado, t.codigo_atual).resultado, "valido");
  assert.equal(t.titularidades.filter((h) => h.status === "vigente").length, 1);
  assert.equal(r.estado.anuncios.find((a) => a.id === anuncio.id)!.status, "vendido");
  assert.ok(!ingressosDoTitular(r.estado, "usr-ana").some((x) => x.id === t.id));
  assert.ok(ingressosRepassados(r.estado, "usr-ana").some((x) => x.id === t.id));
  assert.deepEqual([r.valor.pedido.valor_total, r.valor.pedido.valor_liquido_vendedor], [67.32, 64.68]);
  const tipos = r.valor.pedido.registros.map((x) => x.tipo);
  assert.ok(tipos.indexOf("titularidade_invalidada") < tipos.indexOf("repasse_liberado"), "repasse só depois da troca");
});
teste("não compra o próprio anúncio; anúncio vendido não vende de novo", () => {
  const e0 = base();
  const anuncio = anuncioDe(e0, "usr-ana", "evt-calourus");
  erro(comprarRevenda(como(e0, "usr-ana"), anuncio.id, AGORA), /próprio anúncio/);
  const e1 = ok(comprarRevenda(como(e0, "usr-comprador"), anuncio.id, AGORA)).estado;
  erro(comprarRevenda(como(e1, "usr-carla"), anuncio.id, AGORA), /não está mais disponível/);
});
teste("o ex-titular não consegue mais anunciar o ingresso", () => {
  const e0 = base();
  const anuncio = anuncioDe(e0, "usr-ana", "evt-calourus");
  const e1 = ok(comprarRevenda(como(e0, "usr-comprador"), anuncio.id, AGORA)).estado;
  erro(anunciarRevenda(como(e1, "usr-ana"), anuncio.ingresso_id, 70, AGORA), /titular atual/);
});
teste("revenda em cadeia: três titularidades, só a última vale", () => {
  let e = base();
  const a1 = anuncioDe(e, "usr-ana", "evt-calourus");
  e = ok(comprarRevenda(como(e, "usr-comprador"), a1.id, AGORA)).estado;
  const a2 = ok(anunciarRevenda(como(e, "usr-comprador"), a1.ingresso_id, 75, AGORA + 1000));
  e = ok(comprarRevenda(como(a2.estado, "usr-bruno"), a2.valor.id, AGORA + 2000)).estado;
  const t = ingressoPorId(e, a1.ingresso_id)!;
  assert.equal(t.titularidades.length, 3);
  assert.deepEqual(t.titularidades.map((h) => consultarCodigo(e, h.codigo).resultado), ["invalidado", "invalidado", "valido"]);
  assert.equal(t.titular_id, "usr-bruno");
});

// ---------------------------------------------------------------------------
console.log("\nValidação na entrada");
teste("código inexistente", () => {
  assert.equal(consultarCodigo(base(), "OCT-ZZZZ-ZZZZ").resultado, "inexistente");
  assert.equal(buscarPorCodigo(base(), "nada"), null);
});
teste("consulta fica registrada no histórico da portaria", () => {
  const e0 = base();
  const codigo = doTitular(e0, "usr-comprador", "evt-calourus").codigo_atual;
  const r = ok(validarCodigo(como(e0, "usr-prod-atletica"), codigo.toLowerCase(), AGORA));
  assert.equal(r.valor.resultado, "valido");
  assert.equal(r.estado.validacoes.length, 1);
});
teste("só o produtor do evento (ou admin) registra a entrada", () => {
  const e0 = base();
  const codigo = doTitular(e0, "usr-comprador", "evt-calourus").codigo_atual;
  erro(registrarEntrada(como(e0, "usr-comprador"), codigo, AGORA), /produtor do evento/);
  erro(registrarEntrada(como(e0, "usr-prod-arena"), codigo, AGORA), /produtor do evento/);
  ok(registrarEntrada(como(e0, "usr-admin"), codigo, AGORA));
});
teste("entrada registrada: segunda tentativa recusada e revenda bloqueada", () => {
  const e0 = base();
  const t = doTitular(e0, "usr-comprador", "evt-calourus");
  const e1 = ok(registrarEntrada(como(e0, "usr-prod-atletica"), t.codigo_atual, AGORA)).estado;
  assert.equal(ingressoPorId(e1, t.id)!.status, "utilizado");
  assert.equal(consultarCodigo(e1, t.codigo_atual).resultado, "utilizado");
  erro(registrarEntrada(e1, t.codigo_atual, AGORA), /recusada/);
  erro(anunciarRevenda(como(e1, "usr-comprador"), t.id, 60, AGORA), /não pode ser revendido/);
});
teste("código antigo (revendido) e anunciado não registram entrada", () => {
  const e0 = como(base(), "usr-prod-arena");
  const t = doTitular(e0, "usr-ana", "evt-primavera");
  erro(registrarEntrada(e0, t.titularidades[0].codigo, AGORA), /recusada/);
  const anunciado = doTitular(e0, "usr-carla", "evt-arena");
  erro(registrarEntrada(e0, anunciado.codigo_atual, AGORA), /recusada/);
});

// ---------------------------------------------------------------------------
console.log("\nProdutor");
const novoEvento: DadosEvento = {
  nome: "Evento de Teste",
  descricao: "",
  data_hora: "2027-03-10T20:00:00-03:00",
  local: "Local",
  categoria: "Show",
  capa: { de: "#5B4FE9", para: "#9B8CFF" },
  lotes: [{ nome: "Pista", preco: 50, quantidade: 10 }],
};
teste("produtor cadastra evento com lotes; usuário comum não", () => {
  erro(criarEvento(como(base(), "usr-ana"), novoEvento, AGORA), /produtor/);
  const r = ok(criarEvento(como(base(), "usr-prod-arena"), novoEvento, AGORA));
  assert.equal(r.valor.produtor_id, "usr-prod-arena");
  assert.equal(r.valor.lotes[0].vendidos, 0);
  const compra = ok(comprarLote(como(r.estado, "usr-ana"), r.valor.id, r.valor.lotes[0].id, AGORA));
  assert.equal(compra.valor.ingresso.titular_id, "usr-ana");
});
teste("validações do cadastro de evento", () => {
  const e = como(base(), "usr-prod-arena");
  erro(criarEvento(e, { ...novoEvento, nome: "" }, AGORA), /nome/);
  erro(criarEvento(e, { ...novoEvento, data_hora: "2020-01-01T10:00:00Z" }, AGORA), /futuro/);
  erro(criarEvento(e, { ...novoEvento, lotes: [] }, AGORA), /1 a 4 lotes/);
  erro(criarEvento(e, { ...novoEvento, lotes: [{ nome: "X", preco: 0, quantidade: 1 }] }, AGORA), /maior que zero/);
});

// ---------------------------------------------------------------------------
console.log("\nConta simulada");
teste("cadastro cria conta comum e bloqueia e-mail repetido", () => {
  const r = ok(cadastrar(base(), "Maria Teste", "maria@exemplo.test"));
  assert.equal(r.valor.role, "usuario");
  erro(cadastrar(r.estado, "Outra", "MARIA@exemplo.test"), /Já existe/);
});

console.log(`\n${passou} testes passaram, ${falhas.length} falharam.`);
if (falhas.length) {
  console.log(`Falhas:\n - ${falhas.join("\n - ")}`);
  process.exit(1);
}
