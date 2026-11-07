// Histórico diario de patrimonio y ejecución de órdenes pendientes.
// Funciones puras: las usan la app y la tarea diaria del servidor (scripts/daily-update.ts),
// así que ambas llegan exactamente al mismo resultado con los mismos datos de mercado.

import type { EquityPoint, GameSaveData, PendingOrder, Position, TradeRecord } from '../types/market';
import { baseCurrency, fxSymbolFor, getFxRate } from './portfolio';

/** Vela diaria: t = inicio de la sesión (ms) */
export interface DailyBar {
  t: number;
  open: number;
  close: number;
}

export type BarsBySymbol = Record<string, DailyBar[]>;

export const DAY_MS = 24 * 60 * 60 * 1000;
const round2 = (v: number) => Math.round(v * 100) / 100;

export const startOfUtcDay = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS;

/** Rango de Yahoo que cubre desde `sinceMs` hasta hoy (velas diarias). */
export function yahooRangeSince(sinceMs: number, now: number = Date.now()): string {
  const days = (now - sinceMs) / DAY_MS + 3;
  if (days <= 5) return '5d';
  if (days <= 30) return '1mo';
  if (days <= 90) return '3mo';
  if (days <= 180) return '6mo';
  if (days <= 365) return '1y';
  if (days <= 730) return '2y';
  if (days <= 1825) return '5y';
  return '10y';
}

/** Convierte la respuesta de /v8/finance/chart (interval=1d) en velas diarias. */
export function parseDailyBars(chartJson: any): DailyBar[] {
  const result = chartJson?.chart?.result?.[0];
  const ts: number[] = result?.timestamp || [];
  const q = result?.indicators?.quote?.[0] || {};
  const bars: DailyBar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i];
    if (close === null || close === undefined || !isFinite(close)) continue;
    const open = q.open?.[i];
    bars.push({ t: ts[i] * 1000, open: open && isFinite(open) ? open : close, close });
  }
  return bars.sort((a, b) => a.t - b.t);
}

function barAtOrBefore(bars: DailyBar[] | undefined, t: number): DailyBar | undefined {
  if (!bars) return undefined;
  let found: DailyBar | undefined;
  for (const b of bars) {
    if (b.t > t) break;
    found = b;
  }
  return found;
}

/** USD por unidad de `currency` en el instante t, según las velas de tipo de cambio. */
function fxAt(currency: string, t: number, bars: BarsBySymbol): number | undefined {
  const fxSymbol = fxSymbolFor(currency);
  if (!fxSymbol) return getFxRate(currency, {});
  const bar = barAtOrBefore(bars[fxSymbol], t) ?? bars[fxSymbol]?.[0];
  if (!bar) return undefined;
  return getFxRate(currency, { [baseCurrency(currency)]: bar.close });
}

/** Símbolos (y tipos de cambio) necesarios para el histórico y las órdenes de una partida. */
export function symbolsNeeded(game: Pick<GameSaveData, 'tradeHistory' | 'positions' | 'pendingOrders'>): string[] {
  const set = new Set<string>();
  const add = (symbol: string, currency?: string) => {
    set.add(symbol);
    const fx = fxSymbolFor(currency || 'USD');
    if (fx) set.add(fx);
  };
  game.tradeHistory.forEach((t) => add(t.symbol, t.currency));
  game.positions.forEach((p) => add(p.symbol, p.currency));
  game.pendingOrders.forEach((o) => add(o.symbol, o.currency));
  return Array.from(set);
}

/**
 * Recalcula el patrimonio al final de cada día (UTC) desde `start` hasta `now`,
 * reproduciendo las operaciones y valorando con los cierres reales de cada día.
 * El último punto es el valor en `now`.
 */
export function reconstructDailyHistory(params: {
  start: number;
  initialCash: number;
  trades: TradeRecord[];
  bars: BarsBySymbol;
  now?: number;
}): EquityPoint[] {
  const now = params.now ?? Date.now();
  const trades = params.trades
    .filter((t) => t && isFinite(t.timestamp) && isFinite(t.shares) && isFinite(t.investedAmount))
    .sort((a, b) => a.timestamp - b.timestamp);

  let cash = params.initialCash;
  const holdings = new Map<string, { symbol: string; type: string; shares: number; invested: number; currency: string }>();
  let ti = 0;
  const points: EquityPoint[] = [];

  for (let day = startOfUtcDay(params.start); day <= now; day += DAY_MS) {
    const end = Math.min(day + DAY_MS - 1, now);

    while (ti < trades.length && trades[ti].timestamp <= end) {
      const t = trades[ti++];
      const key = `${t.symbol}|${t.type}`;
      const h = holdings.get(key) ?? { symbol: t.symbol, type: t.type, shares: 0, invested: 0, currency: t.currency || 'USD' };
      if (t.action === 'OPEN_LONG' || t.action === 'OPEN_SHORT') {
        cash -= t.investedAmount;
        h.shares += t.shares;
        h.invested += t.investedAmount;
      } else {
        cash += t.investedAmount + (t.realizedPnL || 0);
        h.shares = Math.max(0, h.shares - t.shares);
        h.invested = Math.max(0, h.invested - t.investedAmount);
      }
      holdings.set(key, h);
    }

    let value = cash;
    for (const h of holdings.values()) {
      if (h.shares <= 1e-12) continue;
      const bar = barAtOrBefore(params.bars[h.symbol], end);
      const fx = fxAt(h.currency, end, params.bars);
      if (!bar || fx === undefined) {
        value += h.invested; // sin datos de mercado: a precio de coste
        continue;
      }
      const notional = h.shares * bar.close * fx;
      value += h.type === 'LONG' ? notional : Math.max(0, 2 * h.invested - notional);
    }
    points.push({ t: end, v: round2(value) });
  }
  return points;
}

/** Primera sesión que empezó después de `after` (y ya ha empezado). */
function nextSessionBar(bars: DailyBar[] | undefined, after: number, now: number): DailyBar | undefined {
  return bars?.find((b) => b.t > after && b.t <= now);
}

export function sanitizePendingOrder(raw: any): PendingOrder | null {
  if (!raw || typeof raw !== 'object' || !raw.id || !raw.symbol) return null;
  if (raw.kind !== 'OPEN' && raw.kind !== 'CLOSE') return null;
  if (raw.type !== 'LONG' && raw.type !== 'SHORT') return null;
  if (!isFinite(raw.createdAt)) return null;
  if (raw.kind === 'OPEN' && !(raw.amount > 0)) return null;
  if (raw.kind === 'CLOSE' && (!raw.positionId || !(raw.fraction > 0))) return null;
  return {
    id: String(raw.id),
    kind: raw.kind,
    symbol: String(raw.symbol),
    name: String(raw.name || raw.symbol),
    type: raw.type,
    currency: typeof raw.currency === 'string' ? raw.currency : 'USD',
    createdAt: raw.createdAt,
    amount: raw.kind === 'OPEN' ? raw.amount : undefined,
    positionId: raw.kind === 'CLOSE' ? String(raw.positionId) : undefined,
    fraction: raw.kind === 'CLOSE' ? Math.min(1, raw.fraction) : undefined,
  };
}

/**
 * Ejecuta las órdenes pendientes cuya siguiente sesión ya ha abierto, al precio
 * de apertura real de esa sesión. Devuelve la partida actualizada y cuántas se ejecutaron.
 */
export function applyPendingFills(
  game: GameSaveData,
  bars: BarsBySymbol,
  now: number = Date.now()
): { game: GameSaveData; filled: number } {
  if (game.pendingOrders.length === 0) return { game, filled: 0 };

  let cash = game.cashAvailable;
  let positions: Position[] = [...game.positions];
  const newTrades: TradeRecord[] = [];
  const remaining: PendingOrder[] = [];
  let filled = 0;

  for (const order of [...game.pendingOrders].sort((a, b) => a.createdAt - b.createdAt)) {
    const bar = nextSessionBar(bars[order.symbol], order.createdAt, now);
    const fx = bar ? fxAt(order.currency, bar.t, bars) : undefined;
    if (!bar || !fx || !(bar.open > 0)) {
      remaining.push(order);
      continue;
    }

    if (order.kind === 'OPEN') {
      const amount = order.amount!;
      const shares = amount / (bar.open * fx);
      // El dinero ya estaba reservado al crear la orden
      positions = [
        {
          id: `pos_${order.id}`,
          symbol: order.symbol,
          name: order.name,
          type: order.type,
          shares,
          entryPrice: bar.open,
          investedAmount: amount,
          openedAt: bar.t,
          currency: order.currency,
          entryFx: fx,
        },
        ...positions,
      ];
      newTrades.push({
        id: `trade_${order.id}`,
        symbol: order.symbol,
        name: order.name,
        type: order.type,
        action: order.type === 'LONG' ? 'OPEN_LONG' : 'OPEN_SHORT',
        shares,
        entryPrice: bar.open,
        investedAmount: amount,
        timestamp: bar.t,
        currency: order.currency,
      });
      filled++;
      continue;
    }

    // CLOSE
    const pos = positions.find((p) => p.id === order.positionId);
    if (!pos) {
      filled++; // la posición ya no existe: la orden se descarta
      continue;
    }
    const fraction = Math.min(1, order.fraction!);
    const posFx = pos.currency === order.currency ? fx : fxAt(pos.currency || 'USD', bar.t, bars) ?? fx;
    const notional = pos.shares * bar.open * posFx;
    let pnl = pos.type === 'LONG' ? notional - pos.investedAmount : pos.investedAmount - notional;
    let value = pos.investedAmount + pnl;
    if (value < 0) {
      value = 0;
      pnl = -pos.investedAmount;
    }
    const realizedPnL = pnl * fraction;
    cash += value * fraction;
    newTrades.push({
      id: `trade_${order.id}`,
      symbol: pos.symbol,
      name: pos.name,
      type: pos.type,
      action: pos.type === 'LONG' ? 'CLOSE_LONG' : 'CLOSE_SHORT',
      shares: pos.shares * fraction,
      entryPrice: pos.entryPrice,
      exitPrice: bar.open,
      investedAmount: pos.investedAmount * fraction,
      realizedPnL,
      realizedPnLPercent: pos.investedAmount > 0 ? (pnl / pos.investedAmount) * 100 : 0,
      timestamp: bar.t,
      currency: pos.currency,
    });
    positions =
      fraction >= 0.999
        ? positions.filter((p) => p.id !== pos.id)
        : positions.map((p) =>
            p.id === pos.id ? { ...p, shares: p.shares * (1 - fraction), investedAmount: p.investedAmount * (1 - fraction) } : p
          );
    filled++;
  }

  if (filled === 0) return { game, filled: 0 };
  return {
    game: {
      ...game,
      cashAvailable: round2(cash),
      positions,
      pendingOrders: remaining,
      tradeHistory: [...newTrades.sort((a, b) => b.timestamp - a.timestamp), ...game.tradeHistory].sort(
        (a, b) => b.timestamp - a.timestamp
      ),
    },
    filled,
  };
}

/** Une el histórico diario con los puntos intradía (sin duplicar) y ordena. */
export function mergeHistories(daily: EquityPoint[], intraday: EquityPoint[]): EquityPoint[] {
  const map = new Map<number, number>();
  daily.forEach((p) => map.set(p.t, p.v));
  intraday.forEach((p) => map.set(p.t, p.v));
  return Array.from(map, ([t, v]) => ({ t, v })).sort((a, b) => a.t - b.t);
}

/** Inicio del histórico de una partida (tras un reinicio, el primer punto intradía). */
export function historyStart(game: Pick<GameSaveData, 'createdAt' | 'equityHistory'>): number {
  return game.equityHistory[0]?.t ?? game.createdAt;
}
