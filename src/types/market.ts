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
  /** Precio en la divisa nativa del activo (ver `currency`) */
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: string;
  /** Volumen numérico (para ordenar) */
  volumeRaw?: number;
  marketCap: string;
  week52High?: number;
  week52Low?: number;
  currency: string;
  exchange: string;
  instrumentType?: string;
  /** Momento de la última cotización (ms) */
  marketTime?: number;
  /** Inicio y fin de la sesión regular actual/última (ms) */
  sessionStart?: number;
  sessionEnd?: number;
  /** Estado según Yahoo: REGULAR, PRE, POST, CLOSED... (sólo en algunas fuentes) */
  marketState?: string;
  /** Cuándo se descargó esta cotización (ms) */
  fetchedAt: number;
}

/** Posición tal y como se guarda (sin valores derivados de precios). */
export interface Position {
  id: string;
  symbol: string;
  name: string;
  type: PositionType; // LONG = compra, SHORT = venta en corto
  shares: number;
  /** Precio de entrada en la divisa nativa */
  entryPrice: number;
  /** Capital invertido en USD */
  investedAmount: number;
  openedAt: number;
  /** Divisa nativa del activo. Posiciones antiguas: se asume USD. */
  currency?: string;
  /** USD por unidad de divisa nativa en la apertura */
  entryFx?: number;
}

/** Posición con valores calculados a partir de la cotización actual. */
export interface PositionView extends Position {
  currentPrice: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dayPnL: number;
  /** false si no hay ninguna cotización (se usa el precio de entrada) */
  hasPrice: boolean;
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
  currency?: string;
}

/** Punto del historial de patrimonio: t = ms, v = patrimonio en USD */
export interface EquityPoint {
  t: number;
  v: number;
}

/** Orden hecha con el mercado cerrado: se ejecuta a la apertura de la siguiente sesión. */
export interface PendingOrder {
  id: string;
  kind: 'OPEN' | 'CLOSE';
  symbol: string;
  name: string;
  type: PositionType;
  currency: string;
  createdAt: number;
  /** OPEN: USD reservados para la compra / venta en corto */
  amount?: number;
  /** CLOSE: posición a cerrar y fracción (0-1] */
  positionId?: string;
  fraction?: number;
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
  hasPin: boolean;
}

export interface GameSaveData extends GameSummary {
  positions: Position[];
  tradeHistory: TradeRecord[];
  watchlist: string[];
  equityHistory: EquityPoint[];
  pendingOrders: PendingOrder[];
  /** Patrimonio al cierre de cada día (lo calcula el servidor; sólo lectura en la app) */
  dailyHistory: EquityPoint[];
}
