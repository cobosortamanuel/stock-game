import React, { useState, useMemo } from 'react';
import { Search, Star } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { POPULAR_SYMBOLS, MARKET_CATEGORIES, mapYahooToCategory, getAssetVariation, formatCurrency, formatPercent } from '../services/marketApi';

interface MarketsViewProps {
  onSelectSymbol: (symbol: string) => void;
  onOpenSearch: () => void;
}

const CATEGORY_ORDER: Record<string, number> = {
  TECH: 1,
  CONSUMER: 2,
  GAMING: 3,
  CRYPTO: 4,
  AUTO: 5,
  MEDIA: 6,
  BANKING: 7,
  ENERGY: 8,
  INDICES: 9,
  OTHER: 99,
};

export const MarketsView: React.FC<MarketsViewProps> = ({
  onSelectSymbol,
  onOpenSearch,
}) => {
  const { liveQuotes, watchlist, toggleWatchlist } = useTrading();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);

  const categories = useMemo(() => [
    ...MARKET_CATEGORIES,
    { id: 'GAINERS', label: 'Subiendo hoy' },
    { id: 'LOSERS', label: 'Bajando hoy' },
  ], []);

  // Dynamically combine POPULAR_SYMBOLS with any custom asset in user's watchlist
  const allAvailableSymbols = useMemo(() => {
    const list: any[] = [...POPULAR_SYMBOLS];
    const existing = new Set(list.map((s) => s.symbol));

    watchlist.forEach((sym) => {
      if (!existing.has(sym)) {
        const quote = liveQuotes[sym];
        const isCrypto = sym.includes('-') || sym.includes('USD') || sym.includes('BTC') || sym.includes('ETH');
        const autoCat = mapYahooToCategory({ symbol: sym, type: isCrypto ? 'cryptocurrency' : 'equity' });
        const variation = getAssetVariation(sym, quote?.price || 100);

        list.unshift({
          symbol: sym,
          name: quote?.name || `${sym}`,
          sector: isCrypto ? 'Criptomoneda' : 'Acción Global',
          category: autoCat,
          basePrice: quote?.price || 100,
          baseChange: variation.change,
          baseChangePercent: variation.changePercent,
        });
        existing.add(sym);
      }
    });

    return list;
  }, [watchlist, liveQuotes]);

  // Filter symbols based on favorites toggle AND selected category
  const filteredSymbols = allAvailableSymbols.filter((stock: any) => {
    const quote = liveQuotes[stock.symbol];
    const changePercent = quote ? quote.changePercent : (stock.baseChangePercent ?? 0);
    const isFavorited = watchlist.includes(stock.symbol);

    // 1. If onlyFavorites is toggled on, exclude non-favorites
    if (onlyFavorites && !isFavorited) {
      return false;
    }

    // 2. Filter by category
    const cat = stock.category || mapYahooToCategory(stock);
    switch (selectedCategory) {
      case 'GAINERS':
        return changePercent > 0;
      case 'LOSERS':
        return changePercent < 0;
      case 'ALL':
        return true;
      default:
        return cat === selectedCategory;
    }
  }).sort((a: any, b: any) => {
    const isFavA = watchlist.includes(a.symbol);
    const isFavB = watchlist.includes(b.symbol);

    // Favoritos siempre arriba
    if (isFavA && !isFavB) return -1;
    if (!isFavA && isFavB) return 1;

    // Si estamos en Subiendo hoy o Bajando hoy, ordenar por mayor porcentaje
    if (selectedCategory === 'GAINERS') {
      const chgA = liveQuotes[a.symbol]?.changePercent ?? a.baseChangePercent ?? 0;
      const chgB = liveQuotes[b.symbol]?.changePercent ?? b.baseChangePercent ?? 0;
      return chgB - chgA;
    }
    if (selectedCategory === 'LOSERS') {
      const chgA = liveQuotes[a.symbol]?.changePercent ?? a.baseChangePercent ?? 0;
      const chgB = liveQuotes[b.symbol]?.changePercent ?? b.baseChangePercent ?? 0;
      return chgA - chgB;
    }

    // Orden por categoría
    const catA = a.category || mapYahooToCategory(a);
    const catB = b.category || mapYahooToCategory(b);
    const orderA = CATEGORY_ORDER[catA] || 99;
    const orderB = CATEGORY_ORDER[catB] || 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return 0;
  });

  return (
    <div className="space-y-4 pb-20 max-w-md mx-auto px-4 pt-2">
      {/* Search Input Bar Trigger + Favorites Quick Toggle Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex-1 p-3.5 rounded-3xl bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border border-black/5 dark:border-white/10 flex items-center justify-between text-zinc-400 text-sm shadow-ios-sm ios-active"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-zinc-400" />
            <span>Buscar...</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono text-zinc-500">
            AAPL, TSLA, BTC...
          </span>
        </button>

        {/* Quick Star Button to toggle Favorites */}
        <button
          type="button"
          onClick={() => setOnlyFavorites((prev) => !prev)}
          className={`p-3.5 rounded-3xl border transition-all shadow-ios-sm ios-active flex items-center justify-center shrink-0 ${
            onlyFavorites
              ? 'bg-amber-400/20 border-amber-400/50 text-amber-500 dark:text-amber-400 ring-2 ring-amber-400/20 shadow-sm'
              : 'bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border-black/5 dark:border-white/10 text-zinc-400 hover:text-amber-400'
          }`}
          title={onlyFavorites ? 'Mostrando solo favoritos' : 'Ver solo mis favoritos'}
          aria-label="Ver solo mis favoritos"
        >
          <Star className={`w-5 h-5 ${onlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>
      </div>

      {/* Categories Horizontal Scroll */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ios-active ${
              selectedCategory === cat.id
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm font-bold'
                : 'bg-zinc-200/70 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Market Ticker Cards List */}
      <div className="space-y-2.5">
        {filteredSymbols.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-black/5 dark:border-white/5 text-center space-y-2">
            <Star className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {onlyFavorites ? 'Sin favoritos en esta categoría' : 'No hay empresas disponibles'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
              {onlyFavorites
                ? 'No tienes ninguna empresa marcada como favorita en esta categoría seleccionada.'
                : 'Prueba a cambiar de categoría o busca activos con la lupa.'}
            </p>
          </div>
        ) : (
          filteredSymbols.map((item: any) => {
            const quote = liveQuotes[item.symbol];
            const price = quote ? quote.price : item.basePrice;
            const change = quote ? quote.change : item.baseChange;
            const changePercent = quote ? quote.changePercent : item.baseChangePercent;
            const isUp = changePercent >= 0;
            const isFavorited = watchlist.includes(item.symbol);

            return (
              <div
                key={item.symbol}
                className="w-full bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 rounded-3xl p-3.5 border border-black/5 dark:border-white/10 flex items-center justify-between shadow-ios-sm hover:border-ios-blue/40 transition-all overflow-hidden"
              >
                {/* Left: Ticker, Name, Sector */}
                <button
                  type="button"
                  onClick={() => onSelectSymbol(item.symbol)}
                  className="flex items-center gap-3 text-left flex-1 min-w-0 group mr-2"
                >
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center font-bold text-xs text-zinc-800 dark:text-zinc-200 border border-black/5 dark:border-white/5 group-hover:border-ios-blue transition-colors shrink-0">
                    {item.symbol.substring(0, 4)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50 shrink-0">
                        {item.symbol}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium truncate max-w-[120px] sm:max-w-[160px]">
                        {item.sector}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate block w-full mt-0.5">
                      {item.name}
                    </p>
                  </div>
                </button>

                {/* Right: Price, Change Pill & Star */}
                <div className="flex items-center gap-2.5 shrink-0 pl-1">
                  <button
                    type="button"
                    onClick={() => onSelectSymbol(item.symbol)}
                    className="text-right"
                  >
                    <div className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                      {formatCurrency(price, item.symbol.endsWith('.MC') ? 'EUR' : 'USD')}
                    </div>
                    <div
                      className={`inline-flex items-center justify-end font-mono font-semibold text-xs whitespace-nowrap ${
                        isUp ? 'text-ios-green' : 'text-ios-red'
                      }`}
                    >
                      {isUp ? '+' : ''}{formatPercent(changePercent)}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleWatchlist(item.symbol)}
                    className="p-1.5 text-zinc-400 hover:text-amber-400 ios-active shrink-0"
                    aria-label="Favorito"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        isFavorited ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-600'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
