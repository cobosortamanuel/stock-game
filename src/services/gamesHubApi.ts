import { GameSaveData, GameSummary } from '../types/market';

const REGISTRY_KEY = 'apex_games_registry_v3';
const LOCAL_GAMES_PREFIX = 'apex_game_save_v3_';

// Unique ID generator for games
export function generateGameId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Fetch all created games from Local Storage (0ms, zero CORS errors)
export async function fetchAllGames(): Promise<GameSummary[]> {
  let localGames: GameSummary[] = [];

  try {
    const local = localStorage.getItem(REGISTRY_KEY);
    if (local) {
      localGames = JSON.parse(local);
    }
  } catch {
    localGames = [];
  }

  return localGames.sort((a, b) => b.updatedAt - a.updatedAt);
}

// Save or update game in Local Storage immediately
export async function syncGameToCloudAndLocal(game: GameSaveData): Promise<boolean> {
  const summary: GameSummary = {
    id: game.id,
    name: game.name,
    createdAt: game.createdAt,
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

  // 1. Instant persistence in LocalStorage
  try {
    localStorage.setItem(`${LOCAL_GAMES_PREFIX}${game.id}`, JSON.stringify(fullData));
  } catch (e) {
    console.warn('LocalStorage save warning:', e);
  }

  // 2. Update local registry
  let localRegistry: GameSummary[] = [];
  try {
    const reg = localStorage.getItem(REGISTRY_KEY);
    if (reg) localRegistry = JSON.parse(reg);
  } catch {}

  const updatedRegistry = [
    summary,
    ...localRegistry.filter((g) => g.id !== game.id),
  ].sort((a, b) => b.updatedAt - a.updatedAt);

  localStorage.setItem(REGISTRY_KEY, JSON.stringify(updatedRegistry));

  return true;
}

// Rename a game
export async function renameGameById(gameId: string, newName: string): Promise<boolean> {
  const cleanId = gameId.trim().toUpperCase();
  const cleanName = newName.trim();
  if (!cleanName) return false;

  // Load existing
  const existing = await loadGameData(cleanId);
  if (existing) {
    existing.name = cleanName;
    existing.updatedAt = Date.now();
    await syncGameToCloudAndLocal(existing);
    return true;
  }

  // Update registry
  let localRegistry: GameSummary[] = [];
  try {
    const reg = localStorage.getItem(REGISTRY_KEY);
    if (reg) localRegistry = JSON.parse(reg);
  } catch {}

  const updated = localRegistry.map((g) =>
    g.id === cleanId ? { ...g, name: cleanName, updatedAt: Date.now() } : g
  );
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(updated));
  return true;
}

// Load a specific game's full data
export async function loadGameData(gameId: string): Promise<GameSaveData | null> {
  const cleanId = gameId.trim().toUpperCase();

  try {
    const local = localStorage.getItem(`${LOCAL_GAMES_PREFIX}${cleanId}`);
    if (local) {
      return JSON.parse(local);
    }
  } catch {}

  return null;
}

// Delete a game
export async function deleteGameById(gameId: string): Promise<boolean> {
  const cleanId = gameId.trim().toUpperCase();

  localStorage.removeItem(`${LOCAL_GAMES_PREFIX}${cleanId}`);

  let registry: GameSummary[] = [];
  try {
    const reg = localStorage.getItem(REGISTRY_KEY);
    if (reg) registry = JSON.parse(reg);
  } catch {}

  const updatedRegistry = registry.filter((g) => g.id !== cleanId);
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(updatedRegistry));

  return true;
}
