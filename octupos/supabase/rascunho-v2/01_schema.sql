-- =============================================================================
-- Octopus v2 — esquema: venda primária + revenda interna.
--
-- RASCUNHO. Este arquivo NÃO está em supabase/migrations/ e não é aplicado pela
-- CLI. Ele substituirá 20261117000001_schema.sql depois que a ausência de
-- tabelas no projeto remoto for confirmada no Table Editor.
--
-- Pagamentos são SIMULADOS nesta etapa ('pix_simulado'). A estrutura já prevê
-- pedido pendente + confirmação, que é o formato de um provedor real (webhook).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos de estado
-- -----------------------------------------------------------------------------
create type public.user_role         as enum ('usuario', 'produtor', 'admin');
create type public.event_status      as enum ('ativo', 'encerrado', 'cancelado');
-- valido: libera entrada · em_revenda: anunciado, entrada bloqueada ·
-- utilizado: entrada registrada · cancelado: anulado.
create type public.ticket_status     as enum ('valido', 'em_revenda', 'utilizado', 'cancelado');
create type public.credential_status as enum ('vigente', 'invalidada');
create type public.credential_origin as enum ('compra_primaria', 'revenda');
create type public.listing_status    as enum ('ativo', 'reservado', 'vendido', 'cancelado');
create type public.order_kind        as enum ('primaria', 'revenda');
create type public.order_status      as enum ('aguardando_pagamento', 'pago', 'cancelado', 'expirado', 'estornado');
create type public.payment_method    as enum ('pix_simulado');  -- provedores reais entram aqui
create type public.payment_status    as enum ('pendente', 'confirmado', 'cancelado', 'expirado', 'estornado');
create type public.payout_origin     as enum ('primaria', 'revenda');
-- devido: valor registrado a favor do beneficiário · liberado/pago: etapas do
-- provedor real (futuro) · bloqueado/estornado: contestação ou reembolso.
create type public.payout_status     as enum ('devido', 'liberado', 'pago', 'bloqueado', 'estornado');
create type public.validation_result as enum (
  'valido', 'invalidado', 'utilizado', 'bloqueado_revenda', 'cancelado', 'inexistente'
);

-- -----------------------------------------------------------------------------
-- Parâmetros (taxas são frações do preço-base: 0.02 = 2%)
-- -----------------------------------------------------------------------------
create table public.app_settings (
  chave         text primary key,
  valor         numeric not null check (valor >= 0),
  descricao     text not null,
  atualizado_em timestamptz not null default now(),
  constraint taxa_e_fracao check (chave not in ('buyer_fee_rate', 'seller_fee_rate') or valor < 1)
);

insert into public.app_settings (chave, valor, descricao) values
  ('buyer_fee_rate',   0.02, 'Taxa do comprador, fração do preço-base (0.02 = 2%)'),
  ('seller_fee_rate',  0.02, 'Taxa do vendedor/produtor, fração do preço-base (0.02 = 2%)'),
  ('teto_revenda',     1.5,  'Preço máximo de revenda, em múltiplos do valor de face'),
  ('reserva_minutos',  10,   'Tempo para pagar antes de o pedido expirar e liberar o ingresso');

-- -----------------------------------------------------------------------------
-- Perfis (1:1 com auth.users; criados por gatilho no cadastro)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  nome      text not null check (char_length(nome) between 1 and 100),
  email     text not null,
  role      public.user_role not null default 'usuario',
  criado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Eventos e lotes (venda primária)
-- -----------------------------------------------------------------------------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  produtor_id uuid not null references public.profiles (id) on delete restrict,
  nome        text not null check (char_length(nome) between 2 and 150),
  descricao   text not null default '' check (char_length(descricao) <= 2000),
  data_hora   timestamptz not null,
  local       text not null check (char_length(local) between 1 and 200),
  categoria   text not null check (char_length(categoria) between 1 and 60),
  capa_de     text not null default '#5B4FE9' check (capa_de ~ '^#[0-9A-Fa-f]{6}$'),
  capa_para   text not null default '#8B5CF6' check (capa_para ~ '^#[0-9A-Fa-f]{6}$'),
  destaque    boolean not null default false,
  status      public.event_status not null default 'ativo',
  criado_em   timestamptz not null default now()
);
create index events_data_hora_idx   on public.events (data_hora);
create index events_produtor_id_idx on public.events (produtor_id);

create table public.ticket_batches (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete restrict,
  nome       text not null check (char_length(nome) between 1 and 60),
  preco      numeric(10, 2) not null check (preco > 0),
  quantidade integer not null check (quantidade between 1 and 5000),
  vendidos   integer not null default 0 check (vendidos >= 0),
  criado_em  timestamptz not null default now(),
  constraint vendidos_ate_quantidade check (vendidos <= quantidade)
);
create index ticket_batches_event_id_idx on public.ticket_batches (event_id);

-- -----------------------------------------------------------------------------
-- Ingressos emitidos pelo Octopus
-- -----------------------------------------------------------------------------
create table public.tickets (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete restrict,
  batch_id     uuid not null references public.ticket_batches (id) on delete restrict,
  tipo         text not null,
  valor_face   numeric(10, 2) not null check (valor_face > 0),
  titular_id   uuid not null references public.profiles (id) on delete restrict,
  status       public.ticket_status not null default 'valido',
  emitido_em   timestamptz not null default now(),
  utilizado_em timestamptz,
  constraint utilizado_coerente check ((status = 'utilizado') = (utilizado_em is not null))
);
create index tickets_titular_id_idx on public.tickets (titular_id);
create index tickets_event_id_idx   on public.tickets (event_id);

-- Uma credencial por titularidade. O código vai no QR; ao transferir, a anterior
-- é invalidada e uma nova é emitida.
create table public.ticket_credentials (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.tickets (id) on delete restrict,
  titular_id   uuid not null references public.profiles (id) on delete restrict,
  codigo       text not null unique check (codigo ~ '^OCT(-[0-9A-F]{4}){4}$'),
  status       public.credential_status not null default 'vigente',
  origem       public.credential_origin not null,
  order_id     uuid not null,  -- FK adicionada depois de orders
  inicio       timestamptz not null default now(),
  fim          timestamptz,
  constraint fim_coerente check ((status = 'invalidada') = (fim is not null))
);
-- Garante no banco: nunca duas credenciais vigentes para o mesmo ingresso.
create unique index ticket_credentials_uma_vigente
  on public.ticket_credentials (ticket_id) where status = 'vigente';
create index ticket_credentials_titular_idx on public.ticket_credentials (titular_id);

-- -----------------------------------------------------------------------------
-- Anúncios de revenda
-- -----------------------------------------------------------------------------
create table public.listings (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.tickets (id) on delete restrict,
  vendedor_id  uuid not null references public.profiles (id) on delete restrict,
  preco        numeric(10, 2) not null check (preco > 0),
  status       public.listing_status not null default 'ativo',
  criado_em    timestamptz not null default now(),
  encerrado_em timestamptz
);
-- No máximo um anúncio em andamento por ingresso.
create unique index listings_um_ativo_por_ingresso
  on public.listings (ticket_id) where status in ('ativo', 'reservado');
create index listings_status_idx on public.listings (status);

-- -----------------------------------------------------------------------------
-- Pedidos (primária ou revenda)
-- -----------------------------------------------------------------------------
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  tipo            public.order_kind not null,
  comprador_id    uuid not null references public.profiles (id) on delete restrict,
  -- Produtor (primária) ou titular anterior (revenda).
  vendedor_id     uuid not null references public.profiles (id) on delete restrict,
  event_id        uuid not null references public.events (id) on delete restrict,
  batch_id        uuid references public.ticket_batches (id) on delete restrict,
  listing_id      uuid references public.listings (id) on delete restrict,
  -- Na primária, o ingresso só existe depois do pagamento.
  ticket_id       uuid references public.tickets (id) on delete restrict,
  valor_base      numeric(10, 2) not null check (valor_base > 0),
  -- Taxas copiadas de app_settings na criação; mudanças futuras não afetam o pedido.
  buyer_fee_rate  numeric(5, 4) not null check (buyer_fee_rate >= 0 and buyer_fee_rate < 1),
  seller_fee_rate numeric(5, 4) not null check (seller_fee_rate >= 0 and seller_fee_rate < 1),
  buyer_fee       numeric(10, 2) generated always as (round(valor_base * buyer_fee_rate, 2)) stored,
  seller_fee      numeric(10, 2) generated always as (round(valor_base * seller_fee_rate, 2)) stored,
  valor_total     numeric(10, 2) generated always as
                    (valor_base + round(valor_base * buyer_fee_rate, 2)) stored,
  valor_liquido_vendedor numeric(10, 2) generated always as
                    (valor_base - round(valor_base * seller_fee_rate, 2)) stored,
  status          public.order_status not null default 'aguardando_pagamento',
  expira_em       timestamptz not null,
  pago_em         timestamptz,
  criado_em       timestamptz not null default now(),
  constraint comprador_diferente_vendedor check (comprador_id <> vendedor_id),
  constraint primaria_coerente check (tipo <> 'primaria' or (batch_id is not null and listing_id is null)),
  constraint revenda_coerente check (tipo <> 'revenda' or (listing_id is not null and ticket_id is not null)),
  constraint pago_coerente check ((status in ('pago', 'estornado')) = (pago_em is not null)),
  constraint primaria_paga_tem_ingresso check (tipo <> 'primaria' or status not in ('pago', 'estornado') or ticket_id is not null)
);
create index orders_comprador_idx on public.orders (comprador_id);
create index orders_vendedor_idx  on public.orders (vendedor_id);
create index orders_pendentes_idx on public.orders (expira_em) where status = 'aguardando_pagamento';
-- Um anúncio só pode ter um pedido pendente ou pago.
create unique index orders_um_por_anuncio
  on public.orders (listing_id) where status in ('aguardando_pagamento', 'pago');

alter table public.ticket_credentials
  add constraint ticket_credentials_order_fk foreign key (order_id) references public.orders (id) on delete restrict;

-- -----------------------------------------------------------------------------
-- Pagamentos (simulados nesta etapa)
-- -----------------------------------------------------------------------------
create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null unique references public.orders (id) on delete restrict,
  metodo             public.payment_method not null default 'pix_simulado',
  valor              numeric(10, 2) not null check (valor > 0),
  status             public.payment_status not null default 'pendente',
  -- Para o provedor real: identificador da cobrança no provedor (idempotência do webhook).
  provedor           text,
  referencia_externa text unique,
  criado_em          timestamptz not null default now(),
  confirmado_em      timestamptz
);

-- -----------------------------------------------------------------------------
-- Repasses (valores devidos; nenhum dinheiro real se move nesta etapa)
-- Primária e revenda têm regras SEPARADAS:
--   revenda  → disponivel_em = momento da confirmação do pagamento;
--   primaria → disponivel_em = NULL: regra de liberação a configurar com o provedor.
-- -----------------------------------------------------------------------------
create table public.payouts (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null unique references public.orders (id) on delete restrict,
  origem          public.payout_origin not null,
  beneficiario_id uuid not null references public.profiles (id) on delete restrict,
  valor           numeric(10, 2) not null check (valor >= 0),
  status          public.payout_status not null default 'devido',
  disponivel_em   timestamptz,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
create index payouts_beneficiario_idx on public.payouts (beneficiario_id);

-- -----------------------------------------------------------------------------
-- Histórico do ingresso (somente inclusão)
-- -----------------------------------------------------------------------------
create table public.ticket_events (
  id            bigint generated always as identity primary key,
  ticket_id     uuid not null references public.tickets (id) on delete restrict,
  tipo          text not null check (tipo in (
                  'emitido', 'anunciado', 'anuncio_cancelado', 'reservado', 'reserva_liberada',
                  'credencial_invalidada', 'credencial_emitida', 'transferido', 'entrada_registrada')),
  ator_id       uuid references public.profiles (id) on delete restrict,
  order_id      uuid references public.orders (id) on delete restrict,
  detalhe       text not null default '',
  registrado_em timestamptz not null default now()
);
create index ticket_events_ticket_idx on public.ticket_events (ticket_id);

-- -----------------------------------------------------------------------------
-- Portaria
-- -----------------------------------------------------------------------------
create table public.validations (
  id                 bigint generated always as identity primary key,
  codigo             text not null,
  ticket_id          uuid references public.tickets (id) on delete restrict,
  event_id           uuid references public.events (id) on delete restrict,
  resultado          public.validation_result not null,
  operador_id        uuid not null references public.profiles (id) on delete restrict,
  entrada_registrada boolean not null default false,
  registrado_em      timestamptz not null default now()
);
create index validations_event_idx on public.validations (event_id);
