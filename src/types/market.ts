export type TimeRange = '1H' | '1D' | '1W' | '1M' | '1Y' | '5Y' | 'ALL';

export type PositionType = 'LONG' | 'SHORT';

export interface ChartPoint {
  timestamp: number;
  dateStr: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: string;
  marketCap: string;
  peRatio?: number;
  week52High?: number;
  week52Low?: number;
  currency: string;
  exchange: string;
  sector?: string;
  description?: string;
  historicalChanges?: {
    '1H'?: number;
    '1D': number;
    '1W': number;
    '1M': number;
    '1Y': number;
    '5Y': number;
    'ALL': number;
  };
}

export interface Position {
  id: string;
  symbol: string;
  name: string;
  type: PositionType; // LONG = Compra tradicional, SHORT = Venta en corto
  shares: number;
  entryPrice: number;
  investedAmount: number; // Dinero apostado / margen
  currentPrice: number;
  currentValue: number;
  unrealizedPnL: number; // Ganancia/Pérdida en $
  unrealizedPnLPercent: number; // Ganancia/Pérdida en %
  openedAt: number;
  timeframePnL?: {
    '1H'?: number;
    '1D': number;
    '1W': number;
    '1M': number;
    '1Y': number;
    'ALL': number;
  };
}

export interface TradeRecord {
  id: string;
  symbol: string;
  name: string;
  type: PositionType;
  action: 'OPEN_LONG' | 'CLOSE_LONG' | 'OPEN_SHORT' | 'CLOSE_SHORT';
  shares: number;
  entryPrice: number;
  exitPrice?: number;
  investedAmount: number;
  realizedPnL?: number;
  realizedPnLPercent?: number;
  timestamp: number;
}

export interface PortfolioSnapshot {
  timestamp: number;
  date: string;
  netWorth: number;
  cashAvailable: number;
  cashInvested: number;
  pnl: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  sector?: string;
  industry?: string;
}

export interface GameSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  initialCash: number;
  cashAvailable: number;
  cashInvested: number;
  totalNetWorth: number;
  totalPnL: number;
  totalPnLPercent: number;
  positionsCount: number;
}

export interface GameSaveData extends GameSummary {
  positions: Position[];
  tradeHistory: TradeRecord[];
  watchlist: string[];
}
