-- =============================================================================
-- Octopus v2 — permissões e RLS (RASCUNHO; ver 01_schema.sql).
--
-- Regra geral: a API pública só LÊ tabelas (filtradas pelo RLS). Toda escrita
-- acontece pelas funções de 02_funcoes.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Zera as permissões padrão (o Supabase concede tudo a anon/authenticated por
-- padrão em objetos novos do schema public).
-- -----------------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on schema interno from public, anon, authenticated;
revoke all on all functions in schema interno from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

-- Leitura
grant select on public.app_settings, public.events, public.ticket_batches,
                public.listings, public.tickets to anon, authenticated;
grant select on public.profiles, public.ticket_credentials, public.orders, public.payments,
                public.payouts, public.ticket_events, public.validations to authenticated;

-- Operações do usuário logado
grant execute on function
  public.criar_evento(text, text, timestamptz, text, text, text, text, jsonb),
  public.definir_papel(uuid, public.user_role),
  public.iniciar_compra_lote(uuid),
  public.anunciar_revenda(uuid, numeric),
  public.cancelar_anuncio(uuid),
  public.iniciar_compra_revenda(uuid),
  public.confirmar_pagamento_simulado(uuid),
  public.cancelar_pedido(uuid),
  public.validar_codigo(text),
  public.registrar_entrada(text)
to authenticated;

-- As políticas de RLS chamam estes auxiliares; nenhum deles altera dados.
grant usage on schema interno to anon, authenticated;
grant execute on function interno.eh_admin(), interno.pode_ver_ingresso(uuid) to anon, authenticated;

-- Servidor (service_role): webhook do provedor de pagamento, no futuro.
grant usage on schema interno to service_role;
grant execute on function interno.confirmar_pagamento(uuid, text), interno.expirar_pedidos() to service_role;
grant all on all tables in schema public to service_role;

-- -----------------------------------------------------------------------------
-- RLS em todas as tabelas
-- -----------------------------------------------------------------------------
alter table public.app_settings       enable row level security;
alter table public.profiles           enable row level security;
alter table public.events             enable row level security;
alter table public.ticket_batches     enable row level security;
alter table public.tickets            enable row level security;
alter table public.ticket_credentials enable row level security;
alter table public.listings           enable row level security;
alter table public.orders             enable row level security;
alter table public.payments           enable row level security;
alter table public.payouts            enable row level security;
alter table public.ticket_events      enable row level security;
alter table public.validations        enable row level security;

create policy "parametros: leitura publica" on public.app_settings
  for select to anon, authenticated using (true);

create policy "perfis: proprio ou admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select interno.eh_admin()));

create policy "eventos: leitura publica" on public.events
  for select to anon, authenticated using (true);

create policy "lotes: leitura publica" on public.ticket_batches
  for select to anon, authenticated using (true);

-- Ingressos: os anunciados aparecem para todos (dados do anúncio); os demais só
-- para titular atual, ex-titulares, produtor do evento e administração.
create policy "ingressos: anunciados (publico)" on public.tickets
  for select to anon using (status = 'em_revenda');
create policy "ingressos: anunciados ou relacionados" on public.tickets
  for select to authenticated using (status = 'em_revenda' or interno.pode_ver_ingresso(id));

-- Credenciais (códigos do QR): só o próprio titular. O produtor valida pela
-- função da portaria, sem ler os códigos.
create policy "credenciais: proprio titular ou admin" on public.ticket_credentials
  for select to authenticated using (titular_id = (select auth.uid()) or (select interno.eh_admin()));

create policy "anuncios: ativos (publico)" on public.listings
  for select to anon using (status = 'ativo');
create policy "anuncios: ativos, proprios ou comprados" on public.listings
  for select to authenticated using (
    status = 'ativo'
    or vendedor_id = (select auth.uid())
    or (select interno.eh_admin())
    or exists (select 1 from public.orders o where o.listing_id = listings.id and o.comprador_id = (select auth.uid()))
  );

create policy "pedidos: participantes ou admin" on public.orders
  for select to authenticated using (
    (select auth.uid()) in (comprador_id, vendedor_id) or (select interno.eh_admin())
  );

-- O subselect em orders já passa pelo RLS de orders.
create policy "pagamentos: do pedido visivel" on public.payments
  for select to authenticated using (exists (select 1 from public.orders o where o.id = payments.order_id));

create policy "repasses: beneficiario ou admin" on public.payouts
  for select to authenticated using (beneficiario_id = (select auth.uid()) or (select interno.eh_admin()));

create policy "historico: quem pode ver o ingresso" on public.ticket_events
  for select to authenticated using (interno.pode_ver_ingresso(ticket_id));

create policy "portaria: produtor do evento, operador ou admin" on public.validations
  for select to authenticated using (
    operador_id = (select auth.uid())
    or (select interno.eh_admin())
    or exists (select 1 from public.events e where e.id = validations.event_id and e.produtor_id = (select auth.uid()))
  );
