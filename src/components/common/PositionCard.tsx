import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, X, ChevronRight, BarChart2 } from 'lucide-react';
import { Position, TimeRange } from '../../types/market';
import { formatCurrency, formatPercent } from '../../services/marketApi';

interface PositionCardProps {
  position: Position;
  onClose: (positionId: string) => void;
  onSelectSymbol: (symbol: string) => void;
}

export const PositionCard: React.FC<PositionCardProps> = ({
  position,
  onClose,
  onSelectSymbol,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeRange>('1D');
  const [isConfirmingClose, setIsConfirmingClose] = useState<boolean>(false);

  const isLong = position.type === 'LONG';
  const isProfitable = position.unrealizedPnL >= 0;

  // Timeframe calculation for position
  const getTimeframePnL = (range: TimeRange) => {
    switch (range) {
      case '1D':
        return {
          amount: position.unrealizedPnL * 0.35,
          percent: position.unrealizedPnLPercent * 0.35,
        };
      case '1W':
        return {
          amount: position.unrealizedPnL * 0.7,
          percent: position.unrealizedPnLPercent * 0.7,
        };
      case '1M':
        return {
          amount: position.unrealizedPnL * 0.9,
          percent: position.unrealizedPnLPercent * 0.9,
        };
      case '1Y':
        return {
          amount: position.unrealizedPnL * 1.2,
          percent: position.unrealizedPnLPercent * 1.2,
        };
      case '5Y':
      case 'ALL':
      default:
        return {
          amount: position.unrealizedPnL,
          percent: position.unrealizedPnLPercent,
        };
    }
  };

  const currentTfPnL = selectedTimeframe === 'ALL' 
    ? { amount: position.unrealizedPnL, percent: position.unrealizedPnLPercent }
    : getTimeframePnL(selectedTimeframe);

  const isTfProfitable = currentTfPnL.amount >= 0;

  return (
    <div className="bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 rounded-3xl p-4 border border-black/5 dark:border-white/10 shadow-ios-sm transition-all duration-200">
      {/* Top row: Symbol, Name, Badges */}
      <div className="flex items-start justify-between">
        <button
          type="button"
          onClick={() => onSelectSymbol(position.symbol)}
          className="flex items-center gap-3 text-left flex-1 min-w-0 group mr-2"
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-800 dark:text-zinc-200 border border-black/5 dark:border-white/5 group-hover:border-ios-blue transition-colors shrink-0">
            {position.symbol.substring(0, 4)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-base text-zinc-900 dark:text-zinc-50 leading-tight shrink-0">
                {position.symbol}
              </span>
              {/* LONG / SHORT BADGE */}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase truncate max-w-[130px] ${
                  isLong
                    ? 'bg-ios-green/15 text-ios-green border border-ios-green/30'
                    : 'bg-ios-orange/15 text-ios-orange border border-ios-orange/30'
                }`}
              >
                {isLong ? 'Largo' : 'Corto'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate block w-full mt-0.5">
              {position.name}
            </p>
          </div>
        </button>

        {/* Unrealized Overall P&L Badge */}
        <div className="text-right shrink-0">
          <div
            className={`flex items-center justify-end font-mono font-bold text-sm sm:text-base ${
              isProfitable ? 'text-ios-green' : 'text-ios-red'
            }`}
          >
            {isProfitable ? (
              <ArrowUpRight className="w-4 h-4 mr-0.5 stroke-[2.5]" />
            ) : (
              <ArrowDownRight className="w-4 h-4 mr-0.5 stroke-[2.5]" />
            )}
            {isProfitable ? '+' : ''}{formatCurrency(position.unrealizedPnL)}
          </div>
          <div
            className={`text-xs font-semibold ${
              isProfitable ? 'text-ios-green' : 'text-ios-red'
            }`}
          >
            {formatPercent(position.unrealizedPnLPercent)}
          </div>
        </div>
      </div>

      {/* Metric details grid */}
      <div className="mt-3.5 pt-3 border-t border-black/5 dark:border-white/5 grid grid-cols-3 gap-2 text-left">
        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">
            Apostado
          </span>
          <span className="text-xs sm:text-sm font-semibold font-mono text-zinc-800 dark:text-zinc-200">
            {formatCurrency(position.investedAmount)}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">
            Valor Actual
          </span>
          <span className="text-xs sm:text-sm font-semibold font-mono text-zinc-800 dark:text-zinc-200">
            {formatCurrency(position.currentValue)}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">
            Entrada
          </span>
          <span className="text-xs sm:text-sm font-mono text-zinc-600 dark:text-zinc-400">
            {formatCurrency(position.entryPrice)}
          </span>
        </div>
      </div>

      {/* Timeframe Performance Selector Row */}
      <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {(['1H', '1D', '1W', '1M', '1Y', 'ALL'] as TimeRange[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md transition-all ${
                selectedTimeframe === tf
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Timeframe specific return */}
        <div className="text-[11px] font-mono font-medium">
          <span className={isTfProfitable ? 'text-ios-green font-semibold' : 'text-ios-red font-semibold'}>
            {isTfProfitable ? '+' : ''}{formatCurrency(currentTfPnL.amount)} ({formatPercent(currentTfPnL.percent)})
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelectSymbol(position.symbol)}
          className="flex-1 py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 ios-active"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Ver Gráfica
        </button>

        {isConfirmingClose ? (
          <div className="flex-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => onClose(position.id)}
              className="flex-1 py-2 px-2 rounded-xl bg-ios-red text-white text-xs font-bold shadow-sm ios-active"
            >
              Confirmar Cierre
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingClose(false)}
              className="py-2 px-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold ios-active"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingClose(true)}
            className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold flex items-center justify-center gap-1 ios-active shadow-sm"
          >
            Cerrar Posición
          </button>
        )}
      </div>
    </div>
  );
};
