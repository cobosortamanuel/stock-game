import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EquityPoint, GameSaveData, GameSummary, PendingOrder, PositionType, PositionView, StockQuote, TradeRecord } from '../types/market';
import { fetchDailyBars, formatCurrency, getMarketStatus, isAlwaysOpen } from '../services/marketApi';
import {
  applyPendingFills,
  DAY_MS,
  historyStart,
  mergeHistories,
  reconstructDailyHistory,
  symbolsNeeded,
} from '../lib/history';
import {
  createGame as apiCreateGame,
  deleteGame as apiDeleteGame,
  DEFAULT_INITIAL_CASH,
  fetchMyGames,
  forgetGame,
  GameOpResult,
  getCachedGame,
  getCachedSummaries,
  getJoinedIds,
  getToken,
  hasPendingSync,
  joinGame as apiJoinGame,
  loadGame,
  saveGame,
  setGamePin,
} from '../services/gamesHubApi';
import { subscribeToGame } from '../services/supabaseService';
import { useMarketQuotes } from '../hooks/useMarketQuotes';
import {
  compactEquityHistory,
  EQUITY_SNAPSHOT_INTERVAL,
  FxRates,
  getFxRate,
  summarizePortfolio,
} from '../lib/portfolio';

export type SyncStatus = 'synced' | 'saving' | 'offline' | 'error';

export interface LobbyNotice {
  message: string;
  /** Si se indica, el lobby abre directamente el formulario para unirse a esta partida */
  joinGameId?: string;
}

type ActionResult = { success: boolean; message: string };

interface TradingContextType {
  // Tema y PWA
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isInstallable: boolean;
  installApp: () => Promise<void>;

  // Partida activa y lobby
  activeGameId: string | null;
  activeGameName: string;
  activeGameHasPin: boolean;
  activeGameCreatedAt: number;
  myGames: GameSummary[];
  isLoadingGames: boolean;
  refreshMyGames: () => Promise<void>;
  isLobbyOpen: boolean;
  lobbyNotice: LobbyNotice | null;
  openLobby: () => void;
  closeLobby: () => void;
  createGame: (name: string, initialCash: number, pin?: string) => Promise<GameOpResult>;
  joinGame: (code: string, pin?: string) => Promise<GameOpResult>;
  switchGame: (gameId: string) => Promise<GameOpResult>;
  leaveGame: (gameId: string) => void;
  deleteActiveGame: () => Promise<GameOpResult>;
  renameActiveGame: (name: string) => void;
  setActiveGamePin: (pin: string | null) => Promise<GameOpResult>;
  syncStatus: SyncStatus;

  // Cartera
  initialCash: number;
  cashAvailable: number;
  cashInvested: number;
  positionsValue: number;
  totalNetWorth: number;
  totalPnL: number;
  totalPnLPercent: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  equityHistory: EquityPoint[];
  /** Histórico completo de patrimonio: cierres diarios + puntos intradía */
  netWorthHistory: EquityPoint[];
  pendingOrders: PendingOrder[];
  positions: PositionView[];
  tradeHistory: TradeRecord[];
  watchlist: string[];

  // Mercado
  liveQuotes: Record<string, StockQuote>;
  fxRates: FxRates;
  isSyncing: boolean;
  lastQuotesUpdate: number | null;
  refreshMarketData: () => Promise<void>;
  ensureQuotes: (symbols: string[], maxAgeMs?: number) => Promise<void>;
  mergeQuote: (quote: StockQuote) => void;
  mergeQuotes: (quotes: StockQuote[]) => void;

  // Operaciones
  openPosition: (quote: StockQuote, amountUsd: number, type: PositionType) => ActionResult;
  closePosition: (positionId: string, percentageToClose?: number) => ActionResult;
  cancelOrder: (orderId: string) => void;
  toggleWatchlist: (symbol: string) => void;
  resetAccount: () => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ACTIVE_GAME_ID: 'apex_active_game_id_v8',
  THEME: 'apex_theme_v8',
};

const SAVE_DEBOUNCE_MS = 800;
const HISTORY_CHECK_MS = 5 * 60 * 1000;

/** USD reservados en órdenes de compra pendientes */
const reservedOf = (g: GameSaveData | null) =>
  g ? g.pendingOrders.reduce((acc, o) => acc + (o.kind === 'OPEN' ? o.amount || 0 : 0), 0) : 0;

/** El mercado del activo está cerrado (las criptomonedas nunca cierran) */
const isMarketClosed = (q: StockQuote | undefined) => !!q && !isAlwaysOpen(q) && getMarketStatus(q) === 'CLOSED';
const round2 = (v: number) => Math.round(v * 100) / 100;

function readInitialGame(): GameSaveData | null {
  try {
    const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_GAME_ID);
    if (!id || !getJoinedIds().includes(id)) return null;
    const cached = getCachedGame(id);
    if (!cached) return null;
    if (cached.hasPin && !getToken(id)) return null;
    return cached;
  } catch {
    return null;
  }
}

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ------------------------------------------------------------------
  // Tema
  // ------------------------------------------------------------------
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved === null ? true : saved === 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.getElementById('theme-color-meta')?.setAttribute('content', isDarkMode ? '#000000' : '#F2F2F7');
    localStorage.setItem(STORAGE_KEYS.THEME, isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => setIsDarkMode((prev) => !prev), []);

  // ------------------------------------------------------------------
  // PWA
  // ------------------------------------------------------------------
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  }, [deferredPrompt]);

  // ------------------------------------------------------------------
  // Partida activa
  // ------------------------------------------------------------------
  const [game, setGameState] = useState<GameSaveData | null>(readInitialGame);
  const gameRef = useRef<GameSaveData | null>(game);
  const [myGames, setMyGames] = useState<GameSummary[]>(() => getCachedSummaries());
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [isLobbyOpen, setIsLobbyOpen] = useState<boolean>(() => !game);
  const [lobbyNotice, setLobbyNotice] = useState<LobbyNotice | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');

  const lastSyncedAtRef = useRef<number>(game?.updatedAt ?? 0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);

  const setGame = useCallback((next: GameSaveData | null) => {
    gameRef.current = next;
    setGameState(next);
  }, []);

  // ------------------------------------------------------------------
  // Cotizaciones
  // ------------------------------------------------------------------
  const getTracked = useCallback(() => {
    const g = gameRef.current;
    if (!g) return { symbols: [], currencies: [] };
    return {
      symbols: Array.from(new Set([...g.positions.map((p) => p.symbol), ...g.watchlist])),
      currencies: Array.from(new Set(g.positions.map((p) => p.currency || 'USD'))),
    };
  }, []);

  const market = useMarketQuotes(getTracked);
  const { ensureQuotes, mergeQuote } = market;
  const quotesRef = useRef(market.quotes);
  const fxRef = useRef(market.fxRates);
  quotesRef.current = market.quotes;
  fxRef.current = market.fxRates;

  // Al cambiar las posiciones o favoritos, pedir sus cotizaciones
  const trackedKey = game ? [...game.positions.map((p) => p.symbol), ...game.watchlist].sort().join(',') : '';
  useEffect(() => {
    if (trackedKey) ensureQuotes(trackedKey.split(','), 30_000);
  }, [trackedKey, ensureQuotes]);

  // ------------------------------------------------------------------
  // Valores derivados
  // ------------------------------------------------------------------
  const summary = useMemo(
    () =>
      game
        ? summarizePortfolio(game.positions, game.cashAvailable, game.initialCash, market.quotes, market.fxRates, reservedOf(game))
        : summarizePortfolio([], 0, 0, {}, {}),
    [game, market.quotes, market.fxRates]
  );
  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  // ------------------------------------------------------------------
  // Guardado
  // ------------------------------------------------------------------
  const handleLostAccess = useCallback(
    (gameId: string, message: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      if (gameRef.current?.id === gameId) {
        setGame(null);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME_ID);
      }
      setLobbyNotice({ message, joinGameId: gameId });
      setIsLobbyOpen(true);
    },
    [setGame]
  );

  const flushSave = useCallback(async (): Promise<void> => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const current = gameRef.current;
    if (!current) return;
    if (savingRef.current) {
      dirtyRef.current = true;
      return;
    }

    savingRef.current = true;
    dirtyRef.current = false;
    setSyncStatus('saving');

    const totals = summarizePortfolio(
      current.positions,
      current.cashAvailable,
      current.initialCash,
      quotesRef.current,
      fxRef.current,
      reservedOf(current)
    );
    const payload: GameSaveData = {
      ...current,
      cashInvested: round2(totals.cashInvested),
      totalNetWorth: round2(totals.totalNetWorth),
      totalPnL: round2(totals.totalNetWorth - current.initialCash),
      totalPnLPercent: Number(totals.totalPnLPercent.toFixed(4)),
      positionsCount: current.positions.length,
      updatedAt: Date.now(),
    };

    const res = await saveGame(payload);
    savingRef.current = false;

    if (gameRef.current?.id === current.id) {
      if (res.ok) {
        lastSyncedAtRef.current = res.updatedAt ?? Date.now();
        setSyncStatus('synced');
      } else if (res.needsPin) {
        handleLostAccess(current.id, 'El PIN de esta partida ha cambiado. Vuelve a introducirlo para seguir jugando.');
        return;
      } else {
        setSyncStatus(res.error === 'NETWORK' ? 'offline' : 'error');
      }
    }

    if (dirtyRef.current) await flushSave();
  }, [handleLostAccess]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      flushSave();
    }, SAVE_DEBOUNCE_MS);
  }, [flushSave]);

  /** Aplica un cambio local a la partida y programa el guardado. */
  const updateGame = useCallback(
    (mutator: (g: GameSaveData) => GameSaveData) => {
      const current = gameRef.current;
      if (!current) return;
      setGame(mutator(current));
      scheduleSave();
    },
    [scheduleSave, setGame]
  );

  // ------------------------------------------------------------------
  // Mis partidas / lobby
  // ------------------------------------------------------------------
  const refreshMyGames = useCallback(async () => {
    setIsLoadingGames(true);
    try {
      setMyGames(await fetchMyGames());
    } finally {
      setIsLoadingGames(false);
    }
  }, []);

  const activateGame = useCallback(
    (next: GameSaveData) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      setGame(next);
      lastSyncedAtRef.current = next.updatedAt;
      localStorage.setItem(STORAGE_KEYS.ACTIVE_GAME_ID, next.id);
      setSyncStatus('synced');
      setLobbyNotice(null);
      setIsLobbyOpen(false);
      refreshMyGames();
    },
    [refreshMyGames, setGame]
  );

  const createGame = useCallback(
    async (name: string, initialCash: number, pin?: string) => {
      if (gameRef.current) await flushSave();
      const res = await apiCreateGame(name, initialCash, pin);
      if (res.ok && res.game) activateGame(res.game);
      return res;
    },
    [activateGame, flushSave]
  );

  const joinGame = useCallback(
    async (code: string, pin?: string) => {
      if (gameRef.current) await flushSave();
      const res = await apiJoinGame(code, pin);
      if (res.ok && res.game) activateGame(res.game);
      return res;
    },
    [activateGame, flushSave]
  );

  const switchGame = useCallback(
    async (gameId: string): Promise<GameOpResult> => {
      if (gameRef.current?.id === gameId) {
        setIsLobbyOpen(false);
        return { ok: true };
      }
      if (gameRef.current) await flushSave();
      const res = await loadGame(gameId);
      if (res.status === 'ok') {
        activateGame(res.game);
        if (hasPendingSync(gameId)) scheduleSave();
        return { ok: true, game: res.game };
      }
      if (res.status === 'needs_pin') return { ok: false, error: 'Esta partida tiene PIN.', needsPin: true };
      if (res.status === 'not_found') {
        forgetGame(gameId);
        refreshMyGames();
        return { ok: false, error: 'Esta partida ya no existe.' };
      }
      return { ok: false, error: 'Sin conexión. Inténtalo de nuevo.' };
    },
    [activateGame, flushSave, refreshMyGames, scheduleSave]
  );

  const leaveGame = useCallback(
    (gameId: string) => {
      forgetGame(gameId);
      if (gameRef.current?.id === gameId) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        setGame(null);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME_ID);
        setIsLobbyOpen(true);
      }
      refreshMyGames();
    },
    [refreshMyGames, setGame]
  );

  const deleteActiveGame = useCallback(async (): Promise<GameOpResult> => {
    const current = gameRef.current;
    if (!current) return { ok: false, error: 'No hay ninguna partida activa.' };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    const res = await apiDeleteGame(current.id);
    if (res.ok) {
      setGame(null);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME_ID);
      setIsLobbyOpen(true);
      refreshMyGames();
    }
    return res;
  }, [refreshMyGames, setGame]);

  const renameActiveGame = useCallback(
    (name: string) => {
      const clean = name.trim().slice(0, 40);
      if (!clean) return;
      updateGame((g) => ({ ...g, name: clean }));
      setMyGames((list) => list.map((g) => (g.id === gameRef.current?.id ? { ...g, name: clean } : g)));
    },
    [updateGame]
  );

  const setActiveGamePin = useCallback(
    async (pin: string | null): Promise<GameOpResult> => {
      const current = gameRef.current;
      if (!current) return { ok: false, error: 'No hay ninguna partida activa.' };
      const res = await setGamePin(current.id, pin);
      if (res.ok && gameRef.current?.id === current.id) {
        setGame({ ...gameRef.current, hasPin: !!pin });
        if (res.updatedAt) lastSyncedAtRef.current = res.updatedAt;
      } else if (!res.ok && res.needsPin) {
        handleLostAccess(current.id, res.error);
      }
      return res;
    },
    [handleLostAccess, setGame]
  );

  const openLobby = useCallback(() => {
    setLobbyNotice(null);
    setIsLobbyOpen(true);
    refreshMyGames();
  }, [refreshMyGames]);

  const closeLobby = useCallback(() => {
    if (gameRef.current) {
      setIsLobbyOpen(false);
      setLobbyNotice(null);
    }
  }, []);

  // ------------------------------------------------------------------
  // Carga inicial y cambios remotos
  // ------------------------------------------------------------------
  const reloadActiveFromCloud = useCallback(async () => {
    const current = gameRef.current;
    if (!current) return;
    // Si hay cambios locales sin guardar, no pisarlos
    if (savingRef.current || saveTimerRef.current) return;

    const res = await loadGame(current.id);
    if (gameRef.current?.id !== current.id || savingRef.current || saveTimerRef.current) return;

    if (res.status === 'ok') {
      if (res.fromCache) {
        if (hasPendingSync(current.id)) scheduleSave();
        return;
      }
      if (res.game.updatedAt > lastSyncedAtRef.current) {
        setGame(res.game);
        lastSyncedAtRef.current = res.game.updatedAt;
      }
    } else if (res.status === 'needs_pin') {
      handleLostAccess(current.id, 'Esta partida ahora está protegida con PIN. Introdúcelo para seguir jugando.');
    } else if (res.status === 'not_found') {
      forgetGame(current.id);
      setGame(null);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME_ID);
      setLobbyNotice({ message: 'La partida en la que estabas ha sido eliminada.' });
      setIsLobbyOpen(true);
      refreshMyGames();
    }
  }, [handleLostAccess, refreshMyGames, scheduleSave, setGame]);

  // Arranque
  useEffect(() => {
    refreshMyGames();
    if (gameRef.current) {
      reloadActiveFromCloud();
    } else {
      // Partida activa con PIN y sin token en este dispositivo: pedir el PIN
      const storedId = localStorage.getItem(STORAGE_KEYS.ACTIVE_GAME_ID);
      if (storedId && getJoinedIds().includes(storedId)) {
        const cached = getCachedGame(storedId);
        if (cached?.hasPin && !getToken(storedId)) {
          setLobbyNotice({ message: 'Introduce el PIN para volver a tu partida.', joinGameId: storedId });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambios desde otros dispositivos
  const activeGameId = game?.id ?? null;
  useEffect(() => {
    if (!activeGameId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = subscribeToGame(activeGameId, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(reloadActiveFromCloud, 500);
    });

    let lastCheck = 0;
    const onFocus = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastCheck < 5000) return;
      lastCheck = Date.now();
      reloadActiveFromCloud();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      if (timer) clearTimeout(timer);
      unsub();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [activeGameId, reloadActiveFromCloud]);

  // Guardar antes de cerrar la pestaña si hay cambios pendientes
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && saveTimerRef.current) flushSave();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [flushSave]);

  // ------------------------------------------------------------------
  // Historial de patrimonio: un punto cada 15 min con precios frescos
  // ------------------------------------------------------------------
  useEffect(() => {
    const current = gameRef.current;
    if (!current || !market.lastUpdated) return;
    const now = Date.now();
    const allPriced = summaryRef.current.views.every((p) => {
      const q = quotesRef.current[p.symbol];
      return p.hasPrice && q && now - q.fetchedAt < 5 * 60 * 1000;
    });
    if (!allPriced) return;
    const last = current.equityHistory[current.equityHistory.length - 1];
    if (last && now - last.t < EQUITY_SNAPSHOT_INTERVAL) return;
    const value = round2(summaryRef.current.totalNetWorth);
    updateGame((g) => ({ ...g, equityHistory: compactEquityHistory([...g.equityHistory, { t: now, v: value }], now) }));
  }, [market.lastUpdated, updateGame]);

  // ------------------------------------------------------------------
  // Operaciones
  // ------------------------------------------------------------------
  const openPosition = useCallback(
    (quote: StockQuote, amountUsd: number, type: PositionType): ActionResult => {
      const current = gameRef.current;
      if (!current) return { success: false, message: 'Primero crea o únete a una partida.' };

      const amount = Math.round(Number(amountUsd) * 100) / 100;
      if (!isFinite(amount) || amount <= 0) return { success: false, message: 'Introduce un importe válido.' };
      if (amount > current.cashAvailable + 0.005) {
        return { success: false, message: `Saldo insuficiente. Tienes ${formatCurrency(current.cashAvailable)} disponibles.` };
      }
      if (!quote || !(quote.price > 0)) return { success: false, message: 'No hay cotización disponible para este activo.' };

      if (isMarketClosed(quote)) {
        const now = Date.now();
        updateGame((g) => ({
          ...g,
          cashAvailable: Math.max(0, round2(g.cashAvailable - amount)),
          pendingOrders: [
            ...g.pendingOrders,
            {
              id: `ord_${now}_${Math.random().toString(36).slice(2, 8)}`,
              kind: 'OPEN',
              symbol: quote.symbol,
              name: quote.name,
              type,
              currency: quote.currency,
              createdAt: now,
              amount,
            },
          ],
        }));
        return {
          success: true,
          message: `Orden programada: ${type === 'LONG' ? 'compra' : 'venta en corto'} de ${quote.symbol} por ${formatCurrency(amount)} al precio de apertura del próximo día de mercado.`,
        };
      }

      const fx = getFxRate(quote.currency, fxRef.current);
      if (!fx) {
        mergeQuote(quote);
        return { success: false, message: `Cargando el tipo de cambio ${quote.currency}/USD. Inténtalo en unos segundos.` };
      }

      const now = Date.now();
      const shares = amount / (quote.price * fx);
      const uid = `${now}_${Math.random().toString(36).slice(2, 8)}`;

      mergeQuote({ ...quote, fetchedAt: quote.fetchedAt || now });
      updateGame((g) => ({
        ...g,
        cashAvailable: Math.max(0, round2(g.cashAvailable - amount)),
        positions: [
          {
            id: `pos_${uid}`,
            symbol: quote.symbol,
            name: quote.name,
            type,
            shares,
            entryPrice: quote.price,
            investedAmount: amount,
            openedAt: now,
            currency: quote.currency,
            entryFx: fx,
          },
          ...g.positions,
        ],
        tradeHistory: [
          {
            id: `trade_${uid}`,
            symbol: quote.symbol,
            name: quote.name,
            type,
            action: type === 'LONG' ? 'OPEN_LONG' : 'OPEN_SHORT',
            shares,
            entryPrice: quote.price,
            investedAmount: amount,
            timestamp: now,
            currency: quote.currency,
          },
          ...g.tradeHistory,
        ],
      }));

      return {
        success: true,
        message:
          type === 'LONG'
            ? `Has comprado ${shares.toFixed(4)} acciones de ${quote.symbol} por ${formatCurrency(amount)}.`
            : `Has abierto un corto en ${quote.symbol} por ${formatCurrency(amount)}.`,
      };
    },
    [mergeQuote, updateGame]
  );

  const closePosition = useCallback(
    (positionId: string, percentageToClose: number = 100): ActionResult => {
      const view = summaryRef.current.views.find((p) => p.id === positionId);
      if (!view) return { success: false, message: 'Posición no encontrada.' };
      const current = gameRef.current;
      if (current?.pendingOrders.some((o) => o.kind === 'CLOSE' && o.positionId === positionId)) {
        return { success: false, message: 'Ya hay una orden de cierre pendiente para esta posición.' };
      }

      if (isMarketClosed(quotesRef.current[view.symbol])) {
        const now = Date.now();
        const fraction = Math.min(100, Math.max(1, percentageToClose)) / 100;
        updateGame((g) => ({
          ...g,
          pendingOrders: [
            ...g.pendingOrders,
            {
              id: `ord_${now}_${Math.random().toString(36).slice(2, 8)}`,
              kind: 'CLOSE',
              symbol: view.symbol,
              name: view.name,
              type: view.type,
              currency: view.currency || 'USD',
              createdAt: now,
              positionId,
              fraction,
            },
          ],
        }));
        return {
          success: true,
          message: `Cierre programado (${Math.round(fraction * 100)}%) al precio de apertura del próximo día de mercado.`,
        };
      }

      if (!view.hasPrice) {
        ensureQuotes([view.symbol], 0);
        return { success: false, message: `Todavía no hay cotización de ${view.symbol}. Inténtalo en unos segundos.` };
      }

      const fraction = Math.min(100, Math.max(1, percentageToClose)) / 100;
      const isFull = fraction >= 0.999;
      const realizedPnL = view.unrealizedPnL * fraction;
      const cashBack = view.currentValue * fraction;
      const now = Date.now();

      updateGame((g) => ({
        ...g,
        cashAvailable: round2(g.cashAvailable + cashBack),
        positions: isFull
          ? g.positions.filter((p) => p.id !== positionId)
          : g.positions.map((p) =>
              p.id === positionId
                ? { ...p, shares: p.shares * (1 - fraction), investedAmount: p.investedAmount * (1 - fraction) }
                : p
            ),
        tradeHistory: [
          {
            id: `trade_${now}_${Math.random().toString(36).slice(2, 8)}`,
            symbol: view.symbol,
            name: view.name,
            type: view.type,
            action: view.type === 'LONG' ? 'CLOSE_LONG' : 'CLOSE_SHORT',
            shares: view.shares * fraction,
            entryPrice: view.entryPrice,
            exitPrice: view.currentPrice,
            investedAmount: view.investedAmount * fraction,
            realizedPnL,
            realizedPnLPercent: view.unrealizedPnLPercent,
            timestamp: now,
            currency: view.currency,
          },
          ...g.tradeHistory,
        ],
      }));

      return {
        success: true,
        message: `Posición cerrada. ${realizedPnL >= 0 ? 'Ganancia' : 'Pérdida'}: ${realizedPnL >= 0 ? '+' : ''}${formatCurrency(realizedPnL)}`,
      };
    },
    [ensureQuotes, updateGame]
  );

  const cancelOrder = useCallback(
    (orderId: string) => {
      updateGame((g) => {
        const order = g.pendingOrders.find((o) => o.id === orderId);
        if (!order) return g;
        return {
          ...g,
          cashAvailable: round2(g.cashAvailable + (order.kind === 'OPEN' ? order.amount || 0 : 0)),
          pendingOrders: g.pendingOrders.filter((o) => o.id !== orderId),
        };
      });
    },
    [updateGame]
  );

  // ------------------------------------------------------------------
  // Órdenes pendientes e histórico diario
  // ------------------------------------------------------------------
  const [localDaily, setLocalDaily] = useState<{ gameId: string; points: EquityPoint[] } | null>(null);
  const historyCheckRef = useRef<{ gameId: string; at: number } | null>(null);

  const processHistoryAndOrders = useCallback(async () => {
    const current = gameRef.current;
    if (!current) return;
    const now = Date.now();

    // 1. Ejecutar órdenes pendientes cuya sesión ya abrió (precio de apertura real)
    if (current.pendingOrders.length > 0) {
      const since = Math.min(...current.pendingOrders.map((o) => o.createdAt)) - 3 * DAY_MS;
      const symbols = symbolsNeeded({ tradeHistory: [], positions: current.positions, pendingOrders: current.pendingOrders });
      const bars = await fetchDailyBars(symbols, since);
      if (gameRef.current?.id === current.id) {
        const { filled } = applyPendingFills(gameRef.current, bars, now);
        if (filled > 0) updateGame((g) => applyPendingFills(g, bars, now).game);
      }
    }

    // 2. Histórico diario: si el servidor aún no lo ha calculado (o va con retraso), reconstruirlo aquí
    const g = gameRef.current;
    if (!g || g.id !== current.id) return;
    const lastServer = g.dailyHistory[g.dailyHistory.length - 1]?.t ?? 0;
    const check = historyCheckRef.current;
    const recentlyChecked = check && check.gameId === g.id && now - check.at < 6 * 60 * 60 * 1000;
    if (now - lastServer > 30 * 60 * 60 * 1000 && !recentlyChecked && g.tradeHistory.length > 0) {
      historyCheckRef.current = { gameId: g.id, at: now };
      const start = historyStart(g);
      const bars = await fetchDailyBars(symbolsNeeded(g), start - 3 * DAY_MS);
      if (gameRef.current?.id !== g.id) return;
      const points = reconstructDailyHistory({ start, initialCash: g.initialCash, trades: g.tradeHistory, bars, now });
      setLocalDaily({ gameId: g.id, points });
    }
  }, [updateGame]);

  useEffect(() => {
    if (!activeGameId) return;
    processHistoryAndOrders();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') processHistoryAndOrders();
    }, HISTORY_CHECK_MS);
    return () => clearInterval(interval);
  }, [activeGameId, processHistoryAndOrders]);

  const netWorthHistory = useMemo(() => {
    if (!game) return [];
    const daily =
      localDaily && localDaily.gameId === game.id && (localDaily.points.at(-1)?.t ?? 0) > (game.dailyHistory.at(-1)?.t ?? 0)
        ? localDaily.points
        : game.dailyHistory;
    const start = historyStart(game);
    return mergeHistories(
      daily.filter((p) => p.t >= start),
      game.equityHistory
    );
  }, [game, localDaily]);

  const toggleWatchlist = useCallback(
    (symbol: string) => {
      updateGame((g) => ({
        ...g,
        watchlist: g.watchlist.includes(symbol) ? g.watchlist.filter((s) => s !== symbol) : [...g.watchlist, symbol],
      }));
    },
    [updateGame]
  );

  const resetAccount = useCallback(() => {
    const now = Date.now();
    updateGame((g) => ({
      ...g,
      cashAvailable: g.initialCash,
      positions: [],
      tradeHistory: [],
      pendingOrders: [],
      dailyHistory: [],
      equityHistory: [{ t: now, v: g.initialCash }],
    }));
  }, [updateGame]);

  // ------------------------------------------------------------------
  const value: TradingContextType = {
    isDarkMode,
    toggleDarkMode,
    isInstallable: !!deferredPrompt,
    installApp,

    activeGameId,
    activeGameName: game?.name ?? '',
    activeGameHasPin: !!game?.hasPin,
    activeGameCreatedAt: game?.createdAt ?? Date.now(),
    myGames,
    isLoadingGames,
    refreshMyGames,
    isLobbyOpen: isLobbyOpen || !game,
    lobbyNotice,
    openLobby,
    closeLobby,
    createGame,
    joinGame,
    switchGame,
    leaveGame,
    deleteActiveGame,
    renameActiveGame,
    setActiveGamePin,
    syncStatus,

    initialCash: game?.initialCash ?? DEFAULT_INITIAL_CASH,
    cashAvailable: game?.cashAvailable ?? 0,
    cashInvested: summary.cashInvested,
    positionsValue: summary.positionsValue,
    totalNetWorth: summary.totalNetWorth,
    totalPnL: summary.totalPnL,
    totalPnLPercent: summary.totalPnLPercent,
    dailyPnL: summary.dailyPnL,
    dailyPnLPercent: summary.dailyPnLPercent,
    equityHistory: game?.equityHistory ?? [],
    netWorthHistory,
    pendingOrders: game?.pendingOrders ?? [],
    positions: summary.views,
    tradeHistory: game?.tradeHistory ?? [],
    watchlist: game?.watchlist ?? [],

    liveQuotes: market.quotes,
    fxRates: market.fxRates,
    isSyncing: market.isSyncing,
    lastQuotesUpdate: market.lastUpdated,
    refreshMarketData: market.refresh,
    ensureQuotes,
    mergeQuote,
    mergeQuotes: market.mergeQuotes,

    openPosition,
    closePosition,
    toggleWatchlist,
    resetAccount,
    cancelOrder,
  };

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) throw new Error('useTrading must be used within a TradingProvider');
  return context;
};
