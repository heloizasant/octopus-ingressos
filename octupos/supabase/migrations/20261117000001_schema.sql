-- Octupos: esquema inicial (Etapa 1).
-- Protótipo demonstrativo: nenhum pagamento, validação ou transferência é real.
-- Estados ficam em português sem acento; a interface mostra os rótulos.

-- ---------------------------------------------------------------------------
-- Tipos de estado
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('usuario', 'admin');

create type public.event_status as enum ('ativo', 'encerrado', 'cancelado');

create type public.ticket_status as enum (
  'disponivel', 'reservado', 'vendido', 'pendente_validacao', 'reprovado', 'cancelado'
);

-- Resultado da análise demonstrativa do anúncio (não comprova autenticidade).
create type public.validation_status as enum ('aprovada', 'pendente', 'reprovada');

create type public.order_status as enum (
  'aguardando_pagamento', 'pagamento_confirmado', 'em_validacao', 'concluida', 'cancelada'
);

create type public.payment_status as enum ('pendente', 'confirmado', 'cancelado', 'expirado');

create type public.transfer_status as enum ('pendente', 'aprovada', 'reprovada', 'concluida');

create type public.record_type as enum (
  'pagamento_simulado', 'valor_retido', 'titularidade_aprovada',
  'liberacao_registrada', 'devolucao_registrada'
);

-- ---------------------------------------------------------------------------
-- Parâmetros da demonstração (taxa configurável etc.)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  chave         text primary key,
  valor         numeric not null,
  descricao     text not null,
  atualizado_em timestamptz not null default now(),
  constraint taxa_entre_5_e_10 check (
    chave <> 'taxa_servico_percentual' or valor between 5 and 10
  ),
  constraint valores_positivos check (valor > 0)
);

insert into public.app_settings (chave, valor, descricao) values
  ('taxa_servico_percentual', 8,   'Taxa de serviço demonstrativa, em % sobre o preço do ingresso'),
  ('reserva_minutos',         10,  'Tempo de reserva do ingresso durante o checkout'),
  ('analise_limite_aprovada', 1.5, 'Análise demonstrativa: aprovada até este múltiplo do preço de referência'),
  ('analise_limite_pendente', 2.5, 'Análise demonstrativa: pendente até este múltiplo; acima, reprovada');

-- ---------------------------------------------------------------------------
-- Perfis (1:1 com auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  nome      text not null check (char_length(nome) between 1 and 100),
  email     text not null,
  role      public.user_role not null default 'usuario',
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Eventos
-- ---------------------------------------------------------------------------
create table public.events (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null check (char_length(nome) between 1 and 150),
  descricao        text not null default '',
  data_hora        timestamptz not null,
  local            text not null,
  organizador      text not null,
  imagem_url       text,
  categoria        text not null,
  preco_referencia numeric(10, 2) not null check (preco_referencia > 0),
  destaque         boolean not null default false,
  status           public.event_status not null default 'ativo',
  criado_em        timestamptz not null default now()
);

create index events_data_hora_idx on public.events (data_hora);

-- ---------------------------------------------------------------------------
-- Ingressos anunciados
-- ---------------------------------------------------------------------------
create table public.tickets (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events (id) on delete restrict,
  seller_id        uuid not null references public.profiles (id) on delete restrict,
  tipo             text not null check (char_length(tipo) between 1 and 60),
  descricao        text check (char_length(descricao) <= 500),
  preco            numeric(10, 2) not null check (preco > 0),
  status           public.ticket_status not null default 'pendente_validacao',
  validacao_status public.validation_status not null default 'pendente',
  validacao_motivo text,
  codigo_demo      text not null unique,
  criado_em        timestamptz not null default now(),
  -- Só anúncio aprovado pode estar à venda; reprovado nunca fica disponível.
  constraint disponivel_exige_aprovacao check (
    status not in ('disponivel', 'reservado', 'vendido') or validacao_status = 'aprovada'
  ),
  constraint reprovado_coerente check (
    (status = 'reprovado') = (validacao_status = 'reprovada')
  )
);

create index tickets_event_id_idx  on public.tickets (event_id);
create index tickets_seller_id_idx on public.tickets (seller_id);
create index tickets_status_idx    on public.tickets (status);

-- ---------------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------------
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  ticket_id         uuid not null references public.tickets (id) on delete restrict,
  buyer_id          uuid not null references public.profiles (id) on delete restrict,
  seller_id         uuid not null references public.profiles (id) on delete restrict,
  valor_ingresso    numeric(10, 2) not null check (valor_ingresso > 0),
  taxa_percentual   numeric(5, 2)  not null check (taxa_percentual between 0 and 100),
  taxa_servico      numeric(10, 2) not null check (taxa_servico >= 0),
  valor_total       numeric(10, 2) not null,
  status            public.order_status not null default 'aguardando_pagamento',
  reservado_ate     timestamptz,
  etapa_alterada_em timestamptz not null default now(),
  criado_em         timestamptz not null default now(),
  constraint comprador_diferente_vendedor check (buyer_id <> seller_id),
  constraint total_coerente check (valor_total = valor_ingresso + taxa_servico)
);

-- Um ingresso só pode ter um pedido não cancelado: impede compra simultânea
-- e revenda de ingresso já vendido, direto no banco.
create unique index orders_um_pedido_ativo_por_ingresso
  on public.orders (ticket_id) where status <> 'cancelada';

create index orders_buyer_id_idx  on public.orders (buyer_id);
create index orders_seller_id_idx on public.orders (seller_id);

-- ---------------------------------------------------------------------------
-- Pagamentos (sempre Pix simulado)
-- ---------------------------------------------------------------------------
create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null unique references public.orders (id) on delete restrict,
  valor         numeric(10, 2) not null check (valor > 0),
  metodo        text not null default 'pix_simulado' check (metodo = 'pix_simulado'),
  status        public.payment_status not null default 'pendente',
  expira_em     timestamptz not null,
  criado_em     timestamptz not null default now(),
  confirmado_em timestamptz
);

-- ---------------------------------------------------------------------------
-- Transferências de titularidade (simuladas)
-- ---------------------------------------------------------------------------
create table public.ticket_transfers (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null unique references public.orders (id) on delete restrict,
  ticket_id            uuid not null references public.tickets (id) on delete restrict,
  status               public.transfer_status not null default 'pendente',
  codigo_novo_ingresso text unique,
  criado_em            timestamptz not null default now(),
  realizado_em         timestamptz
);

create index ticket_transfers_ticket_id_idx on public.ticket_transfers (ticket_id);

-- ---------------------------------------------------------------------------
-- Registros da custódia demonstrativa
-- O identificador SIM-XXXX-XXXX deixa claro que não é transação real.
-- ---------------------------------------------------------------------------
create table public.transaction_records (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders (id) on delete restrict,
  tipo               public.record_type not null,
  identificador_demo text not null unique
    check (identificador_demo ~ '^SIM-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  descricao          text not null,
  registrado_em      timestamptz not null default now()
);

create index transaction_records_order_id_idx on public.transaction_records (order_id);
