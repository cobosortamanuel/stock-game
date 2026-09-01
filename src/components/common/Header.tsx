import React from 'react';
import { Search, Moon, Sun, RefreshCw, TrendingUp, Lock, Globe } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Stock Game',
  subtitle,
  onOpenSearch,
}) => {
  const {
    isDarkMode,
    toggleDarkMode,
    isSyncing,
    refreshMarketData,
    activeGameName,
    isCurrentGamePrivate,
    isCurrentGameUnlocked,
    openLobby,
  } = useTrading();

  return (
    <header className="sticky top-0 z-30 w-full pt-safe ios-glass-header border-b border-black/5 dark:border-white/10 transition-colors duration-200">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* Title / Active Game Info */}
        <div className="flex items-center min-w-0">
          <button
            type="button"
            onClick={openLobby}
            className="flex items-center gap-2.5 text-left group ios-active min-w-0"
            title="Cambiar o crear partida"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-ios-green text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-none truncate max-w-[140px] sm:max-w-[190px]">
                  {activeGameName || title}
                </span>
                {isCurrentGamePrivate ? (
                  <Lock className="w-3 h-3 text-zinc-400 dark:text-zinc-500 shrink-0" />
                ) : (
                  <Globe className="w-3 h-3 text-ios-blue shrink-0" />
                )}
              </div>
              <p className="text-[10px] text-ios-blue font-bold tracking-tight leading-none mt-1">
                {isCurrentGamePrivate && !isCurrentGameUnlocked ? 'Modo Espectador' : 'Partida'}
              </p>
            </div>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1 shrink-0">
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
              <Sun className="w-4 h-4 text-zinc-300" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
