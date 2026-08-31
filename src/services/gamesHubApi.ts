import { GameSaveData, GameSummary } from '../types/market';

const REGISTRY_KEY = 'apex_games_registry_v4';
const LOCAL_GAMES_PREFIX = 'apex_game_save_v4_';
const MASTER_REGISTRY_ID = 'ff808181a058d43f01a0590e88c80270';
const CLOUD_API_BASE = 'https://api.restful-api.dev/objects';

// ID mapping for specific game saves in cloud
const CLOUD_MAP_KEY = 'apex_cloud_id_map_v4';

function getCloudIdMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CLOUD_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setCloudIdMap(map: Record<string, string>) {
  try {
    localStorage.setItem(CLOUD_MAP_KEY, JSON.stringify(map));
  } catch {}
}

// Unique 6-character game code generator
export function generateGameId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Fetch all games from Cloud Master Registry and local storage
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

  // Fetch Cloud Master Registry (with CORS *)
  try {
    const response = await fetch(`${CLOUD_API_BASE}/${MASTER_REGISTRY_ID}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const result = await response.json();
      const cloudGames: GameSummary[] = result?.data?.games || [];

      // Merge unique games by ID, preferring newest updatedAt
      const map = new Map<string, GameSummary>();
      [...localGames, ...cloudGames].forEach((g) => {
        const existing = map.get(g.id);
        if (!existing || g.updatedAt > existing.updatedAt) {
          map.set(g.id, g);
        }
      });

      const merged = Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Cloud registry fetch note:', err);
  }

  return localGames.sort((a, b) => b.updatedAt - a.updatedAt);
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

  // 1. Instant local persistence
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

  // 3. Sync to Cloud Registry & Game Object
  try {
    // Update Master Registry on Cloud
    fetch(`${CLOUD_API_BASE}/${MASTER_REGISTRY_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'apex_master_registry_oz29',
        data: { games: updatedRegistry },
      }),
    }).catch(() => {});

    // Save full game data object to Cloud
    const idMap = getCloudIdMap();
    const cloudObjectId = idMap[game.id];

    if (cloudObjectId) {
      fetch(`${CLOUD_API_BASE}/${cloudObjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `apex_game_${game.id}`,
          data: fullData,
        }),
      }).catch(() => {});
    } else {
      fetch(`${CLOUD_API_BASE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `apex_game_${game.id}`,
          data: fullData,
        }),
      })
        .then((res) => res.json())
        .then((created) => {
          if (created && created.id) {
            idMap[game.id] = created.id;
            setCloudIdMap(idMap);
          }
        })
        .catch(() => {});
    }
  } catch (err) {
    console.warn('Cloud sync error note:', err);
  }

  return true;
}

// Rename a game across Cloud & Local
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

  // Sync renamed registry to cloud
  try {
    fetch(`${CLOUD_API_BASE}/${MASTER_REGISTRY_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'apex_master_registry_oz29',
        data: { games: updated },
      }),
    }).catch(() => {});
  } catch {}

  return true;
}

// Load a specific game's full data
export async function loadGameData(gameId: string): Promise<GameSaveData | null> {
  const cleanId = gameId.trim().toUpperCase();

  // Try local first
  try {
    const local = localStorage.getItem(`${LOCAL_GAMES_PREFIX}${cleanId}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && parsed.id) return parsed;
    }
  } catch {}

  // Try loading from cloud
  try {
    const idMap = getCloudIdMap();
    const cloudObjectId = idMap[cleanId];
    if (cloudObjectId) {
      const res = await fetch(`${CLOUD_API_BASE}/${cloudObjectId}`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const item = await res.json();
        if (item?.data?.id) {
          localStorage.setItem(`${LOCAL_GAMES_PREFIX}${cleanId}`, JSON.stringify(item.data));
          return item.data;
        }
      }
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

  // Update cloud registry
  try {
    fetch(`${CLOUD_API_BASE}/${MASTER_REGISTRY_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'apex_master_registry_oz29',
        data: { games: updatedRegistry },
      }),
    }).catch(() => {});
  } catch {}

  return true;
}
