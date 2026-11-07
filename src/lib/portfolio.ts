import { EquityPoint, Position, PositionView, StockQuote, TradeRecord } from '../types/market';

/** USD por unidad de cada divisa base (EUR, GBP, JPY...) */
export type FxRates = Record<string, number>;

// Algunas bolsas cotizan en subunidades (peniques, céntimos...)
const SUBUNITS: Record<string, { base: string; factor: number }> = {
  GBp: { base: 'GBP', factor: 0.01 },
  GBX: { base: 'GBP', factor: 0.01 },
  ZAc: { base: 'ZAR', factor: 0.01 },
  ILA: { base: 'ILS', factor: 0.01 },
};

export function baseCurrency(currency: string = 'USD'): string {
  return SUBUNITS[currency]?.base ?? currency.toUpperCase();
}

/** Símbolo de Yahoo del tipo de cambio a USD (p. ej. EURUSD=X), o null para USD. */
export function fxSymbolFor(currency: string = 'USD'): string | null {
  const base = baseCurrency(currency);
  return base === 'USD' ? null : `${base}USD=X`;
}

/** USD por 1 unidad de `currency`, o undefined si aún no se conoce el cambio. */
export function getFxRate(currency: string = 'USD', rates: FxRates): number | undefined {
  const factor = SUBUNITS[currency]?.factor ?? 1;
  const base = baseCurrency(currency);
  if (base === 'USD') return factor;
  const rate = rates[base];
  return rate ? rate * factor : undefined;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && isFinite(v);

/** Normaliza una posición guardada (incluidas las del formato antiguo). */
export function sanitizePosition(raw: any): Position | null {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.id || !raw.symbol || (raw.type !== 'LONG' && raw.type !== 'SHORT')) return null;
  if (!isNum(raw.shares) || !isNum(raw.entryPrice) || !isNum(raw.investedAmount)) return null;
  return {
    id: String(raw.id),
    symbol: String(raw.symbol),
    name: String(raw.name || raw.symbol),
    type: raw.type,
    shares: raw.shares,
    entryPrice: raw.entryPrice,
    investedAmount: raw.investedAmount,
    openedAt: isNum(raw.openedAt) ? raw.openedAt : Date.now(),
    // Posiciones antiguas no guardaban divisa: se trataron siempre como USD
    currency: typeof raw.currency === 'string' ? raw.currency : 'USD',
    entryFx: isNum(raw.entryFx) ? raw.entryFx : 1,
  };
}

export function sanitizeTrade(raw: any): TradeRecord | null {
  if (!raw || typeof raw !== 'object' || !raw.id || !raw.symbol || !raw.action) return null;
  return raw as TradeRecord;
}

/** Valora una posición con la cotización y el tipo de cambio actuales. */
export function valuePosition(pos: Position, quote: StockQuote | undefined, rates: FxRates): PositionView {
  const currency = pos.currency || 'USD';
  const hasPrice = !!quote && quote.price > 0;
  const price = hasPrice ? quote!.price : pos.entryPrice;
  const fx = hasPrice ? getFxRate(currency, rates) ?? pos.entryFx ?? 1 : pos.entryFx ?? 1;
  const sign = pos.type === 'LONG' ? 1 : -1;

  const notional = pos.shares * price * fx;
  let unrealizedPnL = pos.type === 'LONG' ? notional - pos.investedAmount : pos.investedAmount - notional;
  let currentValue = pos.investedAmount + unrealizedPnL;
  if (currentValue < 0) {
    // Un corto no puede perder más que lo invertido (liquidación)
    currentValue = 0;
    unrealizedPnL = -pos.investedAmount;
  }

  let dayPnL = 0;
  if (hasPrice) {
    // Si la posición se abrió durante la sesión actual, el cambio del día se mide desde la entrada
    const openedThisSession = !!quote!.sessionStart && pos.openedAt >= quote!.sessionStart;
    const reference = openedThisSession ? pos.entryPrice : quote!.prevClose || pos.entryPrice;
    dayPnL = sign * pos.shares * (price - reference) * fx;
    if (currentValue === 0) dayPnL = 0;
  }

  // Evitar "-$0.00" por errores de coma flotante (p. ej. justo después de comprar)
  if (Math.abs(unrealizedPnL) < 0.005) unrealizedPnL = 0;
  if (Math.abs(dayPnL) < 0.005) dayPnL = 0;

  return {
    ...pos,
    currentPrice: price,
    currentValue,
    unrealizedPnL,
    unrealizedPnLPercent: pos.investedAmount > 0 ? (unrealizedPnL / pos.investedAmount) * 100 : 0,
    dayPnL,
    hasPrice,
  };
}

// =====================================================================
// Historial de patrimonio
// =====================================================================

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const EQUITY_SNAPSHOT_INTERVAL = 15 * MIN;

export function sanitizeEquityHistory(raw: any, createdAt: number, initialCash: number): EquityPoint[] {
  const list: EquityPoint[] = Array.isArray(raw)
    ? raw.filter((p: any) => p && isNum(p.t) && isNum(p.v)).map((p: any) => ({ t: p.t, v: p.v }))
    : [];
  list.sort((a, b) => a.t - b.t);
  if (list.length === 0 || list[0].t > createdAt) {
    list.unshift({ t: createdAt, v: initialCash });
  }
  return list;
}

/**
 * Reduce la resolución de los puntos antiguos para que el historial no crezca sin límite:
 * últimos 2 días -> cada 15 min · hasta 90 días -> 1 por hora · más antiguo -> 1 por día.
 * El primer punto (capital inicial) se conserva siempre.
 */
export function compactEquityHistory(points: EquityPoint[], now: number = Date.now()): EquityPoint[] {
  if (points.length <= 2) return points;
  const first = points[0];
  const buckets = new Map<string, EquityPoint>();
  for (const p of points.slice(1)) {
    const age = now - p.t;
    const size = age <= 2 * DAY ? EQUITY_SNAPSHOT_INTERVAL : age <= 90 * DAY ? HOUR : DAY;
    buckets.set(`${size}:${Math.floor(p.t / size)}`, p); // el último punto de cada intervalo
  }
  const rest = Array.from(buckets.values()).sort((a, b) => a.t - b.t);
  const result = [first, ...rest];
  return result.length > 2500 ? [first, ...result.slice(-2499)] : result;
}

/** Valor del patrimonio en el instante `t` (último punto conocido antes de `t`). */
export function equityValueAt(history: EquityPoint[], t: number): number {
  let value = history.length > 0 ? history[0].v : 0;
  for (const p of history) {
    if (p.t > t) break;
    value = p.v;
  }
  return value;
}

export type PortfolioPeriod = '1D' | '1W' | '1M' | '1Y' | 'ALL';

export const PERIOD_MS: Record<Exclude<PortfolioPeriod, 'ALL'>, number> = {
  '1D': DAY,
  '1W': 7 * DAY,
  '1M': 30 * DAY,
  '1Y': 365 * DAY,
};

export function periodStart(period: PortfolioPeriod, history: EquityPoint[], now: number = Date.now()): number {
  const first = history.length > 0 ? history[0].t : now;
  if (period === 'ALL') return first;
  return Math.max(first, now - PERIOD_MS[period]);
}

export function periodReturn(
  period: PortfolioPeriod,
  history: EquityPoint[],
  currentValue: number,
  now: number = Date.now()
): { amount: number; percent: number } {
  const base = equityValueAt(history, periodStart(period, history, now));
  const amount = currentValue - base;
  return { amount, percent: base > 0 ? (amount / base) * 100 : 0 };
}

// =====================================================================
// Resumen de cartera
// =====================================================================

export interface PortfolioSummary {
  views: PositionView[];
  cashInvested: number;
  positionsValue: number;
  totalNetWorth: number;
  totalPnL: number;
  totalPnLPercent: number;
  dailyPnL: number;
  dailyPnLPercent: number;
}

export function summarizePortfolio(
  positions: Position[],
  cashAvailable: number,
  initialCash: number,
  quotes: Record<string, StockQuote>,
  rates: FxRates,
  /** USD reservados en órdenes de compra pendientes */
  reserved: number = 0
): PortfolioSummary {
  const views = positions.map((p) => valuePosition(p, quotes[p.symbol], rates));
  const cashInvested = views.reduce((acc, p) => acc + p.investedAmount, 0);
  const positionsValue = views.reduce((acc, p) => acc + p.currentValue, 0);
  const totalPnL = views.reduce((acc, p) => acc + p.unrealizedPnL, 0);
  const dailyPnL = views.reduce((acc, p) => acc + p.dayPnL, 0);
  const totalNetWorth = cashAvailable + positionsValue + reserved;
  const startOfDay = totalNetWorth - dailyPnL;
  return {
    views,
    cashInvested,
    positionsValue,
    totalNetWorth,
    totalPnL,
    totalPnLPercent: initialCash > 0 ? ((totalNetWorth - initialCash) / initialCash) * 100 : 0,
    dailyPnL,
    dailyPnLPercent: startOfDay > 0 ? (dailyPnL / startOfDay) * 100 : 0,
  };
}
