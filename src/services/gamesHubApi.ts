import { GameSaveData, GameSummary } from '../types/market';
import {
  isCloudConnected,
  fetchGamesFromSupabase,
  fetchGameDataFromSupabase,
  saveGameToSupabase,
  deleteGameFromSupabase,
} from './supabaseService';

const REGISTRY_KEY = 'apex_games_registry_v8';
const LOCAL_GAMES_PREFIX = 'apex_game_save_v8_';

// Unique 6-character game code generator
export function generateGameId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Synchronous fetch of local games registry
export function getAllGamesSync(): GameSummary[] {
  try {
    const local = localStorage.getItem(REGISTRY_KEY);
    if (local) {
      const parsed: GameSummary[] = JSON.parse(local);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
      }
    }
  } catch {}
  return [];
}

// Fetch all games (Supabase Cloud is the source of truth when connected)
export async function fetchAllGames(): Promise<GameSummary[]> {
  if (isCloudConnected()) {
    try {
      const cloudGames = await fetchGamesFromSupabase();
      if (cloudGames !== null) {
        try {
          localStorage.setItem(REGISTRY_KEY, JSON.stringify(cloudGames));
        } catch {}
        return cloudGames;
      }
    } catch {}
  }

  return getAllGamesSync();
}

// Synchronous fetch of single game data from local storage
export function getSavedGameSync(gameId: string): GameSaveData | null {
  const cleanId = gameId.trim().toUpperCase();
  try {
    const local = localStorage.getItem(`${LOCAL_GAMES_PREFIX}${cleanId}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && parsed.id) return parsed;
    }
  } catch {}
  return null;
}

// Synchronous local persistence + background Supabase sync
export function syncGameToCloudAndLocal(game: GameSaveData): boolean {
  if (!game || !game.id) return false;

  const summary: GameSummary = {
    id: game.id,
    name: game.name,
    createdAt: game.createdAt || Date.now(),
    updatedAt: Date.now(),
    initialCash: game.initialCash,
    cashAvailable: game.cashAvailable,
    cashInvested: game.cashInvested,
    totalNetWorth: game.totalNetWorth,
    totalPnL: game.totalPnL,
    totalPnLPercent: game.totalPnLPercent,
    positionsCount: game.positions ? game.positions.length : 0,
  };

  const fullData: GameSaveData = {
    ...game,
    updatedAt: summary.updatedAt,
  };

  // 1. Instant local persistence (Synchronous 0ms)
  try {
    localStorage.setItem(`${LOCAL_GAMES_PREFIX}${game.id}`, JSON.stringify(fullData));
  } catch (e) {
    console.warn('LocalStorage save warning:', e);
  }

  // 2. Update local registry
  const localRegistry = getAllGamesSync();
  const updatedRegistry = [
    summary,
    ...localRegistry.filter((g) => g.id !== game.id),
  ].sort((a, b) => b.updatedAt - a.updatedAt);

  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(updatedRegistry));
  } catch {}

  // 3. Cloud Sync (if Supabase is connected)
  if (isCloudConnected()) {
    saveGameToSupabase(fullData).catch(() => {});
  }

  return true;
}

// Rename a game with immediate local & cloud update
export async function renameGameById(gameId: string, newName: string): Promise<boolean> {
  const cleanId = gameId.trim().toUpperCase();
  const cleanName = newName.trim();
  if (!cleanName) return false;

  const existing = await loadGameData(cleanId);
  if (existing) {
    existing.name = cleanName;
    existing.updatedAt = Date.now();
    syncGameToCloudAndLocal(existing);
    return true;
  }

  const localRegistry = getAllGamesSync();
  const updated = localRegistry.map((g) =>
    g.id === cleanId ? { ...g, name: cleanName, updatedAt: Date.now() } : g
  );
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(updated));
  } catch {}

  return true;
}

// Load a specific game's full data
export async function loadGameData(gameId: string): Promise<GameSaveData | null> {
  const cleanId = gameId.trim().toUpperCase();

  // Try local first
  const local = getSavedGameSync(cleanId);
  if (local) return local;

  // If not found locally and cloud is connected, load from Supabase
  if (isCloudConnected()) {
    try {
      const cloudData = await fetchGameDataFromSupabase(cleanId);
      if (cloudData) {
        try {
          localStorage.setItem(`${LOCAL_GAMES_PREFIX}${cleanId}`, JSON.stringify(cloudData));
        } catch {}
        return cloudData;
      }
    } catch {}
  }

  return null;
}

// Delete a game permanently from local storage and Supabase
export async function deleteGameById(gameId: string): Promise<boolean> {
  const cleanId = gameId.trim().toUpperCase();

  // 1. Remove from local storage immediately
  try {
    localStorage.removeItem(`${LOCAL_GAMES_PREFIX}${cleanId}`);
    const registry = getAllGamesSync();
    const updatedRegistry = registry.filter((g) => g.id !== cleanId);
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(updatedRegistry));
  } catch {}

  // 2. Remove from Supabase
  if (isCloudConnected()) {
    try {
      await deleteGameFromSupabase(cleanId);
    } catch {}
  }

  return true;
}
