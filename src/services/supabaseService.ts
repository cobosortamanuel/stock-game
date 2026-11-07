import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GameSaveData, GameSummary } from '../types/market';
import { sanitizeEquityHistory, sanitizePosition, sanitizeTrade } from '../lib/portfolio';

const DEFAULT_SUPABASE_URL = 'https://vvxfewktdsltzsxfumio.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_RXWhW8Lu_vIehqKQJAPsQw_GkvczmaZ';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient;
  const env = (import.meta as any).env || {};
  const url = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  supabaseClient = createClient(url, key, { auth: { persistSession: false } });
  return supabaseClient;
}

const SUMMARY_COLUMNS =
  'id, name, initial_cash, cash_available, cash_invested, total_net_worth, total_pnl, total_pnl_percent, positions_count, has_pin, created_at, updated_at';

function rowToSummary(row: any): GameSummary {
  const initialCash = Number(row.initial_cash) || 0;
  return {
    id: row.id,
    name: row.name,
    createdAt: Number(row.created_at) || Date.now(),
    updatedAt: Number(row.updated_at) || Date.now(),
    initialCash,
    cashAvailable: Number(row.cash_available) || 0,
    cashInvested: Number(row.cash_invested) || 0,
    totalNetWorth: Number(row.total_net_worth) || initialCash,
    totalPnL: Number(row.total_pnl) || 0,
    totalPnLPercent: Number(row.total_pnl_percent) || 0,
    positionsCount: Number(row.positions_count) || 0,
    hasPin: !!row.has_pin,
  };
}

function rowToGame(row: any): GameSaveData {
  const summary = rowToSummary(row);
  const watchlist: string[] = Array.isArray(row.watchlist)
    ? row.watchlist.filter((s: unknown) => typeof s === 'string' && s.trim() && !s.startsWith('__SEC:'))
    : [];
  return {
    ...summary,
    positions: (Array.isArray(row.positions) ? row.positions : []).map(sanitizePosition).filter(Boolean) as any,
    tradeHistory: (Array.isArray(row.trade_history) ? row.trade_history : []).map(sanitizeTrade).filter(Boolean) as any,
    watchlist,
    equityHistory: sanitizeEquityHistory(row.equity_history, summary.createdAt, summary.initialCash),
  };
}

/** Resúmenes de partidas (todas, o sólo las indicadas). null si no hay conexión. */
export async function fetchGameSummaries(ids?: string[]): Promise<GameSummary[] | null> {
  try {
    let query = getSupabase().from('games').select(SUMMARY_COLUMNS);
    if (ids) {
      if (ids.length === 0) return [];
      query = query.in('id', ids);
    }
    const { data, error } = await query.order('total_net_worth', { ascending: false }).limit(500);
    if (error || !data) return null;
    return data.map(rowToSummary);
  } catch {
    return null;
  }
}

export type FetchGameResult = { status: 'ok'; game: GameSaveData } | { status: 'not_found' } | { status: 'offline' };

export async function fetchGame(gameId: string): Promise<FetchGameResult> {
  try {
    const { data, error } = await getSupabase().from('games').select('*').eq('id', gameId).maybeSingle();
    if (error) return { status: 'offline' };
    if (!data) return { status: 'not_found' };
    return { status: 'ok', game: rowToGame(data) };
  } catch {
    return { status: 'offline' };
  }
}

export interface RpcResult {
  ok: boolean;
  error?: string;
  token?: string | null;
  updated_at?: number;
  retry_after?: number;
  attempts_left?: number;
}

async function callRpc(name: string, args: Record<string, unknown>): Promise<RpcResult> {
  try {
    const { data, error } = await getSupabase().rpc(name, args);
    if (error) {
      // PGRST202 = la función no existe: falta ejecutar la migración SQL
      if (error.code === 'PGRST202' || /Could not find the function/i.test(error.message)) {
        return { ok: false, error: 'MIGRATION_MISSING' };
      }
      return { ok: false, error: 'SERVER' };
    }
    return (data as RpcResult) ?? { ok: false, error: 'SERVER' };
  } catch {
    return { ok: false, error: 'NETWORK' };
  }
}

export const gamesRpc = {
  create: (id: string, name: string, initialCash: number, pin?: string) =>
    callRpc('sg_create_game', { p_id: id, p_name: name, p_initial_cash: initialCash, p_pin: pin || null }),

  save: (game: GameSaveData, token: string | null) =>
    callRpc('sg_save_game', {
      p_id: game.id,
      p_token: token,
      p_state: {
        name: game.name,
        initial_cash: game.initialCash,
        cash_available: game.cashAvailable,
        cash_invested: game.cashInvested,
        total_net_worth: game.totalNetWorth,
        total_pnl: game.totalPnL,
        total_pnl_percent: game.totalPnLPercent,
        positions: game.positions,
        trade_history: game.tradeHistory,
        watchlist: game.watchlist,
        equity_history: game.equityHistory,
      },
    }),

  unlock: (id: string, pin: string) => callRpc('sg_unlock_game', { p_id: id, p_pin: pin }),

  setPin: (id: string, token: string | null, newPin: string | null) =>
    callRpc('sg_set_pin', { p_id: id, p_token: token, p_new_pin: newPin }),

  remove: (id: string, token: string | null) => callRpc('sg_delete_game', { p_id: id, p_token: token }),
};

/** Escucha cambios de UNA partida (otro dispositivo guardó o la borró). */
export function subscribeToGame(gameId: string, onChange: (event: 'UPDATE' | 'DELETE') => void): () => void {
  const supabase = getSupabase();
  try {
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload: any) => onChange(payload.eventType === 'DELETE' ? 'DELETE' : 'UPDATE')
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}
