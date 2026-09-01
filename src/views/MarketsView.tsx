import React, { useState } from 'react';
import { Search, Star } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { POPULAR_SYMBOLS, formatCurrency, formatPercent } from '../services/marketApi';

interface MarketsViewProps {
  onSelectSymbol: (symbol: string) => void;
  onOpenSearch: () => void;
}

type MarketCategory = 'ALL' | 'TECH' | 'GAMING' | 'CRYPTO' | 'AUTO' | 'MEDIA' | 'CONSUMER' | 'SPAIN' | 'INDICES' | 'GAINERS' | 'LOSERS';

const CATEGORY_ORDER: Record<string, number> = {
  GAMING: 1,
  TECH: 2,
  CRYPTO: 3,
  AUTO: 4,
  MEDIA: 5,
  CONSUMER: 6,
  SPAIN: 7,
  INDICES: 8,
};

export const MarketsView: React.FC<MarketsViewProps> = ({
  onSelectSymbol,
  onOpenSearch,
}) => {
  const { liveQuotes, watchlist, toggleWatchlist } = useTrading();
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory>('ALL');

  const categories = [
    { id: 'ALL' as MarketCategory, label: 'Todo' },
    { id: 'GAMING' as MarketCategory, label: 'Videojuegos' },
    { id: 'TECH' as MarketCategory, label: 'Tecnología e IA' },
    { id: 'CRYPTO' as MarketCategory, label: 'Criptomonedas (24/7)' },
    { id: 'AUTO' as MarketCategory, label: 'Automotriz' },
    { id: 'MEDIA' as MarketCategory, label: 'Streaming y Cine' },
    { id: 'CONSUMER' as MarketCategory, label: 'Consumo y Moda' },
    { id: 'SPAIN' as MarketCategory, label: 'España (IBEX 35)' },
    { id: 'INDICES' as MarketCategory, label: 'Índices y Oro' },
    { id: 'GAINERS' as MarketCategory, label: 'Subiendo hoy' },
    { id: 'LOSERS' as MarketCategory, label: 'Bajando hoy' },
  ];

  // Filter symbols based on category
  const filteredSymbols = POPULAR_SYMBOLS.filter((stock: any) => {
    const quote = liveQuotes[stock.symbol];
    const change = quote ? quote.changePercent : 0;

    switch (selectedCategory) {
      case 'GAMING':
        return stock.category === 'GAMING';
      case 'TECH':
        return stock.category === 'TECH';
      case 'CRYPTO':
        return stock.category === 'CRYPTO';
      case 'AUTO':
        return stock.category === 'AUTO';
      case 'MEDIA':
        return stock.category === 'MEDIA';
      case 'CONSUMER':
        return stock.category === 'CONSUMER';
      case 'SPAIN':
        return stock.category === 'SPAIN';
      case 'INDICES':
        return stock.category === 'INDICES';
      case 'GAINERS':
        return change > 0;
      case 'LOSERS':
        return change < 0;
      case 'ALL':
      default:
        return true;
    }
  }).sort((a: any, b: any) => {
    const isFavA = watchlist.includes(a.symbol);
    const isFavB = watchlist.includes(b.symbol);

    // 1. Favoritos siempre arriba del todo
    if (isFavA && !isFavB) return -1;
    if (!isFavA && isFavB) return 1;

    // 2. Ordenar según el orden de las categorías de las pestañas
    const orderA = CATEGORY_ORDER[a.category] || 99;
    const orderB = CATEGORY_ORDER[b.category] || 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return 0;
  });

  return (
    <div className="space-y-4 pb-20 max-w-md mx-auto px-4 pt-2">
      {/* Search Input Bar Trigger */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="w-full p-3.5 rounded-3xl bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border border-black/5 dark:border-white/10 flex items-center justify-between text-zinc-400 text-sm shadow-ios-sm ios-active"
      >
        <div className="flex items-center gap-2.5">
          <Search className="w-4 h-4 text-zinc-400" />
          <span>Buscar cualquier empresa del mundo...</span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono text-zinc-500">
          AAPL, TSLA, BTC...
        </span>
      </button>

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
        {filteredSymbols.map((item: any) => {
          const quote = liveQuotes[item.symbol];
          const price = quote ? quote.price : item.basePrice;
          const change = quote ? quote.change : 0;
          const changePercent = quote ? quote.changePercent : 0;
          const isUp = change >= 0;
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
        })}
      </div>
    </div>
  );
};
