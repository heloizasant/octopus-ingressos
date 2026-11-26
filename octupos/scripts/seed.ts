/**
 * Dados de demonstração do Octupos.
 *
 * Uso: `npm run seed` (dentro de `octupos/`).
 * Precisa de NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY e SEED_DEMO_PASSWORD
 * em `.env.local`.
 *
 * ATENÇÃO: o script RESTAURA a demonstração. Ele apaga todos os eventos,
 * anúncios, pedidos, pagamentos, transferências e registros do banco e cria
 * tudo de novo. As contas de demonstração são mantidas ou recriadas.
 * Nunca imprime chaves.
 */
import { randomInt } from "node:crypto";
import { existsSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY em .env.local.",
  );
  process.exit(1);
}

const supabase: SupabaseClient = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Senha das contas de demonstração. Nunca fica no código: defina
 * SEED_DEMO_PASSWORD no `.env.local` (mínimo de 12 caracteres).
 */
const SENHA_DEMO = process.env.SEED_DEMO_PASSWORD ?? "";
if (SENHA_DEMO.length < 12) {
  console.error("Defina SEED_DEMO_PASSWORD em .env.local (mínimo de 12 caracteres).");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function bloco(): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}

const codigo = (prefixo: string) => `${prefixo}-${bloco()}-${bloco()}`;

/** Arredonda para centavos. */
const centavos = (v: number) => Math.round(v * 100) / 100;

const minutos = (n: number) => new Date(Date.now() + n * 60_000).toISOString();

function falhar(etapa: string, erro: { message: string } | null): void {
  if (erro) {
    console.error(`Erro em "${etapa}": ${erro.message}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Contas de demonstração (domínio reservado .test, nunca recebe e-mail)
// ---------------------------------------------------------------------------
type Conta = { chave: string; email: string; nome: string; role: "usuario" | "admin" };

const CONTAS: Conta[] = [
  { chave: "admin", email: "admin@octupos.test", nome: "Admin Octupos", role: "admin" },
  { chave: "comprador", email: "comprador@octupos.test", nome: "Diego Rocha", role: "usuario" },
  { chave: "ana", email: "ana@octupos.test", nome: "Ana Souza", role: "usuario" },
  { chave: "bruno", email: "bruno@octupos.test", nome: "Bruno Lima", role: "usuario" },
  { chave: "carla", email: "carla@octupos.test", nome: "Carla Mendes", role: "usuario" },
];

async function garantirContas(): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};

  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  falhar("listar usuários", error);
  const existentes = new Map(data.users.map((u) => [u.email, u.id]));

  for (const conta of CONTAS) {
    let id = existentes.get(conta.email);
    if (id) {
      const { error: e } = await supabase.auth.admin.updateUserById(id, {
        password: SENHA_DEMO,
        email_confirm: true,
      });
      falhar(`atualizar ${conta.email}`, e);
    } else {
      const { data: criado, error: e } = await supabase.auth.admin.createUser({
        email: conta.email,
        password: SENHA_DEMO,
        email_confirm: true,
        user_metadata: { nome: conta.nome },
      });
      falhar(`criar ${conta.email}`, e);
      id = criado.user!.id;
    }
    ids[conta.chave] = id;
  }

  const { error: e } = await supabase.from("profiles").upsert(
    CONTAS.map((c) => ({ id: ids[c.chave], nome: c.nome, email: c.email, role: c.role })),
  );
  falhar("gravar perfis", e);

  return ids;
}

// ---------------------------------------------------------------------------
// Limpeza (ordem respeita as chaves estrangeiras)
// ---------------------------------------------------------------------------
async function limpar(): Promise<void> {
  const tabelas = [
    "transaction_records",
    "ticket_transfers",
    "payments",
    "orders",
    "tickets",
    "events",
  ];
  for (const t of tabelas) {
    const { error } = await supabase.from(t).delete().not("id", "is", null);
    falhar(`limpar ${t}`, error);
  }
}

// ---------------------------------------------------------------------------
// Eventos: os 3 primeiros vêm da tela de referência "Buscar evento".
// Horário de Brasília (-03:00).
// ---------------------------------------------------------------------------
const EVENTOS = [
  {
    chave: "calourus",
    nome: "Festa Universitária — Virada Calourus",
    descricao: "A festa de boas-vindas aos calouros, com DJs e atrações da cena universitária.",
    data_hora: "2026-11-28T22:00:00-03:00", // sábado
    local: "Centro de Eventos",
    organizador: "Atlética Integrada",
    categoria: "Festa universitária",
    preco_referencia: 60,
    destaque: true,
  },
  {
    chave: "arena",
    nome: "Show de Encerramento — Arena Sul",
    descricao: "Show de encerramento da temporada com artistas convidados.",
    data_hora: "2026-12-11T21:00:00-03:00", // sexta-feira
    local: "Arena Sul",
    organizador: "Arena Sul Produções",
    categoria: "Show",
    preco_referencia: 150,
    destaque: true,
  },
  {
    chave: "primavera",
    nome: "Festival de Primavera",
    descricao: "Festival ao ar livre com música, food trucks e feira criativa.",
    data_hora: "2026-12-20T16:00:00-03:00", // domingo
    local: "Parque da Cidade",
    organizador: "Coletivo Primavera",
    categoria: "Festival",
    preco_referencia: 90,
    destaque: true,
  },
  {
    chave: "sarau",
    nome: "Sarau de Verão",
    descricao: "Noite de música acústica e poesia.",
    data_hora: "2027-01-09T20:00:00-03:00",
    local: "Teatro Municipal",
    organizador: "Teatro Municipal",
    categoria: "Teatro e música",
    preco_referencia: 40,
    destaque: false,
  },
  {
    chave: "futsal",
    nome: "Copa Universitária de Futsal — Final",
    descricao: "A grande final da copa entre as atléticas.",
    data_hora: "2027-01-23T19:00:00-03:00",
    local: "Ginásio Poliesportivo",
    organizador: "Liga Universitária",
    categoria: "Esporte",
    preco_referencia: 25,
    destaque: false,
  },
  {
    chave: "gastro",
    nome: "Festival Gastronômico & Música",
    descricao: "Gastronomia regional com shows ao vivo.",
    data_hora: "2027-02-06T12:00:00-03:00",
    local: "Praça Central",
    organizador: "Associação Comercial",
    categoria: "Festival",
    preco_referencia: 70,
    destaque: false,
  },
];

// ---------------------------------------------------------------------------
// Anúncios: o preço define o resultado da análise demonstrativa
// (até 1,5× a referência = aprovada; até 2,5× = pendente; acima = reprovada).
// ---------------------------------------------------------------------------
const ANUNCIOS = [
  // aprovados
  { ref: "a1", evento: "calourus", vendedor: "ana", tipo: "Pista", preco: 65 },
  { ref: "a2", evento: "calourus", vendedor: "bruno", tipo: "Pista", preco: 70 },
  { ref: "a3", evento: "calourus", vendedor: "carla", tipo: "Camarote", preco: 85 },
  { ref: "a4", evento: "arena", vendedor: "ana", tipo: "Pista", preco: 160 },
  { ref: "a5", evento: "arena", vendedor: "carla", tipo: "Meia-entrada", preco: 80 },
  { ref: "a6", evento: "primavera", vendedor: "bruno", tipo: "Inteira", preco: 95 },
  { ref: "a7", evento: "sarau", vendedor: "carla", tipo: "Plateia", preco: 45 },
  { ref: "a8", evento: "futsal", vendedor: "ana", tipo: "Arquibancada", preco: 30 },
  { ref: "a9", evento: "gastro", vendedor: "bruno", tipo: "Passaporte", preco: 75 },
  // pendentes de análise
  { ref: "p1", evento: "arena", vendedor: "bruno", tipo: "Área VIP", preco: 300 },
  { ref: "p2", evento: "primavera", vendedor: "carla", tipo: "Inteira", preco: 180 },
  // reprovados
  { ref: "r1", evento: "calourus", vendedor: "bruno", tipo: "Pista", preco: 200 },
  { ref: "r2", evento: "arena", vendedor: "carla", tipo: "Pista", preco: 420 },
  { ref: "r3", evento: "futsal", vendedor: "bruno", tipo: "Arquibancada", preco: 90 },
];

type Analise = {
  status: "disponivel" | "pendente_validacao" | "reprovado";
  validacao_status: "aprovada" | "pendente" | "reprovada";
  validacao_motivo: string;
};

function analisar(preco: number, ref: number, lim: { aprov: number; pend: number }): Analise {
  const fator = preco / ref;
  if (fator <= lim.aprov)
    return {
      status: "disponivel",
      validacao_status: "aprovada",
      validacao_motivo: "Preço dentro da faixa de referência da demonstração.",
    };
  if (fator <= lim.pend)
    return {
      status: "pendente_validacao",
      validacao_status: "pendente",
      validacao_motivo: "Preço acima da faixa de referência: aguardando revisão demonstrativa.",
    };
  return {
    status: "reprovado",
    validacao_status: "reprovada",
    validacao_motivo: "Preço fora da faixa de referência da demonstração.",
  };
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------
async function main() {
  console.log("Octupos: restaurando dados de demonstração…");

  const { data: params, error: eParams } = await supabase
    .from("app_settings")
    .select("chave, valor");
  falhar("ler parâmetros", eParams);
  const p = Object.fromEntries((params ?? []).map((r) => [r.chave, Number(r.valor)]));
  const taxaPct = p.taxa_servico_percentual;
  const limites = { aprov: p.analise_limite_aprovada, pend: p.analise_limite_pendente };
  if (!taxaPct || !limites.aprov || !limites.pend) {
    console.error("Parâmetros ausentes em app_settings. As migrations foram aplicadas?");
    process.exit(1);
  }

  const contas = await garantirContas();
  await limpar();

  // Eventos
  const { data: eventos, error: eEv } = await supabase
    .from("events")
    .insert(
      EVENTOS.map((e) => ({
        nome: e.nome,
        descricao: e.descricao,
        data_hora: e.data_hora,
        local: e.local,
        organizador: e.organizador,
        categoria: e.categoria,
        preco_referencia: e.preco_referencia,
        destaque: e.destaque,
      })),
    )
    .select("id, nome");
  falhar("inserir eventos", eEv);
  const eventoId: Record<string, string> = {};
  const eventoRef: Record<string, number> = {};
  for (const e of EVENTOS) {
    eventoId[e.chave] = eventos!.find((x) => x.nome === e.nome)!.id;
    eventoRef[e.chave] = e.preco_referencia;
  }

  // Anúncios
  const linhas = ANUNCIOS.map((a) => ({
    event_id: eventoId[a.evento],
    seller_id: contas[a.vendedor],
    tipo: a.tipo,
    preco: a.preco,
    codigo_demo: codigo("OCT"),
    ...analisar(a.preco, eventoRef[a.evento], limites),
  }));
  const { data: tickets, error: eTk } = await supabase
    .from("tickets")
    .insert(linhas)
    .select("id, codigo_demo");
  falhar("inserir anúncios", eTk);
  const ticketId: Record<string, string> = {};
  ANUNCIOS.forEach((a, i) => {
    ticketId[a.ref] = tickets!.find((t) => t.codigo_demo === linhas[i].codigo_demo)!.id;
  });
  const anuncio = (ref: string) => ANUNCIOS.find((a) => a.ref === ref)!;

  // Pedidos
  const pedidos = [
    { ref: "a1", comprador: "comprador", final: "concluida" },
    { ref: "a4", comprador: "comprador", final: "concluida" },
    { ref: "a7", comprador: "ana", final: "concluida" },
    { ref: "a6", comprador: "comprador", final: "aguardando_pagamento" },
    { ref: "a9", comprador: "carla", final: "cancelada" },
  ] as const;

  for (const ped of pedidos) {
    const a = anuncio(ped.ref);
    const taxa = centavos((a.preco * taxaPct) / 100);
    const total = centavos(a.preco + taxa);

    const { data: ordem, error: eOrd } = await supabase
      .from("orders")
      .insert({
        ticket_id: ticketId[ped.ref],
        buyer_id: contas[ped.comprador],
        seller_id: contas[a.vendedor],
        valor_ingresso: a.preco,
        taxa_percentual: taxaPct,
        taxa_servico: taxa,
        valor_total: total,
        status: ped.final,
        reservado_ate: ped.final === "aguardando_pagamento" ? minutos(p.reserva_minutos) : null,
      })
      .select("id")
      .single();
    falhar("inserir pedido", eOrd);

    const pago = ped.final === "concluida";
    const { error: ePay } = await supabase.from("payments").insert({
      order_id: ordem!.id,
      valor: total,
      status: pago ? "confirmado" : ped.final === "cancelada" ? "cancelado" : "pendente",
      expira_em: minutos(p.reserva_minutos),
      confirmado_em: pago ? new Date().toISOString() : null,
    });
    falhar("inserir pagamento", ePay);

    if (pago) {
      const { error: eTr } = await supabase.from("ticket_transfers").insert({
        order_id: ordem!.id,
        ticket_id: ticketId[ped.ref],
        status: "concluida",
        codigo_novo_ingresso: codigo("OCT"),
        realizado_em: new Date().toISOString(),
      });
      falhar("inserir transferência", eTr);

      const registros = [
        ["pagamento_simulado", "Pix simulado confirmado. Nenhum valor foi cobrado."],
        ["valor_retido", "Valor retido em custódia demonstrativa."],
        ["titularidade_aprovada", "Titularidade aprovada (simulação)."],
        ["liberacao_registrada", "Liberação demonstrativa registrada para o vendedor."],
      ] as const;
      const { error: eRec } = await supabase.from("transaction_records").insert(
        registros.map(([tipo, descricao]) => ({
          order_id: ordem!.id,
          tipo,
          descricao,
          identificador_demo: codigo("SIM"),
        })),
      );
      falhar("inserir registros", eRec);
    }

    // Estado final do ingresso
    const statusIngresso =
      ped.final === "concluida" ? "vendido"
      : ped.final === "aguardando_pagamento" ? "reservado"
      : "disponivel";
    const { error: eUp } = await supabase
      .from("tickets")
      .update({ status: statusIngresso })
      .eq("id", ticketId[ped.ref]);
    falhar("atualizar ingresso", eUp);
  }

  console.log(
    `Pronto: ${CONTAS.length} contas, ${EVENTOS.length} eventos, ` +
      `${ANUNCIOS.length} anúncios, ${pedidos.length} pedidos.`,
  );
}

main().catch((erro: unknown) => {
  console.error("Falha inesperada:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
