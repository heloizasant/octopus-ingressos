-- Octupos: segurança em nível de linha (RLS), Etapa 1.
-- Nesta etapa só há políticas de LEITURA. Nenhuma tabela aceita escrita direta
-- pela API pública: as operações de venda, compra e admin entram como funções
-- seguras (RPC) nas etapas 5, 6 e 8.

-- ---------------------------------------------------------------------------
-- Permissões de tabela (defesa em profundidade, além do RLS)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.app_settings, public.events, public.tickets to anon, authenticated;
grant select on public.profiles, public.orders, public.payments,
  public.ticket_transfers, public.transaction_records to authenticated;

grant all on all tables in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Funções auxiliares
-- security definer: rodam com permissão do dono para evitar recursão no RLS.
-- search_path vazio: todas as referências usam o schema explícito.
-- ---------------------------------------------------------------------------
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create function public.participa_do_pedido(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders
    where id = p_order_id
      and (select auth.uid()) in (buyer_id, seller_id)
  );
$$;

revoke execute on function public.is_admin() from public;
revoke execute on function public.participa_do_pedido(uuid) from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.participa_do_pedido(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS ligado em todas as tabelas
-- ---------------------------------------------------------------------------
alter table public.app_settings        enable row level security;
alter table public.profiles            enable row level security;
alter table public.events              enable row level security;
alter table public.tickets             enable row level security;
alter table public.orders              enable row level security;
alter table public.payments            enable row level security;
alter table public.ticket_transfers    enable row level security;
alter table public.transaction_records enable row level security;

-- Parâmetros: leitura pública (a taxa aparece no checkout).
create policy "parametros: leitura publica"
  on public.app_settings for select
  to anon, authenticated
  using (true);

-- Perfis: cada um vê o próprio; admin vê todos.
create policy "perfis: proprio ou admin"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- Eventos: leitura pública.
create policy "eventos: leitura publica"
  on public.events for select
  to anon, authenticated
  using (true);

-- Ingressos: o público vê só os disponíveis. Logado também vê os próprios
-- anúncios e os ingressos que comprou. Admin vê todos.
create policy "ingressos: disponiveis para o publico"
  on public.tickets for select
  to anon
  using (status = 'disponivel');

create policy "ingressos: disponiveis, proprios, comprados ou admin"
  on public.tickets for select
  to authenticated
  using (
    status = 'disponivel'
    or seller_id = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1 from public.orders o
      where o.ticket_id = tickets.id
        and o.buyer_id = (select auth.uid())
    )
  );

-- Pedidos e registros ligados a eles: só comprador, vendedor ou admin.
create policy "pedidos: participantes ou admin"
  on public.orders for select
  to authenticated
  using (
    (select auth.uid()) in (buyer_id, seller_id)
    or (select public.is_admin())
  );

create policy "pagamentos: participantes ou admin"
  on public.payments for select
  to authenticated
  using (public.participa_do_pedido(order_id) or (select public.is_admin()));

create policy "transferencias: participantes ou admin"
  on public.ticket_transfers for select
  to authenticated
  using (public.participa_do_pedido(order_id) or (select public.is_admin()));

create policy "registros: participantes ou admin"
  on public.transaction_records for select
  to authenticated
  using (public.participa_do_pedido(order_id) or (select public.is_admin()));
