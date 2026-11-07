// Tarea diaria (GitHub Actions, .github/workflows/daily-update.yml):
//  1. Ejecuta las órdenes pendientes cuya sesión ya abrió (precio de apertura real).
//  2. Recalcula el histórico diario de patrimonio de TODAS las partidas con los cierres reales.
//  3. Actualiza el patrimonio y la rentabilidad del ranking.
// Usa exactamente la misma lógica que la app (src/lib), así que ambas dan el mismo resultado.
//
// Variables: SUPABASE_URL (opcional), SUPABASE_SECRET_KEY (obligatoria, secreto de GitHub).
// Ejecutar en local: SUPABASE_SECRET_KEY=... npx tsx scripts/daily-update.ts [--dry-run]

import type { GameSaveData, StockQuote } from '../src/types/market';
import { rowToGame } from '../src/services/supabaseService';
import {
  applyPendingFills,
  BarsBySymbol,
  DAY_MS,
  historyStart,
  parseDailyBars,
  reconstructDailyHistory,
  symbolsNeeded,
  yahooRangeSince,
} from '../src/lib/history';
import { FxRates, summarizePortfolio } from '../src/lib/portfolio';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vvxfewktdsltzsxfumio.supabase.co';
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';
const PUBLISHABLE_KEY = 'sb_publishable_RXWhW8Lu_vIehqKQJAPsQw_GkvczmaZ';
const DRY_RUN = process.argv.includes('--dry-run');

if (!SECRET_KEY && !DRY_RUN) {
  console.error('Falta SUPABASE_SECRET_KEY (Supabase > Project Settings > API Keys > Secret keys).');
  process.exit(1);
}

const dbHeaders: Record<string, string> = { apikey: SECRET_KEY || PUBLISHABLE_KEY, 'Content-Type': 'application/json' };
// Las claves antiguas (JWT) también necesitan la cabecera Authorization
if (SECRET_KEY.startsWith('eyJ')) dbHeaders.Authorization = `Bearer ${SECRET_KEY}`;

const round2 = (v: number) => Math.round(v * 100) / 100;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url: string, init?: RequestInit, retries = 3): Promise<any> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
      if (res.ok) return res.status === 204 ? null : await res.json();
      if (attempt >= retries || (res.status < 500 && res.status !== 429)) {
        throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
    } catch (err) {
      if (attempt >= retries) throw err;
    }
    await sleep(1500 * attempt);
  }
}

/** Velas diarias vía la función "market" de Supabase (Yahoo bloquea a veces a GitHub). */
async function fetchBars(symbols: string[], sinceBySymbol: Map<string, number>): Promise<BarsBySymbol> {
  const bars: BarsBySymbol = {};
  const queue = [...symbols];
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length > 0) {
      const symbol = queue.shift()!;
      const range = yahooRangeSince(sinceBySymbol.get(symbol) ?? Date.now() - 30 * DAY_MS);
      const url = `${SUPABASE_URL}/functions/v1/market?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=1d`;
      try {
        const data = await fetchJson(url, { headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${PUBLISHABLE_KEY}` } });
        const parsed = parseDailyBars(data);
        if (parsed.length > 0) bars[symbol] = parsed;
        else console.warn(`  sin datos: ${symbol}`);
      } catch (err) {
        console.warn(`  error con ${symbol}: ${(err as Error).message}`);
      }
    }
  });
  await Promise.all(workers);
  return bars;
}

/** Cotización mínima a partir de las velas: último cierre y cierre anterior. */
function quotesFromBars(bars: BarsBySymbol): { quotes: Record<string, StockQuote>; rates: FxRates } {
  const quotes: Record<string, StockQuote> = {};
  const rates: FxRates = {};
  for (const [symbol, list] of Object.entries(bars)) {
    const last = list[list.length - 1];
    const prev = list[list.length - 2] ?? last;
    const fx = /^([A-Z]{3})USD=X$/.exec(symbol);
    if (fx) rates[fx[1]] = last.close;
    quotes[symbol] = {
      symbol,
      name: symbol,
      price: last.close,
      change: last.close - prev.close,
      changePercent: prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0,
      open: last.open,
      high: last.close,
      low: last.close,
      prevClose: prev.close,
      volume: 'N/A',
      marketCap: 'N/A',
      currency: 'USD', // no se usa para valorar: la divisa sale de la posición
      exchange: '',
      sessionStart: last.t,
      fetchedAt: Date.now(),
    };
  }
  return { quotes, rates };
}

async function patchGame(id: string, body: Record<string, unknown>, expectedUpdatedAt?: number): Promise<boolean> {
  const filter = `id=eq.${encodeURIComponent(id)}` + (expectedUpdatedAt !== undefined ? `&updated_at=eq.${expectedUpdatedAt}` : '');
  if (DRY_RUN) {
    console.log(`  [dry-run] PATCH ${id}`, Object.keys(body).join(', '));
    return true;
  }
  const rows = await fetchJson(`${SUPABASE_URL}/rest/v1/games?${filter}`, {
    method: 'PATCH',
    headers: { ...dbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  return Array.isArray(rows) && rows.length > 0;
}

async function main() {
  const now = Date.now();
  const rows: any[] = await fetchJson(`${SUPABASE_URL}/rest/v1/games?select=*&limit=1000`, { headers: dbHeaders });
  const games: { game: GameSaveData; raw: any }[] = rows.map((raw) => ({ game: rowToGame(raw), raw }));
  console.log(`Partidas: ${games.length}`);

  // Símbolos necesarios y desde cuándo
  const since = new Map<string, number>();
  for (const { game } of games) {
    const start = Math.min(historyStart(game), ...game.pendingOrders.map((o) => o.createdAt)) - 3 * DAY_MS;
    for (const s of symbolsNeeded(game)) since.set(s, Math.min(since.get(s) ?? Infinity, start));
  }
  console.log(`Símbolos: ${since.size}`);
  const bars = await fetchBars(Array.from(since.keys()), since);
  const { quotes, rates } = quotesFromBars(bars);

  let filledTotal = 0;
  let updated = 0;
  for (const entry of games) {
    let game = entry.game;
    try {
      // 1. Órdenes pendientes
      const fills = applyPendingFills(game, bars, now);
      if (fills.filled > 0) {
        const ok = await patchGame(
          game.id,
          {
            positions: fills.game.positions,
            trade_history: fills.game.tradeHistory,
            pending_orders: fills.game.pendingOrders,
            cash_available: fills.game.cashAvailable,
            positions_count: fills.game.positions.length,
            updated_at: now,
          },
          Number(entry.raw.updated_at)
        );
        if (ok) {
          game = fills.game;
          filledTotal += fills.filled;
          console.log(`  ${game.id}: ${fills.filled} orden(es) ejecutada(s)`);
        } else {
          console.log(`  ${game.id}: cambió mientras se procesaba; las órdenes se ejecutarán en la app o mañana`);
        }
      }

      // 2. Histórico diario + 3. ranking
      const daily = reconstructDailyHistory({
        start: historyStart(game),
        initialCash: game.initialCash,
        trades: game.tradeHistory,
        bars,
        now,
      });
      const reserved = game.pendingOrders.reduce((acc, o) => acc + (o.kind === 'OPEN' ? o.amount || 0 : 0), 0);
      const totals = summarizePortfolio(game.positions, game.cashAvailable, game.initialCash, quotes, rates, reserved);
      const allPriced = totals.views.every((v) => v.hasPrice);

      await patchGame(game.id, {
        daily_history: daily,
        // Si falta algún precio, no tocar el patrimonio del ranking (sería inexacto)
        ...(allPriced
          ? {
              total_net_worth: round2(totals.totalNetWorth),
              total_pnl: round2(totals.totalNetWorth - game.initialCash),
              total_pnl_percent: Number(totals.totalPnLPercent.toFixed(4)),
              cash_invested: round2(totals.cashInvested),
            }
          : {}),
      });
      updated++;
    } catch (err) {
      console.error(`  ${game.id}: error ${(err as Error).message}`);
    }
  }

  console.log(`Hecho: ${updated}/${games.length} partidas actualizadas, ${filledTotal} órdenes ejecutadas.`);
  if (updated < games.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
