import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Position, TradeRecord, PositionType, StockQuote } from '../types/market';
import { fetchStockData } from '../services/marketApi';
import { getSavedCloudId, setSavedCloudId, saveGameToCloud, loadGameFromCloud } from '../services/cloudSync';

interface TradingContextType {
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Cloud Sync
  cloudSaveId: string;
  isCloudSyncing: boolean;
  syncToCloud: () => Promise<{ success: boolean; message: string }>;
  loadFromCloud: (code: string) => Promise<{ success: boolean; message: string }>;

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
  PORTFOLIO: 'apex_portfolio_v2',
  THEME: 'apex_theme_v2',
  WATCHLIST: 'apex_watchlist_v2',
  HISTORY: 'apex_history_v2',
};

const DEFAULT_INITIAL_BALANCE = 100000;
const DEFAULT_WATCHLIST = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'BTC-USD', 'AMZN', 'GOOGL', 'SPY'];

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved !== null) return saved === 'dark';
    return true; // Default dark iOS style
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

  // Cloud ID
  const [cloudSaveId, setCloudSaveId] = useState<string>(() => getSavedCloudId());
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  // Portfolio State
  const [initialCash, setInitialCash] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.initialCash || DEFAULT_INITIAL_BALANCE;
      } catch {
        return DEFAULT_INITIAL_BALANCE;
      }
    }
    return DEFAULT_INITIAL_BALANCE;
  });

  const [cashAvailable, setCashAvailable] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.cashAvailable ?? DEFAULT_INITIAL_BALANCE;
      } catch {
        return DEFAULT_INITIAL_BALANCE;
      }
    }
    return DEFAULT_INITIAL_BALANCE;
  });

  const [positions, setPositions] = useState<Position[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.positions || [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_WATCHLIST;
      }
    }
    return DEFAULT_WATCHLIST;
  });

  const [liveQuotes, setLiveQuotes] = useState<Record<string, StockQuote>>({});
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Persist State to LocalStorage
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.PORTFOLIO,
      JSON.stringify({ initialCash, cashAvailable, positions })
    );
  }, [initialCash, cashAvailable, positions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(tradeHistory));
  }, [tradeHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
  }, [watchlist]);

  // Cloud Sync Handler
  const syncToCloud = useCallback(async () => {
    setIsCloudSyncing(true);
    try {
      const res = await saveGameToCloud(cloudSaveId, {
        initialCash,
        cashAvailable,
        positions,
        tradeHistory,
        watchlist,
      });
      return res;
    } finally {
      setIsCloudSyncing(false);
    }
  }, [cloudSaveId, initialCash, cashAvailable, positions, tradeHistory, watchlist]);

  // Load from Cloud
  const loadFromCloudHandler = async (code: string) => {
    setIsCloudSyncing(true);
    try {
      const res = await loadGameFromCloud(code);
      if (res.success && res.data) {
        setInitialCash(res.data.initialCash);
        setCashAvailable(res.data.cashAvailable);
        setPositions(res.data.positions || []);
        setTradeHistory(res.data.tradeHistory || []);
        if (res.data.watchlist) setWatchlist(res.data.watchlist);
        setCloudSaveId(code.toUpperCase());
        setSavedCloudId(code);
      }
      return { success: res.success, message: res.message };
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Sync quotes from API
  const refreshMarketData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const symbolsToFetch = Array.from(
        new Set([...watchlist, ...positions.map(p => p.symbol), 'NVDA', 'AAPL', 'TSLA', 'BTC-USD'])
      );

      const quotesMap: Record<string, StockQuote> = { ...liveQuotes };

      // Batch requests smoothly
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

      // Recalculate Positions with updated prices
      setPositions(prevPositions =>
        prevPositions.map(pos => {
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
            // SHORT: Profit if current price dropped below entry price
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
            timeframePnL: {
              '1D': unrealizedPnL,
              '1W': unrealizedPnL * 0.85,
              '1M': unrealizedPnL * 1.15,
              '1Y': unrealizedPnL * 1.4,
              'ALL': unrealizedPnL,
            }
          };
        })
      );
    } finally {
      setIsSyncing(false);
    }
  }, [watchlist, positions, liveQuotes]);

  // Initial fetch and 4-second interval background quote updates
  useEffect(() => {
    refreshMarketData();
    const interval = setInterval(() => {
      // Subtle live tick simulation for open positions
      setLiveQuotes(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(sym => {
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

      // Update positions live
      setPositions(prev =>
        prev.map(pos => {
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

  // Compute Aggregate Financial Metrics
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

  // Performance breakdown across timeframes
  const portfolioTimeframeReturns = useMemo(() => {
    const allPnl = totalNetWorth - initialCash;
    const allPct = initialCash > 0 ? (allPnl / initialCash) * 100 : 0;

    return {
      '1D': {
        amount: dailyPnL,
        percent: dailyPnLPercent,
      },
      '1W': {
        amount: totalPnL * 0.45,
        percent: totalPnLPercent * 0.45,
      },
      '1M': {
        amount: totalPnL * 0.85,
        percent: totalPnLPercent * 0.85,
      },
      '1Y': {
        amount: allPnl * 1.2,
        percent: allPct * 1.2,
      },
      '5Y': {
        amount: allPnl * 2.5,
        percent: allPct * 2.5,
      },
      'ALL': {
        amount: allPnl,
        percent: allPct,
      },
    };
  }, [dailyPnL, dailyPnLPercent, totalPnL, totalPnLPercent, totalNetWorth, initialCash]);

  // Open Position (LONG or SHORT)
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
      timeframePnL: {
        '1D': 0,
        '1W': 0,
        '1M': 0,
        '1Y': 0,
        'ALL': 0,
      }
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

    setCashAvailable(prev => prev - cleanAmount);
    setPositions(prev => [newPosition, ...prev]);
    setTradeHistory(prev => [newTrade, ...prev]);

    return {
      success: true,
      message: `Posición ${type === 'LONG' ? 'en Largo (A favor)' : 'en Corto (A la baja)'} abierta exitosamente con $${cleanAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`
    };
  };

  // Close Position
  const closePosition = (
    positionId: string,
    percentageToClose: number = 100
  ): { success: boolean; message: string } => {
    const targetPos = positions.find(p => p.id === positionId);
    if (!targetPos) {
      return { success: false, message: 'Posición no encontrada.' };
    }

    const fraction = Math.min(100, Math.max(1, percentageToClose)) / 100;
    const closedInvested = targetPos.investedAmount * fraction;
    const closedShares = targetPos.shares * fraction;
    const closedCurrentValue = targetPos.currentValue * fraction;
    const realizedPnL = targetPos.unrealizedPnL * fraction;
    const realizedPnLPercent = targetPos.unrealizedPnLPercent;

    // Release cash: invested + pnl
    const cashToReturn = Math.max(0, closedCurrentValue);
    setCashAvailable(prev => prev + cashToReturn);

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

    setTradeHistory(prev => [closeTrade, ...prev]);

    if (fraction >= 0.999) {
      // Full close
      setPositions(prev => prev.filter(p => p.id !== positionId));
    } else {
      // Partial close
      setPositions(prev =>
        prev.map(p => {
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
    setWatchlist(prev => {
      if (prev.includes(symbol)) {
        return prev.filter(s => s !== symbol);
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
    localStorage.removeItem(STORAGE_KEYS.PORTFOLIO);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  };

  return (
    <TradingContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        cloudSaveId,
        isCloudSyncing,
        syncToCloud,
        loadFromCloud: loadFromCloudHandler,
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
