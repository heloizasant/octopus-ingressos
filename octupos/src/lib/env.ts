/**
 * Variáveis públicas do Supabase (URL e chave publicável).
 * Ficam em `.env.local`. Retorna `null` enquanto não forem configuradas,
 * para o site mostrar um aviso em vez de quebrar.
 *
 * O acesso precisa ser direto (`process.env.NEXT_PUBLIC_...`) para o Next
 * conseguir incluir os valores no código do navegador.
 */
export function getSupabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}
