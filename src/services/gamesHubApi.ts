import { GameSaveData, GameSummary } from '../types/market';

const REGISTRY_KEY = 'apex_games_registry_v5';
const LOCAL_GAMES_PREFIX = 'apex_game_save_v5_';
const CLOUD_SYNC_TOPIC = 'https://ntfy.sh/apex_trade_games_oz29_v5';

// Unique 6-character game code generator
export function generateGameId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Fetch all games (Local Storage + Cloud Realtime Topic)
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

  // Fetch Cloud sync items with full CORS support
  try {
    const response = await fetch(`${CLOUD_SYNC_TOPIC}/json?poll=1&since=all`, {
      signal: AbortSignal.timeout(3000),
    });

    if (response.ok) {
      const rawText = await response.text();
      const lines = rawText.trim().split('\n').filter(Boolean);
      
      const cloudGamesMap = new Map<string, GameSaveData>();
      lines.forEach((line) => {
        try {
          const item = JSON.parse(line);
          if (item.event === 'message' && item.message) {
            const parsed = JSON.parse(item.message);
            if (parsed && parsed.id) {
              if (parsed._isDeleted) {
                cloudGamesMap.delete(parsed.id);
                localStorage.removeItem(`${LOCAL_GAMES_PREFIX}${parsed.id}`);
              } else {
                const existing = cloudGamesMap.get(parsed.id);
                if (!existing || parsed.updatedAt > existing.updatedAt) {
                  cloudGamesMap.set(parsed.id, parsed);
                  // Cache full game locally
                  localStorage.setItem(`${LOCAL_GAMES_PREFIX}${parsed.id}`, JSON.stringify(parsed));
                }
              }
            }
          }
        } catch {}
      });

      // Merge unique games by ID
      const map = new Map<string, GameSummary>();
      localGames.forEach((g) => map.set(g.id, g));

      cloudGamesMap.forEach((cg) => {
        const summary: GameSummary = {
          id: cg.id,
          name: cg.name,
          createdAt: cg.createdAt,
          updatedAt: cg.updatedAt,
          initialCash: cg.initialCash,
          cashAvailable: cg.cashAvailable,
          cashInvested: cg.cashInvested,
          totalNetWorth: cg.totalNetWorth,
          totalPnL: cg.totalPnL,
          totalPnLPercent: cg.totalPnLPercent,
          positionsCount: cg.positions ? cg.positions.length : 0,
        };
        const existing = map.get(cg.id);
        if (!existing || summary.updatedAt > existing.updatedAt) {
          map.set(cg.id, summary);
        }
      });

      const merged = Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Cloud realtime sync note:', err);
  }

  return localGames.sort((a, b) => b.updatedAt - a.updatedAt);
}

// Save or update game in Cloud and Local (Instant 0ms + Cloud Broadcast)
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

  // 3. Broadcast to Real-Time Cloud Topic (Cross-Device PC & Mobile Sync)
  try {
    fetch(CLOUD_SYNC_TOPIC, {
      method: 'POST',
      headers: {
        'Title': `Apex Game ${game.name}`,
        'Tags': 'chart_with_upwards_trend',
      },
      body: JSON.stringify(fullData),
    }).catch(() => {});
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

  return true;
}

// Load a specific game's full data
export async function loadGameData(gameId: string): Promise<GameSaveData | null> {
  const cleanId = gameId.trim().toUpperCase();

  // Try local first (instant)
  try {
    const local = localStorage.getItem(`${LOCAL_GAMES_PREFIX}${cleanId}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && parsed.id) return parsed;
    }
  } catch {}

  // Try loading from Cloud
  try {
    const response = await fetch(`${CLOUD_SYNC_TOPIC}/json?poll=1&since=all`, {
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const rawText = await response.text();
      const lines = rawText.trim().split('\n').filter(Boolean);
      let targetGame: GameSaveData | null = null;

      lines.forEach((line) => {
        try {
          const item = JSON.parse(line);
          if (item.event === 'message' && item.message) {
            const parsed = JSON.parse(item.message);
            if (parsed && parsed.id === cleanId && !parsed._isDeleted) {
              if (!targetGame || parsed.updatedAt > targetGame.updatedAt) {
                targetGame = parsed;
              }
            }
          }
        } catch {}
      });

      if (targetGame) {
        localStorage.setItem(`${LOCAL_GAMES_PREFIX}${cleanId}`, JSON.stringify(targetGame));
        return targetGame;
      }
    }
  } catch {}

  return null;
}

// Delete a game from Cloud and Local
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

  // Broadcast deletion to cloud
  try {
    fetch(CLOUD_SYNC_TOPIC, {
      method: 'POST',
      body: JSON.stringify({ id: cleanId, _isDeleted: true, updatedAt: Date.now() }),
    }).catch(() => {});
  } catch {}

  return true;
}

// Subscribe to real-time SSE updates from other devices (PC <-> Mobile)
export function subscribeToRealtimeCloud(onUpdate: (game: GameSaveData) => void): () => void {
  if (typeof EventSource === 'undefined') return () => {};

  try {
    const eventSource = new EventSource(`${CLOUD_SYNC_TOPIC}/sse`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'message' && data.message) {
          const gamePayload = JSON.parse(data.message);
          if (gamePayload && gamePayload.id && !gamePayload._isDeleted) {
            localStorage.setItem(`${LOCAL_GAMES_PREFIX}${gamePayload.id}`, JSON.stringify(gamePayload));
            onUpdate(gamePayload);
          }
        }
      } catch {}
    };

    return () => {
      eventSource.close();
    };
  } catch {
    return () => {};
  }
}
