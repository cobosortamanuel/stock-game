import { GameSaveData, GameSummary } from '../types/market';
import { sanitizeEquityHistory, sanitizePosition, sanitizeTrade } from '../lib/portfolio';
import { fetchGame, fetchGameSummaries, gamesRpc, RpcResult } from './supabaseService';

// Claves de localStorage (prefijo apex_ heredado; no cambiar los sufijos existentes)
const REGISTRY_KEY = 'apex_games_registry_v8'; // resúmenes de mis partidas (caché)
const LOCAL_GAMES_PREFIX = 'apex_game_save_v8_'; // partida completa (caché)
const JOINED_KEY = 'apex_joined_games_v1'; // ids de partidas a las que me he unido en este dispositivo
const TOKENS_KEY = 'apex_game_tokens_v1'; // tokens de dispositivo de partidas con PIN
const PENDING_KEY = 'apex_pending_sync_v1'; // partidas con cambios sin subir

export const DEFAULT_INITIAL_CASH = 10000;
export const GAME_ID_RE = /^[A-Z0-9]{6}$/;
export const PIN_RE = /^[0-9]{4,8}$/;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function normalizeGameId(id: string): string {
  return id.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function generateGameId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

// ---------------------------------------------------------------------
// Partidas unidas en este dispositivo
// ---------------------------------------------------------------------

export function getJoinedIds(): string[] {
  const joined = readJson<string[] | null>(JOINED_KEY, null);
  if (joined) return joined;
  // Primera vez con la versión nueva: heredar las partidas que había en caché
  const legacy = readJson<GameSummary[]>(REGISTRY_KEY, []).map((g) => g.id).filter(Boolean);
  writeJson(JOINED_KEY, legacy);
  return legacy;
}

function setJoinedIds(ids: string[]) {
  writeJson(JOINED_KEY, Array.from(new Set(ids)));
}

export function addJoined(id: string) {
  setJoinedIds([id, ...getJoinedIds().filter((g) => g !== id)]);
}

export function getToken(id: string): string | null {
  return readJson<Record<string, string>>(TOKENS_KEY, {})[id] ?? null;
}

function setToken(id: string, token: string | null | undefined) {
  const tokens = readJson<Record<string, string>>(TOKENS_KEY, {});
  if (token) tokens[id] = token;
  else delete tokens[id];
  writeJson(TOKENS_KEY, tokens);
}

function setPending(id: string, pending: boolean) {
  const map = readJson<Record<string, boolean>>(PENDING_KEY, {});
  if (pending) map[id] = true;
  else delete map[id];
  writeJson(PENDING_KEY, map);
}

export function hasPendingSync(id: string): boolean {
  return !!readJson<Record<string, boolean>>(PENDING_KEY, {})[id];
}

/** Quita la partida de este dispositivo (no la borra de la nube). */
export function forgetGame(id: string) {
  setJoinedIds(getJoinedIds().filter((g) => g !== id));
  setToken(id, null);
  setPending(id, false);
  try {
    localStorage.removeItem(`${LOCAL_GAMES_PREFIX}${id}`);
  } catch {}
  writeJson(
    REGISTRY_KEY,
    getCachedSummaries().filter((g) => g.id !== id)
  );
}

// ---------------------------------------------------------------------
// Caché local
// ---------------------------------------------------------------------

export function getCachedSummaries(): GameSummary[] {
  const joined = new Set(getJoinedIds());
  return readJson<GameSummary[]>(REGISTRY_KEY, []).filter((g) => g && joined.has(g.id));
}

export function getCachedGame(id: string): GameSaveData | null {
  const raw = readJson<any>(`${LOCAL_GAMES_PREFIX}${id}`, null);
  if (!raw || !raw.id) return null;
  const createdAt = Number(raw.createdAt) || Date.now();
  const initialCash = Number(raw.initialCash) || DEFAULT_INITIAL_CASH;
  return {
    id: raw.id,
    name: raw.name || `Partida ${raw.id}`,
    createdAt,
    updatedAt: Number(raw.updatedAt) || createdAt,
    initialCash,
    cashAvailable: Number(raw.cashAvailable) || 0,
    cashInvested: Number(raw.cashInvested) || 0,
    totalNetWorth: Number(raw.totalNetWorth) || initialCash,
    totalPnL: Number(raw.totalPnL) || 0,
    totalPnLPercent: Number(raw.totalPnLPercent) || 0,
    positionsCount: Number(raw.positionsCount) || 0,
    hasPin: !!(raw.hasPin ?? raw.isPrivate),
    positions: (raw.positions || []).map(sanitizePosition).filter(Boolean),
    tradeHistory: (raw.tradeHistory || []).map(sanitizeTrade).filter(Boolean),
    watchlist: (raw.watchlist || []).filter((s: unknown) => typeof s === 'string' && !String(s).startsWith('__SEC:')),
    equityHistory: sanitizeEquityHistory(raw.equityHistory, createdAt, initialCash),
  };
}

function cacheGame(game: GameSaveData) {
  writeJson(`${LOCAL_GAMES_PREFIX}${game.id}`, game);
  const { positions, tradeHistory, watchlist, equityHistory, ...summary } = game;
  writeJson(REGISTRY_KEY, [summary, ...readJson<GameSummary[]>(REGISTRY_KEY, []).filter((g) => g.id !== game.id)]);
}

// ---------------------------------------------------------------------
// Operaciones
// ---------------------------------------------------------------------

/** Mis partidas (las unidas en este dispositivo) con datos frescos de la nube. */
export async function fetchMyGames(): Promise<GameSummary[]> {
  const ids = getJoinedIds();
  const cloud = await fetchGameSummaries(ids);
  if (!cloud) return getCachedSummaries();

  // Las partidas que ya no existen en la nube se olvidan (salvo cambios pendientes de subir)
  const found = new Set(cloud.map((g) => g.id));
  ids.filter((id) => !found.has(id) && !hasPendingSync(id)).forEach(forgetGame);

  const cachedById = new Map(readJson<GameSummary[]>(REGISTRY_KEY, []).map((g) => [g.id, g]));
  cloud.forEach((g) => cachedById.set(g.id, g));
  writeJson(REGISTRY_KEY, Array.from(cachedById.values()));

  const order = new Map(getJoinedIds().map((id, i) => [id, i]));
  return getCachedSummaries().sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

export async function fetchRanking(): Promise<GameSummary[] | null> {
  return fetchGameSummaries();
}

export type LoadGameResult =
  | { status: 'ok'; game: GameSaveData; fromCache: boolean }
  | { status: 'not_found' }
  | { status: 'needs_pin'; summary: GameSummary }
  | { status: 'offline' };

/** Carga una partida de la nube (o de la caché si no hay conexión). */
export async function loadGame(id: string): Promise<LoadGameResult> {
  const remote = await fetchGame(id);
  const cached = getCachedGame(id);

  if (remote.status === 'not_found') return hasPendingSync(id) && cached ? { status: 'ok', game: cached, fromCache: true } : { status: 'not_found' };
  if (remote.status === 'offline') return cached ? { status: 'ok', game: cached, fromCache: true } : { status: 'offline' };

  const game = remote.game;
  if (game.hasPin && !getToken(id)) {
    const { positions, tradeHistory, watchlist, equityHistory, ...summary } = game;
    return { status: 'needs_pin', summary };
  }

  // Si hay cambios locales sin subir más recientes que la nube, mandan los locales
  if (cached && hasPendingSync(id) && cached.updatedAt > game.updatedAt) {
    return { status: 'ok', game: { ...cached, hasPin: game.hasPin }, fromCache: true };
  }
  cacheGame(game);
  return { status: 'ok', game, fromCache: false };
}

export interface GameOpResult {
  ok: boolean;
  game?: GameSaveData;
  updatedAt?: number;
  error?: string;
  needsPin?: boolean;
}

export function describeGameError(r: RpcResult | { error?: string; retry_after?: number; attempts_left?: number }): string {
  switch (r.error) {
    case 'INVALID_PIN':
      return r.attempts_left !== undefined && r.attempts_left <= 3
        ? `PIN incorrecto. Te quedan ${r.attempts_left} intento(s) antes del bloqueo temporal.`
        : 'PIN incorrecto. El PIN tiene entre 4 y 8 dígitos.';
    case 'LOCKED': {
      const min = Math.max(1, Math.ceil((r.retry_after || 60) / 60));
      return `Demasiados intentos fallidos. Vuelve a intentarlo en ${min} min.`;
    }
    case 'NOT_FOUND':
      return 'No existe ninguna partida con ese código.';
    case 'UNAUTHORIZED':
      return 'Esta partida está protegida con PIN. Vuelve a introducirlo.';
    case 'INVALID_CASH':
      return 'El capital inicial no es válido.';
    case 'INVALID_ID':
      return 'El código de partida no es válido.';
    case 'TOO_LARGE':
      return 'La partida es demasiado grande para guardarse.';
    case 'MIGRATION_MISSING':
      return 'Falta actualizar la base de datos (migración SQL pendiente).';
    case 'NETWORK':
      return 'Sin conexión. Inténtalo de nuevo.';
    default:
      return 'No se ha podido completar la operación. Inténtalo de nuevo.';
  }
}

export async function createGame(name: string, initialCash: number, pin?: string): Promise<GameOpResult> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const id = generateGameId();
    const res = await gamesRpc.create(id, name, initialCash, pin);
    if (!res.ok && res.error === 'ID_TAKEN') continue;
    if (!res.ok) return { ok: false, error: describeGameError(res) };

    setToken(id, res.token);
    addJoined(id);
    const now = res.updated_at || Date.now();
    const game: GameSaveData = {
      id,
      name: name.trim().slice(0, 40) || `Partida ${id}`,
      createdAt: now,
      updatedAt: now,
      initialCash,
      cashAvailable: initialCash,
      cashInvested: 0,
      totalNetWorth: initialCash,
      totalPnL: 0,
      totalPnLPercent: 0,
      positionsCount: 0,
      hasPin: !!pin,
      positions: [],
      tradeHistory: [],
      watchlist: [],
      equityHistory: [{ t: now, v: initialCash }],
    };
    cacheGame(game);
    return { ok: true, game };
  }
  return { ok: false, error: 'No se ha podido generar un código libre. Inténtalo de nuevo.' };
}

/** Unirse a una partida por código (y PIN si lo tiene). */
export async function joinGame(rawId: string, pin?: string): Promise<GameOpResult> {
  const id = normalizeGameId(rawId);
  if (!GAME_ID_RE.test(id)) return { ok: false, error: 'El código tiene 6 caracteres (letras y números).' };

  const summaries = await fetchGameSummaries([id]);
  if (!summaries) return { ok: false, error: describeGameError({ error: 'NETWORK' }) };
  const summary = summaries[0];
  if (!summary) return { ok: false, error: describeGameError({ error: 'NOT_FOUND' }) };

  if (summary.hasPin && !getToken(id)) {
    if (!pin) return { ok: false, error: 'Esta partida tiene PIN.', needsPin: true };
    const res = await gamesRpc.unlock(id, pin.trim());
    if (!res.ok) return { ok: false, error: describeGameError(res), needsPin: true };
    setToken(id, res.token);
  }

  addJoined(id);
  const loaded = await loadGame(id);
  if (loaded.status === 'ok') return { ok: true, game: loaded.game };
  if (loaded.status === 'needs_pin') return { ok: false, error: 'Esta partida tiene PIN.', needsPin: true };
  return { ok: false, error: describeGameError({ error: loaded.status === 'not_found' ? 'NOT_FOUND' : 'NETWORK' }) };
}

/** Guarda en local al instante y sube a la nube. */
export async function saveGame(game: GameSaveData): Promise<GameOpResult> {
  cacheGame(game);
  setPending(game.id, true);
  const res = await gamesRpc.save(game, getToken(game.id));
  if (res.ok) {
    setPending(game.id, false);
    return { ok: true, updatedAt: res.updated_at };
  }
  if (res.error === 'UNAUTHORIZED') {
    setToken(game.id, null);
    setPending(game.id, false);
    return { ok: false, error: describeGameError(res), needsPin: true };
  }
  if (res.error === 'NOT_FOUND') setPending(game.id, false);
  return { ok: false, error: res.error || 'SERVER' };
}

export async function setGamePin(id: string, newPin: string | null): Promise<GameOpResult> {
  if (newPin && !PIN_RE.test(newPin)) return { ok: false, error: 'El PIN debe tener entre 4 y 8 dígitos.' };
  const res = await gamesRpc.setPin(id, getToken(id), newPin);
  if (!res.ok) return { ok: false, error: describeGameError(res), needsPin: res.error === 'UNAUTHORIZED' };
  setToken(id, res.token);
  return { ok: true, updatedAt: res.updated_at };
}

export async function deleteGame(id: string): Promise<GameOpResult> {
  const res = await gamesRpc.remove(id, getToken(id));
  if (!res.ok) return { ok: false, error: describeGameError(res) };
  forgetGame(id);
  return { ok: true };
}
