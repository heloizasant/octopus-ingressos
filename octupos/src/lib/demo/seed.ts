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
export const VERSAO_ESTADO = 4; // 4: venda primária + revenda interna

const DIA_MS = 86_400_000;
const SEMANA_MS = 7 * DIA_MS;
/** A Virada Calourus (primeiro evento em destaque) sempre fica a pelo menos 7 dias. */
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
    nome: "Festa Universitária — Virada Calourus",
    descricao: "A festa de boas-vindas aos calouros, com DJs e atrações da cena universitária. Evento fictício.",
    data: "2026-11-28T22:00:00-03:00", // sábado
    local: "Centro de Eventos",
    categoria: "Festa universitária",
    produtor_id: "usr-prod-atletica",
    destaque: true,
    capa: { de: "#5B4FE9", para: "#9B8CFF" },
    lotes: [lote("lot-cal-pista", "Pista", 60, 150), lote("lot-cal-camarote", "Camarote", 90, 40)],
  },
  {
    id: "evt-arena",
    nome: "Show de Encerramento — Arena Sul",
    descricao: "Show de encerramento da temporada com artistas convidados. Evento fictício.",
    data: "2026-12-11T21:00:00-03:00", // sexta-feira
    local: "Arena Sul",
    categoria: "Show",
    produtor_id: "usr-prod-arena",
    destaque: true,
    capa: { de: "#1F2937", para: "#5B4FE9" },
    lotes: [
      lote("lot-are-pista", "Pista", 150, 300),
      lote("lot-are-meia", "Meia-entrada", 75, 100),
      lote("lot-are-vip", "Área VIP", 280, 30),
    ],
  },
  {
    id: "evt-primavera",
    nome: "Festival de Primavera",
    descricao: "Festival ao ar livre com música, food trucks e feira criativa. Evento fictício.",
    data: "2026-12-20T16:00:00-03:00", // domingo
    local: "Parque da Cidade",
    categoria: "Festival",
    produtor_id: "usr-prod-arena",
    destaque: true,
    capa: { de: "#EC4899", para: "#F59E0B" },
    lotes: [lote("lot-pri-inteira", "Inteira", 90, 200), lote("lot-pri-meia", "Meia-entrada", 45, 100)],
  },
  {
    id: "evt-sarau",
    nome: "Sarau de Verão",
    descricao: "Noite de música acústica e poesia no teatro. Evento fictício.",
    data: "2027-01-09T20:00:00-03:00",
    local: "Teatro Municipal",
    categoria: "Teatro e música",
    produtor_id: "usr-prod-atletica",
    destaque: false,
    capa: { de: "#0EA5E9", para: "#5B4FE9" },
    lotes: [lote("lot-sar-plateia", "Plateia", 40, 120)],
  },
  {
    id: "evt-futsal",
    nome: "Copa Universitária de Futsal — Final",
    descricao: "A grande final da copa entre as atléticas. Evento fictício.",
    data: "2027-01-23T19:00:00-03:00",
    local: "Ginásio Poliesportivo",
    categoria: "Esporte",
    produtor_id: "usr-prod-atletica",
    destaque: false,
    capa: { de: "#10B981", para: "#0F766E" },
    lotes: [lote("lot-fut-arquibancada", "Arquibancada", 25, 400)],
  },
  {
    id: "evt-gastro",
    nome: "Festival Gastronômico & Música",
    descricao: "Gastronomia regional com shows ao vivo na praça. Evento fictício.",
    data: "2027-02-06T12:00:00-03:00",
    local: "Praça Central",
    categoria: "Festival",
    produtor_id: "usr-prod-arena",
    destaque: false,
    capa: { de: "#F97316", para: "#DB2777" },
    lotes: [lote("lot-gas-passaporte", "Passaporte 2 dias", 70, 250)],
  },
];

/** Datas móveis: avança semanas inteiras quando a Virada Calourus fica a menos de 7 dias. */
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
