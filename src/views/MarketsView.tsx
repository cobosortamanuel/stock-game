import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, RefreshCw, Search, Star } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { StockQuote } from '../types/market';
import { fetchScreener, formatCurrency, formatPercent, MARKET_CATEGORIES, POPULAR_SYMBOLS } from '../services/marketApi';
import { SegmentedControl } from '../components/common/SegmentedControl';

interface MarketsViewProps {
  onSelectSymbol: (symbol: string) => void;
  onOpenSearch: () => void;
}

type Mode = 'live' | 'catalog';

/** Listas reales de Yahoo Finance (se actualizan con el mercado) */
const LIVE_LISTS: { id: string; label: string }[] = [
  { id: 'most_actives', label: 'EE. UU. · Más negociadas' },
  { id: 'day_gainers', label: 'EE. UU. · Suben' },
  { id: 'day_losers', label: 'EE. UU. · Bajan' },
  { id: 'most_actives_europe', label: 'Europa · Más negociadas' },
  { id: 'day_gainers_europe', label: 'Europa · Suben' },
  { id: 'day_losers_europe', label: 'Europa · Bajan' },
  { id: 'most_actives_asia', label: 'Asia · Más negociadas' },
  { id: 'day_gainers_asia', label: 'Asia · Suben' },
  { id: 'day_losers_asia', label: 'Asia · Bajan' },
  { id: 'most_actives_ca', label: 'Canadá · Más negociadas' },
  { id: 'day_gainers_au', label: 'Australia · Suben' },
  { id: 'all_cryptocurrencies_us', label: 'Criptomonedas' },
  { id: 'top_etfs_us', label: 'ETFs' },
  { id: 'growth_technology_stocks', label: 'Tecnológicas en crecimiento' },
  { id: 'undervalued_growth_stocks', label: 'Crecimiento infravaloradas' },
  { id: 'small_cap_gainers', label: 'Pequeñas con impulso' },
  { id: 'most_shorted_stocks', label: 'Más vendidas en corto' },
];

const PAGE_SIZE = 50;
const CATALOG_PAGE = 25;

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
  return (
    <div
      style={{ contentVisibility: 'auto', containIntrinsicSize: '72px' }}
      className="w-full bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 rounded-3xl p-3.5 border border-black/5 dark:border-white/10 flex items-center justify-between shadow-ios-sm hover:border-ios-blue/40 transition-all overflow-hidden"
    >
      <button type="button" onClick={() => onSelect(item.symbol)} className="flex items-center gap-3 text-left flex-1 min-w-0 group mr-2">
        <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center font-bold text-[11px] text-zinc-800 dark:text-zinc-200 border border-black/5 dark:border-white/5 group-hover:border-ios-blue transition-colors shrink-0">
          {item.symbol.replace(/[-.=^].*$/, '').substring(0, 4)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50 shrink-0">{item.symbol}</span>
            {(item.sector || quote?.exchange) && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium truncate max-w-[120px] sm:max-w-[160px]">
                {item.sector || quote?.exchange}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate block w-full mt-0.5">{quote?.name || item.name}</p>
        </div>
      </button>

      <div className="flex items-center gap-2.5 shrink-0 pl-1">
        <button type="button" onClick={() => onSelect(item.symbol)} className="text-right">
          {quote ? (
            <>
              <div className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                {formatCurrency(quote.price, quote.currency)}
              </div>
              <div className={`font-mono font-semibold text-xs whitespace-nowrap ${isUp ? 'text-ios-green' : 'text-ios-red'}`}>
                {formatPercent(quote.changePercent)}
              </div>
            </>
          ) : (
            <div className="space-y-1.5 flex flex-col items-end">
              <div className="h-3.5 w-16 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
              <div className="h-3 w-10 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            </div>
          )}
        </button>
        <button type="button" onClick={() => onToggleWatchlist(item.symbol)} className="p-1.5 ios-active shrink-0" aria-label="Favorito">
          <Star className={`w-4 h-4 ${isFavorited ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-600'}`} />
        </button>
      </div>
    </div>
  );
});

export const MarketsView: React.FC<MarketsViewProps> = ({ onSelectSymbol, onOpenSearch }) => {
  const { liveQuotes, watchlist, toggleWatchlist, ensureQuotes, mergeQuotes } = useTrading();
  const [mode, setMode] = useState<Mode>('live');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // ---------------- Listas en vivo ----------------
  const [listId, setListId] = useState(LIVE_LISTS[0].id);
  const [listItems, setListItems] = useState<RowItem[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(false);
  const loadedCountRef = useRef(0);

  const loadList = useCallback(
    async (id: string, start: number, count: number, replace: boolean) => {
      setListLoading(true);
      setListError(false);
      try {
        const res = await fetchScreener(id, start, count);
        if (!res) {
          if (replace) setListItems([]);
          setListError(true);
          return;
        }
        mergeQuotes(res.quotes);
        const rows = res.quotes.map((q) => ({ symbol: q.symbol, name: q.name }));
        setListTotal(res.total);
        setListItems((prev) => {
          const next = replace ? rows : [...prev, ...rows.filter((r) => !prev.some((p) => p.symbol === r.symbol))];
          loadedCountRef.current = next.length;
          return next;
        });
      } finally {
        setListLoading(false);
      }
    },
    [mergeQuotes]
  );

  useEffect(() => {
    if (mode !== 'live' || onlyFavorites) return;
    setListItems([]);
    loadedCountRef.current = 0;
    loadList(listId, 0, PAGE_SIZE, true);
    // Actualizar los precios de la lista cada minuto
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadList(listId, 0, Math.min(100, Math.max(PAGE_SIZE, loadedCountRef.current)), true);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [mode, listId, onlyFavorites, loadList]);

  // ---------------- Catálogo ----------------
  const [category, setCategory] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(CATALOG_PAGE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const catalogItems = useMemo<RowItem[]>(() => {
    return POPULAR_SYMBOLS.filter((s) => category === 'ALL' || s.category === category).map((s) => ({
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
    }));
  }, [category]);

  const favoriteItems = useMemo<RowItem[]>(() => {
    const catalog = new Map(POPULAR_SYMBOLS.map((s) => [s.symbol, s]));
    return watchlist.map((sym) => ({
      symbol: sym,
      name: catalog.get(sym)?.name || liveQuotes[sym]?.name || sym,
      sector: catalog.get(sym)?.sector,
    }));
  }, [watchlist, liveQuotes]);

  useEffect(() => setVisibleCount(CATALOG_PAGE), [category, onlyFavorites, mode]);

  const rows: RowItem[] = onlyFavorites ? favoriteItems : mode === 'live' ? listItems : catalogItems.slice(0, visibleCount);

  // Pedir las cotizaciones de lo que está en pantalla (catálogo y favoritos)
  const visibleKey = onlyFavorites || mode === 'catalog' ? rows.map((r) => r.symbol).join(',') : '';
  useEffect(() => {
    if (!visibleKey) return;
    const symbols = visibleKey.split(',');
    ensureQuotes(symbols, 60_000);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') ensureQuotes(symbols, 60_000);
    }, 60_000);
    return () => clearInterval(interval);
  }, [visibleKey, ensureQuotes]);

  // Carga progresiva del catálogo
  useEffect(() => {
    if (mode !== 'catalog' || onlyFavorites) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((prev) => Math.min(prev + CATALOG_PAGE, catalogItems.length));
      },
      { rootMargin: '300px' }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [mode, onlyFavorites, catalogItems.length, visibleCount]);

  const chips = mode === 'live' ? LIVE_LISTS : MARKET_CATEGORIES;
  const selectedChip = mode === 'live' ? listId : category;

  return (
    <div className="space-y-4 pb-20 max-w-md mx-auto px-4 pt-2">
      {/* Buscador + favoritos */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex-1 p-3.5 rounded-3xl bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border border-black/5 dark:border-white/10 flex items-center justify-between text-zinc-400 text-sm shadow-ios-sm ios-active"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-zinc-400" />
            <span>Buscar en todas las bolsas...</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setOnlyFavorites((prev) => !prev)}
          className={`p-3.5 rounded-3xl border transition-all shadow-ios-sm ios-active flex items-center justify-center shrink-0 ${
            onlyFavorites
              ? 'bg-amber-400/20 border-amber-400/50 text-amber-500 dark:text-amber-400 ring-2 ring-amber-400/20'
              : 'bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border-black/5 dark:border-white/10 text-zinc-400 hover:text-amber-400'
          }`}
          aria-label="Ver solo mis favoritos"
        >
          <Star className={`w-5 h-5 ${onlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>
      </div>

      {!onlyFavorites && (
        <>
          <SegmentedControl<Mode>
            options={[
              { label: 'En directo', value: 'live' },
              { label: 'Por sectores', value: 'catalog' },
            ]}
            value={mode}
            onChange={setMode}
            size="sm"
          />

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => (mode === 'live' ? setListId(chip.id) : setCategory(chip.id))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ios-active ${
                  selectedChip === chip.id
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm font-bold'
                    : 'bg-zinc-200/70 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {mode === 'live' && (
            <div className="flex items-center justify-between px-1 -mt-2 text-[11px] text-zinc-400">
              <span>{listTotal > 0 ? `${listItems.length} de ${listTotal.toLocaleString('es-ES')} valores · datos de Yahoo Finance` : 'Datos de Yahoo Finance'}</span>
              <button
                type="button"
                onClick={() => loadList(listId, 0, Math.min(100, Math.max(PAGE_SIZE, listItems.length)), true)}
                disabled={listLoading}
                className="p-1 ios-active"
                aria-label="Actualizar lista"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${listLoading ? 'animate-spin text-ios-blue' : ''}`} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Lista */}
      <div className="space-y-2.5">
        {rows.length === 0 ? (
          listLoading ? (
            <div className="py-16 text-center text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-ios-blue" />
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-black/5 dark:border-white/5 text-center space-y-2">
              <Star className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                {onlyFavorites ? 'Aún no tienes favoritos' : listError ? 'No se ha podido cargar la lista' : 'No hay valores en esta lista'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
                {onlyFavorites
                  ? 'Marca con la estrella las empresas que quieras seguir.'
                  : listError
                  ? 'Comprueba tu conexión e inténtalo de nuevo.'
                  : 'Prueba otra lista o busca cualquier empresa con la lupa.'}
              </p>
            </div>
          )
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

        {!onlyFavorites && mode === 'live' && listItems.length > 0 && listItems.length < listTotal && (
          <button
            type="button"
            onClick={() => loadList(listId, listItems.length, PAGE_SIZE, false)}
            disabled={listLoading}
            className="w-full py-3 rounded-2xl bg-white dark:bg-ios-card-dark border border-black/5 dark:border-white/10 text-xs font-bold text-ios-blue shadow-ios-sm ios-active flex items-center justify-center gap-1.5"
          >
            {listLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Cargar más
          </button>
        )}

        {!onlyFavorites && mode === 'catalog' && visibleCount < catalogItems.length && (
          <div ref={loadMoreRef} className="h-6 w-full flex items-center justify-center py-2 opacity-50">
            <div className="w-4 h-4 rounded-full border-2 border-ios-blue border-t-transparent animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};
