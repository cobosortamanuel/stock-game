import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Position, TradeRecord, PositionType, StockQuote, GameSummary, GameSaveData } from '../types/market';
import { fetchStockData } from '../services/marketApi';
import { fetchAllGames, syncGameToCloudAndLocal, loadGameData, deleteGameById, generateGameId } from '../services/gamesHubApi';

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
  openPosition: (symbol: string, name: string, amountToInvest: number, type: PositionType) => { success: boolean; message: string };
  closePosition: (positionId: string, percentageToClose?: number) => { success: boolean; message: string };
  toggleWatchlist: (symbol: string) => void;
  resetAccount: (newBalance?: number) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ACTIVE_GAME_ID: 'apex_active_game_id_v3',
  THEME: 'apex_theme_v3',
};

const DEFAULT_INITIAL_BALANCE = 100000;
const DEFAULT_WATCHLIST = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'BTC-USD', 'AMZN', 'GOOGL', 'SPY'];

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

  // Games Hub State
  const [gamesList, setGamesList] = useState<GameSummary[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(true);
  const [activeGameId, setActiveGameId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_GAME_ID) || null;
  });
  const [activeGameName, setActiveGameName] = useState<string>('Partida Principal');
  const [isLobbyOpen, setIsLobbyOpen] = useState<boolean>(false);

  // Active Game In-Memory State
  const [initialCash, setInitialCash] = useState<number>(DEFAULT_INITIAL_BALANCE);
  const [cashAvailable, setCashAvailable] = useState<number>(DEFAULT_INITIAL_BALANCE);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);

  const [liveQuotes, setLiveQuotes] = useState<Record<string, StockQuote>>({});
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const hasInitialized = useRef(false);

  // Fetch games list from cloud & local registry
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
      setWatchlist(data.watchlist || DEFAULT_WATCHLIST);
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

    await syncGameToCloudAndLocal(newGame);
    await fetchGamesList();
    await switchGame(id);
  }, [fetchGamesList, switchGame]);

  // Delete a game
  const deleteGame = useCallback(async (gameId: string) => {
    await deleteGameById(gameId);
    const updatedList = await fetchGamesList();
    if (activeGameId === gameId) {
      if (updatedList.length > 0) {
        await switchGame(updatedList[0].id);
      } else {
        // If no games left, create default
        await createGame('Partida Principal', DEFAULT_INITIAL_BALANCE);
      }
    }
  }, [activeGameId, fetchGamesList, switchGame, createGame]);

  // App Initialization: Load games and activate selected or default
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      const list = await fetchGamesList();
      const savedActiveId = localStorage.getItem(STORAGE_KEYS.ACTIVE_GAME_ID);

      if (savedActiveId && list.some((g) => g.id === savedActiveId)) {
        await switchGame(savedActiveId);
      } else if (list.length > 0) {
        await switchGame(list[0].id);
      } else {
        // No games created yet, create initial default game
        await createGame('Partida Principal', DEFAULT_INITIAL_BALANCE);
      }
    };

    init();
  }, [fetchGamesList, switchGame, createGame]);

  // Sync Quotes
  const refreshMarketData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const symbolsToFetch = Array.from(
        new Set([...watchlist, ...positions.map((p) => p.symbol), 'NVDA', 'AAPL', 'TSLA', 'BTC-USD'])
      );

      const quotesMap: Record<string, StockQuote> = { ...liveQuotes };

      await Promise.all(
        symbolsToFetch.map(async (sym) => {
          try {
            const data = await fetchStockData(sym, '1D');
            quotesMap[sym] = data.quote;
          } catch (e) {
            console.error(`Quote sync error for ${sym}`, e);
          }
        })
      );

      setLiveQuotes(quotesMap);

      setPositions((prevPositions) =>
        prevPositions.map((pos) => {
          const currentQuote = quotesMap[pos.symbol];
          const curPrice = currentQuote ? currentQuote.price : pos.currentPrice;

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
  }, [watchlist, positions, liveQuotes]);

  // Background price ticking
  useEffect(() => {
    refreshMarketData();
    const interval = setInterval(() => {
      setLiveQuotes((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((sym) => {
          const tickDelta = (Math.random() - 0.495) * 0.003 * next[sym].price;
          const newPrice = Math.max(0.01, Number((next[sym].price + tickDelta).toFixed(2)));
          const change = Number((newPrice - next[sym].prevClose).toFixed(2));
          const changePercent = next[sym].prevClose > 0 ? Number(((change / next[sym].prevClose) * 100).toFixed(2)) : 0;
          next[sym] = {
            ...next[sym],
            price: newPrice,
            change,
            changePercent,
          };
        });
        return next;
      });

      setPositions((prev) =>
        prev.map((pos) => {
          const currentQuote = liveQuotes[pos.symbol];
          if (!currentQuote) return pos;
          const curPrice = currentQuote.price;

          let pnl = 0;
          let pnlPct = 0;
          let curVal = pos.investedAmount;

          if (pos.type === 'LONG') {
            pnl = (curPrice - pos.entryPrice) * pos.shares;
            pnlPct = pos.entryPrice > 0 ? ((curPrice - pos.entryPrice) / pos.entryPrice) * 100 : 0;
            curVal = pos.shares * curPrice;
          } else {
            pnl = (pos.entryPrice - curPrice) * pos.shares;
            pnlPct = pos.entryPrice > 0 ? ((pos.entryPrice - curPrice) / pos.entryPrice) * 100 : 0;
            curVal = pos.investedAmount + pnl;
          }

          return {
            ...pos,
            currentPrice: curPrice,
            currentValue: Math.max(0, curVal),
            unrealizedPnL: pnl,
            unrealizedPnLPercent: pnlPct,
          };
        })
      );
    }, 4000);

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
      '1D': { amount: dailyPnL, percent: dailyPnLPercent },
      '1W': { amount: totalPnL * 0.45, percent: totalPnLPercent * 0.45 },
      '1M': { amount: totalPnL * 0.85, percent: totalPnLPercent * 0.85 },
      '1Y': { amount: allPnl * 1.2, percent: allPct * 1.2 },
      '5Y': { amount: allPnl * 2.5, percent: allPct * 2.5 },
      'ALL': { amount: allPnl, percent: allPct },
    };
  }, [dailyPnL, dailyPnLPercent, totalPnL, totalPnLPercent, totalNetWorth, initialCash]);

  // Auto-sync game to cloud & local whenever state changes
  useEffect(() => {
    if (!activeGameId) return;

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

    const timer = setTimeout(() => {
      syncGameToCloudAndLocal(gamePayload);
    }, 300);

    return () => clearTimeout(timer);
  }, [activeGameId, activeGameName, initialCash, cashAvailable, cashInvested, totalNetWorth, totalPnL, totalPnLPercent, positions, tradeHistory, watchlist]);

  // Trade Execution: Open Position
  const openPosition = (
    symbol: string,
    name: string,
    amountToInvest: number,
    type: PositionType
  ): { success: boolean; message: string } => {
    const cleanAmount = Number(amountToInvest);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      return { success: false, message: 'Ingresa un monto válido para apostar.' };
    }

    if (cleanAmount > cashAvailable) {
      return { success: false, message: `Fondos insuficientes. Tienes disponible $${cashAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}` };
    }

    const currentQuote = liveQuotes[symbol];
    const currentPrice = currentQuote ? currentQuote.price : 100;
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
