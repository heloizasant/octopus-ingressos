import type { ResultadoValidacao, StatusAnuncio, StatusIngresso, TipoRegistro } from "./types";

export type Tom = "neutro" | "marca" | "sucesso" | "alerta" | "perigo";

export interface Rotulo {
  texto: string;
  tom: Tom;
}

export const ROTULO_INGRESSO: Record<StatusIngresso, Rotulo> = {
  valido: { texto: "Válido", tom: "sucesso" },
  em_revenda: { texto: "Anunciado para revenda", tom: "alerta" },
  utilizado: { texto: "Entrada registrada", tom: "neutro" },
  cancelado: { texto: "Cancelado", tom: "perigo" },
};

export const ROTULO_ANUNCIO: Record<StatusAnuncio, Rotulo> = {
  ativo: { texto: "Anúncio ativo", tom: "alerta" },
  vendido: { texto: "Vendido", tom: "sucesso" },
  cancelado: { texto: "Anúncio cancelado", tom: "neutro" },
};

export const ROTULO_VALIDACAO: Record<
  ResultadoValidacao,
  { titulo: string; tom: Tom; explicacao: string }
> = {
  valido: {
    titulo: "Ingresso válido",
    tom: "sucesso",
    explicacao: "O código pertence à titularidade vigente e o ingresso ainda não foi utilizado.",
  },
  invalidado: {
    titulo: "Código invalidado",
    tom: "perigo",
    explicacao:
      "Este código pertencia a um titular anterior. O ingresso foi revendido e recebeu um código novo.",
  },
  utilizado: {
    titulo: "Entrada já registrada",
    tom: "perigo",
    explicacao: "Este ingresso já foi usado para entrar no evento.",
  },
  bloqueado_revenda: {
    titulo: "Bloqueado: anunciado para revenda",
    tom: "alerta",
    explicacao:
      "Enquanto está anunciado, o ingresso não libera entrada. O titular pode cancelar o anúncio para voltar a usá-lo.",
  },
  cancelado: {
    titulo: "Ingresso cancelado",
    tom: "perigo",
    explicacao: "O ingresso foi cancelado e não dá acesso ao evento.",
  },
  inexistente: {
    titulo: "Código não encontrado",
    tom: "perigo",
    explicacao: "Nenhum ingresso emitido pelo Octopus tem este código.",
  },
};

export const ROTULO_REGISTRO: Record<TipoRegistro, string> = {
  pagamento_simulado: "Pagamento simulado enviado",
  pagamento_confirmado: "Pagamento confirmado (simulação)",
  valor_retido: "Valor retido até a transferência",
  ingresso_emitido: "Ingresso emitido",
  titularidade_invalidada: "Titularidade anterior invalidada",
  titularidade_registrada: "Nova titularidade registrada",
  taxas_registradas: "Taxas da plataforma",
  repasse_liberado: "Repasse liberado (demonstração)",
};
