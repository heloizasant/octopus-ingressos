import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, CircleCheck, CircleX, Repeat, ScanLine, Store, Ticket, UserRound } from "lucide-react";
import { Aviso, Cartao, LinkBotao, Pagina, Secao, Selo } from "@/components/octupos/base";
import { SolanaFuturo } from "@/components/octupos/ingresso";
import { BUYER_FEE_RATE, calcularValores, formatarTaxa, SELLER_FEE_RATE, TETO_REVENDA } from "@/lib/domain/fees";
import { brl } from "@/lib/domain/format";
import { ROTULO_VALIDACAO } from "@/lib/domain/status";
import type { ResultadoValidacao } from "@/lib/domain/types";

export const metadata: Metadata = {
  title: "Como funciona",
  description: "Venda primária e revenda interna de ingressos, com titularidade e validação controladas pelo Octopus.",
};

const FLUXO = [
  { icone: Store, titulo: "O produtor disponibiliza", texto: "Cadastra o evento e os lotes de ingressos no Octopus." },
  { icone: Ticket, titulo: "O comprador adquire", texto: "Paga (simulado) e o Octopus emite o ingresso na hora." },
  { icone: BadgeCheck, titulo: "O ingresso é dele", texto: "Fica associado à conta, com um código único de entrada." },
  { icone: Repeat, titulo: "Pode revender", texto: "Anuncia dentro do Octopus, com preço limitado ao teto." },
  { icone: UserRound, titulo: "Nova titularidade", texto: "Na venda, o código antigo é invalidado e o comprador recebe outro." },
  { icone: ScanLine, titulo: "Validação na entrada", texto: "A portaria consulta o estado atual: só o titular vigente entra." },
];

const RESULTADOS: ResultadoValidacao[] = ["valido", "invalidado", "bloqueado_revenda", "utilizado", "inexistente"];

export default function ComoFunciona() {
  const exemplo = calcularValores(100);

  return (
    <Pagina className="flex flex-col gap-10">
      <header className="flex max-w-3xl flex-col gap-3">
        <Selo tom="marca" className="w-fit">
          Protótipo acadêmico
        </Selo>
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-ink md:text-4xl">Como o Octopus funciona</h1>
        <p className="text-[15px] leading-relaxed text-ink-3 md:text-lg">
          O Octopus é uma plataforma de <strong className="text-ink">venda primária e revenda interna</strong>. Como é o
          próprio Octopus que emite os ingressos, ele sabe sempre quem é o titular de cada um. A revenda acontece dentro
          da plataforma, e a portaria consulta esse registro na entrada.
        </p>
      </header>

      <Secao titulo="O fluxo, do produtor à portaria">
        <ol className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {FLUXO.map(({ icone: Icone, titulo, texto }, i) => (
            <li key={titulo} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icone className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-bold text-ink">
                  <span className="mr-1.5 text-brand">{i + 1}.</span>
                  {titulo}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-3">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </Secao>

      <Secao titulo="Por que o código antigo não funciona mais">
        <Cartao className="flex flex-col gap-5 md:p-8">
          <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center">
            <div className="flex flex-1 flex-col gap-2 rounded-2xl border-2 border-danger/30 bg-danger-soft p-5">
              <p className="flex items-center gap-2 font-bold text-danger">
                <CircleX className="size-5" aria-hidden="true" /> Ana (titular anterior)
              </p>
              <p className="font-mono text-sm text-ink-3 line-through">OCT-ANA1-2345</p>
              <p className="text-xs text-ink-2">Titularidade invalidada na revenda. Mesmo com print do QR, não entra.</p>
            </div>
            <div className="flex flex-col items-center gap-1 text-brand">
              <ArrowRight className="size-7 rotate-90 md:rotate-0" aria-hidden="true" />
              <span className="text-xs font-bold">revenda no Octopus</span>
            </div>
            <div className="flex flex-1 flex-col gap-2 rounded-2xl border-2 border-success/30 bg-success-soft p-5">
              <p className="flex items-center gap-2 font-bold text-success">
                <CircleCheck className="size-5" aria-hidden="true" /> Diego (titular atual)
              </p>
              <p className="font-mono text-sm font-bold text-ink">OCT-DIE6-7890</p>
              <p className="text-xs text-ink-2">Código novo, emitido na transferência. É o único que libera a entrada.</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-ink-3">
            Códigos ilustrativos. O preço de revenda é limitado a {TETO_REVENDA.toLocaleString("pt-BR")}× o valor
            original, e um ingresso anunciado fica bloqueado para entrada até ser vendido ou o anúncio ser cancelado,
            para que ninguém use o ingresso e depois o venda.
          </p>
        </Cartao>
      </Secao>

      <Secao titulo="O que a portaria vê">
        <dl className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {RESULTADOS.map((r) => (
            <Cartao key={r} className="flex flex-col gap-1.5 !p-4">
              <dt>
                <Selo tom={ROTULO_VALIDACAO[r].tom}>{ROTULO_VALIDACAO[r].titulo}</Selo>
              </dt>
              <dd className="text-sm leading-relaxed text-ink-3">{ROTULO_VALIDACAO[r].explicacao}</dd>
            </Cartao>
          ))}
        </dl>
      </Secao>

      <Secao titulo="Taxas (demonstração)">
        <Cartao className="flex flex-col gap-2 text-sm text-ink-2">
          <p>
            Ingresso de R$ 100,00: o comprador paga <strong>{brl(exemplo.valor_total)}</strong> (preço +{" "}
            {formatarTaxa(BUYER_FEE_RATE)}) e quem vende recebe <strong>{brl(exemplo.valor_liquido_vendedor)}</strong>{" "}
            (preço − {formatarTaxa(SELLER_FEE_RATE)}). Vale para a venda oficial (o produtor recebe) e para a revenda (o
            titular recebe).
          </p>
          <p className="text-xs text-ink-3">Na revenda, o repasse só é liberado depois que a nova titularidade é registrada.</p>
        </Cartao>
      </Secao>

      <Secao titulo="Solana: como poderá entrar no futuro">
        <SolanaFuturo />
        <Aviso tom="neutro" titulo="Situação atual">
          Esta versão não tem integração com a Solana: nenhuma biblioteca de blockchain está instalada no site e nenhuma
          transação é feita. A titularidade é controlada pelo registro interno do Octopus (na demonstração, guardado no
          seu navegador).
        </Aviso>
      </Secao>

      <Secao titulo="O que é real e o que é simulado">
        <div className="grid gap-3.5 md:grid-cols-2">
          <Cartao className="flex flex-col gap-2 !border-success/30">
            <p className="font-bold text-success">Funciona de verdade nesta demonstração</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
              <li>Emissão de ingressos com código único e baixa no estoque do lote</li>
              <li>Anúncio, cancelamento e compra na revenda</li>
              <li>Invalidação do código anterior e registro da nova titularidade</li>
              <li>Consulta do estado do código e registro da entrada na portaria</li>
              <li>Cadastro de eventos e lotes pelo produtor</li>
            </ul>
          </Cartao>
          <Cartao className="flex flex-col gap-2 !border-danger/30">
            <p className="font-bold text-danger">Simulado ou ainda não existe</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
              <li>Pagamentos (Pix fictício; nenhum valor é cobrado)</li>
              <li>Login (sem senha; perfis de demonstração)</li>
              <li>Banco de dados (os dados ficam no navegador)</li>
              <li>Registro em blockchain (evolução futura)</li>
            </ul>
          </Cartao>
        </div>
      </Secao>

      <div className="flex flex-col gap-3 sm:flex-row">
        <LinkBotao href="/demonstracao" tamanho="lg">
          Seguir o roteiro da demonstração
        </LinkBotao>
        <LinkBotao href="/eventos" variant="outline" tamanho="lg">
          Buscar eventos
        </LinkBotao>
      </div>
    </Pagina>
  );
}
