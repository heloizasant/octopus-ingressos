/**
 * Modelo de dados do protótipo Octopus — venda primária e revenda interna.
 *
 * O produtor disponibiliza os ingressos (lotes). O Octopus emite cada ingresso,
 * controla a titularidade, a revenda entre usuários e a validação na entrada.
 *
 * TUDO aqui é demonstrativo: pagamentos são simulados e não há registro em
 * blockchain. Os dados ficam no navegador (localStorage).
 */

export type Papel = "usuario" | "produtor" | "admin";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: Papel;
}

export type StatusEvento = "ativo" | "encerrado" | "cancelado";

/** Lote de ingressos disponibilizado pelo produtor (venda primária). */
export interface Lote {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
  vendidos: number;
}

export interface Evento {
  id: string;
  nome: string;
  descricao: string;
  /** ISO 8601. */
  data_hora: string;
  local: string;
  categoria: string;
  produtor_id: string;
  destaque: boolean;
  status: StatusEvento;
  /** Cores da capa gráfica (gradiente). Também é o fundo de reserva quando não há imagem. */
  capa: { de: string; para: string };
  lotes: Lote[];
  /** Cidade e UF, ex.: "Goiânia – GO". */
  cidade?: string;
  /** Imagem de divulgação, arquivo local em /public/images/events. Sem ela, a capa usa o gradiente. */
  imagem?: ImagemEvento;
  /**
   * "real" só para eventos com informações verificadas em fonte pública (`fonte`).
   * Ausente ou "demonstrativo": evento fictício da demonstração.
   */
  origem?: "demonstrativo" | "real";
  fonte?: string;
}

export interface ImagemEvento {
  src: string;
  /** Descrição do conteúdo da imagem. */
  alt: string;
  /** Autoria e licença, quando a imagem não é própria do projeto. */
  credito?: string;
}

/**
 * valido: pode entrar · em_revenda: anunciado, bloqueado para entrada ·
 * utilizado: entrada já registrada · cancelado: anulado pelo produtor.
 */
export type StatusIngresso = "valido" | "em_revenda" | "utilizado" | "cancelado";

/** Cada dono que o ingresso já teve. Só uma titularidade fica vigente. */
export interface Titularidade {
  id: string;
  titular_id: string;
  /** Código do QR desta titularidade. Ao transferir, o código anterior deixa de valer. */
  codigo: string;
  inicio: string;
  fim: string | null;
  status: "vigente" | "invalidada";
  origem: "compra_primaria" | "revenda";
  pedido_id: string;
  /** Identificador do registro interno (SIM-…). Não é transação de blockchain. */
  registro_demo: string;
}

export interface Ingresso {
  id: string;
  event_id: string;
  lote_id: string;
  tipo: string;
  /** Preço original do lote (valor de face). */
  valor_face: number;
  titular_id: string;
  codigo_atual: string;
  status: StatusIngresso;
  emitido_em: string;
  utilizado_em: string | null;
  titularidades: Titularidade[];
}

export type StatusAnuncio = "ativo" | "vendido" | "cancelado";

export interface Anuncio {
  id: string;
  ingresso_id: string;
  vendedor_id: string;
  preco: number;
  status: StatusAnuncio;
  criado_em: string;
  encerrado_em: string | null;
}

export type TipoPedido = "primaria" | "revenda";

export type TipoRegistro =
  | "pagamento_simulado"
  | "pagamento_confirmado"
  | "valor_retido"
  | "ingresso_emitido"
  | "titularidade_invalidada"
  | "titularidade_registrada"
  | "taxas_registradas"
  | "repasse_liberado";

export interface Registro {
  id: string;
  tipo: TipoRegistro;
  /** Sempre no formato SIM-XXXX-XXXX: nunca parece transação real. */
  identificador_demo: string;
  descricao: string;
  valor: number | null;
  registrado_em: string;
}

export interface Pedido {
  id: string;
  tipo: TipoPedido;
  comprador_id: string;
  /** Produtor (venda primária) ou titular anterior (revenda). */
  vendedor_id: string;
  event_id: string;
  ingresso_id: string;
  lote_id: string | null;
  anuncio_id: string | null;
  valor_base: number;
  buyer_fee_rate: number;
  seller_fee_rate: number;
  buyer_fee: number;
  seller_fee: number;
  valor_total: number;
  valor_liquido_vendedor: number;
  pagamento: { metodo: "pix_simulado"; codigo_pix: string; confirmado_em: string };
  registros: Registro[];
  criado_em: string;
}

export type ResultadoValidacao =
  | "valido"
  | "invalidado"
  | "utilizado"
  | "bloqueado_revenda"
  | "cancelado"
  | "inexistente";

export interface Validacao {
  id: string;
  codigo: string;
  ingresso_id: string | null;
  resultado: ResultadoValidacao;
  em: string;
  operador_id: string | null;
  entrada_registrada: boolean;
}

export interface EstadoDemo {
  versao: number;
  usuarios: Usuario[];
  /** Usuário logado (autenticação simulada, sem senha). */
  sessao: string | null;
  eventos: Evento[];
  ingressos: Ingresso[];
  anuncios: Anuncio[];
  pedidos: Pedido[];
  validacoes: Validacao[];
}
