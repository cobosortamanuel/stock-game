-- =====================================================================
-- Stock Game · Histórico diario de patrimonio + órdenes pendientes
-- Ejecutar UNA vez en Supabase > SQL Editor (es idempotente).
-- Requiere haber ejecutado antes 20261107_secure_games.sql.
--
--  * daily_history: patrimonio al cierre de cada día. Lo calcula la tarea
--    diaria del servidor (GitHub Actions) a partir de las operaciones y los
--    cierres reales; la app no lo escribe.
--  * pending_orders: órdenes hechas con el mercado cerrado, que se ejecutan
--    al precio de apertura de la siguiente sesión.
-- =====================================================================

alter table public.games add column if not exists daily_history jsonb not null default '[]'::jsonb;
alter table public.games add column if not exists pending_orders jsonb not null default '[]'::jsonb;

-- sg_save_game ahora también guarda las órdenes pendientes
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
     or jsonb_typeof(coalesce(p_state -> 'equity_history', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_state -> 'pending_orders', '[]'::jsonb)) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'INVALID_STATE');
  end if;

  if jsonb_array_length(p_state -> 'positions') > 500
     or jsonb_array_length(p_state -> 'trade_history') > 10000
     or jsonb_array_length(coalesce(p_state -> 'watchlist', '[]'::jsonb)) > 300
     or jsonb_array_length(coalesce(p_state -> 'equity_history', '[]'::jsonb)) > 3000
     or jsonb_array_length(coalesce(p_state -> 'pending_orders', '[]'::jsonb)) > 50 then
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
    pending_orders    = coalesce(p_state -> 'pending_orders', pending_orders),
    updated_at        = v_now
  where id = p_id;

  return jsonb_build_object('ok', true, 'updated_at', v_now);
end $$;

revoke all on function public.sg_save_game(text, text, jsonb) from public;
grant execute on function public.sg_save_game(text, text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
