import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GameSaveData, GameSummary } from '../types/market';

const STORAGE_KEYS = {
  SUPABASE_URL: 'apex_supabase_url_v1',
  SUPABASE_ANON_KEY: 'apex_supabase_anon_key_v1',
};

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseCredentials(): { url: string; key: string } | null {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey) {
    return { url: envUrl, key: envKey };
  }

  try {
    const savedUrl = localStorage.getItem(STORAGE_KEYS.SUPABASE_URL);
    const savedKey = localStorage.getItem(STORAGE_KEYS.SUPABASE_ANON_KEY);
    if (savedUrl && savedKey) {
      return { url: savedUrl.trim(), key: savedKey.trim() };
    }
  } catch {}

  return null;
}

export function saveSupabaseCredentials(url: string, key: string): boolean {
  try {
    const cleanUrl = url.trim();
    const cleanKey = key.trim();
    if (!cleanUrl || !cleanKey) return false;

    localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, cleanUrl);
    localStorage.setItem(STORAGE_KEYS.SUPABASE_ANON_KEY, cleanKey);
    supabaseClient = createClient(cleanUrl, cleanKey);
    return true;
  } catch {
    return false;
  }
}

export function clearSupabaseCredentials() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_URL);
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_ANON_KEY);
    supabaseClient = null;
  } catch {}
}

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const creds = getSupabaseCredentials();
  if (creds && creds.url && creds.key) {
    try {
      supabaseClient = createClient(creds.url, creds.key);
      return supabaseClient;
    } catch {
      return null;
    }
  }
  return null;
}

export const isCloudConnected = (): boolean => {
  return getSupabase() !== null;
};

// Fetch all games from Supabase
export async function fetchGamesFromSupabase(): Promise<GameSummary[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('games')
      .select('id, name, initial_cash, cash_available, cash_invested, total_net_worth, total_pnl, total_pnl_percent, positions_count, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error || !data) {
      console.warn('Supabase fetch error:', error?.message);
      return null;
    }

    return data.map((g: any) => ({
      id: g.id,
      name: g.name,
      createdAt: Number(g.created_at),
      updatedAt: Number(g.updated_at),
      initialCash: Number(g.initial_cash),
      cashAvailable: Number(g.cash_available),
      cashInvested: Number(g.cash_invested),
      totalNetWorth: Number(g.total_net_worth),
      totalPnL: Number(g.total_pnl),
      totalPnLPercent: Number(g.total_pnl_percent),
      positionsCount: Number(g.positions_count || 0),
    }));
  } catch (err) {
    console.warn('Supabase exception:', err);
    return null;
  }
}

// Fetch single game data from Supabase
export async function fetchGameDataFromSupabase(gameId: string): Promise<GameSaveData | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId.trim().toUpperCase())
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      createdAt: Number(data.created_at),
      updatedAt: Number(data.updated_at),
      initialCash: Number(data.initial_cash),
      cashAvailable: Number(data.cash_available),
      cashInvested: Number(data.cash_invested),
      totalNetWorth: Number(data.total_net_worth),
      totalPnL: Number(data.total_pnl),
      totalPnLPercent: Number(data.total_pnl_percent),
      positionsCount: Number(data.positions_count || 0),
      positions: data.positions || [],
      tradeHistory: data.trade_history || [],
      watchlist: data.watchlist || [],
    };
  } catch {
    return null;
  }
}

// Upsert game data into Supabase
export async function saveGameToSupabase(game: GameSaveData): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const payload = {
      id: game.id,
      name: game.name,
      initial_cash: game.initialCash,
      cash_available: game.cashAvailable,
      cash_invested: game.cashInvested,
      total_net_worth: game.totalNetWorth,
      total_pnl: game.totalPnL,
      total_pnl_percent: game.totalPnLPercent,
      positions_count: game.positions ? game.positions.length : 0,
      positions: game.positions || [],
      trade_history: game.tradeHistory || [],
      watchlist: game.watchlist || [],
      created_at: game.createdAt || Date.now(),
      updated_at: Date.now(),
    };

    const { error } = await supabase
      .from('games')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase upsert note:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Delete game from Supabase
export async function deleteGameFromSupabase(gameId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId.trim().toUpperCase());

    return !error;
  } catch {
    return false;
  }
}

// Subscribe to real-time database changes from other devices (PC <-> Mobile)
export function subscribeToSupabaseRealtime(onSync: () => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  try {
    const channel = supabase
      .channel('public:games_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games' },
        () => {
          onSync();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}
