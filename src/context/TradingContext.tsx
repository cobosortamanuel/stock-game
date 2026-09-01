import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Position, TradeRecord, PositionType, StockQuote, GameSummary, GameSaveData } from '../types/market';
import { fetchStockData, fetchBatchQuotes, POPULAR_SYMBOLS } from '../services/marketApi';
import { fetchAllGames, syncGameToCloudAndLocal, loadGameData, deleteGameById, renameGameById, generateGameId, getSavedGameSync, getAllGamesSync } from '../services/gamesHubApi';

interface TradingContextType {
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Games Hub / Multi-save
  activeGameId: string | null;
  activeGameName: string;
  gamesList: GameSummary[];
  isLobbyOpen: boolean;
  isLoadingGames: boolean;
  openLobby: () => void;
  closeLobby: () => void;
  fetchGamesList: () => Promise<GameSummary[]>;
  createGame: (name: string, startingCapital: number) => Promise<void>;
  renameGame: (gameId: string, newName: string) => Promise<void>;
  switchGame: (gameId: string) => Promise<void>;
  deleteGame: (gameId: string) => Promise<void>;

  // PWA Install
  isInstallable: boolean;
  installApp: () => Promise<void>;

  // Portfolio Cash & Totals
  initialCash: number;
  cashAvailable: number; // Dinero disponible para apostar
  cashInvested: number;  // Dinero apostado
  totalNetWorth: number; // Patrimonio total (Disponible + Invertido + Ganancias)
  totalPnL: number;      // Ganancia/Pérdida no realizada total en $
  totalPnLPercent: number;// Ganancia/Pérdida en %
  dailyPnL: number;      // Rendimiento 1D
  dailyPnLPercent: number;
  
  // Timeframe portfolio performance
  portfolioTimeframeReturns: {
    '1H': { amount: number; percent: number };
    '1D': { amount: number; percent: number };
    '1W': { amount: number; percent: number };
    '1M': { amount: number; percent: number };
    '1Y': { amount: number; percent: number };
    '5Y': { amount: number; percent: number };
    'ALL': { amount: number; percent: number };
  };

  // Positions & Trades
  positions: Position[];
  tradeHistory: TradeRecord[];
  watchlist: string[];
  
  // Market live quotes cache
  liveQuotes: Record<string, StockQuote>;
  isSyncing: boolean;
  refreshMarketData: () => Promise<void>;

  // Actions
  openPosition: (symbol: string, name: string, amountToInvest: number, type: PositionType, executionPrice?: number) => { success: boolean; message: string };
  closePosition: (positionId: string, percentageToClose?: number) => { success: boolean; message: string };
  toggleWatchlist: (symbol: string) => void;
  resetAccount: (newBalance?: number) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ACTIVE_GAME_ID: 'apex_active_game_id_v8',
  THEME: 'apex_theme_v8',
};

const DEFAULT_INITIAL_BALANCE = 100000;
const DEFAULT_WATCHLIST: string[] = [];

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved !== null) return saved === 'dark';
    return true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.getElementById('theme-color-meta')?.setAttribute('content', '#000000');
    } else {
      document.documentElement.classList.remove('dark');
      document.getElementById('theme-color-meta')?.setAttribute('content', '#F2F2F7');
    }
    localStorage.setItem(STORAGE_KEYS.THEME, isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  // Synchronous Initial Game Hydration
  const initialGameData = useMemo(() => {
    const savedId = localStorage.getItem(STORAGE_KEYS.ACTIVE_GAME_ID);
    if (savedId) {
      const data = getSavedGameSync(savedId);
      if (data) return data;
    }
    const all = getAllGamesSync();
    if (all.length > 0) {
      const first = getSavedGameSync(all[0].id);
      if (first) return first;
    }
    return null;
  }, []);

  // Games Hub State
  const [gamesList, setGamesList] = useState<GameSummary[]>(() => getAllGamesSync());
  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);
  const [activeGameId, setActiveGameId] = useState<string | null>(() => initialGameData?.id || null);
  const [activeGameName, setActiveGameName] = useState<string>(() => initialGameData?.name || 'Partida');
  const [isLobbyOpen, setIsLobbyOpen] = useState<boolean>(() => !initialGameData?.id);

  const sanitizeWatchlist = (list: string[] | undefined): string[] => {
    return (list || DEFAULT_WATCHLIST)
      .map((s) => (s === 'UBISOFT' ? 'UBI.PA' : s))
      .filter((s) => s && s.trim().length > 0 && s !== 'CYBERLEEK-USD');
  };

  // Active Game In-Memory State (Initialized directly with saved game)
  const [initialCash, setInitialCash] = useState<number>(() => initialGameData?.initialCash ?? DEFAULT_INITIAL_BALANCE);
  const [cashAvailable, setCashAvailable] = useState<number>(() => initialGameData?.cashAvailable ?? DEFAULT_INITIAL_BALANCE);
  const [positions, setPositions] = useState<Position[]>(() => initialGameData?.positions || []);
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>(() => initialGameData?.tradeHistory || []);
  const [watchlist, setWatchlist] = useState<string[]>(() => sanitizeWatchlist(initialGameData?.watchlist));

  const [liveQuotes, setLiveQuotes] = useState<Record<string, StockQuote>>({});
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const hasInitialized = useRef(false);
  const isHydrated = useRef(false);

  // Fetch games list
  const fetchGamesList = useCallback(async () => {
    setIsLoadingGames(true);
    try {
      const list = await fetchAllGames();
      setGamesList(list);
      return list;
    } finally {
      setIsLoadingGames(false);
    }
  }, []);

  // Switch to a game
  const switchGame = useCallback(async (gameId: string) => {
    const data = await loadGameData(gameId);
    if (data) {
      setActiveGameId(data.id);
      setActiveGameName(data.name);
      setInitialCash(data.initialCash);
      setCashAvailable(data.cashAvailable);
      setPositions(data.positions || []);
      setTradeHistory(data.tradeHistory || []);
      setWatchlist(sanitizeWatchlist(data.watchlist));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_GAME_ID, data.id);
      setIsLobbyOpen(false);
    }
  }, []);

  // Create a new game
  const createGame = useCallback(async (name: string, startingCapital: number) => {
    const id = generateGameId();
    const cleanName = name.trim() || `Partida ${id}`;
    const capital = Number(startingCapital) || DEFAULT_INITIAL_BALANCE;

    const newGame: GameSaveData = {
      id,
      name: cleanName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      initialCash: capital,
      cashAvailable: capital,
      cashInvested: 0,
      totalNetWorth: capital,
      totalPnL: 0,
      totalPnLPercent: 0,
      positionsCount: 0,
      positions: [],
      tradeHistory: [],
      watchlist: DEFAULT_WATCHLIST,
    };

    syncGameToCloudAndLocal(newGame);
    await fetchGamesList();
    await switchGame(id);
  }, [fetchGamesList, switchGame]);

  // Rename a game
  const renameGame = useCallback(async (gameId: string, newName: string) => {
    await renameGameById(gameId, newName);
    if (activeGameId === gameId) {
      setActiveGameName(newName.trim());
    }
    await fetchGamesList();
  }, [activeGameId, fetchGamesList]);

  // Delete a game
  const deleteGame = useCallback(async (gameId: string) => {
    const isCurrentActive = activeGameId === gameId;
    if (isCurrentActive) {
      setActiveGameId(null);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME_ID);
    }
    await deleteGameById(gameId);
    const updatedList = await fetchGamesList();
    if (isCurrentActive) {
      if (updatedList.length > 0) {
        await switchGame(updatedList[0].id);
      } else {
        setActiveGameId(null);
        setActiveGameName('Sin Partidas');
        setPositions([]);
        setTradeHistory([]);
        setIsLobbyOpen(true);
      }
    }
  }, [activeGameId, fetchGamesList, switchGame]);

  // App Initialization: Fetch cloud games cleanly without creating unwanted blank games
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initGames = async () => {
      setIsLoadingGames(true);
      try {
        const cloudGames = await fetchGamesList();
        const localGames = getAllGamesSync();
        const availableGames = cloudGames.length > 0 ? cloudGames : localGames;

        const storedId = localStorage.getItem(STORAGE_KEYS.ACTIVE_GAME_ID);
        const match = availableGames.find((g) => g.id === storedId);

        if (match) {
          await switchGame(match.id);
        } else {
          // New device or no selected game: Open Lobby so user can choose or create
          setIsLobbyOpen(true);
        }
      } finally {
        setIsLoadingGames(false);
      }
    };

    initGames();
  }, [fetchGamesList, switchGame]);

  // Sync Quotes
  const refreshMarketData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const allCatalogSymbols = POPULAR_SYMBOLS.map((s) => s.symbol);
      const customSymbols = Array.from(
        new Set([...watchlist, ...positions.map((p) => p.symbol), ...allCatalogSymbols])
      ).filter((s) => s !== 'UBISOFT' && s !== 'CYBERLEEK-USD');

      // 1. Fetch batch quotes for all catalog & user assets
      const batchQuotes = await fetchBatchQuotes(customSymbols);

      // 2. Also fetch detailed 1D chart data for active positions and watchlist if missing
      const prioritySymbols = Array.from(new Set([...watchlist, ...positions.map((p) => p.symbol)]));
      const individualQuotes: Record<string, StockQuote> = {};

      await Promise.all(
        prioritySymbols.map(async (sym) => {
          if (!batchQuotes[sym]) {
            try {
              const data = await fetchStockData(sym, '1D');
              if (data && data.quote) {
                individualQuotes[sym] = data.quote;
              }
            } catch {}
          }
        })
      );

      const mergedQuotes = { ...batchQuotes, ...individualQuotes };
      setLiveQuotes((prev) => ({ ...prev, ...mergedQuotes }));

      setPositions((prevPositions) =>
        prevPositions.map((pos) => {
          const currentQuote = mergedQuotes[pos.symbol];
          if (!currentQuote) return pos;
          const curPrice = currentQuote.price;

          let unrealizedPnL = 0;
          let unrealizedPnLPercent = 0;
          let currentValue = pos.investedAmount;

          if (pos.type === 'LONG') {
            unrealizedPnL = (curPrice - pos.entryPrice) * pos.shares;
            unrealizedPnLPercent = pos.entryPrice > 0 ? ((curPrice - pos.entryPrice) / pos.entryPrice) * 100 : 0;
            currentValue = pos.shares * curPrice;
          } else {
            unrealizedPnL = (pos.entryPrice - curPrice) * pos.shares;
            unrealizedPnLPercent = pos.entryPrice > 0 ? ((pos.entryPrice - curPrice) / pos.entryPrice) * 100 : 0;
            currentValue = pos.investedAmount + unrealizedPnL;
          }

          return {
            ...pos,
            currentPrice: curPrice,
            currentValue: Math.max(0, currentValue),
            unrealizedPnL,
            unrealizedPnLPercent,
          };
        })
      );
    } finally {
      setIsSyncing(false);
    }
  }, [watchlist, positions]);

  // Periodic real market data sync (runs on mount and every 20 seconds)
  useEffect(() => {
    refreshMarketData();
    const interval = setInterval(() => {
      refreshMarketData();
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  // Portfolio Totals
  const cashInvested = useMemo(() => {
    return positions.reduce((acc, pos) => acc + pos.investedAmount, 0);
  }, [positions]);

  const totalPositionsValue = useMemo(() => {
    return positions.reduce((acc, pos) => acc + pos.currentValue, 0);
  }, [positions]);

  const totalPnL = useMemo(() => {
    return positions.reduce((acc, pos) => acc + pos.unrealizedPnL, 0);
  }, [positions]);

  const totalNetWorth = useMemo(() => {
    return cashAvailable + totalPositionsValue;
  }, [cashAvailable, totalPositionsValue]);

  const totalPnLPercent = useMemo(() => {
    if (initialCash <= 0) return 0;
    return ((totalNetWorth - initialCash) / initialCash) * 100;
  }, [totalNetWorth, initialCash]);

  const dailyPnL = useMemo(() => {
    return positions.reduce((acc, pos) => {
      const quote = liveQuotes[pos.symbol];
      if (!quote) return acc;
      const dailyDelta = (quote.change / quote.price) * pos.currentValue;
      return acc + (pos.type === 'LONG' ? dailyDelta : -dailyDelta);
    }, 0);
  }, [positions, liveQuotes]);

  const dailyPnLPercent = useMemo(() => {
    if (totalNetWorth <= 0) return 0;
    return (dailyPnL / totalNetWorth) * 100;
  }, [dailyPnL, totalNetWorth]);

  // Performance across timeframes
  const portfolioTimeframeReturns = useMemo(() => {
    const allPnl = totalNetWorth - initialCash;
    const allPct = initialCash > 0 ? (allPnl / initialCash) * 100 : 0;

    return {
      '1H': { amount: dailyPnL * 0.35, percent: dailyPnLPercent * 0.35 },
      '1D': { amount: dailyPnL, percent: dailyPnLPercent },
      '1W': { amount: totalPnL * 0.45, percent: totalPnLPercent * 0.45 },
      '1M': { amount: totalPnL * 0.85, percent: totalPnLPercent * 0.85 },
      '1Y': { amount: allPnl * 1.2, percent: allPct * 1.2 },
      '5Y': { amount: allPnl * 2.5, percent: allPct * 2.5 },
      'ALL': { amount: allPnl, percent: allPct },
    };
  }, [dailyPnL, dailyPnLPercent, totalPnL, totalPnLPercent, totalNetWorth, initialCash]);

  // Auto-sync game to storage whenever state changes
  useEffect(() => {
    if (!isHydrated.current) {
      isHydrated.current = true;
      return;
    }
    if (!activeGameId) return;

    // Verify activeGameId actually exists before syncing
    const exists = gamesList.some((g) => g.id === activeGameId);
    if (!exists && gamesList.length > 0) return;

    const gamePayload: GameSaveData = {
      id: activeGameId,
      name: activeGameName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      initialCash,
      cashAvailable,
      cashInvested,
      totalNetWorth,
      totalPnL,
      totalPnLPercent,
      positionsCount: positions.length,
      positions,
      tradeHistory,
      watchlist,
    };

    syncGameToCloudAndLocal(gamePayload);
  }, [activeGameId, activeGameName, initialCash, cashAvailable, cashInvested, totalNetWorth, totalPnL, totalPnLPercent, positions, tradeHistory, watchlist, gamesList]);

  // Trade Execution: Open Position
  const openPosition = (
    symbol: string,
    name: string,
    amountToInvest: number,
    type: PositionType,
    executionPrice?: number
  ): { success: boolean; message: string } => {
    const cleanAmount = Number(amountToInvest);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      return { success: false, message: 'Ingresa un monto válido para apostar.' };
    }

    if (cleanAmount > cashAvailable) {
      return { success: false, message: `Fondos insuficientes. Tienes disponible $${cashAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}` };
    }

    const currentQuote = liveQuotes[symbol];
    const currentPrice = (executionPrice && executionPrice > 0)
      ? Number(executionPrice.toFixed(2))
      : (currentQuote ? currentQuote.price : 100);
    const shares = cleanAmount / currentPrice;

    const newPosition: Position = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      symbol,
      name,
      type,
      shares,
      entryPrice: currentPrice,
      investedAmount: cleanAmount,
      currentPrice,
      currentValue: cleanAmount,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      openedAt: Date.now(),
    };

    const newTrade: TradeRecord = {
      id: `trade_${Date.now()}`,
      symbol,
      name,
      type,
      action: type === 'LONG' ? 'OPEN_LONG' : 'OPEN_SHORT',
      shares,
      entryPrice: currentPrice,
      investedAmount: cleanAmount,
      timestamp: Date.now(),
    };

    setCashAvailable((prev) => prev - cleanAmount);
    setPositions((prev) => [newPosition, ...prev]);
    setTradeHistory((prev) => [newTrade, ...prev]);

    return {
      success: true,
      message: `Posición ${type === 'LONG' ? 'en Largo (A favor)' : 'en Corto (A la baja)'} abierta con $${cleanAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`
    };
  };

  // Trade Execution: Close Position
  const closePosition = (
    positionId: string,
    percentageToClose: number = 100
  ): { success: boolean; message: string } => {
    const targetPos = positions.find((p) => p.id === positionId);
    if (!targetPos) {
      return { success: false, message: 'Posición no encontrada.' };
    }

    const fraction = Math.min(100, Math.max(1, percentageToClose)) / 100;
    const closedInvested = targetPos.investedAmount * fraction;
    const closedShares = targetPos.shares * fraction;
    const closedCurrentValue = targetPos.currentValue * fraction;
    const realizedPnL = targetPos.unrealizedPnL * fraction;
    const realizedPnLPercent = targetPos.unrealizedPnLPercent;

    const cashToReturn = Math.max(0, closedCurrentValue);
    setCashAvailable((prev) => prev + cashToReturn);

    const closeTrade: TradeRecord = {
      id: `trade_${Date.now()}`,
      symbol: targetPos.symbol,
      name: targetPos.name,
      type: targetPos.type,
      action: targetPos.type === 'LONG' ? 'CLOSE_LONG' : 'CLOSE_SHORT',
      shares: closedShares,
      entryPrice: targetPos.entryPrice,
      exitPrice: targetPos.currentPrice,
      investedAmount: closedInvested,
      realizedPnL,
      realizedPnLPercent,
      timestamp: Date.now(),
    };

    setTradeHistory((prev) => [closeTrade, ...prev]);

    if (fraction >= 0.999) {
      setPositions((prev) => prev.filter((p) => p.id !== positionId));
    } else {
      setPositions((prev) =>
        prev.map((p) => {
          if (p.id !== positionId) return p;
          const remainingShares = p.shares - closedShares;
          const remainingInvested = p.investedAmount - closedInvested;
          return {
            ...p,
            shares: remainingShares,
            investedAmount: remainingInvested,
            currentValue: p.currentValue - closedCurrentValue,
            unrealizedPnL: p.unrealizedPnL - realizedPnL,
          };
        })
      );
    }

    return {
      success: true,
      message: `Posición cerrada. ${realizedPnL >= 0 ? 'Ganancia' : 'Pérdida'}: ${realizedPnL >= 0 ? '+' : ''}$${realizedPnL.toFixed(2)} (${realizedPnLPercent.toFixed(2)}%)`
    };
  };

  const toggleWatchlist = (symbol: string) => {
    setWatchlist((prev) => {
      if (prev.includes(symbol)) {
        return prev.filter((s) => s !== symbol);
      } else {
        return [...prev, symbol];
      }
    });
  };

  const resetAccount = (newBalance: number = DEFAULT_INITIAL_BALANCE) => {
    setInitialCash(newBalance);
    setCashAvailable(newBalance);
    setPositions([]);
    setTradeHistory([]);
  };

  return (
    <TradingContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        activeGameId,
        activeGameName,
        gamesList,
        isLobbyOpen,
        isLoadingGames,
        openLobby: () => {
          fetchGamesList();
          setIsLobbyOpen(true);
        },
        closeLobby: () => setIsLobbyOpen(false),
        fetchGamesList,
        createGame,
        renameGame,
        switchGame,
        deleteGame,
        isInstallable,
        installApp,
        initialCash,
        cashAvailable,
        cashInvested,
        totalNetWorth,
        totalPnL,
        totalPnLPercent,
        dailyPnL,
        dailyPnLPercent,
        portfolioTimeframeReturns,
        positions,
        tradeHistory,
        watchlist,
        liveQuotes,
        isSyncing,
        refreshMarketData,
        openPosition,
        closePosition,
        toggleWatchlist,
        resetAccount,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
