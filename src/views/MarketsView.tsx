import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Clock, Loader2, Search, Star } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { StockQuote } from '../types/market';
import { fetchScreener, formatCurrency, formatPercent, MARKET_CATEGORIES, POPULAR_SYMBOLS } from '../services/marketApi';
import { getFxRate } from '../lib/portfolio';
import { MarketHoursSheet } from '../components/common/MarketHoursSheet';

interface MarketsViewProps {
  onSelectSymbol: (symbol: string) => void;
  onOpenSearch: () => void;
  /** Popup de aperturas y órdenes pendientes */
  hoursOpen: boolean;
  onHoursOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------

type Region = 'ALL' | 'US' | 'EU' | 'ASIA' | 'AMER';
type SortOrder = 'DEFAULT' | 'VOLUME' | 'GAINERS' | 'LOSERS';

const REGIONS: { id: Region; label: string }[] = [
  { id: 'ALL', label: 'Todas las regiones' },
  { id: 'US', label: 'EE. UU.' },
  { id: 'EU', label: 'Europa' },
  { id: 'ASIA', label: 'Asia-Pacífico' },
  { id: 'AMER', label: 'Canadá y Latinoamérica' },
];

const ORDERS: { id: SortOrder; label: string }[] = [
  { id: 'DEFAULT', label: 'Destacadas' },
  { id: 'VOLUME', label: 'Más negociadas' },
  { id: 'GAINERS', label: 'Suben hoy' },
  { id: 'LOSERS', label: 'Bajan hoy' },
];

const SECTOR_SHORT: Record<string, string> = {
  ALL: 'Todo',
  TECH: 'Tecnología',
  CONSUMER: 'Consumo',
  GAMING: 'Videojuegos',
  CRYPTO: 'Cripto',
  AUTO: 'Motor',
  MEDIA: 'Medios',
  BANKING: 'Banca',
  ENERGY: 'Energía',
  INDICES: 'ETFs e índices',
};

const EU_SUFFIXES = ['MC', 'PA', 'DE', 'L', 'MI', 'AS', 'SW', 'ST', 'HE', 'WA', 'BR', 'LS', 'CO', 'OL', 'IR', 'VI', 'IS', 'AT', 'PR', 'BD'];
const ASIA_SUFFIXES = ['T', 'HK', 'KS', 'KQ', 'SS', 'SZ', 'TW', 'TWO', 'AX', 'NS', 'BO', 'JK', 'SI', 'KL', 'BK', 'NZ', 'XA'];
const AMER_SUFFIXES = ['TO', 'V', 'CN', 'NE', 'SA', 'MX', 'BA', 'SN', 'LIM'];

/** Región de un símbolo de Yahoo según su sufijo de bolsa ("" = EE. UU.). Cripto: todas. */
function regionOf(symbol: string): Region | 'GLOBAL' {
  if (/-(USD|EUR|USDT)$/.test(symbol)) return 'GLOBAL';
  const m = /\.([A-Z]+)$/.exec(symbol);
  if (!m) return 'US';
  if (EU_SUFFIXES.includes(m[1])) return 'EU';
  if (ASIA_SUFFIXES.includes(m[1])) return 'ASIA';
  if (AMER_SUFFIXES.includes(m[1])) return 'AMER';
  return 'US';
}

const matchesRegion = (symbol: string, region: Region) => {
  if (region === 'ALL') return true;
  const r = regionOf(symbol);
  return r === 'GLOBAL' || r === region;
};

/** Listas reales de Yahoo que amplían lo que se ve */
function screenersFor(region: Region, order: SortOrder, sector: string): string[] {
  if (sector === 'CRYPTO') return ['all_cryptocurrencies_us'];
  if (sector === 'INDICES') return ['top_etfs_us'];
  if (sector !== 'ALL' || order === 'DEFAULT') return [];
  const byRegion: Record<Exclude<Region, 'ALL'>, Partial<Record<SortOrder, string[]>>> = {
    US: { VOLUME: ['most_actives'], GAINERS: ['day_gainers'], LOSERS: ['day_losers'] },
    EU: { VOLUME: ['most_actives_europe'], GAINERS: ['day_gainers_europe'], LOSERS: ['day_losers_europe'] },
    ASIA: { VOLUME: ['most_actives_asia'], GAINERS: ['day_gainers_asia', 'day_gainers_au'], LOSERS: ['day_losers_asia'] },
    AMER: { VOLUME: ['most_actives_ca'] },
  };
  const regions: Exclude<Region, 'ALL'>[] = region === 'ALL' ? ['US', 'EU', 'ASIA'] : [region];
  return regions.flatMap((r) => byRegion[r][order] ?? []);
}

const PAGE = 30;

// Bolsas alemanas secundarias que replican acciones extranjeras (p. ej. F8P.F = IREN, de EE. UU.)
const MIRROR_VENUES = ['F', 'SG', 'BE', 'DU', 'HM', 'MU', 'HA'];

/** Descarta de las listas de Yahoo las réplicas y los errores evidentes de datos (cambios > 500% en un día). */
function isUsefulListQuote(q: StockQuote): boolean {
  const suffix = /\.([A-Z]+)$/.exec(q.symbol)?.[1];
  if (suffix && MIRROR_VENUES.includes(suffix)) return false;
  return Math.abs(q.changePercent) <= 500;
}

// ---------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------

function Dropdown<T extends string>({
  value,
  options,
  onChange,
  prefix,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  prefix: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const current = options.find((o) => o.id === value);
  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 rounded-2xl bg-white dark:bg-ios-card-dark border border-black/5 dark:border-white/10 shadow-ios-sm flex items-center justify-between gap-1 ios-active"
      >
        <span className="min-w-0 text-left">
          <span className="block text-[9px] uppercase font-semibold text-zinc-400 leading-tight">{prefix}</span>
          <span className="block text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate">{current?.label}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 left-0 right-0 min-w-[180px] bg-white dark:bg-zinc-900 rounded-2xl border border-black/10 dark:border-white/10 shadow-ios-sheet overflow-hidden animate-fadeIn">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
              className="w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100"
            >
              {o.label}
              {o.id === value && <Check className="w-4 h-4 text-ios-blue" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface RowItem {
  symbol: string;
  name: string;
  sector?: string;
}

const StockRow = React.memo<{
  item: RowItem;
  quote?: StockQuote;
  isFavorited: boolean;
  onSelect: (symbol: string) => void;
  onToggleWatchlist: (symbol: string) => void;
}>(({ item, quote, isFavorited, onSelect, onToggleWatchlist }) => {
  const isUp = (quote?.changePercent ?? 0) >= 0;
  const tag = item.sector || quote?.exchange;
  return (
    <div
      style={{ contentVisibility: 'auto', containIntrinsicSize: '68px' }}
      className="w-full bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 rounded-3xl py-3 pl-3 pr-1.5 border border-black/5 dark:border-white/10 flex items-center shadow-ios-sm"
    >
      <button type="button" onClick={() => onSelect(item.symbol)} className="flex items-center gap-2.5 text-left flex-1 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center font-bold text-[11px] text-zinc-800 dark:text-zinc-200 border border-black/5 dark:border-white/5 shrink-0">
          {item.symbol.replace(/[-.=^].*$/, '').substring(0, 4)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50 truncate">{item.symbol}</span>
            {tag && (
              <span className="hidden min-[400px]:inline text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium truncate max-w-[110px]">
                {tag}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{quote?.name || item.name}</p>
        </div>
        <div className="text-right shrink-0 pl-1">
          {quote ? (
            <>
              <div className="font-mono font-bold text-[13px] text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                {formatCurrency(quote.price, quote.currency)}
              </div>
              <div className={`font-mono font-semibold text-xs whitespace-nowrap ${isUp ? 'text-ios-green' : 'text-ios-red'}`}>
                {formatPercent(quote.changePercent)}
              </div>
            </>
          ) : (
            <div className="space-y-1.5 flex flex-col items-end">
              <div className="h-3.5 w-14 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
              <div className="h-3 w-9 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            </div>
          )}
        </div>
      </button>
      <button type="button" onClick={() => onToggleWatchlist(item.symbol)} className="p-2 ios-active shrink-0" aria-label="Favorito">
        <Star className={`w-4 h-4 ${isFavorited ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-600'}`} />
      </button>
    </div>
  );
});

// ---------------------------------------------------------------------
// Vista
// ---------------------------------------------------------------------

export const MarketsView: React.FC<MarketsViewProps> = ({ onSelectSymbol, onOpenSearch, hoursOpen, onHoursOpenChange }) => {
  const { pendingOrders, liveQuotes, fxRates, watchlist, toggleWatchlist, ensureQuotes, mergeQuotes } = useTrading();
  const [region, setRegion] = useState<Region>('ALL');
  const [order, setOrder] = useState<SortOrder>('DEFAULT');
  const [sector, setSector] = useState('ALL');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [visible, setVisible] = useState(PAGE);

  // Listas de Yahoo cargadas: id -> símbolos
  const [screenerRows, setScreenerRows] = useState<Record<string, RowItem[]>>({});
  const [loadingScreeners, setLoadingScreeners] = useState(false);

  const screenerIds = useMemo(() => screenersFor(region, order, sector), [region, order, sector]);
  const screenerKey = screenerIds.join(',');

  const loadScreeners = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      setLoadingScreeners(true);
      try {
        const results = await Promise.all(ids.map((id) => fetchScreener(id, 0, 100).then((r) => [id, r] as const)));
        const allQuotes: StockQuote[] = [];
        const next: Record<string, RowItem[]> = {};
        results.forEach(([id, r]) => {
          if (!r) return;
          const useful = r.quotes.filter(isUsefulListQuote);
          allQuotes.push(...useful);
          next[id] = useful.map((q) => ({ symbol: q.symbol, name: q.name }));
        });
        mergeQuotes(allQuotes);
        setScreenerRows((prev) => ({ ...prev, ...next }));
      } finally {
        setLoadingScreeners(false);
      }
    },
    [mergeQuotes]
  );

  useEffect(() => {
    if (onlyFavorites || !screenerKey) return;
    const ids = screenerKey.split(',');
    loadScreeners(ids);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadScreeners(ids);
    }, 60_000);
    return () => clearInterval(interval);
  }, [screenerKey, onlyFavorites, loadScreeners]);

  useEffect(() => setVisible(PAGE), [region, order, sector, onlyFavorites]);

  // Catálogo filtrado por región y sector
  const catalogRows = useMemo<RowItem[]>(
    () =>
      POPULAR_SYMBOLS.filter((s) => (sector === 'ALL' || s.category === sector) && matchesRegion(s.symbol, region)).map((s) => ({
        symbol: s.symbol,
        name: s.name,
        sector: s.sector,
      })),
    [sector, region]
  );

  // Todo lo que corresponde a los filtros: catálogo + listas de Yahoo
  const allRows = useMemo<RowItem[]>(() => {
    const seen = new Set<string>();
    const out: RowItem[] = [];
    const push = (r: RowItem) => {
      if (seen.has(r.symbol) || !matchesRegion(r.symbol, region)) return;
      seen.add(r.symbol);
      out.push(r);
    };
    catalogRows.forEach(push);
    screenerIds.forEach((id) => (screenerRows[id] || []).forEach(push));
    return out;
  }, [catalogRows, screenerIds, screenerRows, region]);

  // Ordenar con datos reales; sin cotización, al final
  const sortedRows = useMemo<RowItem[]>(() => {
    if (order === 'DEFAULT') return allRows;
    const score = (r: RowItem): number | null => {
      const q = liveQuotes[r.symbol];
      if (!q) return null;
      if (order === 'GAINERS') return q.changePercent;
      if (order === 'LOSERS') return -q.changePercent;
      // Más negociadas: volumen en dólares (comparable entre bolsas y divisas)
      const fx = getFxRate(q.currency, fxRates);
      return q.volumeRaw && fx ? q.volumeRaw * q.price * fx : null;
    };
    return [...allRows]
      .map((r) => ({ r, s: score(r) }))
      .sort((a, b) => (b.s ?? -Infinity) - (a.s ?? -Infinity))
      .map((x) => x.r);
  }, [allRows, order, liveQuotes, fxRates]);

  const favoriteRows = useMemo<RowItem[]>(() => {
    const catalog = new Map(POPULAR_SYMBOLS.map((s) => [s.symbol, s]));
    return watchlist.map((sym) => ({ symbol: sym, name: catalog.get(sym)?.name || liveQuotes[sym]?.name || sym, sector: catalog.get(sym)?.sector }));
  }, [watchlist, liveQuotes]);

  const rows = onlyFavorites ? favoriteRows : sortedRows.slice(0, visible);

  // Cotizaciones: para ordenar hacen falta las de todo el conjunto; si no, sólo las visibles
  const neededKey = (onlyFavorites ? favoriteRows : order === 'DEFAULT' ? rows : allRows).map((r) => r.symbol).join(',');
  useEffect(() => {
    if (!neededKey) return;
    const symbols = neededKey.split(',');
    ensureQuotes(symbols, 60_000);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') ensureQuotes(symbols, 60_000);
    }, 60_000);
    return () => clearInterval(interval);
  }, [neededKey, ensureQuotes]);

  const total = onlyFavorites ? favoriteRows.length : sortedRows.length;

  return (
    <div className="space-y-3 pb-24 max-w-md mx-auto px-4 pt-2">
      {/* Buscador + favoritos */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex-1 min-w-0 px-3.5 py-3 rounded-3xl bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border border-black/5 dark:border-white/10 flex items-center gap-2.5 text-zinc-400 text-sm shadow-ios-sm ios-active"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="truncate">Buscar en todas las bolsas…</span>
        </button>
        <button
          type="button"
          onClick={() => setOnlyFavorites((v) => !v)}
          className={`p-3 rounded-3xl border transition-all shadow-ios-sm ios-active shrink-0 ${
            onlyFavorites
              ? 'bg-amber-400/20 border-amber-400/50 text-amber-500 dark:text-amber-400'
              : 'bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border-black/5 dark:border-white/10 text-zinc-400'
          }`}
          aria-label="Ver solo mis favoritos"
        >
          <Star className={`w-5 h-5 ${onlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>
        <button
          type="button"
          onClick={() => onHoursOpenChange(true)}
          className={`relative p-3 rounded-3xl border transition-all shadow-ios-sm ios-active shrink-0 ${
            pendingOrders.length > 0
              ? 'bg-ios-orange/15 border-ios-orange/40 text-ios-orange'
              : 'bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border-black/5 dark:border-white/10 text-zinc-400'
          }`}
          aria-label="Aperturas de mercado y órdenes pendientes"
        >
          <Clock className="w-5 h-5" />
          {pendingOrders.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-ios-orange text-white text-[10px] font-bold flex items-center justify-center">
              {pendingOrders.length}
            </span>
          )}
        </button>
      </div>

      {hoursOpen && <MarketHoursSheet onClose={() => onHoursOpenChange(false)} onSelectSymbol={onSelectSymbol} />}

      {!onlyFavorites && (
        <>
          <div className="flex gap-2">
            <Dropdown<Region> prefix="Región" value={region} options={REGIONS} onChange={setRegion} />
            <Dropdown<SortOrder> prefix="Orden" value={order} options={ORDERS} onChange={setOrder} />
          </div>

          {/* Sectores: se reparten en varias filas, sin deslizar */}
          <div className="flex flex-wrap gap-1.5">
            {MARKET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSector(cat.id)}
                className={`px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all ios-active ${
                  sector === cat.id
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                    : 'bg-zinc-200/70 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {SECTOR_SHORT[cat.id] || cat.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400">
        <span>
          {onlyFavorites ? 'Tus favoritos' : `${total.toLocaleString('es-ES')} valores`}
          {!onlyFavorites && screenerIds.length > 0 && ' · incluye listas de Yahoo Finance'}
        </span>
        {loadingScreeners && <Loader2 className="w-3.5 h-3.5 animate-spin text-ios-blue" />}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-black/5 dark:border-white/5 text-center space-y-2">
            <Star className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {onlyFavorites ? 'Aún no tienes favoritos' : loadingScreeners ? 'Cargando…' : 'No hay valores con estos filtros'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
              {onlyFavorites ? 'Marca con la estrella las empresas que quieras seguir.' : 'Cambia la región o el sector, o busca cualquier empresa con la lupa.'}
            </p>
          </div>
        ) : (
          rows.map((item) => (
            <StockRow
              key={item.symbol}
              item={item}
              quote={liveQuotes[item.symbol]}
              isFavorited={watchlist.includes(item.symbol)}
              onSelect={onSelectSymbol}
              onToggleWatchlist={toggleWatchlist}
            />
          ))
        )}

        {!onlyFavorites && visible < sortedRows.length && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE)}
            className="w-full py-3 rounded-2xl bg-white dark:bg-ios-card-dark border border-black/5 dark:border-white/10 text-xs font-bold text-ios-blue shadow-ios-sm ios-active"
          >
            Ver más ({(sortedRows.length - visible).toLocaleString('es-ES')} restantes)
          </button>
        )}
      </div>
    </div>
  );
};
