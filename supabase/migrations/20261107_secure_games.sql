-- =====================================================================
-- Stock Game · Seguridad de partidas + historial de patrimonio
-- Ejecutar UNA sola vez en Supabase > SQL Editor (es idempotente).
--
-- Qué hace:
--  * El PIN deja de guardarse en texto plano: se guarda con hash bcrypt en
--    una tabla privada (game_secrets) que nadie puede leer desde la app.
--  * Al acertar el PIN, el servidor entrega un token de dispositivo aleatorio.
--    Las escrituras de una partida con PIN exigen ese token.
--  * Bloqueo progresivo tras 5 PIN fallidos (1, 2, 4... min, máx. 24 h).
--  * La tabla games pasa a ser de solo lectura para la app; todas las
--    escrituras van por funciones (RPC) que validan permisos.
--  * Nueva columna equity_history para la gráfica de patrimonio.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- 1. Columnas nuevas ----------------------------------------------------
alter table public.games add column if not exists has_pin boolean not null default false;
alter table public.games add column if not exists equity_history jsonb not null default '[]'::jsonb;

-- watchlist como jsonb (antes podía ser text[] o json)
do $$
declare v_type text;
begin
  select data_type into v_type from information_schema.columns
   where table_schema = 'public' and table_name = 'games' and column_name = 'watchlist';
  if v_type = 'ARRAY' then
    alter table public.games alter column watchlist drop default;
    alter table public.games alter column watchlist type jsonb using to_jsonb(watchlist);
  elsif v_type = 'json' then
    alter table public.games alter column watchlist drop default;
    alter table public.games alter column watchlist type jsonb using watchlist::jsonb;
  end if;
  alter table public.games alter column watchlist set default '[]'::jsonb;
end $$;

-- 2. Tablas privadas ----------------------------------------------------
create table if not exists public.game_secrets (
  game_id text primary key references public.games(id) on delete cascade,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz
);

create table if not exists public.game_tokens (
  token_hash text primary key,
  game_id text not null references public.games(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists game_tokens_game_id_idx on public.game_tokens(game_id);

alter table public.game_secrets enable row level security;
alter table public.game_tokens enable row level security;
-- Sin políticas: nadie (anon/authenticated) puede leer ni escribir.
revoke all on public.game_secrets from anon, authenticated;
revoke all on public.game_tokens from anon, authenticated;

-- 3. Migrar los PIN antiguos (guardados como "__SEC:PRIV:<pin>__" en watchlist)
insert into public.game_secrets (game_id, pin_hash)
select g.id, extensions.crypt(r.match[1], extensions.gen_salt('bf', 8))
  from public.games g
  cross join lateral jsonb_array_elements_text(
    case when jsonb_typeof(g.watchlist) = 'array' then g.watchlist else '[]'::jsonb end
  ) as w(tag)
  cross join lateral regexp_match(w.tag, '^__SEC:PRIV:([0-9A-Za-z]+)__$') as r(match)
 where r.match is not null
on conflict (game_id) do nothing;

update public.games g
   set has_pin = exists (select 1 from public.game_secrets s where s.game_id = g.id);

-- Quitar las etiquetas __SEC:...__ de la watchlist
update public.games
   set watchlist = coalesce((
     select jsonb_agg(w)
       from jsonb_array_elements(watchlist) w
      where not (jsonb_typeof(w) = 'string' and (w #>> '{}') like '\_\_SEC:%')
   ), '[]'::jsonb)
 where jsonb_typeof(watchlist) = 'array';

-- 4. RLS de games: lectura pública, escritura solo por RPC ----------------
alter table public.games enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'games' loop
    execute format('drop policy %I on public.games', p.policyname);
  end loop;
end $$;

create policy games_public_read on public.games for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.games from anon, authenticated;
grant select on public.games to anon, authenticated;

-- 5. Funciones internas -------------------------------------------------
create or replace function public._sg_now_ms() returns bigint
language sql stable as $$
  select (extract(epoch from clock_timestamp()) * 1000)::bigint;
$$;

create or replace function public._sg_token_valid(p_game_id text, p_token text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select p_token is not null
     and length(p_token) >= 32
     and exists (
       select 1 from public.game_tokens t
        where t.game_id = p_game_id
          and t.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
     );
$$;

create or replace function public._sg_issue_token(p_game_id text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  insert into public.game_tokens (token_hash, game_id)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), p_game_id);
  return v_token;
end $$;

create or replace function public._sg_can_write(p_game_id text, p_token text) returns text
language plpgsql stable security definer set search_path = public, extensions as $$
declare v_has_pin boolean;
begin
  select has_pin into v_has_pin from public.games where id = p_game_id;
  if not found then return 'NOT_FOUND'; end if;
  if v_has_pin and not public._sg_token_valid(p_game_id, p_token) then return 'UNAUTHORIZED'; end if;
  return 'OK';
end $$;

revoke all on function public._sg_now_ms() from public, anon, authenticated;
revoke all on function public._sg_token_valid(text, text) from public, anon, authenticated;
revoke all on function public._sg_issue_token(text) from public, anon, authenticated;
revoke all on function public._sg_can_write(text, text) from public, anon, authenticated;

-- 6. API pública (RPC) ----------------------------------------------------

-- Crear partida (PIN opcional, 4-8 dígitos)
create or replace function public.sg_create_game(p_id text, p_name text, p_initial_cash numeric, p_pin text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_now bigint := public._sg_now_ms();
  v_name text := left(btrim(coalesce(p_name, '')), 40);
  v_pin text := nullif(btrim(coalesce(p_pin, '')), '');
  v_token text := null;
begin
  if p_id is null or p_id !~ '^[A-Z0-9]{6}$' then
    return jsonb_build_object('ok', false, 'error', 'INVALID_ID');
  end if;
  if p_initial_cash is null or p_initial_cash < 100 or p_initial_cash > 10000000 then
    return jsonb_build_object('ok', false, 'error', 'INVALID_CASH');
  end if;
  if v_pin is not null and v_pin !~ '^[0-9]{4,8}$' then
    return jsonb_build_object('ok', false, 'error', 'INVALID_PIN');
  end if;
  if exists (select 1 from public.games where id = p_id) then
    return jsonb_build_object('ok', false, 'error', 'ID_TAKEN');
  end if;
  if v_name = '' then v_name := 'Partida ' || p_id; end if;

  insert into public.games (
    id, name, initial_cash, cash_available, cash_invested, total_net_worth, total_pnl, total_pnl_percent,
    positions_count, positions, trade_history, watchlist, equity_history, has_pin, created_at, updated_at
  ) values (
    p_id, v_name, p_initial_cash, p_initial_cash, 0, p_initial_cash, 0, 0,
    0, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    jsonb_build_array(jsonb_build_object('t', v_now, 'v', p_initial_cash)),
    v_pin is not null, v_now, v_now
  );

  if v_pin is not null then
    insert into public.game_secrets (game_id, pin_hash)
    values (p_id, extensions.crypt(v_pin, extensions.gen_salt('bf', 8)));
    v_token := public._sg_issue_token(p_id);
  end if;

  return jsonb_build_object('ok', true, 'token', v_token, 'updated_at', v_now);
end $$;

-- Guardar el estado de una partida
create or replace function public.sg_save_game(p_id text, p_token text, p_state jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_now bigint := public._sg_now_ms();
  v_auth text := public._sg_can_write(p_id, p_token);
begin
  if v_auth <> 'OK' then return jsonb_build_object('ok', false, 'error', v_auth); end if;

  if jsonb_typeof(p_state) <> 'object'
     or jsonb_typeof(p_state -> 'positions') <> 'array'
     or jsonb_typeof(p_state -> 'trade_history') <> 'array'
     or jsonb_typeof(coalesce(p_state -> 'watchlist', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_state -> 'equity_history', '[]'::jsonb)) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'INVALID_STATE');
  end if;

  if jsonb_array_length(p_state -> 'positions') > 500
     or jsonb_array_length(p_state -> 'trade_history') > 10000
     or jsonb_array_length(coalesce(p_state -> 'watchlist', '[]'::jsonb)) > 300
     or jsonb_array_length(coalesce(p_state -> 'equity_history', '[]'::jsonb)) > 3000 then
    return jsonb_build_object('ok', false, 'error', 'TOO_LARGE');
  end if;

  update public.games set
    name              = coalesce(nullif(left(btrim(p_state ->> 'name'), 40), ''), name),
    initial_cash      = coalesce((p_state ->> 'initial_cash')::numeric, initial_cash),
    cash_available    = coalesce((p_state ->> 'cash_available')::numeric, cash_available),
    cash_invested     = coalesce((p_state ->> 'cash_invested')::numeric, cash_invested),
    total_net_worth   = coalesce((p_state ->> 'total_net_worth')::numeric, total_net_worth),
    total_pnl         = coalesce((p_state ->> 'total_pnl')::numeric, total_pnl),
    total_pnl_percent = coalesce((p_state ->> 'total_pnl_percent')::numeric, total_pnl_percent),
    positions_count   = jsonb_array_length(p_state -> 'positions'),
    positions         = p_state -> 'positions',
    trade_history     = p_state -> 'trade_history',
    watchlist         = coalesce(p_state -> 'watchlist', watchlist),
    equity_history    = coalesce(p_state -> 'equity_history', equity_history),
    updated_at        = v_now
  where id = p_id;

  return jsonb_build_object('ok', true, 'updated_at', v_now);
end $$;

-- Entrar en una partida con PIN: devuelve un token de dispositivo
create or replace function public.sg_unlock_game(p_id text, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  s public.game_secrets%rowtype;
  v_fails integer;
begin
  select * into s from public.game_secrets where game_id = p_id for update;
  if not found then
    if exists (select 1 from public.games where id = p_id) then
      return jsonb_build_object('ok', true, 'token', null);
    end if;
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;

  if s.locked_until is not null and s.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'LOCKED',
      'retry_after', ceil(extract(epoch from (s.locked_until - now())))::int);
  end if;

  if p_pin is not null and s.pin_hash = extensions.crypt(p_pin, s.pin_hash) then
    update public.game_secrets set failed_attempts = 0, locked_until = null where game_id = p_id;
    return jsonb_build_object('ok', true, 'token', public._sg_issue_token(p_id));
  end if;

  v_fails := s.failed_attempts + 1;
  update public.game_secrets
     set failed_attempts = v_fails,
         locked_until = case
           when v_fails >= 5 then now() + make_interval(mins => least(1440, power(2, least(v_fails - 5, 11))::int))
           else null end
   where game_id = p_id;

  return jsonb_build_object('ok', false, 'error', 'INVALID_PIN', 'attempts_left', greatest(0, 5 - v_fails));
end $$;

-- Poner, cambiar o quitar el PIN (p_new_pin vacío = quitar)
create or replace function public.sg_set_pin(p_id text, p_token text, p_new_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_now bigint := public._sg_now_ms();
  v_auth text := public._sg_can_write(p_id, p_token);
  v_pin text := nullif(btrim(coalesce(p_new_pin, '')), '');
begin
  if v_auth <> 'OK' then return jsonb_build_object('ok', false, 'error', v_auth); end if;

  if v_pin is null then
    delete from public.game_secrets where game_id = p_id;
    delete from public.game_tokens where game_id = p_id;
    update public.games set has_pin = false, updated_at = v_now where id = p_id;
    return jsonb_build_object('ok', true, 'token', null, 'updated_at', v_now);
  end if;

  if v_pin !~ '^[0-9]{4,8}$' then
    return jsonb_build_object('ok', false, 'error', 'INVALID_PIN');
  end if;

  insert into public.game_secrets (game_id, pin_hash)
  values (p_id, extensions.crypt(v_pin, extensions.gen_salt('bf', 8)))
  on conflict (game_id) do update
    set pin_hash = excluded.pin_hash, failed_attempts = 0, locked_until = null;

  -- Cambiar el PIN cierra la sesión del resto de dispositivos
  delete from public.game_tokens where game_id = p_id;
  update public.games set has_pin = true, updated_at = v_now where id = p_id;

  return jsonb_build_object('ok', true, 'token', public._sg_issue_token(p_id), 'updated_at', v_now);
end $$;

-- Eliminar partida
create or replace function public.sg_delete_game(p_id text, p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_auth text := public._sg_can_write(p_id, p_token);
begin
  if v_auth <> 'OK' then return jsonb_build_object('ok', false, 'error', v_auth); end if;
  delete from public.games where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.sg_create_game(text, text, numeric, text) from public;
revoke all on function public.sg_save_game(text, text, jsonb) from public;
revoke all on function public.sg_unlock_game(text, text) from public;
revoke all on function public.sg_set_pin(text, text, text) from public;
revoke all on function public.sg_delete_game(text, text) from public;
grant execute on function public.sg_create_game(text, text, numeric, text) to anon, authenticated;
grant execute on function public.sg_save_game(text, text, jsonb) to anon, authenticated;
grant execute on function public.sg_unlock_game(text, text) to anon, authenticated;
grant execute on function public.sg_set_pin(text, text, text) to anon, authenticated;
grant execute on function public.sg_delete_game(text, text) to anon, authenticated;

-- 7. Realtime: asegurar que games emite cambios ----------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'games'
     ) then
    alter publication supabase_realtime add table public.games;
  end if;
end $$;

-- Recargar la caché de esquema de la API
notify pgrst, 'reload schema';
