import { GameSaveData, GameSummary } from '../types/market';

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

// Synchronous fetch of games registry
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

// Fetch all games async wrapper
export async function fetchAllGames(): Promise<GameSummary[]> {
  return getAllGamesSync();
}

// Synchronous fetch of single game data
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

// Synchronous immediate local persistence
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

  // 1. Instant local persistence
  try {
    localStorage.setItem(`${LOCAL_GAMES_PREFIX}${game.id}`, JSON.stringify(fullData));
  } catch (e) {
    console.warn('LocalStorage save warning:', e);
  }

  // 2. Update local registry
  let localRegistry = getAllGamesSync();
  const updatedRegistry = [
    summary,
    ...localRegistry.filter((g) => g.id !== game.id),
  ].sort((a, b) => b.updatedAt - a.updatedAt);

  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(updatedRegistry));
  } catch {}

  return true;
}

// Rename a game
export async function renameGameById(gameId: string, newName: string): Promise<boolean> {
  const cleanId = gameId.trim().toUpperCase();
  const cleanName = newName.trim();
  if (!cleanName) return false;

  const existing = getSavedGameSync(cleanId);
  if (existing) {
    existing.name = cleanName;
    existing.updatedAt = Date.now();
    syncGameToCloudAndLocal(existing);
    return true;
  }

  let localRegistry = getAllGamesSync();
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
  return getSavedGameSync(gameId);
}

// Delete a game
export async function deleteGameById(gameId: string): Promise<boolean> {
  const cleanId = gameId.trim().toUpperCase();

  try {
    localStorage.removeItem(`${LOCAL_GAMES_PREFIX}${cleanId}`);
    let registry = getAllGamesSync();
    const updatedRegistry = registry.filter((g) => g.id !== cleanId);
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(updatedRegistry));
  } catch {}

  return true;
}
