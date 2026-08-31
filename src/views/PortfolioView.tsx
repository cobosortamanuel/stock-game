import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Layers, PlusCircle, ShieldCheck, TrendingUp } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { TimeRange } from '../types/market';
import { formatCurrency, formatPercent } from '../services/marketApi';
import { PositionCard } from '../components/common/PositionCard';

interface PortfolioViewProps {
  onSelectSymbol: (symbol: string) => void;
  onExploreMarkets: () => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  onSelectSymbol,
  onExploreMarkets,
}) => {
  const {
    initialCash,
    cashAvailable,
    cashInvested,
    totalNetWorth,
    portfolioTimeframeReturns,
    positions,
    closePosition,
  } = useTrading();

  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeRange>('1D');
  const activeTimeframeReturn = portfolioTimeframeReturns[selectedTimeframe];
  const isOverallPositive = activeTimeframeReturn.amount >= 0;

  const timeRanges: TimeRange[] = ['1D', '1W', '1M', '1Y', '5Y', 'ALL'];

  const longPositions = positions.filter(p => p.type === 'LONG');
  const shortPositions = positions.filter(p => p.type === 'SHORT');

  return (
    <div className="space-y-4 pb-20 max-w-md mx-auto px-4 pt-2">
      {/* Portfolio Main Balance Card (Apple Wallet / Stocks Card Aesthetic) */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border border-black/5 dark:border-white/10 shadow-ios">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Patrimonio Total
          </span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            <ShieldCheck className="w-3.5 h-3.5 text-ios-green" />
            <span>Ficticio 100%</span>
          </div>
        </div>

        {/* Big Net Worth Number */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatCurrency(totalNetWorth)}
          </span>
        </div>

        {/* Timeframe Return Badge */}
        <div className="mt-1 flex items-center gap-2">
          <div
            className={`inline-flex items-center font-mono font-bold text-xs sm:text-sm ${
              isOverallPositive ? 'text-ios-green' : 'text-ios-red'
            }`}
          >
            {isOverallPositive ? (
              <ArrowUpRight className="w-4 h-4 mr-0.5 stroke-[2.5]" />
            ) : (
              <ArrowDownRight className="w-4 h-4 mr-0.5 stroke-[2.5]" />
            )}
            {isOverallPositive ? '+' : ''}{formatCurrency(activeTimeframeReturn.amount)} ({formatPercent(activeTimeframeReturn.percent)})
          </div>
          <span className="text-[11px] text-zinc-400 font-medium">
            en {selectedTimeframe}
          </span>
        </div>

        {/* Portfolio Timeframe Switcher */}
        <div className="mt-4 grid grid-cols-6 gap-1 bg-zinc-200/60 dark:bg-zinc-800/80 p-1 rounded-xl">
          {timeRanges.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setSelectedTimeframe(tf)}
              className={`py-1 text-xs font-semibold rounded-lg transition-all ios-active ${
                selectedTimeframe === tf
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm font-bold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* 3 Key Breakdown Metrics (Dinero Base, Dinero Apostado, Dinero para apostar) */}
        <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/10 grid grid-cols-3 gap-2">
          {/* Dinero Base */}
          <div className="bg-zinc-100/70 dark:bg-zinc-800/50 p-2.5 rounded-2xl">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 block tracking-tight">
              Dinero Base
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-zinc-800 dark:text-zinc-200 block mt-0.5">
              {formatCurrency(initialCash, 'USD', true)}
            </span>
          </div>

          {/* Dinero Apostado */}
          <div className="bg-zinc-100/70 dark:bg-zinc-800/50 p-2.5 rounded-2xl">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 block tracking-tight">
              Apostado
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-ios-orange block mt-0.5">
              {formatCurrency(cashInvested, 'USD', true)}
            </span>
          </div>

          {/* Dinero Disponible */}
          <div className="bg-zinc-100/70 dark:bg-zinc-800/50 p-2.5 rounded-2xl">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 block tracking-tight">
              Disponible
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-ios-green block mt-0.5">
              {formatCurrency(cashAvailable, 'USD', true)}
            </span>
          </div>
        </div>

        {/* Quick Position Allocation Pill */}
        {positions.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-medium px-1">
            <span>Posiciones activas: <strong>{positions.length}</strong></span>
            <div className="flex items-center gap-2">
              <span className="text-ios-green font-semibold">{longPositions.length} Largo</span>
              <span>•</span>
              <span className="text-ios-orange font-semibold">{shortPositions.length} Corto</span>
            </div>
          </div>
        )}
      </div>

      {/* Open Positions Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
              Empresas con Dinero Apostado
            </h2>
            <p className="text-xs text-zinc-400">
              Posiciones abiertas en tiempo real
            </p>
          </div>

          {positions.length > 0 && (
            <button
              type="button"
              onClick={onExploreMarkets}
              className="text-xs font-semibold text-ios-blue flex items-center gap-1 ios-active"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Nueva Apuesta
            </button>
          )}
        </div>

        {/* Positions List */}
        {positions.length > 0 ? (
          <div className="space-y-3">
            {positions.map((pos) => (
              <PositionCard
                key={pos.id}
                position={pos}
                onClose={(id) => closePosition(id)}
                onSelectSymbol={onSelectSymbol}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 text-center bg-white/50 dark:bg-zinc-900/30">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400 mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Sin apuestas activas
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Tienes <strong>{formatCurrency(cashAvailable)}</strong> listos para apostar a favor (en largo) o a la baja (en corto).
            </p>

            <button
              type="button"
              onClick={onExploreMarkets}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold shadow-md ios-active"
            >
              <TrendingUp className="w-4 h-4" />
              Explorar Empresas y Apostar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
