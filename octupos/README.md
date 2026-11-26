# Octopus — aplicação

Next.js 16, React 19, TypeScript, Tailwind CSS 4 e Supabase.

## Como rodar

Requer Node.js 20.9 ou superior.

```bash
npm install
npm run dev        # http://localhost:3000
```

A demonstração não precisa de variáveis de ambiente: os dados ficam no
`localStorage` do navegador.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificação de tipos |
| `npm run test:fluxos` | Testes das regras da demonstração (sem banco e sem rede) |
| `npm run test:banco` | Testes do esquema em rascunho num PostgreSQL local (PGlite), sem Docker e sem rede |

## Pastas

| Pasta | Conteúdo |
|---|---|
| `src/app/` | Rotas (páginas) |
| `src/components/` | Componentes de interface |
| `src/lib/domain/` | Regras compartilhadas: taxas, formatação, tipos |
| `src/lib/demo/` | Estado da demonstração (`localStorage`) |
| `src/lib/supabase/` | Clientes do Supabase (ainda não usados pelas telas) |
| `supabase/rascunho-v2/` | Novo esquema do banco (rascunho, não aplicado) — ver o README da pasta |
| `supabase/migrations/` | Esquema da versão anterior (não aplicado) |
| `scripts/` | Testes e o script de dados iniciais |
| `docs/` | Referência de tela e notas de demonstração |

## Regras da demonstração

- Taxas de 2% do comprador e 2% do vendedor, sobre o preço-base.
- Preço de revenda limitado a 1,5× o valor de face.
- Pagamentos simulados; os registros usam códigos `SIM-…` para não parecerem
  transações reais.

## Variáveis de ambiente

Só são necessárias para usar o Supabase. Copie `.env.local.example` para
`.env.local` e preencha. O `.env.local` nunca deve ser versionado.

O script `npm run seed` está desatualizado em relação ao esquema em rascunho e será
reescrito; não o use contra um banco real.
