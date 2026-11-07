import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart2, X } from 'lucide-react';
import { PositionView, StockQuote } from '../../types/market';
import { formatCurrency, formatPercent, getMarketStatus } from '../../services/marketApi';
import { MarketStatusBadge } from './MarketStatusBadge';

interface PositionCardProps {
  position: PositionView;
  quote?: StockQuote;
  onClose: (positionId: string) => { success: boolean; message: string } | void;
  onSelectSymbol: (symbol: string) => void;
}

export const PositionCard: React.FC<PositionCardProps> = ({ position, quote, onClose, onSelectSymbol }) => {
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLong = position.type === 'LONG';
  const isProfitable = position.unrealizedPnL >= 0;
  const isDayUp = position.dayPnL >= 0;
  const currency = position.currency || 'USD';

  const handleClose = () => {
    const res = onClose(position.id);
    if (res && !res.success) setError(res.message);
    setIsConfirmingClose(false);
  };

  return (
    <div className="bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 rounded-3xl p-4 border border-black/5 dark:border-white/10 shadow-ios-sm transition-all duration-200">
      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <button type="button" onClick={() => onSelectSymbol(position.symbol)} className="flex items-center gap-3 text-left flex-1 min-w-0 group mr-2">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-800 dark:text-zinc-200 border border-black/5 dark:border-white/5 group-hover:border-ios-blue transition-colors shrink-0">
            {position.symbol.substring(0, 4)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-base text-zinc-900 dark:text-zinc-50 leading-tight shrink-0">{position.symbol}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 ${
                  isLong ? 'bg-ios-green/15 text-ios-green border border-ios-green/30' : 'bg-ios-orange/15 text-ios-orange border border-ios-orange/30'
                }`}
              >
                {isLong ? 'Largo' : 'Corto'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate block w-full mt-0.5">{position.name}</p>
          </div>
        </button>

        <div className="text-right shrink-0">
          {position.hasPrice ? (
            <>
              <div className={`flex items-center justify-end font-mono font-bold text-sm sm:text-base ${isProfitable ? 'text-ios-green' : 'text-ios-red'}`}>
                {isProfitable ? <ArrowUpRight className="w-4 h-4 mr-0.5 stroke-[2.5]" /> : <ArrowDownRight className="w-4 h-4 mr-0.5 stroke-[2.5]" />}
                {isProfitable ? '+' : ''}
                {formatCurrency(position.unrealizedPnL)}
              </div>
              <div className={`text-xs font-semibold ${isProfitable ? 'text-ios-green' : 'text-ios-red'}`}>
                {formatPercent(position.unrealizedPnLPercent)}
              </div>
            </>
          ) : (
            <div className="text-xs font-semibold text-zinc-400">Cargando precio…</div>
          )}
        </div>
      </div>

      {/* Datos */}
      <div className="mt-3.5 pt-3 border-t border-black/5 dark:border-white/5 grid grid-cols-3 gap-2 text-left">
        <div className="min-w-0">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">Invertido</span>
          <span className="text-xs sm:text-sm font-semibold font-mono text-zinc-800 dark:text-zinc-200 block truncate">
            {formatCurrency(position.investedAmount)}
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">Valor actual</span>
          <span className="text-xs sm:text-sm font-semibold font-mono text-zinc-800 dark:text-zinc-200 block truncate">
            {formatCurrency(position.currentValue)}
          </span>
        </div>
        <div className="text-right min-w-0">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">Entrada → Ahora</span>
          <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 block truncate">
            {formatCurrency(position.entryPrice, currency)}
          </span>
          <span className="text-[11px] font-mono font-semibold text-zinc-800 dark:text-zinc-200 block truncate">
            {position.hasPrice ? formatCurrency(position.currentPrice, currency) : '—'}
          </span>
        </div>
      </div>

      {/* Hoy + estado del mercado */}
      <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
        <MarketStatusBadge quote={quote} compact />
        {position.hasPrice && (
          <span className="text-[11px] font-mono font-medium">
            <span className="text-zinc-400 font-sans mr-1">{quote && getMarketStatus(quote) === 'CLOSED' ? 'Última sesión' : 'Hoy'}</span>
            <span className={isDayUp ? 'text-ios-green font-semibold' : 'text-ios-red font-semibold'}>
              {isDayUp ? '+' : ''}
              {formatCurrency(position.dayPnL)}
            </span>
          </span>
        )}
      </div>

      {error && <div className="mt-2 p-2 bg-red-500/10 text-ios-red text-[11px] rounded-xl font-medium">{error}</div>}

      {/* Acciones */}
      <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelectSymbol(position.symbol)}
          className="flex-1 py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 ios-active"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Ver gráfica
        </button>

        {isConfirmingClose ? (
          <div className="flex-1 flex items-center gap-1">
            <button type="button" onClick={handleClose} className="flex-1 py-2 px-2 rounded-xl bg-ios-red text-white text-xs font-bold shadow-sm ios-active">
              Cerrar por {formatCurrency(position.currentValue)}
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingClose(false)}
              className="py-2 px-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold ios-active"
              aria-label="Cancelar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsConfirmingClose(true);
            }}
            disabled={!position.hasPrice}
            className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold flex items-center justify-center gap-1 ios-active shadow-sm disabled:opacity-50"
          >
            Cerrar posición
          </button>
        )}
      </div>
    </div>
  );
};
