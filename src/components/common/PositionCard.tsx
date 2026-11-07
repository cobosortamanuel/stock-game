import React from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart2 } from 'lucide-react';
import { PositionView, StockQuote } from '../../types/market';
import { formatCurrency, formatPercent, getMarketStatus, isAlwaysOpen } from '../../services/marketApi';
import { MarketStatusBadge } from './MarketStatusBadge';
import { ClosePositionControl } from './ClosePositionControl';

interface PositionCardProps {
  position: PositionView;
  quote?: StockQuote;
  hasPendingClose: boolean;
  onClose: (positionId: string, percentage: number) => { success: boolean; message: string };
  onSelectSymbol: (symbol: string) => void;
}

const Stat: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="min-w-0">
    <span className="text-[10px] text-zinc-400 uppercase tracking-wide block font-medium">{label}</span>
    <span
      className={`text-[13px] font-mono block truncate ${
        strong ? 'font-semibold text-zinc-800 dark:text-zinc-200' : 'text-zinc-600 dark:text-zinc-400'
      }`}
    >
      {value}
    </span>
  </div>
);

export const PositionCard: React.FC<PositionCardProps> = ({ position, quote, hasPendingClose, onClose, onSelectSymbol }) => {
  const isLong = position.type === 'LONG';
  const isProfitable = position.unrealizedPnL >= 0;
  const isDayUp = position.dayPnL >= 0;
  const currency = position.currency || 'USD';
  const marketClosed = !!quote && !isAlwaysOpen(quote) && getMarketStatus(quote) === 'CLOSED';

  return (
    <div className="bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 rounded-3xl p-4 border border-black/5 dark:border-white/10 shadow-ios-sm">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => onSelectSymbol(position.symbol)} className="flex items-center gap-3 text-left flex-1 min-w-0 group">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-[11px] text-zinc-800 dark:text-zinc-200 border border-black/5 dark:border-white/5 group-hover:border-ios-blue transition-colors shrink-0">
            {position.symbol.replace(/[-.=^].*$/, '').substring(0, 4)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-[15px] text-zinc-900 dark:text-zinc-50 leading-tight truncate">{position.symbol}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase shrink-0 ${
                  isLong ? 'bg-ios-green/15 text-ios-green' : 'bg-ios-orange/15 text-ios-orange'
                }`}
              >
                {isLong ? 'Largo' : 'Corto'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{position.name}</p>
          </div>
        </button>

        <div className="text-right shrink-0">
          {position.hasPrice ? (
            <>
              <div className={`flex items-center justify-end font-mono font-bold text-sm ${isProfitable ? 'text-ios-green' : 'text-ios-red'}`}>
                {isProfitable ? <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" /> : <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />}
                {isProfitable ? '+' : ''}
                {formatCurrency(position.unrealizedPnL)}
              </div>
              <div className={`text-xs font-semibold font-mono ${isProfitable ? 'text-ios-green' : 'text-ios-red'}`}>
                {formatPercent(position.unrealizedPnLPercent)}
              </div>
            </>
          ) : (
            <div className="text-xs font-semibold text-zinc-400">Cargando…</div>
          )}
        </div>
      </div>

      {/* Datos (2 x 2) */}
      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 grid grid-cols-2 gap-x-3 gap-y-2">
        <Stat label="Invertido" value={formatCurrency(position.investedAmount)} strong />
        <Stat label="Valor actual" value={formatCurrency(position.currentValue)} strong />
        <Stat label="Entrada" value={formatCurrency(position.entryPrice, currency)} />
        <Stat label="Precio actual" value={position.hasPrice ? formatCurrency(position.currentPrice, currency) : '—'} />
      </div>

      {/* Estado del mercado + cambio del día */}
      <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
        <MarketStatusBadge quote={quote} compact />
        {position.hasPrice && (
          <span className="text-[11px] font-mono whitespace-nowrap">
            <span className="text-zinc-400 font-sans mr-1">{marketClosed ? 'Última sesión' : 'Hoy'}</span>
            <span className={`font-semibold ${isDayUp ? 'text-ios-green' : 'text-ios-red'}`}>
              {isDayUp ? '+' : ''}
              {formatCurrency(position.dayPnL)}
            </span>
          </span>
        )}
      </div>

      {/* Acciones */}
      <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5">
        <ClosePositionControl
          position={position}
          marketClosed={marketClosed}
          hasPendingClose={hasPendingClose}
          onClose={onClose}
          leading={
            <button
              type="button"
              onClick={() => onSelectSymbol(position.symbol)}
              className="py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 ios-active shrink-0"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Gráfica
            </button>
          }
        />
      </div>
    </div>
  );
};
