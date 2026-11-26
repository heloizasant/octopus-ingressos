# Octopus Ingressos

Protótipo acadêmico de uma plataforma de ingressos com **venda primária** (o produtor
cadastra o evento e os lotes) e **revenda interna** entre usuários, com troca de
titularidade: ao revender, a credencial anterior deixa de valer e o comprador recebe
uma nova.

## Situação atual

- A interface funciona como demonstração no navegador: os dados ficam no
  `localStorage`, o login é simulado e **nenhum pagamento é real**.
- O banco de dados (Supabase/PostgreSQL) está em desenvolvimento. O novo esquema
  está em rascunho em `octupos/supabase/rascunho-v2/`, testado localmente, e ainda
  não foi aplicado em nenhum banco.
- A integração com um provedor de pagamentos ainda não foi feita.

## Estrutura

```
octupos/              aplicação Next.js (código, testes, banco e documentação)
```

Instruções de instalação e uso estão em [`octupos/README.md`](octupos/README.md).

## Direitos

Todos os direitos reservados. Este repositório não concede licença de uso, cópia ou
distribuição.
