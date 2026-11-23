const FUSO = "America/Sao_Paulo";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const brl = (valor: number): string => moeda.format(valor);

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function partes(iso: string) {
  const f = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return {
    semana: maiuscula(p.weekday.slice(0, 3)),
    dia: p.day,
    mes: p.month,
    ano: p.year,
    hora: p.hour,
    minuto: p.minute,
  };
}

/** "Sáb, 28 de novembro" (formato da tela de referência). */
export function dataCurta(iso: string): string {
  const p = partes(iso);
  return `${p.semana}, ${p.dia} de ${p.mes}`;
}

/** "22h" ou "22h30". */
export function horario(iso: string): string {
  const p = partes(iso);
  return p.minuto === "00" ? `${p.hora}h` : `${p.hora}h${p.minuto}`;
}

/** "Sáb, 28 de novembro de 2026 · 22h". */
export function dataCompleta(iso: string): string {
  const p = partes(iso);
  return `${p.semana}, ${p.dia} de ${p.mes} de ${p.ano} · ${horario(iso)}`;
}

/** "17/11/2026 14:05". */
export function dataHoraNumerica(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** Valor para <input type="datetime-local"> (horário de Brasília). */
export function paraInputLocal(iso: string): string {
  const f = new Intl.DateTimeFormat("sv-SE", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return f.format(new Date(iso)).replace(" ", "T");
}

/** Converte o valor de <input type="datetime-local"> (Brasília, -03:00) em ISO. */
export function deInputLocal(valor: string): string {
  return new Date(`${valor}:00-03:00`).toISOString();
}

/** Primeiro nome, para não expor o nome completo do vendedor. */
export const primeiroNome = (nome: string): string => nome.trim().split(/\s+/)[0] ?? nome;

/** Remove acentos e caixa, para a busca. */
export const normalizar = (s: string): string =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export const plural = (n: number, um: string, varios: string): string =>
  `${n} ${n === 1 ? um : varios}`;
