/**
 * Regras de negócio do protótipo Octopus (venda primária + revenda interna),
 * como funções puras: recebem o estado e devolvem um estado novo ou um erro.
 * Testadas por `npm run test:fluxos`, sem navegador, banco ou rede.
 *
 * Pagamentos são SIMULADOS. Não há registro em blockchain.
 */
import { BUYER_FEE_RATE, calcularValores, centavos, SELLER_FEE_RATE, tetoRevenda } from "@/lib/domain/fees";
import type {
  Anuncio,
  EstadoDemo,
  Evento,
  Ingresso,
  Lote,
  Pedido,
  Registro,
  ResultadoValidacao,
  TipoRegistro,
  Titularidade,
  Usuario,
  Validacao,
} from "@/lib/domain/types";

export type Resultado<T = undefined> =
  | { ok: true; estado: EstadoDemo; valor: T }
  | { ok: false; erro: string };

const falha = (erro: string): { ok: false; erro: string } => ({ ok: false, erro });
const sucesso = <T>(estado: EstadoDemo, valor: T): Resultado<T> => ({ ok: true, estado, valor });
const clonar = (estado: EstadoDemo): EstadoDemo => structuredClone(estado);
const iso = (t: number) => new Date(t).toISOString();

// ---------------------------------------------------------------------------
// Identificadores
// ---------------------------------------------------------------------------
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function bloco(): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return s;
}

/** `OCT-XXXX-XXXX` (código do ingresso), `SIM-…` (registro interno), `PIX-…` (Pix fictício). */
export const gerarCodigo = (prefixo: "OCT" | "SIM" | "PIX"): string => `${prefixo}-${bloco()}-${bloco()}`;

export const novoId = (prefixo: string): string => `${prefixo}-${Date.now().toString(36)}${bloco().toLowerCase()}`;

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------
export const usuarioAtual = (e: EstadoDemo): Usuario | null => e.usuarios.find((u) => u.id === e.sessao) ?? null;
export const usuarioPorId = (e: EstadoDemo, id: string) => e.usuarios.find((x) => x.id === id);
export const eventoPorId = (e: EstadoDemo, id: string) => e.eventos.find((x) => x.id === id);
export const ingressoPorId = (e: EstadoDemo, id: string) => e.ingressos.find((x) => x.id === id);
export const anuncioPorId = (e: EstadoDemo, id: string) => e.anuncios.find((x) => x.id === id);
export const pedidoPorId = (e: EstadoDemo, id: string) => e.pedidos.find((x) => x.id === id);

export const eventoEstaAberto = (ev: Evento, agora: number): boolean =>
  ev.status === "ativo" && new Date(ev.data_hora).getTime() > agora;

export const eventosFuturos = (e: EstadoDemo, agora: number): Evento[] =>
  e.eventos.filter((ev) => eventoEstaAberto(ev, agora)).sort((a, b) => a.data_hora.localeCompare(b.data_hora));

export const disponiveisNoLote = (l: Lote): number => Math.max(0, l.quantidade - l.vendidos);

export const ingressosOficiaisDisponiveis = (ev: Evento): number =>
  ev.lotes.reduce((s, l) => s + disponiveisNoLote(l), 0);

export const menorPrecoOficial = (ev: Evento): number | null => {
  const precos = ev.lotes.filter((l) => disponiveisNoLote(l) > 0).map((l) => l.preco);
  return precos.length ? Math.min(...precos) : null;
};

export const anunciosAtivosDoEvento = (e: EstadoDemo, eventId: string): Anuncio[] =>
  e.anuncios.filter((a) => a.status === "ativo" && ingressoPorId(e, a.ingresso_id)?.event_id === eventId);

export const anuncioAtivoDoIngresso = (e: EstadoDemo, ingressoId: string): Anuncio | undefined =>
  e.anuncios.find((a) => a.ingresso_id === ingressoId && a.status === "ativo");

/** Ingressos de que o usuário é o titular atual. */
export const ingressosDoTitular = (e: EstadoDemo, userId: string): Ingresso[] =>
  e.ingressos.filter((t) => t.titular_id === userId);

/** Ingressos que o usuário já teve e repassou (titularidade invalidada). */
export const ingressosRepassados = (e: EstadoDemo, userId: string): Ingresso[] =>
  e.ingressos.filter(
    (t) => t.titular_id !== userId && t.titularidades.some((h) => h.titular_id === userId && h.status === "invalidada"),
  );

export const titularidadeVigente = (t: Ingresso): Titularidade =>
  t.titularidades.find((h) => h.status === "vigente")!;

/** Localiza qualquer código já emitido (vigente ou antigo). */
export function buscarPorCodigo(e: EstadoDemo, codigo: string): { ingresso: Ingresso; titularidade: Titularidade } | null {
  const alvo = codigo.trim().toUpperCase();
  for (const ingresso of e.ingressos) {
    const titularidade = ingresso.titularidades.find((h) => h.codigo === alvo);
    if (titularidade) return { ingresso, titularidade };
  }
  return null;
}

/** Estado do código para a portaria. Não altera nada. */
export function consultarCodigo(e: EstadoDemo, codigo: string): {
  resultado: ResultadoValidacao;
  ingresso: Ingresso | null;
  titularidade: Titularidade | null;
} {
  const achado = buscarPorCodigo(e, codigo);
  if (!achado) return { resultado: "inexistente", ingresso: null, titularidade: null };
  const { ingresso, titularidade } = achado;
  let resultado: ResultadoValidacao;
  if (titularidade.status === "invalidada") resultado = "invalidado";
  else if (ingresso.status === "utilizado") resultado = "utilizado";
  else if (ingresso.status === "em_revenda") resultado = "bloqueado_revenda";
  else if (ingresso.status === "cancelado") resultado = "cancelado";
  else resultado = "valido";
  return { resultado, ingresso, titularidade };
}

// ---------------------------------------------------------------------------
// Sessão simulada (sem senha: nenhuma credencial é coletada)
// ---------------------------------------------------------------------------
export function entrar(estado: EstadoDemo, userId: string): Resultado {
  if (!usuarioPorId(estado, userId)) return falha("Conta não encontrada.");
  return sucesso({ ...estado, sessao: userId }, undefined);
}

export function entrarPorEmail(estado: EstadoDemo, email: string): Resultado {
  const usuario = estado.usuarios.find((u) => u.email === email.trim().toLowerCase());
  if (!usuario) return falha("Nenhuma conta de demonstração com este e-mail. Crie uma em Cadastro.");
  return sucesso({ ...estado, sessao: usuario.id }, undefined);
}

export function sair(estado: EstadoDemo): Resultado {
  return sucesso({ ...estado, sessao: null }, undefined);
}

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cadastrar(estado: EstadoDemo, nome: string, email: string): Resultado<Usuario> {
  const n = nome.trim();
  const m = email.trim().toLowerCase();
  if (n.length < 2 || n.length > 100) return falha("Informe um nome com 2 a 100 caracteres.");
  if (!REGEX_EMAIL.test(m)) return falha("Informe um e-mail válido.");
  if (estado.usuarios.some((u) => u.email === m)) return falha("Já existe uma conta com este e-mail.");
  const usuario: Usuario = { id: novoId("usr"), nome: n, email: m, role: "usuario" };
  const novo = clonar(estado);
  novo.usuarios.push(usuario);
  novo.sessao = usuario.id;
  return sucesso(novo, usuario);
}

// ---------------------------------------------------------------------------
// Compras
// ---------------------------------------------------------------------------
function registro(tipo: TipoRegistro, descricao: string, valor: number | null, agora: number): Registro {
  return { id: novoId("rec"), tipo, identificador_demo: gerarCodigo("SIM"), descricao, valor, registrado_em: iso(agora) };
}

function novaTitularidade(
  titular: string,
  origem: Titularidade["origem"],
  pedido: string,
  agora: number,
): Titularidade {
  return {
    id: novoId("tit"),
    titular_id: titular,
    codigo: gerarCodigo("OCT"),
    inicio: iso(agora),
    fim: null,
    status: "vigente",
    origem,
    pedido_id: pedido,
    registro_demo: gerarCodigo("SIM"),
  };
}

function montarPedido(
  tipo: Pedido["tipo"],
  comprador: string,
  vendedor: string,
  eventId: string,
  ingressoId: string,
  preco: number,
  agora: number,
  extra: { lote_id?: string; anuncio_id?: string },
): Pedido {
  const v = calcularValores(preco, BUYER_FEE_RATE, SELLER_FEE_RATE);
  return {
    id: novoId("ped"),
    tipo,
    comprador_id: comprador,
    vendedor_id: vendedor,
    event_id: eventId,
    ingresso_id: ingressoId,
    lote_id: extra.lote_id ?? null,
    anuncio_id: extra.anuncio_id ?? null,
    valor_base: preco,
    buyer_fee_rate: BUYER_FEE_RATE,
    seller_fee_rate: SELLER_FEE_RATE,
    ...v,
    pagamento: { metodo: "pix_simulado", codigo_pix: gerarCodigo("PIX"), confirmado_em: iso(agora) },
    registros: [],
    criado_em: iso(agora),
  };
}

/**
 * VENDA PRIMÁRIA: o comprador paga (simulado) e o Octopus EMITE o ingresso,
 * já associado a ele, com um código único.
 */
export function comprarLote(
  estado: EstadoDemo,
  eventId: string,
  loteId: string,
  agora: number,
): Resultado<{ pedido: Pedido; ingresso: Ingresso }> {
  const comprador = usuarioAtual(estado);
  if (!comprador) return falha("Entre na sua conta para comprar.");
  const evento = eventoPorId(estado, eventId);
  if (!evento || !eventoEstaAberto(evento, agora)) return falha("Este evento não está mais à venda.");
  if (evento.produtor_id === comprador.id) return falha("O produtor não compra ingressos do próprio evento.");
  const lote = evento.lotes.find((l) => l.id === loteId);
  if (!lote) return falha("Lote não encontrado.");
  if (disponiveisNoLote(lote) <= 0) return falha("Este lote está esgotado.");

  const novo = clonar(estado);
  const ev = novo.eventos.find((x) => x.id === eventId)!;
  ev.lotes.find((l) => l.id === loteId)!.vendidos += 1;

  const ingressoId = novoId("ing");
  const pedido = montarPedido("primaria", comprador.id, evento.produtor_id, eventId, ingressoId, lote.preco, agora, {
    lote_id: loteId,
  });
  const titularidade = novaTitularidade(comprador.id, "compra_primaria", pedido.id, agora);
  const ingresso: Ingresso = {
    id: ingressoId,
    event_id: eventId,
    lote_id: loteId,
    tipo: lote.nome,
    valor_face: lote.preco,
    titular_id: comprador.id,
    codigo_atual: titularidade.codigo,
    status: "valido",
    emitido_em: iso(agora),
    utilizado_em: null,
    titularidades: [titularidade],
  };
  pedido.registros.push(
    registro("pagamento_simulado", "Pix simulado enviado pelo comprador. Nenhum valor foi cobrado.", pedido.valor_total, agora),
    registro("pagamento_confirmado", "Pagamento confirmado (simulação).", pedido.valor_total, agora),
    registro("ingresso_emitido", `Ingresso emitido pelo Octopus com o código ${titularidade.codigo}.`, null, agora),
    registro("titularidade_registrada", `Titularidade registrada para ${comprador.nome}.`, null, agora),
    registro("taxas_registradas", "Taxas demonstrativas da plataforma (comprador + produtor).", centavos(pedido.buyer_fee + pedido.seller_fee), agora),
    registro("repasse_liberado", "Repasse demonstrativo ao produtor.", pedido.valor_liquido_vendedor, agora),
  );
  novo.ingressos.push(ingresso);
  novo.pedidos.push(pedido);
  return sucesso(novo, { pedido, ingresso });
}

/** O titular anuncia o ingresso para revenda. Enquanto anunciado, ele não libera entrada. */
export function anunciarRevenda(estado: EstadoDemo, ingressoId: string, preco: number, agora: number): Resultado<Anuncio> {
  const usuario = usuarioAtual(estado);
  const ingresso = ingressoPorId(estado, ingressoId);
  if (!usuario || !ingresso) return falha("Ingresso não encontrado.");
  if (ingresso.titular_id !== usuario.id) return falha("Só o titular atual pode anunciar este ingresso.");
  if (ingresso.status === "em_revenda") return falha("Este ingresso já está anunciado.");
  if (ingresso.status !== "valido") return falha("Este ingresso não pode ser revendido.");
  const evento = eventoPorId(estado, ingresso.event_id);
  if (!evento || !eventoEstaAberto(evento, agora)) return falha("O evento já aconteceu ou foi cancelado.");
  if (!Number.isFinite(preco) || preco <= 0) return falha("Informe um preço maior que zero.");
  const teto = tetoRevenda(ingresso.valor_face);
  if (preco > teto) return falha(`O preço máximo de revenda é 1,5× o valor original (R$ ${teto.toFixed(2).replace(".", ",")}).`);

  const anuncio: Anuncio = {
    id: novoId("anc"),
    ingresso_id: ingressoId,
    vendedor_id: usuario.id,
    preco: centavos(preco),
    status: "ativo",
    criado_em: iso(agora),
    encerrado_em: null,
  };
  const novo = clonar(estado);
  novo.anuncios.push(anuncio);
  novo.ingressos.find((t) => t.id === ingressoId)!.status = "em_revenda";
  return sucesso(novo, anuncio);
}

export function cancelarAnuncio(estado: EstadoDemo, anuncioId: string, agora: number): Resultado {
  const usuario = usuarioAtual(estado);
  const anuncio = anuncioPorId(estado, anuncioId);
  if (!usuario || !anuncio) return falha("Anúncio não encontrado.");
  if (anuncio.vendedor_id !== usuario.id) return falha("Só quem anunciou pode cancelar.");
  if (anuncio.status !== "ativo") return falha("Este anúncio não está ativo.");
  const novo = clonar(estado);
  const a = novo.anuncios.find((x) => x.id === anuncioId)!;
  a.status = "cancelado";
  a.encerrado_em = iso(agora);
  novo.ingressos.find((t) => t.id === a.ingresso_id)!.status = "valido";
  return sucesso(novo, undefined);
}

/**
 * REVENDA INTERNA: o comprador paga (simulado); o Octopus INVALIDA a
 * titularidade anterior (o código antigo deixa de valer), REGISTRA a nova
 * titularidade com código novo e libera o repasse ao vendedor.
 */
export function comprarRevenda(
  estado: EstadoDemo,
  anuncioId: string,
  agora: number,
): Resultado<{ pedido: Pedido; ingresso: Ingresso }> {
  const comprador = usuarioAtual(estado);
  if (!comprador) return falha("Entre na sua conta para comprar.");
  const anuncio = anuncioPorId(estado, anuncioId);
  if (!anuncio || anuncio.status !== "ativo") return falha("Este anúncio não está mais disponível.");
  if (anuncio.vendedor_id === comprador.id) return falha("Você não pode comprar o seu próprio anúncio.");
  const ingresso = ingressoPorId(estado, anuncio.ingresso_id);
  if (!ingresso || ingresso.status !== "em_revenda" || ingresso.titular_id !== anuncio.vendedor_id)
    return falha("O ingresso deste anúncio não está disponível.");
  const evento = eventoPorId(estado, ingresso.event_id);
  if (!evento || !eventoEstaAberto(evento, agora)) return falha("O evento já aconteceu ou foi cancelado.");
  const vendedor = usuarioPorId(estado, anuncio.vendedor_id);

  const novo = clonar(estado);
  const t = novo.ingressos.find((x) => x.id === ingresso.id)!;
  const a = novo.anuncios.find((x) => x.id === anuncioId)!;
  const pedido = montarPedido("revenda", comprador.id, anuncio.vendedor_id, t.event_id, t.id, anuncio.preco, agora, {
    anuncio_id: anuncioId,
  });

  const anterior = t.titularidades.find((h) => h.status === "vigente")!;
  anterior.status = "invalidada";
  anterior.fim = iso(agora);
  const nova = novaTitularidade(comprador.id, "revenda", pedido.id, agora);
  t.titularidades.push(nova);
  t.titular_id = comprador.id;
  t.codigo_atual = nova.codigo;
  t.status = "valido";
  a.status = "vendido";
  a.encerrado_em = iso(agora);

  pedido.registros.push(
    registro("pagamento_simulado", "Pix simulado enviado pelo comprador. Nenhum valor foi cobrado.", pedido.valor_total, agora),
    registro("pagamento_confirmado", "Pagamento confirmado (simulação).", pedido.valor_total, agora),
    registro("valor_retido", "Valor retido pelo Octopus até a troca de titularidade.", pedido.valor_total, agora),
    registro(
      "titularidade_invalidada",
      `Titularidade de ${vendedor?.nome ?? "vendedor"} invalidada: o código ${anterior.codigo} deixou de valer.`,
      null,
      agora,
    ),
    registro("titularidade_registrada", `Nova titularidade para ${comprador.nome} com o código ${nova.codigo}.`, null, agora),
    registro("taxas_registradas", "Taxas demonstrativas da plataforma (comprador + vendedor).", centavos(pedido.buyer_fee + pedido.seller_fee), agora),
    registro("repasse_liberado", "Repasse demonstrativo ao vendedor, após a troca de titularidade.", pedido.valor_liquido_vendedor, agora),
  );
  novo.pedidos.push(pedido);
  return sucesso(novo, { pedido, ingresso: t });
}

// ---------------------------------------------------------------------------
// Validação na entrada (portaria)
// ---------------------------------------------------------------------------
function podeOperarPortaria(estado: EstadoDemo, ingresso: Ingresso | null): boolean {
  const u = usuarioAtual(estado);
  if (!u) return false;
  if (u.role === "admin") return true;
  if (u.role !== "produtor") return false;
  return !ingresso || eventoPorId(estado, ingresso.event_id)?.produtor_id === u.id;
}

/** Consulta o código e guarda a consulta no histórico da portaria. */
export function validarCodigo(estado: EstadoDemo, codigo: string, agora: number): Resultado<Validacao> {
  const alvo = codigo.trim().toUpperCase();
  if (!alvo) return falha("Informe o código do ingresso.");
  const { resultado, ingresso } = consultarCodigo(estado, alvo);
  const validacao: Validacao = {
    id: novoId("val"),
    codigo: alvo,
    ingresso_id: ingresso?.id ?? null,
    resultado,
    em: iso(agora),
    operador_id: estado.sessao,
    entrada_registrada: false,
  };
  const novo = clonar(estado);
  novo.validacoes.unshift(validacao);
  novo.validacoes = novo.validacoes.slice(0, 50);
  return sucesso(novo, validacao);
}

/** Registra a entrada: só com código vigente de ingresso válido, pelo produtor do evento ou admin. */
export function registrarEntrada(estado: EstadoDemo, codigo: string, agora: number): Resultado<Validacao> {
  const { resultado, ingresso } = consultarCodigo(estado, codigo);
  if (!podeOperarPortaria(estado, ingresso))
    return falha("Só o produtor do evento (ou a administração) pode registrar entradas.");
  if (resultado !== "valido" || !ingresso) return falha("Entrada recusada: o código não está válido.");

  const novo = clonar(estado);
  const t = novo.ingressos.find((x) => x.id === ingresso.id)!;
  t.status = "utilizado";
  t.utilizado_em = iso(agora);
  const validacao: Validacao = {
    id: novoId("val"),
    codigo: codigo.trim().toUpperCase(),
    ingresso_id: t.id,
    resultado: "valido",
    em: iso(agora),
    operador_id: estado.sessao,
    entrada_registrada: true,
  };
  novo.validacoes.unshift(validacao);
  return sucesso(novo, validacao);
}

// ---------------------------------------------------------------------------
// Produtor
// ---------------------------------------------------------------------------
export interface DadosLote {
  nome: string;
  preco: number;
  quantidade: number;
}

export interface DadosEvento {
  nome: string;
  descricao: string;
  data_hora: string;
  local: string;
  categoria: string;
  capa: Evento["capa"];
  lotes: DadosLote[];
}

export function criarEvento(estado: EstadoDemo, d: DadosEvento, agora: number): Resultado<Evento> {
  const produtor = usuarioAtual(estado);
  if (!produtor || (produtor.role !== "produtor" && produtor.role !== "admin"))
    return falha("Só contas de produtor podem cadastrar eventos.");
  if (d.nome.trim().length < 2 || d.nome.length > 150) return falha("Informe o nome do evento (2 a 150 caracteres).");
  if (!d.local.trim()) return falha("Informe o local.");
  if (!d.categoria.trim()) return falha("Informe a categoria.");
  const data = new Date(d.data_hora).getTime();
  if (Number.isNaN(data)) return falha("Informe uma data e hora válidas.");
  if (data <= agora) return falha("A data do evento precisa estar no futuro.");
  if (d.lotes.length < 1 || d.lotes.length > 4) return falha("Cadastre de 1 a 4 lotes.");
  for (const l of d.lotes) {
    if (!l.nome.trim()) return falha("Dê um nome a cada lote.");
    if (!Number.isFinite(l.preco) || l.preco <= 0) return falha(`O preço do lote “${l.nome}” deve ser maior que zero.`);
    if (!Number.isInteger(l.quantidade) || l.quantidade < 1 || l.quantidade > 5000)
      return falha(`A quantidade do lote “${l.nome}” deve ser de 1 a 5.000.`);
  }
  const evento: Evento = {
    id: novoId("evt"),
    nome: d.nome.trim(),
    descricao: d.descricao.trim(),
    data_hora: new Date(data).toISOString(),
    local: d.local.trim(),
    categoria: d.categoria.trim(),
    produtor_id: produtor.id,
    destaque: false,
    status: "ativo",
    capa: d.capa,
    lotes: d.lotes.map((l) => ({ id: novoId("lot"), nome: l.nome.trim(), preco: centavos(l.preco), quantidade: l.quantidade, vendidos: 0 })),
  };
  const novo = clonar(estado);
  novo.eventos.push(evento);
  return sucesso(novo, evento);
}
