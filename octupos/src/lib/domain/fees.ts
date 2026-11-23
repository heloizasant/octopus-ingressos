/**
 * Taxas demonstrativas, como fração do preço-base (0.02 = 2%).
 * Comprador e vendedor (produtor, na venda primária; titular, na revenda)
 * pagam cada um a sua, calculadas separadamente.
 */
export const BUYER_FEE_RATE = 0.02;
export const SELLER_FEE_RATE = 0.02;

/** Regra da plataforma: a revenda pode custar no máximo 1,5× o valor de face. */
export const TETO_REVENDA = 1.5;

/** Arredonda para centavos. */
export const centavos = (valor: number): number => Math.round(valor * 100) / 100;

export const tetoRevenda = (valorFace: number): number => centavos(valorFace * TETO_REVENDA);

export interface Valores {
  buyer_fee: number;
  seller_fee: number;
  valor_total: number;
  valor_liquido_vendedor: number;
}

export function calcularValores(
  preco: number,
  buyerRate = BUYER_FEE_RATE,
  sellerRate = SELLER_FEE_RATE,
): Valores {
  const buyer_fee = centavos(preco * buyerRate);
  const seller_fee = centavos(preco * sellerRate);
  return {
    buyer_fee,
    seller_fee,
    valor_total: centavos(preco + buyer_fee),
    valor_liquido_vendedor: centavos(preco - seller_fee),
  };
}

export const formatarTaxa = (rate: number): string =>
  `${(rate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
