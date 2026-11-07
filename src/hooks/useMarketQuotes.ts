import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StockQuote } from '../types/market';
import { fetchBatchQuotes, fetchStockData } from '../services/marketApi';
import { FxRates, fxSymbolFor } from '../lib/portfolio';

const CACHE_KEY = 'apex_quote_cache_v1';
const CACHE_MAX_ENTRIES = 400;
const REFRESH_MS = 30_000;
const FX_MAX_AGE_MS = 10 * 60 * 1000;
const FX_SYMBOL_RE = /^([A-Z]{3})USD=X$/;

function loadQuoteCache(): Record<string, StockQuote> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
}

function saveQuoteCache(quotes: Record<string, StockQuote>) {
  try {
    const entries = Object.values(quotes)
      .filter((q) => q && q.symbol && q.price > 0)
      .sort((a, b) => (b.fetchedAt || 0) - (a.fetchedAt || 0))
      .slice(0, CACHE_MAX_ENTRIES);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries.map((q) => [q.symbol, q]))));
  } catch {}
}

export interface TrackedAssets {
  symbols: string[];
  currencies: string[];
}

/**
 * Cotizaciones en vivo: refresca cada 30 s sólo lo que el jugador sigue (posiciones,
 * favoritos y sus tipos de cambio) y mientras la pestaña está visible. Las vistas piden
 * lo que necesitan con `ensureQuotes`. Guarda la última cotización conocida en localStorage.
 */
export function useMarketQuotes(getTracked: () => TrackedAssets) {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>(loadQuoteCache);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const quotesRef = useRef(quotes);
  const getTrackedRef = useRef(getTracked);
  const inFlight = useRef(new Set<string>());
  const lastUpdatedRef = useRef<number | null>(null);

  useEffect(() => {
    quotesRef.current = quotes;
  }, [quotes]);

  useEffect(() => {
    getTrackedRef.current = getTracked;
  }, [getTracked]);

  // Guardar la caché (con retardo para no escribir en cada refresco)
  useEffect(() => {
    const t = setTimeout(() => saveQuoteCache(quotes), 2000);
    return () => clearTimeout(t);
  }, [quotes]);

  const fxRates = useMemo<FxRates>(() => {
    const rates: FxRates = {};
    Object.values(quotes).forEach((q) => {
      const m = FX_SYMBOL_RE.exec(q.symbol);
      if (m && q.price > 0) rates[m[1]] = q.price;
    });
    return rates;
  }, [quotes]);

  const fetchSymbols = useCallback(async (symbols: string[]): Promise<Record<string, StockQuote>> => {
    const wanted = Array.from(new Set(symbols)).filter((s) => s && !inFlight.current.has(s));
    if (wanted.length === 0) return {};
    wanted.forEach((s) => inFlight.current.add(s));
    try {
      const result = await fetchBatchQuotes(wanted);

      // Los símbolos que no vinieron en el lote se piden uno a uno (máx. 8)
      const missing = wanted.filter((s) => !result[s]).slice(0, 8);
      await Promise.all(
        missing.map(async (s) => {
          const data = await fetchStockData(s, '1D').catch(() => null);
          if (data) result[s] = data.quote;
        })
      );

      // Tipos de cambio necesarios para valorar en USD
      const now = Date.now();
      const fxNeeded = Array.from(
        new Set(
          Object.values(result)
            .map((q) => fxSymbolFor(q.currency))
            .filter((fx): fx is string => {
              if (!fx || result[fx]) return false;
              const known = quotesRef.current[fx];
              return !known || now - known.fetchedAt > FX_MAX_AGE_MS;
            })
        )
      );
      if (fxNeeded.length > 0) Object.assign(result, await fetchBatchQuotes(fxNeeded));

      if (Object.keys(result).length > 0) {
        setQuotes((prev) => ({ ...prev, ...result }));
      }
      return result;
    } finally {
      wanted.forEach((s) => inFlight.current.delete(s));
    }
  }, []);

  const refresh = useCallback(async () => {
    const { symbols, currencies } = getTrackedRef.current();
    const fx = currencies.map((c) => fxSymbolFor(c)).filter((s): s is string => !!s);
    setIsSyncing(true);
    try {
      await fetchSymbols([...symbols, ...fx]);
      const now = Date.now();
      lastUpdatedRef.current = now;
      setLastUpdated(now);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchSymbols]);

  /** Pide las cotizaciones que falten o tengan más de `maxAgeMs`. */
  const ensureQuotes = useCallback(
    async (symbols: string[], maxAgeMs: number = 60_000) => {
      const now = Date.now();
      const stale = symbols.filter((s) => {
        const q = quotesRef.current[s];
        return !q || now - (q.fetchedAt || 0) > maxAgeMs;
      });
      if (stale.length > 0) await fetchSymbols(stale);
    },
    [fetchSymbols]
  );

  /** Añade una cotización obtenida por otra vía (p. ej. la vista de detalle). */
  const mergeQuote = useCallback(
    (quote: StockQuote) => {
      setQuotes((prev) => ({ ...prev, [quote.symbol]: quote }));
      const fx = fxSymbolFor(quote.currency);
      if (fx) {
        const known = quotesRef.current[fx];
        if (!known || Date.now() - known.fetchedAt > FX_MAX_AGE_MS) fetchSymbols([fx]);
      }
    },
    [fetchSymbols]
  );

  /** Añade varias cotizaciones (p. ej. de una lista de Yahoo) sin pisar otras más recientes. */
  const mergeQuotes = useCallback(
    (list: StockQuote[]) => {
      if (list.length === 0) return;
      setQuotes((prev) => {
        const next = { ...prev };
        list.forEach((q) => {
          const known = prev[q.symbol];
          // Conservar los datos de sesión si la nueva fuente no los trae
          next[q.symbol] = known && !q.sessionStart ? { ...q, sessionStart: known.sessionStart, sessionEnd: known.sessionEnd } : q;
        });
        return next;
      });
    },
    []
  );

  // Refresco periódico, sólo con la pestaña visible
  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!lastUpdatedRef.current || Date.now() - lastUpdatedRef.current > 15_000) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { quotes, fxRates, isSyncing, lastUpdated, refresh, ensureQuotes, mergeQuote, mergeQuotes };
}
