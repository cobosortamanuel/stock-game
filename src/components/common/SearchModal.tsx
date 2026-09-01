import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, ChevronRight, Loader2 } from 'lucide-react';
import { searchSymbols, POPULAR_SYMBOLS, MARKET_CATEGORIES, mapYahooToCategory } from '../../services/marketApi';
import { SearchResult } from '../../types/market';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
}) => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedCategory('ALL');
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchSymbols(query);
        setResults(data);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  // Filtered active list (either from search query or default catalog)
  const displayedItems = useMemo(() => {
    const sourceList = query.trim() ? results : POPULAR_SYMBOLS;

    if (selectedCategory === 'ALL') {
      return sourceList;
    }

    return sourceList.filter((item: any) => {
      const cat = item.category || mapYahooToCategory(item);
      return cat === selectedCategory;
    });
  }, [query, results, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-100/95 dark:bg-black/95 backdrop-blur-2xl animate-fadeIn">
      {/* Top Search Bar */}
      <div className="pt-safe px-4 pb-2 border-b border-black/5 dark:border-white/10 flex items-center gap-3">
        <div className="flex-1 relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-zinc-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar empresa, ticker (ej. AAPL, TSLA, BTC, SAN)..."
            className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-50 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-ios-blue"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 w-5 h-5 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-ios-blue text-sm font-semibold ios-active px-1"
        >
          Cancelar
        </button>
      </div>

      {/* Category Filter Pills Row inside Search */}
      <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-md mx-auto w-full">
        {MARKET_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ios-active ${
              selectedCategory === cat.id
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm font-bold'
                : 'bg-zinc-200/70 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 max-w-md mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-ios-blue" />
            <span className="text-xs">Buscando empresas...</span>
          </div>
        ) : query.trim() ? (
          displayedItems.length > 0 ? (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1 block mb-1">
                Resultados ({displayedItems.length})
              </span>
              {displayedItems.map((res: any) => (
                <button
                  key={`${res.symbol}_${res.exchange}`}
                  type="button"
                  onClick={() => {
                    onSelectSymbol(res.symbol);
                    onClose();
                  }}
                  className="w-full p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 flex items-center justify-between hover:border-ios-blue transition-colors text-left shadow-sm ios-active"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-800 dark:text-zinc-200 shrink-0">
                      {res.symbol.substring(0, 4)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 shrink-0">
                          {res.symbol}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium truncate max-w-[140px]">
                          {res.industry || res.sector || res.exchange}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate block w-full mt-0.5">
                        {res.name}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-zinc-400 text-xs">
              No se encontraron coincidencias para "{query}" en esta categoría.
            </div>
          )
        ) : (
          <div className="space-y-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1 block">
              Empresas y Activos ({displayedItems.length})
            </span>
            <div className="space-y-2">
              {displayedItems.map((item: any) => (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => {
                    onSelectSymbol(item.symbol);
                    onClose();
                  }}
                  className="w-full p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 flex items-center justify-between hover:border-ios-blue transition-colors text-left shadow-sm ios-active"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-800 dark:text-zinc-200 shrink-0">
                      {item.symbol.substring(0, 4)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 shrink-0">
                          {item.symbol}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium truncate max-w-[140px]">
                          {item.sector}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate block w-full mt-0.5">
                        {item.name}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
