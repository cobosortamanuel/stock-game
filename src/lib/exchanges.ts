// Horario regular de las bolsas y cálculo de la próxima apertura.
// Sin APIs del navegador (lo puede usar también el job diario).
// Los festivos no se conocen: la fecha calculada es la del siguiente día laborable.

import type { StockQuote } from '../types/market';

export interface ExchangeInfo {
  id: string;
  name: string;
  /** Ciudad para "9:30 en Nueva York" */
  city: string;
  /** Zona horaria IANA */
  tz: string;
  /** Apertura y cierre en hora local de la bolsa, "HH:MM" */
  open: string;
  close: string;
  /** Sufijos de Yahoo ("" = EE. UU., sin sufijo) */
  suffixes: string[];
  /** Se muestra siempre en la lista de mercados */
  main?: boolean;
}

export const EXCHANGES: ExchangeInfo[] = [
  { id: 'US', name: 'NYSE / Nasdaq', city: 'Nueva York', tz: 'America/New_York', open: '09:30', close: '16:00', suffixes: [''], main: true },
  { id: 'TO', name: 'Toronto', city: 'Toronto', tz: 'America/Toronto', open: '09:30', close: '16:00', suffixes: ['TO', 'V', 'CN', 'NE'], main: true },
  { id: 'SA', name: 'B3 São Paulo', city: 'São Paulo', tz: 'America/Sao_Paulo', open: '10:00', close: '17:00', suffixes: ['SA'] },
  { id: 'MX', name: 'Bolsa de México', city: 'Ciudad de México', tz: 'America/Mexico_City', open: '08:30', close: '15:00', suffixes: ['MX'] },
  { id: 'BA', name: 'Bolsa de Buenos Aires', city: 'Buenos Aires', tz: 'America/Argentina/Buenos_Aires', open: '11:00', close: '17:00', suffixes: ['BA'] },
  { id: 'L', name: 'Bolsa de Londres', city: 'Londres', tz: 'Europe/London', open: '08:00', close: '16:30', suffixes: ['L', 'IL'], main: true },
  { id: 'DE', name: 'Xetra Fráncfort', city: 'Fráncfort', tz: 'Europe/Berlin', open: '09:00', close: '17:30', suffixes: ['DE', 'F', 'SG', 'BE', 'DU', 'HM', 'MU', 'HA'], main: true },
  { id: 'PA', name: 'Euronext París', city: 'París', tz: 'Europe/Paris', open: '09:00', close: '17:30', suffixes: ['PA'], main: true },
  { id: 'MC', name: 'Bolsa de Madrid', city: 'Madrid', tz: 'Europe/Madrid', open: '09:00', close: '17:30', suffixes: ['MC'], main: true },
  { id: 'MI', name: 'Borsa de Milán', city: 'Milán', tz: 'Europe/Rome', open: '09:00', close: '17:30', suffixes: ['MI'], main: true },
  { id: 'AS', name: 'Euronext Ámsterdam', city: 'Ámsterdam', tz: 'Europe/Amsterdam', open: '09:00', close: '17:30', suffixes: ['AS'] },
  { id: 'BR', name: 'Euronext Bruselas', city: 'Bruselas', tz: 'Europe/Brussels', open: '09:00', close: '17:30', suffixes: ['BR'] },
  { id: 'LS', name: 'Euronext Lisboa', city: 'Lisboa', tz: 'Europe/Lisbon', open: '08:00', close: '16:30', suffixes: ['LS'] },
  { id: 'IR', name: 'Euronext Dublín', city: 'Dublín', tz: 'Europe/Dublin', open: '08:00', close: '16:30', suffixes: ['IR'] },
  { id: 'SW', name: 'SIX Zúrich', city: 'Zúrich', tz: 'Europe/Zurich', open: '09:00', close: '17:30', suffixes: ['SW'] },
  { id: 'VI', name: 'Bolsa de Viena', city: 'Viena', tz: 'Europe/Vienna', open: '09:00', close: '17:30', suffixes: ['VI'] },
  { id: 'ST', name: 'Nasdaq Estocolmo', city: 'Estocolmo', tz: 'Europe/Stockholm', open: '09:00', close: '17:30', suffixes: ['ST'] },
  { id: 'HE', name: 'Nasdaq Helsinki', city: 'Helsinki', tz: 'Europe/Helsinki', open: '10:00', close: '18:30', suffixes: ['HE'] },
  { id: 'CO', name: 'Nasdaq Copenhague', city: 'Copenhague', tz: 'Europe/Copenhagen', open: '09:00', close: '17:00', suffixes: ['CO'] },
  { id: 'OL', name: 'Bolsa de Oslo', city: 'Oslo', tz: 'Europe/Oslo', open: '09:00', close: '16:20', suffixes: ['OL'] },
  { id: 'WA', name: 'Bolsa de Varsovia', city: 'Varsovia', tz: 'Europe/Warsaw', open: '09:00', close: '17:00', suffixes: ['WA'] },
  { id: 'T', name: 'Bolsa de Tokio', city: 'Tokio', tz: 'Asia/Tokyo', open: '09:00', close: '15:30', suffixes: ['T'], main: true },
  { id: 'HK', name: 'Bolsa de Hong Kong', city: 'Hong Kong', tz: 'Asia/Hong_Kong', open: '09:30', close: '16:00', suffixes: ['HK'], main: true },
  { id: 'SS', name: 'Shanghái / Shenzhen', city: 'Shanghái', tz: 'Asia/Shanghai', open: '09:30', close: '15:00', suffixes: ['SS', 'SZ'] },
  { id: 'KS', name: 'Bolsa de Corea', city: 'Seúl', tz: 'Asia/Seoul', open: '09:00', close: '15:30', suffixes: ['KS', 'KQ'] },
  { id: 'TW', name: 'Bolsa de Taiwán', city: 'Taipéi', tz: 'Asia/Taipei', open: '09:00', close: '13:30', suffixes: ['TW', 'TWO'] },
  { id: 'NS', name: 'NSE / BSE India', city: 'Bombay', tz: 'Asia/Kolkata', open: '09:15', close: '15:30', suffixes: ['NS', 'BO'], main: true },
  { id: 'SI', name: 'Bolsa de Singapur', city: 'Singapur', tz: 'Asia/Singapore', open: '09:00', close: '17:00', suffixes: ['SI'] },
  { id: 'AX', name: 'ASX Sídney', city: 'Sídney', tz: 'Australia/Sydney', open: '10:00', close: '16:00', suffixes: ['AX'], main: true },
  { id: 'NZ', name: 'Bolsa de Nueva Zelanda', city: 'Wellington', tz: 'Pacific/Auckland', open: '10:00', close: '16:45', suffixes: ['NZ'] },
];

const BY_SUFFIX = new Map<string, ExchangeInfo>();
EXCHANGES.forEach((ex) => ex.suffixes.forEach((s) => BY_SUFFIX.set(s, ex)));

/** Bolsa de un símbolo de Yahoo según su sufijo. null = cripto/divisa (no cierra) o desconocida. */
export function exchangeOf(symbol: string): ExchangeInfo | null {
  if (/-(USD|EUR|USDT)$/.test(symbol) || /=X$/.test(symbol)) return null;
  const m = /\.([A-Z]+)$/.exec(symbol);
  return BY_SUFFIX.get(m ? m[1] : '') ?? null;
}

// ---------------------------------------------------------------------
// Zonas horarias
// ---------------------------------------------------------------------

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function partsIn(tz: string, ms: number) {
  let dtf = dtfCache.get(tz);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    dtfCache.set(tz, dtf);
  }
  const out: Record<string, number> = {};
  dtf.formatToParts(new Date(ms)).forEach((p) => {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  });
  return { y: out.year, m: out.month, d: out.day, h: out.hour % 24, min: out.minute, s: out.second };
}

function offsetMs(tz: string, ms: number): number {
  const p = partsIn(tz, ms);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(ms / 1000) * 1000;
}

/** Hora local de la bolsa (y, m, d, h, min) -> ms UTC */
function zonedToUtc(tz: string, y: number, m: number, d: number, h: number, min: number): number {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const off = offsetMs(tz, guess);
  let ts = guess - off;
  const off2 = offsetMs(tz, ts);
  if (off2 !== off) ts = guess - off2;
  return ts;
}

const hm = (s: string) => s.split(':').map(Number) as [number, number];

// ---------------------------------------------------------------------
// Próxima apertura
// ---------------------------------------------------------------------

export interface SessionInfo {
  isOpen: boolean;
  /** Próxima apertura (ms). Si está abierta, la de la siguiente sesión no se calcula. */
  nextOpen?: number;
  /** Cierre de la sesión en curso (ms), si está abierta */
  closesAt?: number;
}

/** Sesiones según el horario (lunes a viernes), a partir de `from`. */
function scheduleFrom(ex: ExchangeInfo, from: number, skipCurrent: boolean): SessionInfo {
  const [oh, om] = hm(ex.open);
  const [ch, cm] = hm(ex.close);
  const today = partsIn(ex.tz, from);
  for (let i = 0; i < 10; i++) {
    const day = new Date(Date.UTC(today.y, today.m - 1, today.d + i));
    const wd = day.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    const y = day.getUTCFullYear();
    const m = day.getUTCMonth() + 1;
    const d = day.getUTCDate();
    const openAt = zonedToUtc(ex.tz, y, m, d, oh, om);
    const closeAt = zonedToUtc(ex.tz, y, m, d, ch, cm);
    if (from < openAt) return { isOpen: false, nextOpen: openAt };
    if (from < closeAt && !skipCurrent) return { isOpen: true, closesAt: closeAt };
  }
  return { isOpen: false };
}

/**
 * Estado de la bolsa y próxima apertura. Si hay cotización, manda lo que dice Yahoo
 * (sesión de hoy real, p. ej. cerrada por festivo); si no, el horario.
 */
export function sessionInfo(ex: ExchangeInfo, now: number = Date.now(), quote?: StockQuote): SessionInfo {
  if (quote?.sessionStart && quote.sessionEnd) {
    if (now < quote.sessionStart && quote.sessionStart - now < 4 * 24 * 3600_000) return { isOpen: false, nextOpen: quote.sessionStart };
    if (now < quote.sessionEnd && now >= quote.sessionStart) return { isOpen: true, closesAt: quote.sessionEnd };
    // La sesión de Yahoo ya terminó: la siguiente, por horario, a partir de su cierre
    return scheduleFrom(ex, Math.max(now, quote.sessionEnd), true);
  }
  return scheduleFrom(ex, now, false);
}

// ---------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------

const dayKey = (ms: number, tz?: string) => new Date(ms).toLocaleDateString('en-CA', { timeZone: tz });

/** "lun, 10 nov, 15:30" en la hora del dispositivo */
export function formatLocalOpen(ms: number): string {
  const d = new Date(ms);
  const date = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
}

/** "9:30 en Nueva York" (con el día si es distinto al del dispositivo). null si coincide con la hora local. */
export function formatExchangeOpen(ms: number, ex: ExchangeInfo): string | null {
  const d = new Date(ms);
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: ex.tz });
  const local = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const sameDay = dayKey(ms, ex.tz) === dayKey(ms);
  if (time === local && sameDay) return null;
  const day = sameDay ? '' : `${d.toLocaleDateString('es-ES', { weekday: 'short', timeZone: ex.tz })} `;
  return `${day}${time} en ${ex.city}`;
}
