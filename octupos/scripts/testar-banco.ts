/**
 * Testes das migrations v2 (supabase/rascunho-v2) em um PostgreSQL local (PGlite).
 * Uso: `npm run test:banco`. Sem Docker, sem rede, sem tocar no banco remoto.
 *
 * O PGlite NÃO é o Supabase: aqui o schema `auth` é uma versão mínima criada só
 * para o teste (tabela auth.users + auth.uid()). Estes testes não substituem os
 * testes no projeto Supabase (Auth real, API, RLS via PostgREST).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const PASTA = join(process.cwd(), "supabase", "rascunho-v2");
const ARQUIVOS = ["01_schema.sql", "02_funcoes.sql", "03_seguranca.sql"];

/** Mínimo do Supabase necessário para as migrations rodarem. */
const AUTH_MINIMO = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`;

let db: PGlite;

async function montarBanco() {
  db = new PGlite();
  await db.exec(AUTH_MINIMO);
  for (const arq of ARQUIVOS) await db.exec(readFileSync(join(PASTA, arq), "utf8"));
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------
type Linha = Record<string, unknown>;

/** Executa como superusuário (montagem do cenário e conferências). */
async function adm<T = Linha>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}

/** Executa como um usuário logado (papel authenticated + auth.uid()), sujeito ao RLS. */
async function como<T = Linha>(uid: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""]);
  await db.exec(uid ? "set role authenticated" : "set role anon");
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

async function comoServidor<T = Linha>(sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec("set role service_role");
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role");
  }
}

async function falha(p: Promise<unknown>, trecho: string) {
  await assert.rejects(p, (e: Error) => {
    assert.ok(e.message.includes(trecho), `esperava erro com "${trecho}", veio: ${e.message}`);
    return true;
  });
}

async function criarUsuario(email: string, nome: string, papel = "usuario", meta: Linha = {}): Promise<string> {
  const [{ id }] = await adm<{ id: string }>(
    "insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), $1, $2) returning id",
    [email, JSON.stringify({ nome, ...meta })],
  );
  if (papel !== "usuario") await adm("update public.profiles set role = $2 where id = $1", [id, papel]);
  return id;
}

const rpc1 = async <T = unknown>(uid: string, chamada: string, params: unknown[] = []): Promise<T> => {
  const [linha] = await como<Linha>(uid, `select ${chamada} as r`, params);
  return linha.r as T;
};

// ---------------------------------------------------------------------------
// Cenário base
// ---------------------------------------------------------------------------
const U: Record<string, string> = {};
let eventoId = "";
let lotePista = "";
let loteUnico = "";

async function cenario() {
  U.admin = await criarUsuario("admin@octupos.test", "Admin", "admin");
  U.produtor = await criarUsuario("produtor@octupos.test", "Paula Produtora", "produtor");
  U.outroProdutor = await criarUsuario("outro@octupos.test", "Otávio Produtor", "produtor");
  U.ana = await criarUsuario("ana@octupos.test", "Ana Souza");
  U.bruno = await criarUsuario("bruno@octupos.test", "Bruno Lima");
  U.carla = await criarUsuario("carla@octupos.test", "Carla Mendes");

  eventoId = await rpc1<string>(
    U.produtor,
    "public.criar_evento($1, $2, now() + interval '10 days', $3, $4, null, null, $5::jsonb)",
    ["Festival Teste", "Descrição", "Parque", "Festival", JSON.stringify([
      { nome: "Pista", preco: 100, quantidade: 50 },
      { nome: "Camarote Único", preco: 300, quantidade: 1 },
    ])],
  );
  const lotes = await adm<{ id: string; nome: string }>("select id, nome from public.ticket_batches where event_id = $1", [eventoId]);
  lotePista = lotes.find((l) => l.nome === "Pista")!.id;
  loteUnico = lotes.find((l) => l.nome === "Camarote Único")!.id;
}

/** Compra primária completa (reserva + pagamento simulado). Devolve o ingresso. */
async function comprarLote(uid: string, lote: string): Promise<{ pedido: string; ingresso: string }> {
  const pedido = await rpc1<string>(uid, "public.iniciar_compra_lote($1)", [lote]);
  const ingresso = await rpc1<string>(uid, "public.confirmar_pagamento_simulado($1)", [pedido]);
  return { pedido, ingresso };
}

const credencialVigente = async (ingresso: string) =>
  (await adm<{ codigo: string; titular_id: string }>(
    "select codigo, titular_id from public.ticket_credentials where ticket_id = $1 and status = 'vigente'",
    [ingresso],
  ))[0];

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------
const testes: [string, string, () => Promise<void>][] = [];
const t = (grupo: string, nome: string, fn: () => Promise<void>) => testes.push([grupo, nome, fn]);

t("Cadastro", "cria perfil 'usuario' e ignora papel enviado nos metadados", async () => {
  const id = await criarUsuario("esperto@octupos.test", "Esperto", "usuario", { role: "admin" });
  const [p] = await adm<{ role: string; nome: string }>("select role, nome from public.profiles where id = $1", [id]);
  assert.equal(p.role, "usuario");
  assert.equal(p.nome, "Esperto");
});

t("Produtor", "usuário comum não cria evento", async () => {
  await falha(
    como(U.ana, "select public.criar_evento('X', '', now() + interval '1 day', 'L', 'C', null, null, '[{\"nome\":\"A\",\"preco\":10,\"quantidade\":1}]')"),
    "Só contas de produtor",
  );
});

t("Produtor", "valida lotes e data futura", async () => {
  await falha(como(U.produtor, "select public.criar_evento('Evento', '', now() - interval '1 day', 'L', 'C', null, null, '[{\"nome\":\"A\",\"preco\":10,\"quantidade\":1}]')"), "no futuro");
  await falha(como(U.produtor, "select public.criar_evento('Evento', '', now() + interval '1 day', 'L', 'C', null, null, '[]')"), "de 1 a 4 lotes");
  await falha(como(U.produtor, "select public.criar_evento('Evento', '', now() + interval '1 day', 'L', 'C', null, null, '[{\"nome\":\"A\",\"preco\":10,\"quantidade\":1.5}]')"), "quantidade");
});

t("Venda primária", "reserva cria pedido pendente com taxas de 2% + 2%", async () => {
  const pedido = await rpc1<string>(U.ana, "public.iniciar_compra_lote($1)", [lotePista]);
  const [o] = await adm<Linha>("select * from public.orders where id = $1", [pedido]);
  assert.equal(o.status, "aguardando_pagamento");
  assert.equal(Number(o.valor_total), 102);
  assert.equal(Number(o.valor_liquido_vendedor), 98);
  const [p] = await adm<Linha>("select status, valor from public.payments where order_id = $1", [pedido]);
  assert.equal(p.status, "pendente");
  assert.equal(Number(p.valor), 102);
  await como(U.ana, "select public.cancelar_pedido($1)", [pedido]);
});

t("Venda primária", "pagamento confirmado emite ingresso, credencial e repasse ao produtor sem data definida", async () => {
  const { pedido, ingresso } = await comprarLote(U.ana, lotePista);
  const [tk] = await adm<Linha>("select titular_id, status, valor_face, tipo from public.tickets where id = $1", [ingresso]);
  assert.equal(tk.titular_id, U.ana);
  assert.equal(tk.status, "valido");
  assert.equal(tk.tipo, "Pista");
  const cred = await credencialVigente(ingresso);
  assert.match(cred.codigo, /^OCT(-[0-9A-F]{4}){4}$/);
  const [lote] = await adm<{ vendidos: number }>("select vendidos from public.ticket_batches where id = $1", [lotePista]);
  assert.ok(lote.vendidos >= 1);
  const [rep] = await adm<Linha>("select origem, beneficiario_id, valor, status, disponivel_em from public.payouts where order_id = $1", [pedido]);
  assert.equal(rep.origem, "primaria");
  assert.equal(rep.beneficiario_id, U.produtor);
  assert.equal(Number(rep.valor), 98);
  assert.equal(rep.status, "devido");
  assert.equal(rep.disponivel_em, null, "regra de liberação da primária fica para configuração futura");
});

t("Venda primária", "confirmar de novo (webhook repetido) não emite outra credencial", async () => {
  const pedido = await rpc1<string>(U.bruno, "public.iniciar_compra_lote($1)", [lotePista]);
  const a = await comoServidor<{ r: string }>("select interno.confirmar_pagamento($1, 'ref-1') as r", [pedido]);
  const b = await comoServidor<{ r: string }>("select interno.confirmar_pagamento($1, 'ref-1') as r", [pedido]);
  assert.equal(a[0].r, b[0].r);
  const creds = await adm("select 1 from public.ticket_credentials where order_id = $1", [pedido]);
  assert.equal(creds.length, 1);
});

t("Venda primária", "reserva conta no estoque: lote de 1 esgota com pedido pendente", async () => {
  const pedido = await rpc1<string>(U.ana, "public.iniciar_compra_lote($1)", [loteUnico]);
  await falha(como(U.bruno, "select public.iniciar_compra_lote($1)", [loteUnico]), "esgotado");
  // Reserva vence: o lote volta a ficar disponível e o pedido antigo expira.
  await adm("update public.orders set expira_em = now() - interval '1 minute' where id = $1", [pedido]);
  const novo = await rpc1<string>(U.bruno, "public.iniciar_compra_lote($1)", [loteUnico]);
  const [antigo] = await adm<{ status: string }>("select status from public.orders where id = $1", [pedido]);
  assert.equal(antigo.status, "expirado");
  await falha(como(U.ana, "select public.confirmar_pagamento_simulado($1)", [pedido]), "não pode mais ser pago");
  await como(U.bruno, "select public.confirmar_pagamento_simulado($1)", [novo]);
  await falha(como(U.carla, "select public.iniciar_compra_lote($1)", [loteUnico]), "esgotado");
});

t("Venda primária", "produtor não compra do próprio evento; evento passado não vende", async () => {
  await falha(como(U.produtor, "select public.iniciar_compra_lote($1)", [lotePista]), "próprio evento");
  const passado = await rpc1<string>(U.outroProdutor,
    "public.criar_evento('Passado', '', now() + interval '1 hour', 'L', 'C', null, null, '[{\"nome\":\"A\",\"preco\":10,\"quantidade\":5}]'::jsonb)");
  await adm("update public.events set data_hora = now() - interval '1 hour' where id = $1", [passado]);
  const [l] = await adm<{ id: string }>("select id from public.ticket_batches where event_id = $1", [passado]);
  await falha(como(U.ana, "select public.iniciar_compra_lote($1)", [l.id]), "não está mais à venda");
});

t("Venda primária", "comprador não confirma pedido de outra pessoa", async () => {
  const pedido = await rpc1<string>(U.ana, "public.iniciar_compra_lote($1)", [lotePista]);
  await falha(como(U.bruno, "select public.confirmar_pagamento_simulado($1)", [pedido]), "Pedido não encontrado");
  await como(U.ana, "select public.cancelar_pedido($1)", [pedido]);
});

t("Revenda", "só o titular anuncia, com teto de 1,5× o valor de face", async () => {
  const { ingresso } = await comprarLote(U.ana, lotePista);
  await falha(como(U.bruno, "select public.anunciar_revenda($1, 120)", [ingresso]), "Só o titular");
  await falha(como(U.ana, "select public.anunciar_revenda($1, 150.01)", [ingresso]), "R$ 150,00");
  await rpc1(U.ana, "public.anunciar_revenda($1, 150)", [ingresso]);
  await falha(como(U.ana, "select public.anunciar_revenda($1, 120)", [ingresso]), "já está anunciado");
});

t("Revenda", "compra transfere titularidade, invalida credencial antiga e registra repasse disponível", async () => {
  const { ingresso } = await comprarLote(U.ana, lotePista);
  const antiga = await credencialVigente(ingresso);
  const anuncio = await rpc1<string>(U.ana, "public.anunciar_revenda($1, 120)", [ingresso]);
  await falha(como(U.ana, "select public.iniciar_compra_revenda($1)", [anuncio]), "próprio anúncio");

  const pedido = await rpc1<string>(U.bruno, "public.iniciar_compra_revenda($1)", [anuncio]);
  const [ped] = await adm<Linha>("select valor_total, valor_liquido_vendedor from public.orders where id = $1", [pedido]);
  assert.equal(Number(ped.valor_total), 122.4);
  assert.equal(Number(ped.valor_liquido_vendedor), 117.6);
  await como(U.bruno, "select public.confirmar_pagamento_simulado($1)", [pedido]);

  const nova = await credencialVigente(ingresso);
  assert.equal(nova.titular_id, U.bruno);
  assert.notEqual(nova.codigo, antiga.codigo);
  const [velha] = await adm<{ status: string }>("select status from public.ticket_credentials where codigo = $1", [antiga.codigo]);
  assert.equal(velha.status, "invalidada");
  const [tk] = await adm<Linha>("select titular_id, status from public.tickets where id = $1", [ingresso]);
  assert.equal(tk.titular_id, U.bruno);
  assert.equal(tk.status, "valido");
  const [an] = await adm<{ status: string }>("select status from public.listings where id = $1", [anuncio]);
  assert.equal(an.status, "vendido");
  const [rep] = await adm<Linha>("select origem, beneficiario_id, valor, status, disponivel_em from public.payouts where order_id = $1", [pedido]);
  assert.equal(rep.origem, "revenda");
  assert.equal(rep.beneficiario_id, U.ana);
  assert.equal(Number(rep.valor), 117.6);
  assert.equal(rep.status, "devido");
  assert.notEqual(rep.disponivel_em, null, "revenda: disponível na confirmação, sem retenção após o evento");

  const hist = await adm<{ tipo: string }>("select tipo from public.ticket_events where ticket_id = $1 order by id", [ingresso]);
  assert.deepEqual(hist.map((h) => h.tipo), [
    "emitido", "credencial_emitida", "anunciado", "reservado",
    "credencial_invalidada", "transferido", "credencial_emitida",
  ]);
});

t("Revenda", "segundo comprador não reserva anúncio já reservado; cancelamento libera", async () => {
  const { ingresso } = await comprarLote(U.carla, lotePista);
  const anuncio = await rpc1<string>(U.carla, "public.anunciar_revenda($1, 110)", [ingresso]);
  const pedido = await rpc1<string>(U.ana, "public.iniciar_compra_revenda($1)", [anuncio]);
  await falha(como(U.bruno, "select public.iniciar_compra_revenda($1)", [anuncio]), "não está mais disponível");
  await falha(como(U.carla, "select public.cancelar_anuncio($1)", [anuncio]), "compra em andamento");
  await como(U.ana, "select public.cancelar_pedido($1)", [pedido]);
  const [an] = await adm<{ status: string }>("select status from public.listings where id = $1", [anuncio]);
  assert.equal(an.status, "ativo");
  await como(U.carla, "select public.cancelar_anuncio($1)", [anuncio]);
  const [tk] = await adm<{ status: string }>("select status from public.tickets where id = $1", [ingresso]);
  assert.equal(tk.status, "valido");
});

t("Portaria", "código antigo é recusado, o novo vale uma única vez", async () => {
  const { ingresso } = await comprarLote(U.ana, lotePista);
  const antiga = await credencialVigente(ingresso);
  const anuncio = await rpc1<string>(U.ana, "public.anunciar_revenda($1, 100)", [ingresso]);

  const [bloq] = await como<Linha>(U.produtor, "select * from public.validar_codigo($1)", [antiga.codigo]);
  assert.equal(bloq.resultado, "bloqueado_revenda");

  const pedido = await rpc1<string>(U.bruno, "public.iniciar_compra_revenda($1)", [anuncio]);
  await como(U.bruno, "select public.confirmar_pagamento_simulado($1)", [pedido]);
  const nova = await credencialVigente(ingresso);

  const [inv] = await como<Linha>(U.produtor, "select * from public.validar_codigo($1)", [antiga.codigo]);
  assert.equal(inv.resultado, "invalidado");
  const [ok] = await como<Linha>(U.produtor, "select * from public.validar_codigo($1)", [nova.codigo.toLowerCase()]);
  assert.equal(ok.resultado, "valido");
  assert.equal(ok.titular, "Bruno Lima");

  await como(U.produtor, "select public.registrar_entrada($1)", [nova.codigo]);
  await falha(como(U.produtor, "select public.registrar_entrada($1)", [nova.codigo]), "utilizado");
  await falha(como(U.bruno, "select public.anunciar_revenda($1, 100)", [ingresso]), "não pode ser revendido");
});

t("Portaria", "usuário comum não opera; produtor de outro evento vê código como inexistente", async () => {
  const { ingresso } = await comprarLote(U.carla, lotePista);
  const cred = await credencialVigente(ingresso);
  await falha(como(U.ana, "select * from public.validar_codigo($1)", [cred.codigo]), "portaria");
  const [r] = await como<Linha>(U.outroProdutor, "select * from public.validar_codigo($1)", [cred.codigo]);
  assert.equal(r.resultado, "inexistente");
  assert.equal(r.ticket_id, null);
  await falha(como(U.outroProdutor, "select public.registrar_entrada($1)", [cred.codigo]), "inexistente");
});

t("Segurança (RLS)", "credenciais e pedidos de terceiros ficam invisíveis", async () => {
  const { ingresso, pedido } = await comprarLote(U.ana, lotePista);
  assert.equal((await como(U.carla, "select * from public.ticket_credentials where ticket_id = $1", [ingresso])).length, 0);
  assert.equal((await como(U.carla, "select * from public.orders where id = $1", [pedido])).length, 0);
  assert.equal((await como(U.carla, "select * from public.tickets where id = $1", [ingresso])).length, 0);
  assert.equal((await como(U.ana, "select * from public.ticket_credentials where ticket_id = $1", [ingresso])).length, 1);
  // O produtor vê o ingresso do próprio evento, mas não o código da credencial.
  assert.equal((await como(U.produtor, "select * from public.tickets where id = $1", [ingresso])).length, 1);
  assert.equal((await como(U.produtor, "select * from public.ticket_credentials where ticket_id = $1", [ingresso])).length, 0);
  // Repasse do produtor: visível para ele, não para o comprador.
  assert.equal((await como(U.produtor, "select * from public.payouts where order_id = $1", [pedido])).length, 1);
  assert.equal((await como(U.ana, "select * from public.payouts where order_id = $1", [pedido])).length, 0);
});

t("Segurança (RLS)", "ex-titular vê o histórico, mas não a nova credencial", async () => {
  const { ingresso } = await comprarLote(U.ana, lotePista);
  const anuncio = await rpc1<string>(U.ana, "public.anunciar_revenda($1, 100)", [ingresso]);
  const pedido = await rpc1<string>(U.carla, "public.iniciar_compra_revenda($1)", [anuncio]);
  await como(U.carla, "select public.confirmar_pagamento_simulado($1)", [pedido]);
  const credsAna = await como<{ status: string }>(U.ana, "select status from public.ticket_credentials where ticket_id = $1", [ingresso]);
  assert.deepEqual(credsAna.map((c) => c.status), ["invalidada"]);
  assert.ok((await como(U.ana, "select 1 from public.ticket_events where ticket_id = $1", [ingresso])).length > 0);
});

t("Segurança (RLS)", "visitante sem login vê eventos e anúncios ativos, nada pessoal", async () => {
  assert.ok((await como(null, "select * from public.events")).length > 0);
  assert.ok((await como(null, "select * from public.ticket_batches")).length > 0);
  await falha(como(null, "select * from public.orders"), "permission denied");
  await falha(como(null, "select * from public.ticket_credentials"), "permission denied");
  await falha(como(null, "select * from public.profiles"), "permission denied");
});

t("Segurança (RLS)", "escrita direta nas tabelas é negada; funções internas também", async () => {
  await falha(como(U.ana, "update public.tickets set titular_id = $1", [U.ana]), "permission denied");
  await falha(como(U.ana, "insert into public.ticket_credentials (ticket_id, titular_id, codigo, origem, order_id) values (gen_random_uuid(), $1, 'OCT-AAAA-AAAA-AAAA-AAAA', 'revenda', gen_random_uuid())", [U.ana]), "permission denied");
  await falha(como(U.ana, "update public.profiles set role = 'admin' where id = $1", [U.ana]), "permission denied");
  await falha(como(U.ana, "select interno.confirmar_pagamento(gen_random_uuid())"), "permission denied");
  await falha(como(U.ana, "select public.definir_papel($1, 'admin')", [U.ana]), "Só a administração");
});

t("Segurança (RLS)", "admin promove conta a produtor", async () => {
  await como(U.admin, "select public.definir_papel($1, 'produtor')", [U.carla]);
  const [p] = await adm<{ role: string }>("select role from public.profiles where id = $1", [U.carla]);
  assert.equal(p.role, "produtor");
  await adm("update public.profiles set role = 'usuario' where id = $1", [U.carla]);
});

t("Histórico", "registros do histórico não podem ser alterados nem apagados (nem pelo dono do banco)", async () => {
  await falha(adm("update public.ticket_events set detalhe = 'x'"), "não podem ser alterados");
  await falha(adm("delete from public.validations"), "não podem ser alterados");
});

// ---------------------------------------------------------------------------
async function main() {
  await montarBanco();
  await cenario();
  let ok = 0;
  let falhas = 0;
  let grupoAtual = "";
  for (const [grupo, nome, fn] of testes) {
    if (grupo !== grupoAtual) {
      console.log(`\n${grupo}`);
      grupoAtual = grupo;
    }
    try {
      await fn();
      console.log(`  ok   ${nome}`);
      ok++;
    } catch (e) {
      console.log(`  FALHOU ${nome}\n         ${e instanceof Error ? e.message : String(e)}`);
      falhas++;
      await db.exec("reset role").catch(() => {});
    }
  }
  console.log(`\n${ok} testes passaram, ${falhas} falharam.`);
  process.exit(falhas ? 1 : 0);
}

main().catch((e) => {
  console.error("Falha ao montar o banco de teste:", e instanceof Error ? e.message : e);
  process.exit(1);
});
