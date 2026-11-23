# Migrations v2 — venda primária + revenda interna (RASCUNHO)

Esta pasta **não** é lida pela CLI do Supabase. Nada aqui foi aplicado em banco
remoto.

| Arquivo | Conteúdo |
|---|---|
| `01_schema.sql` | Tipos, tabelas, restrições e índices |
| `02_funcoes.sql` | Operações (RPC), gatilhos de cadastro e de histórico imutável |
| `03_seguranca.sql` | Permissões e políticas de RLS |

## Como testar localmente

```bash
npm run test:banco   # PGlite (PostgreSQL em WebAssembly), sem Docker e sem rede
```

O PGlite usa um `auth` mínimo criado só para o teste. **Não substitui** os testes
no projeto Supabase (Auth real, API REST/RPC, RLS via PostgREST, concorrência real
entre conexões).

## Para virar migration (só com autorização)

1. Confirmar no Table Editor do Supabase que o projeto não tem tabelas.
2. Substituir `supabase/migrations/20261117000001_schema.sql` e
   `20261117000002_rls.sql` por estes três arquivos (renomeados com data/hora).
3. Aplicar **somente** com autorização explícita.

## Modelo

```
profiles ─┬─ events ── ticket_batches            (venda primária)
          ├─ tickets ── ticket_credentials        (uma credencial vigente por ingresso)
          ├─ listings                             (um anúncio ativo/reservado por ingresso)
          ├─ orders ── payments                   (pendente → pago; pix_simulado)
          ├─ payouts                              (primária e revenda separados)
          ├─ ticket_events                        (histórico, só inclusão)
          └─ validations                          (portaria, só inclusão)
```

## Fluxos

- **Primária:** `iniciar_compra_lote` → pedido `aguardando_pagamento` (reserva conta no
  estoque, expira em `reserva_minutos`) → `confirmar_pagamento_simulado` → ingresso +
  credencial + repasse ao produtor `devido` com `disponivel_em = null` (regra a configurar).
- **Revenda:** `anunciar_revenda` (teto 1,5×) → `iniciar_compra_revenda` (anúncio
  `reservado`) → `confirmar_pagamento_simulado` → credencial anterior `invalidada`, nova
  emitida, titular trocado, anúncio `vendido`, repasse ao vendedor `devido` e
  disponível na confirmação (sem retenção após o evento).
- **Portaria:** `validar_codigo` / `registrar_entrada`, só produtor do evento ou admin.

## Provedor de pagamento (próximas etapas)

`interno.confirmar_pagamento(order_id, referencia)` é a função que o webhook do
provedor chamará (service_role). Ela é idempotente: webhook repetido não emite
outra credencial. O método `pix_simulado` continua existindo apenas para a
demonstração.
