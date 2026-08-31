import { GameSaveData, GameSummary } from '../types/market';

const REGISTRY_KEY = 'apex_games_registry_v1';
const LOCAL_GAMES_PREFIX = 'apex_game_save_';

// Unique ID generator for games
export function generateGameId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Fetch all created games (Cloud + Local fallback merge)
export async function fetchAllGames(): Promise<GameSummary[]> {
  let cloudGames: GameSummary[] = [];

  try {
    const response = await fetch('https://kv.val.run/get?key=apex_public_games_registry_v1', {
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        cloudGames = data;
      }
    }
  } catch (err) {
    console.warn('Could not reach cloud registry directly, checking local storage:', err);
  }

  // Read local registry
  let localGames: GameSummary[] = [];
  try {
    const local = localStorage.getItem(REGISTRY_KEY);
    if (local) {
      localGames = JSON.parse(local);
    }
  } catch {
    localGames = [];
  }

  // Merge unique games by ID, preferring newest updatedAt
  const map = new Map<string, GameSummary>();
  [...localGames, ...cloudGames].forEach((g) => {
    const existing = map.get(g.id);
    if (!existing || g.updatedAt > existing.updatedAt) {
      map.set(g.id, g);
    }
  });

  const merged = Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  // Persist merged locally
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(merged));
  return merged;
}

// Save or update game in Cloud and Local
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

  // 1. Save full game locally
  localStorage.setItem(`${LOCAL_GAMES_PREFIX}${game.id}`, JSON.stringify(fullData));

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

  // 3. Sync to Cloud KV store (both game state and global registry)
  try {
    // Save specific game data
    fetch(`https://kv.val.run/set?key=apex_game_${game.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullData),
    }).catch(() => {});

    // Save updated registry
    fetch('https://kv.val.run/set?key=apex_public_games_registry_v1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRegistry),
    }).catch(() => {});

    return true;
  } catch (e) {
    console.warn('Async cloud sync note:', e);
    return false;
  }
}

// Load a specific game's full data
export async function loadGameData(gameId: string): Promise<GameSaveData | null> {
  const cleanId = gameId.trim().toUpperCase();

  // Try Cloud first for freshest state
  try {
    const response = await fetch(`https://kv.val.run/get?key=apex_game_${cleanId}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.id) {
        localStorage.setItem(`${LOCAL_GAMES_PREFIX}${cleanId}`, JSON.stringify(data));
        return data;
      }
    }
  } catch {
    // Fall back to local
  }

  // Local fallback
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

  // Remove locally
  localStorage.removeItem(`${LOCAL_GAMES_PREFIX}${cleanId}`);

  let registry: GameSummary[] = [];
  try {
    const reg = localStorage.getItem(REGISTRY_KEY);
    if (reg) registry = JSON.parse(reg);
  } catch {}

  const updatedRegistry = registry.filter((g) => g.id !== cleanId);
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(updatedRegistry));

  // Sync delete to Cloud
  try {
    fetch('https://kv.val.run/set?key=apex_public_games_registry_v1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRegistry),
    }).catch(() => {});
  } catch {}

  return true;
}
