import React, { useState } from 'react';
import { Search, Star } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { POPULAR_SYMBOLS, formatCurrency, formatPercent } from '../services/marketApi';

interface MarketsViewProps {
  onSelectSymbol: (symbol: string) => void;
  onOpenSearch: () => void;
}

type MarketCategory = 'ALL' | 'TECH' | 'CRYPTO' | 'INDICES' | 'SPAIN' | 'GAINERS' | 'LOSERS';

export const MarketsView: React.FC<MarketsViewProps> = ({
  onSelectSymbol,
  onOpenSearch,
}) => {
  const { liveQuotes, watchlist, toggleWatchlist } = useTrading();
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory>('ALL');

  const categories = [
    { id: 'ALL' as MarketCategory, label: 'Todo' },
    { id: 'TECH' as MarketCategory, label: 'Tecnología' },
    { id: 'CRYPTO' as MarketCategory, label: 'Criptomonedas' },
    { id: 'INDICES' as MarketCategory, label: 'Índices' },
    { id: 'SPAIN' as MarketCategory, label: 'España / UE' },
    { id: 'GAINERS' as MarketCategory, label: 'Top Ganadoras' },
    { id: 'LOSERS' as MarketCategory, label: 'Top Perdedoras' },
  ];

  // Filter symbols based on category
  const filteredSymbols = POPULAR_SYMBOLS.filter((stock) => {
    const quote = liveQuotes[stock.symbol];
    const change = quote ? quote.changePercent : 0;

    switch (selectedCategory) {
      case 'TECH':
        return ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'AMD', 'PLTR'].includes(stock.symbol);
      case 'CRYPTO':
        return ['BTC-USD', 'ETH-USD'].includes(stock.symbol);
      case 'INDICES':
        return ['SPY', 'QQQ'].includes(stock.symbol);
      case 'SPAIN':
        return ['SAN.MC', 'ITX.MC'].includes(stock.symbol);
      case 'GAINERS':
        return change > 0;
      case 'LOSERS':
        return change < 0;
      case 'ALL':
      default:
        return true;
    }
  });

  return (
    <div className="space-y-4 pb-20 max-w-md mx-auto px-4 pt-2">
      {/* Search Input Bar Trigger */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="w-full p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 flex items-center justify-between text-zinc-400 text-sm shadow-ios-sm ios-active"
      >
        <div className="flex items-center gap-2.5">
          <Search className="w-4 h-4 text-zinc-400" />
          <span>Buscar cualquier empresa del mundo...</span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono text-zinc-500">
          AAPL, TSLA...
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
        {filteredSymbols.map((item) => {
          const quote = liveQuotes[item.symbol];
          const price = quote ? quote.price : item.basePrice;
          const change = quote ? quote.change : 0;
          const changePercent = quote ? quote.changePercent : 0;
          const isUp = change >= 0;
          const isFavorited = watchlist.includes(item.symbol);

          return (
            <div
              key={item.symbol}
              className="w-full bg-white dark:bg-ios-card-dark rounded-2xl p-3.5 border border-black/5 dark:border-white/5 flex items-center justify-between shadow-ios-sm hover:border-ios-blue/40 transition-all"
            >
              {/* Left: Ticker, Name, Sector */}
              <button
                type="button"
                onClick={() => onSelectSymbol(item.symbol)}
                className="flex items-center gap-3 text-left flex-1 group"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-800 dark:text-zinc-200 border border-black/5 dark:border-white/5 group-hover:border-ios-blue transition-colors">
                  {item.symbol.substring(0, 4)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                      {item.symbol}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">
                      {item.sector}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[140px] sm:max-w-[190px]">
                    {item.name}
                  </p>
                </div>
              </button>

              {/* Right: Price, Change Pill & Star */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onSelectSymbol(item.symbol)}
                  className="text-right"
                >
                  <div className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(price, item.symbol.endsWith('.MC') ? 'EUR' : 'USD')}
                  </div>
                  <div
                    className={`inline-flex items-center justify-end font-mono font-semibold text-xs ${
                      isUp ? 'text-ios-green' : 'text-ios-red'
                    }`}
                  >
                    {isUp ? '+' : ''}{formatPercent(changePercent)}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => toggleWatchlist(item.symbol)}
                  className="p-1 text-zinc-400 hover:text-amber-400 ios-active"
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
