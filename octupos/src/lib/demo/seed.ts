/**
 * Dados fictícios do protótipo Octopus: produtores, eventos com lotes,
 * ingressos emitidos, anúncios de revenda e uma revenda já concluída.
 * Nenhuma conta, evento ou pagamento é real.
 */
import type { EstadoDemo, Evento, Usuario } from "@/lib/domain/types";
import {
  anunciarRevenda,
  comprarLote,
  comprarRevenda,
  entrar,
  type Resultado,
} from "./actions";

/** Mudar a versão descarta dados antigos guardados no navegador. */
export const VERSAO_ESTADO = 7; // 7: quatro eventos em destaque com imagens enviadas pela equipe

const DIA_MS = 86_400_000;
const SEMANA_MS = 7 * DIA_MS;
/** O primeiro evento (Good Times) sempre fica a pelo menos 7 dias. */
const ANTECEDENCIA_MINIMA_MS = 7 * DIA_MS;

export const USUARIOS: Usuario[] = [
  { id: "usr-admin", nome: "Admin Octopus", email: "admin@octupos.test", role: "admin" },
  { id: "usr-prod-atletica", nome: "Atlética Integrada", email: "atletica@octupos.test", role: "produtor" },
  { id: "usr-prod-arena", nome: "Arena Sul Produções", email: "arena@octupos.test", role: "produtor" },
  { id: "usr-comprador", nome: "Diego Rocha", email: "comprador@octupos.test", role: "usuario" },
  { id: "usr-ana", nome: "Ana Souza", email: "ana@octupos.test", role: "usuario" },
  { id: "usr-bruno", nome: "Bruno Lima", email: "bruno@octupos.test", role: "usuario" },
  { id: "usr-carla", nome: "Carla Mendes", email: "carla@octupos.test", role: "usuario" },
];

interface EventoBase extends Omit<Evento, "data_hora" | "status"> {
  data: string;
}

const lote = (id: string, nome: string, preco: number, quantidade: number) => ({ id, nome, preco, quantidade, vendidos: 0 });

const EVENTOS: EventoBase[] = [
  {
    id: "evt-calourus",
    nome: "Good Times by Illusionize",
    descricao: "Noite de música eletrônica com pista e DJs convidados. Dados fictícios de demonstração: não é um evento confirmado.",
    data: "2026-11-28T22:00:00-03:00",
    local: "Espaço Cerrado",
    cidade: "Goiânia – GO",
    categoria: "Música eletrônica",
    produtor_id: "usr-prod-atletica",
    destaque: true,
    capa: { de: "#0e4a55", para: "#e07a3f" },
    imagem: { src: "/images/events/terceiros/good-times.jpg", alt: "DJ sorrindo na pista, com o público ao fundo", credito: "Imagem de terceiros, uso restrito à demonstração local (fora do repositório)" },
    origem: "demonstrativo",
    lotes: [lote("lot-cal-pista", "Pista", 60, 150), lote("lot-cal-camarote", "Camarote", 90, 40)],
  },
  {
    id: "evt-arena",
    nome: "Sertanejo no Cerrado",
    descricao: "Noite de música sertaneja com arena iluminada e área VIP. Dados fictícios de demonstração: não é um evento confirmado.",
    data: "2026-12-11T21:00:00-03:00",
    local: "Arena Sul",
    cidade: "Goiânia – GO",
    categoria: "Sertanejo",
    produtor_id: "usr-prod-arena",
    destaque: true,
    capa: { de: "#14102a", para: "#b45309" },
    imagem: { src: "/images/events/terceiros/sertanejo-no-cerrado.jpg", alt: "Cantor de chapéu na arena, com a arquibancada iluminada por celulares", credito: "Imagem de terceiros, uso restrito à demonstração local (fora do repositório)" },
    origem: "demonstrativo",
    lotes: [
      lote("lot-are-pista", "Pista", 150, 300),
      lote("lot-are-meia", "Meia-entrada", 75, 100),
      lote("lot-are-vip", "Área VIP", 280, 30),
    ],
  },
  {
    id: "evt-primavera",
    nome: "Electronic Experience",
    descricao: "Festival de música eletrônica com cenografia iluminada e pista ao ar livre. Dados fictícios de demonstração: não é um evento confirmado.",
    data: "2026-12-20T20:00:00-03:00",
    local: "Parque da Cidade",
    cidade: "Senador Canedo – GO",
    categoria: "Música eletrônica",
    produtor_id: "usr-prod-arena",
    destaque: true,
    capa: { de: "#5b21b6", para: "#ec4899" },
    imagem: { src: "/images/events/terceiros/electronic-experience.jpg", alt: "DJ de costas com os braços abertos diante de uma pista lotada", credito: "Imagem de terceiros, uso restrito à demonstração local (fora do repositório)" },
    origem: "demonstrativo",
    lotes: [lote("lot-pri-inteira", "Inteira", 90, 200), lote("lot-pri-meia", "Meia-entrada", 45, 100)],
  },
  {
    id: "evt-sarau",
    nome: "Pagode na Praça",
    descricao: "Tarde de pagode ao ar livre com grupos convidados. Dados fictícios de demonstração: não é um evento confirmado.",
    data: "2026-12-05T16:00:00-03:00",
    local: "Praça Central",
    cidade: "Aparecida de Goiânia – GO",
    categoria: "Pagode",
    produtor_id: "usr-prod-atletica",
    destaque: true,
    capa: { de: "#3b0a8c", para: "#ec4899" },
    imagem: { src: "/images/events/terceiros/pagode-na-praca.jpg", alt: "Grupo de pagode no palco com o público de mãos levantadas", credito: "Imagem de terceiros, uso restrito à demonstração local (fora do repositório)" },
    origem: "demonstrativo",
    lotes: [lote("lot-sar-plateia", "Pista", 40, 120)],
  },
  {
    id: "evt-futsal",
    nome: "Arena 360 Sertaneja",
    descricao: "Sertanejo e música brasileira num palco circular no centro do público. Evento fictício.",
    data: "2027-01-23T20:00:00-03:00",
    local: "Arena Norte",
    cidade: "Goiânia – GO",
    categoria: "Sertanejo e música brasileira",
    produtor_id: "usr-prod-atletica",
    destaque: false,
    capa: { de: "#c2410c", para: "#f6a04d" },
    imagem: { src: "/images/events/arena-360-sertaneja.jpg", alt: "Ilustração de palco circular com público ao redor e raios de luz alaranjados", credito: "Arte ilustrativa do Octopus (demonstração)" },
    origem: "demonstrativo",
    lotes: [lote("lot-fut-arquibancada", "Pista 360", 120, 400)],
  },
  {
    id: "evt-gastro",
    nome: "Cerrado Noise Rock",
    descricao: "Festival de rock independente em dois dias, com bandas de vários estilos. Evento fictício.",
    data: "2027-02-06T16:00:00-03:00",
    local: "Praça Central",
    cidade: "Goiânia – GO",
    categoria: "Rock",
    produtor_id: "usr-prod-arena",
    destaque: false,
    capa: { de: "#1d4ed8", para: "#ec4899" },
    imagem: { src: "/images/events/cerrado-noise-rock.jpg", alt: "Ilustração de guitarra rosa entre amplificadores, com raios e moldura em zigue-zague", credito: "Arte ilustrativa do Octopus (demonstração)" },
    origem: "demonstrativo",
    lotes: [lote("lot-gas-passaporte", "Passaporte 2 dias", 160, 250)],
  },
];

/** Datas móveis: avança semanas inteiras quando o primeiro evento fica a menos de 7 dias. */
export function semanasDeDeslocamento(agora: number): number {
  const base = new Date(EVENTOS[0].data).getTime();
  const limite = agora + ANTECEDENCIA_MINIMA_MS;
  return base >= limite ? 0 : Math.ceil((limite - base) / SEMANA_MS);
}

function aplicar<T>(r: Resultado<T>): { estado: EstadoDemo; valor: T } {
  if (!r.ok) throw new Error(`Falha ao montar a demonstração: ${r.erro}`);
  return r;
}

/** Estado completo da demonstração. */
export function criarEstadoInicial(agora: number = Date.now()): EstadoDemo {
  const desloc = semanasDeDeslocamento(agora) * SEMANA_MS;

  let estado: EstadoDemo = {
    versao: VERSAO_ESTADO,
    usuarios: structuredClone(USUARIOS),
    sessao: null,
    eventos: EVENTOS.map(({ data, ...resto }) => ({
      ...structuredClone(resto),
      data_hora: new Date(new Date(data).getTime() + desloc).toISOString(),
      status: "ativo" as const,
    })),
    ingressos: [],
    anuncios: [],
    pedidos: [],
    validacoes: [],
  };

  const como = (usuario: string) => {
    estado = aplicar(entrar(estado, usuario)).estado;
  };
  const comprar = (usuario: string, evento: string, loteId: string, diasAtras: number): string => {
    como(usuario);
    const r = aplicar(comprarLote(estado, evento, loteId, agora - diasAtras * DIA_MS));
    estado = r.estado;
    return r.valor.ingresso.id;
  };
  const anunciar = (usuario: string, ingresso: string, preco: number, diasAtras: number): string => {
    como(usuario);
    const r = aplicar(anunciarRevenda(estado, ingresso, preco, agora - diasAtras * DIA_MS));
    estado = r.estado;
    return r.valor.id;
  };

  // Compras na venda primária (ingressos emitidos pelo Octopus)
  comprar("usr-comprador", "evt-calourus", "lot-cal-pista", 6);
  comprar("usr-comprador", "evt-arena", "lot-are-pista", 5);
  comprar("usr-comprador", "evt-primavera", "lot-pri-meia", 4);
  const ana = comprar("usr-ana", "evt-calourus", "lot-cal-pista", 6);
  const bruno = comprar("usr-bruno", "evt-calourus", "lot-cal-camarote", 5);
  comprar("usr-bruno", "evt-sarau", "lot-sar-plateia", 3);
  const carlaArena = comprar("usr-carla", "evt-arena", "lot-are-pista", 4);
  const carlaPrimavera = comprar("usr-carla", "evt-primavera", "lot-pri-inteira", 4);

  // Anúncios de revenda ativos
  anunciar("usr-ana", ana, 66, 2);
  anunciar("usr-bruno", bruno, 95, 2);
  anunciar("usr-carla", carlaArena, 160, 1);

  // Revenda já concluída: Carla vendeu para Ana; o código da Carla foi invalidado.
  const anuncioPrimavera = anunciar("usr-carla", carlaPrimavera, 92, 2);
  como("usr-ana");
  estado = aplicar(comprarRevenda(estado, anuncioPrimavera, agora - 1 * DIA_MS)).estado;

  return { ...estado, sessao: null };
}
