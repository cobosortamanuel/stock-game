import { EquityPoint, GameSaveData, GameSummary } from '../types/market';
import { sanitizeEquityHistory, sanitizePosition, sanitizeTrade } from '../lib/portfolio';
import { sanitizePendingOrder } from '../lib/history';

// Lecturas y RPC con fetch directo a la API REST de Supabase (sin cargar supabase-js).
// La librería sólo se descarga, en segundo plano, para la conexión en tiempo real.

const env = (import.meta as any).env || {};
const SUPABASE_URL: string = env.VITE_SUPABASE_URL || 'https://vvxfewktdsltzsxfumio.supabase.co';
const SUPABASE_KEY: string = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_RXWhW8Lu_vIehqKQJAPsQw_GkvczmaZ';

const headers = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };

const SUMMARY_COLUMNS =
  'id,name,initial_cash,cash_available,cash_invested,total_net_worth,total_pnl,total_pnl_percent,positions_count,has_pin,created_at,updated_at';

export interface RankingEntry extends GameSummary {
  dailyHistory: EquityPoint[];
}

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

function cleanPoints(raw: any): EquityPoint[] {
  return Array.isArray(raw)
    ? raw.filter((p: any) => p && isFinite(p.t) && isFinite(p.v)).map((p: any) => ({ t: p.t, v: p.v }))
    : [];
}

export function rowToGame(row: any): GameSaveData {
  const summary = rowToSummary(row);
  return {
    ...summary,
    positions: (Array.isArray(row.positions) ? row.positions : []).map(sanitizePosition).filter(Boolean) as any,
    tradeHistory: (Array.isArray(row.trade_history) ? row.trade_history : []).map(sanitizeTrade).filter(Boolean) as any,
    watchlist: Array.isArray(row.watchlist)
      ? row.watchlist.filter((s: unknown) => typeof s === 'string' && s.trim() && !s.startsWith('__SEC:'))
      : [],
    equityHistory: sanitizeEquityHistory(row.equity_history, summary.createdAt, summary.initialCash),
    pendingOrders: (Array.isArray(row.pending_orders) ? row.pending_orders : []).map(sanitizePendingOrder).filter(Boolean) as any,
    dailyHistory: cleanPoints(row.daily_history),
  };
}

async function rest(path: string): Promise<any[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Resúmenes de partidas (todas, o sólo las indicadas). null si no hay conexión. */
export async function fetchGameSummaries(ids?: string[]): Promise<GameSummary[] | null> {
  if (ids && ids.length === 0) return [];
  const filter = ids ? `&id=in.(${ids.map(encodeURIComponent).join(',')})` : '';
  const rows = await rest(`games?select=${SUMMARY_COLUMNS}${filter}&order=total_net_worth.desc&limit=500`);
  return rows ? rows.map(rowToSummary) : null;
}

/** Ranking: resúmenes + histórico diario (para la clasificación por periodos). */
export async function fetchRankingEntries(): Promise<RankingEntry[] | null> {
  const rows = await rest(`games?select=${SUMMARY_COLUMNS},daily_history&order=total_net_worth.desc&limit=500`);
  return rows ? rows.map((r) => ({ ...rowToSummary(r), dailyHistory: cleanPoints(r.daily_history) })) : null;
}

export type FetchGameResult = { status: 'ok'; game: GameSaveData } | { status: 'not_found' } | { status: 'offline' };

export async function fetchGame(gameId: string): Promise<FetchGameResult> {
  const rows = await rest(`games?select=*&id=eq.${encodeURIComponent(gameId)}`);
  if (!rows) return { status: 'offline' };
  if (rows.length === 0) return { status: 'not_found' };
  return { status: 'ok', game: rowToGame(rows[0]) };
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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      // PGRST202 = la función no existe: falta ejecutar la migración SQL
      if (data?.code === 'PGRST202') return { ok: false, error: 'MIGRATION_MISSING' };
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
        pending_orders: game.pendingOrders,
      },
    }),

  unlock: (id: string, pin: string) => callRpc('sg_unlock_game', { p_id: id, p_pin: pin }),

  setPin: (id: string, token: string | null, newPin: string | null) =>
    callRpc('sg_set_pin', { p_id: id, p_token: token, p_new_pin: newPin }),

  remove: (id: string, token: string | null) => callRpc('sg_delete_game', { p_id: id, p_token: token }),
};

/** Escucha cambios de UNA partida (otro dispositivo o la tarea diaria guardaron). */
export function subscribeToGame(gameId: string, onChange: () => void): () => void {
  let cancelled = false;
  let cleanup: (() => void) | null = null;

  import('@supabase/supabase-js')
    .then(({ createClient }) => {
      if (cancelled) return;
      const client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
      const channel = client
        .channel(`game:${gameId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, () => onChange())
        .subscribe();
      cleanup = () => {
        client.removeChannel(channel);
      };
    })
    .catch(() => {
      // Sin tiempo real: la app sigue sincronizando al volver a la pestaña
    });

  return () => {
    cancelled = true;
    cleanup?.();
  };
}
