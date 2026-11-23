-- =============================================================================
-- Octopus v2 — operações do sistema (RASCUNHO; ver 01_schema.sql).
--
-- Toda escrita passa por estas funções. Cada uma roda numa única transação e
-- trava (FOR UPDATE) as linhas que altera: dois cliques simultâneos nunca vendem
-- o mesmo ingresso duas vezes. As mensagens de erro são exibidas ao usuário.
--
-- schema `interno`: funções auxiliares, NÃO expostas pela API do Supabase.
-- =============================================================================

create schema interno;

-- -----------------------------------------------------------------------------
-- Auxiliares
-- -----------------------------------------------------------------------------

-- Código da credencial: OCT-XXXX-XXXX-XXXX-XXXX (64 bits aleatórios, hexadecimal).
-- gen_random_uuid() usa gerador criptograficamente seguro; as posições 13 e 17
-- (versão e variante do UUID) ficam de fora.
create function interno.gerar_codigo()
returns text language sql volatile set search_path = '' as $$
  select 'OCT-' || substr(h, 1, 4) || '-' || substr(h, 5, 4) || '-' || substr(h, 9, 4) || '-' || substr(h, 19, 4)
  from (select upper(replace(gen_random_uuid()::text, '-', '')) as h) x;
$$;

create function interno.parametro(p_chave text)
returns numeric language sql stable set search_path = '' as $$
  select valor from public.app_settings where chave = p_chave;
$$;

create function interno.exigir_usuario()
returns uuid language plpgsql stable set search_path = '' as $$
declare
  v uuid := auth.uid();
begin
  if v is null then
    raise exception 'Entre na sua conta para continuar.';
  end if;
  return v;
end;
$$;

create function interno.papel(p_user uuid)
returns public.user_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = p_user;
$$;

create function interno.eh_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create function interno.evento_aberto(p_evento public.events)
returns boolean language sql stable set search_path = '' as $$
  select p_evento.status = 'ativo' and p_evento.data_hora > now();
$$;

create function interno.reais(v numeric)
returns text language sql immutable set search_path = '' as $$
  select 'R$ ' || replace(to_char(v, 'FM999999990.00'), '.', ',');
$$;

-- Quem pode ver um ingresso e seu histórico: titular atual, quem já foi titular,
-- o produtor do evento e a administração.
create function interno.pode_ver_ingresso(p_ticket uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
           select 1 from public.tickets t join public.events e on e.id = t.event_id
           where t.id = p_ticket and auth.uid() in (t.titular_id, e.produtor_id))
      or exists (
           select 1 from public.ticket_credentials c
           where c.ticket_id = p_ticket and c.titular_id = auth.uid())
      or interno.eh_admin();
$$;

-- Pedidos não pagos no prazo expiram e liberam o lote ou o anúncio.
create function interno.expirar_pedidos()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select id, tipo, listing_id, ticket_id from public.orders
    where status = 'aguardando_pagamento' and expira_em <= now()
    for update skip locked
  loop
    update public.orders   set status = 'expirado' where id = r.id;
    update public.payments set status = 'expirado' where order_id = r.id and status = 'pendente';
    if r.tipo = 'revenda' then
      update public.listings set status = 'ativo' where id = r.listing_id and status = 'reservado';
      insert into public.ticket_events (ticket_id, tipo, order_id, detalhe)
      values (r.ticket_id, 'reserva_liberada', r.id, 'O prazo de pagamento expirou.');
    end if;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- -----------------------------------------------------------------------------
-- Cadastro: cria o perfil com papel 'usuario'. O papel NUNCA vem dos metadados
-- enviados pelo próprio usuário.
-- -----------------------------------------------------------------------------
create function public.ao_criar_usuario()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nome, email)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
                  nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
                  'Usuário'), 100),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.ao_criar_usuario();

-- -----------------------------------------------------------------------------
-- Histórico e portaria: somente inclusão
-- -----------------------------------------------------------------------------
create function interno.bloquear_alteracao()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Registros de histórico não podem ser alterados nem apagados.';
end;
$$;

create trigger ticket_events_imutavel before update or delete on public.ticket_events
  for each row execute function interno.bloquear_alteracao();
create trigger validations_imutavel before update or delete on public.validations
  for each row execute function interno.bloquear_alteracao();

-- -----------------------------------------------------------------------------
-- Produtor: cria evento com 1 a 4 lotes
-- p_lotes: [{"nome": "Pista", "preco": 60, "quantidade": 100}, ...]
-- -----------------------------------------------------------------------------
create function public.criar_evento(
  p_nome text, p_descricao text, p_data_hora timestamptz, p_local text,
  p_categoria text, p_capa_de text, p_capa_para text, p_lotes jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user   uuid := interno.exigir_usuario();
  v_evento uuid;
  l        record;
begin
  if interno.papel(v_user) not in ('produtor', 'admin') then
    raise exception 'Só contas de produtor podem cadastrar eventos.';
  end if;
  if char_length(trim(coalesce(p_nome, ''))) not between 2 and 150 then
    raise exception 'Informe o nome do evento (2 a 150 caracteres).';
  end if;
  if trim(coalesce(p_local, '')) = '' then raise exception 'Informe o local.'; end if;
  if trim(coalesce(p_categoria, '')) = '' then raise exception 'Informe a categoria.'; end if;
  if p_data_hora is null or p_data_hora <= now() then
    raise exception 'A data do evento precisa estar no futuro.';
  end if;
  if jsonb_typeof(p_lotes) <> 'array' or jsonb_array_length(p_lotes) not between 1 and 4 then
    raise exception 'Cadastre de 1 a 4 lotes.';
  end if;
  for l in select * from jsonb_to_recordset(p_lotes) as x(nome text, preco numeric, quantidade numeric) loop
    if trim(coalesce(l.nome, '')) = '' then raise exception 'Dê um nome a cada lote.'; end if;
    if l.preco is null or l.preco <= 0 then
      raise exception 'O preço do lote "%" deve ser maior que zero.', l.nome;
    end if;
    if l.quantidade is null or l.quantidade <> trunc(l.quantidade) or l.quantidade not between 1 and 5000 then
      raise exception 'A quantidade do lote "%" deve ser de 1 a 5.000.', l.nome;
    end if;
  end loop;

  insert into public.events (produtor_id, nome, descricao, data_hora, local, categoria, capa_de, capa_para)
  values (v_user, trim(p_nome), trim(coalesce(p_descricao, '')), p_data_hora, trim(p_local), trim(p_categoria),
          coalesce(p_capa_de, '#5B4FE9'), coalesce(p_capa_para, '#8B5CF6'))
  returning id into v_evento;

  insert into public.ticket_batches (event_id, nome, preco, quantidade)
  select v_evento, trim(x.nome), round(x.preco, 2), x.quantidade::integer
  from jsonb_to_recordset(p_lotes) as x(nome text, preco numeric, quantidade numeric);

  return v_evento;
end;
$$;

-- Administração: define o papel de uma conta (ex.: tornar produtor).
create function public.definir_papel(p_user uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform interno.exigir_usuario();
  if not interno.eh_admin() then raise exception 'Só a administração altera papéis.'; end if;
  update public.profiles set role = p_role where id = p_user;
  if not found then raise exception 'Conta não encontrada.'; end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- VENDA PRIMÁRIA — etapa 1: reservar (pedido aguardando pagamento)
-- -----------------------------------------------------------------------------
create function public.iniciar_compra_lote(p_batch_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user      uuid := interno.exigir_usuario();
  v_lote      public.ticket_batches;
  v_evento    public.events;
  v_pendentes integer;
  v_pedido    uuid;
begin
  perform interno.expirar_pedidos();

  select * into v_lote from public.ticket_batches where id = p_batch_id for update;
  if not found then raise exception 'Lote não encontrado.'; end if;
  select * into v_evento from public.events where id = v_lote.event_id;
  if not interno.evento_aberto(v_evento) then raise exception 'Este evento não está mais à venda.'; end if;
  if v_evento.produtor_id = v_user then
    raise exception 'O produtor não compra ingressos do próprio evento.';
  end if;

  select count(*) into v_pendentes from public.orders
  where batch_id = p_batch_id and status = 'aguardando_pagamento';
  if v_lote.vendidos + v_pendentes >= v_lote.quantidade then
    raise exception 'Este lote está esgotado.';
  end if;

  insert into public.orders (tipo, comprador_id, vendedor_id, event_id, batch_id, valor_base,
                             buyer_fee_rate, seller_fee_rate, expira_em)
  values ('primaria', v_user, v_evento.produtor_id, v_evento.id, v_lote.id, v_lote.preco,
          interno.parametro('buyer_fee_rate'), interno.parametro('seller_fee_rate'),
          now() + make_interval(mins => interno.parametro('reserva_minutos')::integer))
  returning id into v_pedido;

  insert into public.payments (order_id, valor)
  select id, valor_total from public.orders where id = v_pedido;

  return v_pedido;
end;
$$;

-- -----------------------------------------------------------------------------
-- REVENDA — anunciar e cancelar
-- -----------------------------------------------------------------------------
create function public.anunciar_revenda(p_ticket_id uuid, p_preco numeric)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user    uuid := interno.exigir_usuario();
  v_ingr    public.tickets;
  v_evento  public.events;
  v_teto    numeric;
  v_anuncio uuid;
begin
  perform interno.expirar_pedidos();

  select * into v_ingr from public.tickets where id = p_ticket_id for update;
  if not found or v_ingr.titular_id <> v_user then
    raise exception 'Só o titular atual pode anunciar este ingresso.';
  end if;
  if v_ingr.status = 'em_revenda' then raise exception 'Este ingresso já está anunciado.'; end if;
  if v_ingr.status <> 'valido' then raise exception 'Este ingresso não pode ser revendido.'; end if;
  select * into v_evento from public.events where id = v_ingr.event_id;
  if not interno.evento_aberto(v_evento) then raise exception 'O evento já aconteceu ou foi cancelado.'; end if;
  if p_preco is null or p_preco <= 0 then raise exception 'Informe um preço maior que zero.'; end if;

  v_teto := round(v_ingr.valor_face * interno.parametro('teto_revenda'), 2);
  if p_preco > v_teto then
    raise exception 'O preço máximo de revenda é % (1,5× o valor original).', interno.reais(v_teto);
  end if;

  insert into public.listings (ticket_id, vendedor_id, preco)
  values (v_ingr.id, v_user, round(p_preco, 2))
  returning id into v_anuncio;

  update public.tickets set status = 'em_revenda' where id = v_ingr.id;
  insert into public.ticket_events (ticket_id, tipo, ator_id, detalhe)
  values (v_ingr.id, 'anunciado', v_user, 'Anunciado para revenda por ' || interno.reais(round(p_preco, 2)) || '.');

  return v_anuncio;
end;
$$;

create function public.cancelar_anuncio(p_listing_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user    uuid := interno.exigir_usuario();
  v_anuncio public.listings;
begin
  perform interno.expirar_pedidos();

  select * into v_anuncio from public.listings where id = p_listing_id for update;
  if not found or v_anuncio.vendedor_id <> v_user then raise exception 'Anúncio não encontrado.'; end if;
  if v_anuncio.status = 'reservado' then
    raise exception 'Há uma compra em andamento para este anúncio. Aguarde a conclusão ou a expiração.';
  end if;
  if v_anuncio.status <> 'ativo' then raise exception 'Este anúncio não está ativo.'; end if;

  update public.listings set status = 'cancelado', encerrado_em = now() where id = v_anuncio.id;
  update public.tickets set status = 'valido'
  where id = v_anuncio.ticket_id and titular_id = v_user and status = 'em_revenda';
  insert into public.ticket_events (ticket_id, tipo, ator_id, detalhe)
  values (v_anuncio.ticket_id, 'anuncio_cancelado', v_user, 'Anúncio cancelado pelo titular.');
end;
$$;

-- -----------------------------------------------------------------------------
-- REVENDA — etapa 1: reservar o anúncio (pedido aguardando pagamento)
-- -----------------------------------------------------------------------------
create function public.iniciar_compra_revenda(p_listing_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user    uuid := interno.exigir_usuario();
  v_anuncio public.listings;
  v_ingr    public.tickets;
  v_evento  public.events;
  v_pedido  uuid;
begin
  perform interno.expirar_pedidos();

  select * into v_anuncio from public.listings where id = p_listing_id for update;
  if not found or v_anuncio.status <> 'ativo' then
    raise exception 'Este anúncio não está mais disponível.';
  end if;
  if v_anuncio.vendedor_id = v_user then raise exception 'Você não pode comprar o seu próprio anúncio.'; end if;

  select * into v_ingr from public.tickets where id = v_anuncio.ticket_id for update;
  if v_ingr.status <> 'em_revenda' or v_ingr.titular_id <> v_anuncio.vendedor_id then
    raise exception 'O ingresso deste anúncio não está disponível.';
  end if;
  select * into v_evento from public.events where id = v_ingr.event_id;
  if not interno.evento_aberto(v_evento) then raise exception 'O evento já aconteceu ou foi cancelado.'; end if;

  insert into public.orders (tipo, comprador_id, vendedor_id, event_id, listing_id, ticket_id, valor_base,
                             buyer_fee_rate, seller_fee_rate, expira_em)
  values ('revenda', v_user, v_anuncio.vendedor_id, v_evento.id, v_anuncio.id, v_ingr.id, v_anuncio.preco,
          interno.parametro('buyer_fee_rate'), interno.parametro('seller_fee_rate'),
          now() + make_interval(mins => interno.parametro('reserva_minutos')::integer))
  returning id into v_pedido;

  insert into public.payments (order_id, valor)
  select id, valor_total from public.orders where id = v_pedido;

  update public.listings set status = 'reservado' where id = v_anuncio.id;
  insert into public.ticket_events (ticket_id, tipo, order_id, detalhe)
  values (v_ingr.id, 'reservado', v_pedido, 'Compra iniciada; aguardando pagamento.');

  return v_pedido;
end;
$$;

-- -----------------------------------------------------------------------------
-- Etapa 2 (primária e revenda): CONFIRMAR PAGAMENTO
--
-- Interna: chamada pelo pagamento simulado (abaixo) ou, no futuro, pelo webhook
-- do provedor com a service_role. Idempotente: confirmar de novo um pedido já
-- pago não emite outra credencial.
-- -----------------------------------------------------------------------------
create function interno.confirmar_pagamento(p_order_id uuid, p_referencia text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_ped        public.orders;
  v_lote       public.ticket_batches;
  v_ingr       uuid;
  v_cod_antigo text;
  v_cod_novo   text;
begin
  select * into v_ped from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  if v_ped.status = 'pago' then return v_ped.ticket_id; end if;  -- repetição (ex.: webhook reenviado)
  if v_ped.status <> 'aguardando_pagamento' then raise exception 'Este pedido não pode mais ser pago.'; end if;
  if v_ped.expira_em <= now() then raise exception 'O prazo de pagamento deste pedido expirou.'; end if;

  update public.payments
  set status = 'confirmado', confirmado_em = now(), referencia_externa = coalesce(p_referencia, referencia_externa)
  where order_id = v_ped.id;

  v_cod_novo := interno.gerar_codigo();

  if v_ped.tipo = 'primaria' then
    -- Emite o ingresso e a primeira credencial.
    select * into v_lote from public.ticket_batches where id = v_ped.batch_id for update;
    update public.ticket_batches set vendidos = vendidos + 1 where id = v_lote.id;

    insert into public.tickets (event_id, batch_id, tipo, valor_face, titular_id)
    values (v_ped.event_id, v_lote.id, v_lote.nome, v_lote.preco, v_ped.comprador_id)
    returning id into v_ingr;

    update public.orders set status = 'pago', pago_em = now(), ticket_id = v_ingr where id = v_ped.id;

    insert into public.ticket_credentials (ticket_id, titular_id, codigo, origem, order_id)
    values (v_ingr, v_ped.comprador_id, v_cod_novo, 'compra_primaria', v_ped.id);

    insert into public.ticket_events (ticket_id, tipo, ator_id, order_id, detalhe) values
      (v_ingr, 'emitido', v_ped.comprador_id, v_ped.id, 'Ingresso emitido na compra do lote ' || v_lote.nome || '.'),
      (v_ingr, 'credencial_emitida', v_ped.comprador_id, v_ped.id, 'Credencial ' || v_cod_novo || ' emitida.');

    -- Repasse ao PRODUTOR: valor devido registrado; regra de liberação a configurar.
    insert into public.payouts (order_id, origem, beneficiario_id, valor, disponivel_em)
    values (v_ped.id, 'primaria', v_ped.vendedor_id, v_ped.valor_liquido_vendedor, null);

  else
    -- Transfere a titularidade: invalida a credencial anterior e emite outra.
    v_ingr := v_ped.ticket_id;
    perform 1 from public.tickets
    where id = v_ingr and titular_id = v_ped.vendedor_id and status = 'em_revenda'
    for update;
    if not found then raise exception 'O ingresso deste anúncio não está mais disponível.'; end if;

    update public.ticket_credentials set status = 'invalidada', fim = now()
    where ticket_id = v_ingr and status = 'vigente'
    returning codigo into v_cod_antigo;

    insert into public.ticket_credentials (ticket_id, titular_id, codigo, origem, order_id)
    values (v_ingr, v_ped.comprador_id, v_cod_novo, 'revenda', v_ped.id);

    update public.tickets set titular_id = v_ped.comprador_id, status = 'valido' where id = v_ingr;
    update public.listings set status = 'vendido', encerrado_em = now() where id = v_ped.listing_id;
    update public.orders set status = 'pago', pago_em = now() where id = v_ped.id;

    insert into public.ticket_events (ticket_id, tipo, ator_id, order_id, detalhe) values
      (v_ingr, 'credencial_invalidada', v_ped.vendedor_id, v_ped.id, 'Credencial ' || v_cod_antigo || ' deixou de valer.'),
      (v_ingr, 'transferido', v_ped.comprador_id, v_ped.id, 'Titularidade transferida na revenda.'),
      (v_ingr, 'credencial_emitida', v_ped.comprador_id, v_ped.id, 'Credencial ' || v_cod_novo || ' emitida.');

    -- Repasse ao VENDEDOR: devido e disponível na confirmação (sem retenção após o evento).
    insert into public.payouts (order_id, origem, beneficiario_id, valor, disponivel_em)
    values (v_ped.id, 'revenda', v_ped.vendedor_id, v_ped.valor_liquido_vendedor, now());
  end if;

  return v_ingr;
end;
$$;

-- Pagamento SIMULADO: só o próprio comprador, só pedidos 'pix_simulado'.
create function public.confirmar_pagamento_simulado(p_order_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user      uuid := interno.exigir_usuario();
  v_comprador uuid;
  v_metodo    public.payment_method;
begin
  select o.comprador_id, p.metodo into v_comprador, v_metodo
  from public.orders o join public.payments p on p.order_id = o.id
  where o.id = p_order_id;
  if not found or v_comprador <> v_user then raise exception 'Pedido não encontrado.'; end if;
  if v_metodo <> 'pix_simulado' then raise exception 'Este pedido não usa pagamento simulado.'; end if;
  return interno.confirmar_pagamento(p_order_id, null);
end;
$$;

create function public.cancelar_pedido(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := interno.exigir_usuario();
  v_ped  public.orders;
begin
  select * into v_ped from public.orders where id = p_order_id for update;
  if not found or v_ped.comprador_id <> v_user then raise exception 'Pedido não encontrado.'; end if;
  if v_ped.status <> 'aguardando_pagamento' then raise exception 'Só pedidos aguardando pagamento podem ser cancelados.'; end if;

  update public.orders   set status = 'cancelado' where id = v_ped.id;
  update public.payments set status = 'cancelado' where order_id = v_ped.id and status = 'pendente';
  if v_ped.tipo = 'revenda' then
    update public.listings set status = 'ativo' where id = v_ped.listing_id and status = 'reservado';
    insert into public.ticket_events (ticket_id, tipo, ator_id, order_id, detalhe)
    values (v_ped.ticket_id, 'reserva_liberada', v_user, v_ped.id, 'Compra cancelada pelo comprador.');
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- PORTARIA (produtor do evento ou administração)
-- Códigos de eventos de outro produtor aparecem como inexistentes.
-- -----------------------------------------------------------------------------
create function interno.situacao_codigo(p_codigo text, p_operador uuid, p_admin boolean)
returns table (resultado public.validation_result, ticket_id uuid, event_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_cred public.ticket_credentials;
  v_ingr public.tickets;
  v_ev   public.events;
begin
  select * into v_cred from public.ticket_credentials where codigo = p_codigo;
  if found then
    select * into v_ingr from public.tickets where id = v_cred.ticket_id;
    select * into v_ev from public.events where id = v_ingr.event_id;
  end if;
  if not found or v_cred.id is null or (not p_admin and v_ev.produtor_id <> p_operador) then
    return query select 'inexistente'::public.validation_result, null::uuid, null::uuid;
    return;
  end if;
  return query select
    (case
       when v_cred.status = 'invalidada' then 'invalidado'
       when v_ingr.status = 'utilizado' then 'utilizado'
       when v_ingr.status = 'cancelado' or v_ev.status = 'cancelado' then 'cancelado'
       when v_ingr.status = 'em_revenda' then 'bloqueado_revenda'
       else 'valido'
     end)::public.validation_result,
    v_ingr.id, v_ev.id;
end;
$$;

create function interno.exigir_operador()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := interno.exigir_usuario();
begin
  if interno.papel(v_user) not in ('produtor', 'admin') then
    raise exception 'Só o produtor do evento ou a administração opera a portaria.';
  end if;
  return v_user;
end;
$$;

create function public.validar_codigo(p_codigo text)
returns table (resultado public.validation_result, ticket_id uuid, evento text, tipo text, titular text)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := interno.exigir_operador();
  v_cod  text := upper(trim(coalesce(p_codigo, '')));
  s      record;
begin
  if v_cod = '' then raise exception 'Informe o código do ingresso.'; end if;
  select * into s from interno.situacao_codigo(v_cod, v_user, interno.eh_admin());

  insert into public.validations (codigo, ticket_id, event_id, resultado, operador_id)
  values (v_cod, s.ticket_id, s.event_id, s.resultado, v_user);

  -- O nome do titular só aparece para códigos válidos (conferência de documento).
  return query
    select s.resultado, s.ticket_id, e.nome, t.tipo,
           case when s.resultado = 'valido' then p.nome end
    from (select 1) um
    left join public.tickets t  on t.id = s.ticket_id
    left join public.events e   on e.id = s.event_id
    left join public.profiles p on p.id = t.titular_id;
end;
$$;

create function public.registrar_entrada(p_codigo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := interno.exigir_operador();
  v_cod  text := upper(trim(coalesce(p_codigo, '')));
  s      record;
begin
  -- Trava o ingresso antes de reavaliar: duas leituras simultâneas não registram duas entradas.
  perform 1 from public.tickets t
  join public.ticket_credentials c on c.ticket_id = t.id
  where c.codigo = v_cod for update of t;

  select * into s from interno.situacao_codigo(v_cod, v_user, interno.eh_admin());
  if s.resultado <> 'valido' then
    raise exception 'Entrada recusada: o código não está válido (%).', s.resultado;
  end if;

  update public.tickets set status = 'utilizado', utilizado_em = now() where id = s.ticket_id;
  insert into public.validations (codigo, ticket_id, event_id, resultado, operador_id, entrada_registrada)
  values (v_cod, s.ticket_id, s.event_id, 'valido', v_user, true);
  insert into public.ticket_events (ticket_id, tipo, ator_id, detalhe)
  values (s.ticket_id, 'entrada_registrada', v_user, 'Entrada registrada na portaria.');
  return s.ticket_id;
end;
$$;
