import React from 'react';
import { Search, Moon, Sun, RefreshCw } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Apex Trade',
  subtitle,
  onOpenSearch,
}) => {
  const { isDarkMode, toggleDarkMode, isSyncing, refreshMarketData } = useTrading();

  return (
    <header className="sticky top-0 z-30 w-full pt-safe ios-glass-header border-b border-black/5 dark:border-white/10 transition-colors duration-200">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* Title / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
            AT
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">
                {title}
              </h1>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-ios-green/15 text-ios-green">
                <span className="w-1.5 h-1.5 rounded-full bg-ios-green animate-pulse" />
                VIRTUAL
              </span>
            </div>
            {subtitle && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1">
          {/* Quick Search Trigger */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/80 ios-active"
            aria-label="Buscar empresa"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Sync Refresh */}
          <button
            type="button"
            onClick={() => refreshMarketData()}
            disabled={isSyncing}
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/80 ios-active"
            aria-label="Actualizar cotizaciones"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-ios-blue' : ''}`} />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/80 ios-active"
            aria-label="Alternar modo oscuro y claro"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
