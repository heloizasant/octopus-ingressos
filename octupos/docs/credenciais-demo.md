# Credenciais de demonstração

Contas **fictícias**, criadas pelo script `npm run seed`. O domínio `.test` é
reservado e nunca recebe e-mail. Use estas contas apenas na demonstração.

Senha de todas as contas: `SENHA-REMOVIDA`

| Perfil | E-mail | Nome | Uso na demonstração |
|---|---|---|---|
| Administrador | `admin@octupos.test` | Admin Octupos | Painel administrativo |
| Comprador | `comprador@octupos.test` | Diego Rocha | Compras concluídas e uma aguardando pagamento |
| Vendedora | `ana@octupos.test` | Ana Souza | Anúncios aprovados, uma venda concluída e uma compra |
| Vendedor | `bruno@octupos.test` | Bruno Lima | Anúncios aprovados, pendentes e reprovados |
| Vendedora | `carla@octupos.test` | Carla Mendes | Anúncios variados, uma venda e um pedido cancelado |

## O que o seed cria

- 6 eventos: os 3 da tela de referência (28/11/2026, 11/12/2026 e 20/12/2026) e mais 3.
- 14 anúncios: 9 aprovados, 2 pendentes e 3 reprovados pela análise demonstrativa
  de preço (até 1,5× o preço de referência do evento = aprovado; até 2,5× = pendente;
  acima = reprovado). A análise é uma **simulação**: não comprova a autenticidade
  do ingresso nem detecta fraudes reais.
- 5 pedidos: 3 concluídos, 1 aguardando pagamento e 1 cancelado.

## Restaurar a demonstração

Dentro de `octupos/`, rode `npm run seed`. O script **apaga** eventos, anúncios e
pedidos e recria tudo. Rode antes de cada apresentação.
