import React, { useMemo, useState } from 'react';
import { ChevronRight, Clock, Layers, PlusCircle, TrendingUp } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { ChartPoint, TimeRange } from '../types/market';
import { formatCurrency, formatPercent, getMarketStatus } from '../services/marketApi';
import { PositionCard } from '../components/common/PositionCard';
import { StockChart } from '../components/common/StockChart';
import { equityValueAt, PortfolioPeriod, periodStart } from '../lib/portfolio';

interface PortfolioViewProps {
  onSelectSymbol: (symbol: string) => void;
  onExploreMarkets: () => void;
  onOpenOrders: () => void;
}

const PERIODS: TimeRange[] = ['1D', '1W', '1M', '1Y', 'ALL'];

function formatPointDate(ts: number, period: PortfolioPeriod): string {
  const d = new Date(ts);
  if (period === '1D') return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (period === '1W') return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: period === '1M' ? undefined : '2-digit' });
}

const Metric: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className="bg-zinc-100/70 dark:bg-zinc-800/50 px-2.5 py-2 rounded-2xl min-w-0">
    <span className="text-[10px] uppercase font-semibold text-zinc-400 block truncate">{label}</span>
    <span className={`text-[13px] font-bold font-mono block mt-0.5 truncate ${color}`}>{value}</span>
  </div>
);

export const PortfolioView: React.FC<PortfolioViewProps> = ({ onSelectSymbol, onExploreMarkets, onOpenOrders }) => {
  const {
    initialCash,
    cashAvailable,
    cashInvested,
    totalNetWorth,
    dailyPnL,
    dailyPnLPercent,
    netWorthHistory,
    positions,
    pendingOrders,
    closePosition,
    liveQuotes,
  } = useTrading();

  const [period, setPeriod] = useState<PortfolioPeriod>('ALL');

  const chartData = useMemo<ChartPoint[]>(() => {
    const now = Date.now();
    const start = periodStart(period, netWorthHistory, now);
    const points = [
      { t: start, v: equityValueAt(netWorthHistory, start) },
      ...netWorthHistory.filter((p) => p.t > start && p.t < now),
      { t: now, v: totalNetWorth },
    ];
    return points.map((p) => ({ timestamp: p.t, dateStr: formatPointDate(p.t, period), price: Math.round(p.v * 100) / 100 }));
  }, [netWorthHistory, period, totalNetWorth]);

  const longCount = positions.filter((p) => p.type === 'LONG').length;
  const isDayUp = dailyPnL >= 0;
  const anyMarketOpen = positions.some((p) => liveQuotes[p.symbol] && getMarketStatus(liveQuotes[p.symbol]) !== 'CLOSED');
  const pendingCloseIds = new Set(pendingOrders.filter((o) => o.kind === 'CLOSE').map((o) => o.positionId));

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4 pt-2">
      {/* Patrimonio */}
      <div className="rounded-3xl p-4 sm:p-5 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border border-black/5 dark:border-white/10 shadow-ios">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
          Patrimonio total
        </span>

        <StockChart
          data={chartData}
          timeRange={period}
          onTimeRangeChange={(r) => setPeriod(r as PortfolioPeriod)}
          ranges={PERIODS}
          height={150}
          currency="USD"
          periodLabel={period === 'ALL' ? 'desde el inicio' : undefined}
        />

        {positions.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[11px] font-medium px-1">
            <span className="text-zinc-500 dark:text-zinc-400">{anyMarketOpen ? 'Hoy en bolsa' : 'Última sesión'}</span>
            <span className={`font-mono font-bold ${isDayUp ? 'text-ios-green' : 'text-ios-red'}`}>
              {isDayUp ? '+' : ''}
              {formatCurrency(dailyPnL)} ({formatPercent(dailyPnLPercent)})
            </span>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10 grid grid-cols-3 gap-1.5">
          <Metric label="Inicial" value={formatCurrency(initialCash, 'USD', false, true)} color="text-zinc-800 dark:text-zinc-200" />
          <Metric label="Invertido" value={formatCurrency(cashInvested, 'USD', false, true)} color="text-ios-orange" />
          <Metric label="Disponible" value={formatCurrency(cashAvailable, 'USD', false, true)} color="text-ios-green" />
        </div>
      </div>

      {/* Órdenes pendientes: el detalle está en Mercados */}
      {pendingOrders.length > 0 && (
        <button
          type="button"
          onClick={onOpenOrders}
          className="w-full px-4 py-3 rounded-3xl bg-ios-orange/10 border border-ios-orange/30 flex items-center gap-2.5 text-left ios-active"
        >
          <Clock className="w-4 h-4 text-ios-orange shrink-0" />
          <span className="flex-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {pendingOrders.length === 1 ? '1 orden pendiente' : `${pendingOrders.length} órdenes pendientes`} para la apertura
          </span>
          <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
        </button>
      )}

      {/* Posiciones */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 leading-tight">Tus posiciones</h2>
            {positions.length > 0 && (
              <p className="text-[11px] text-zinc-400">
                {positions.length} abiertas · {longCount} largo · {positions.length - longCount} corto
              </p>
            )}
          </div>
          {positions.length > 0 && (
            <button type="button" onClick={onExploreMarkets} className="text-xs font-semibold text-ios-blue flex items-center gap-1 ios-active">
              <PlusCircle className="w-3.5 h-3.5" />
              Invertir más
            </button>
          )}
        </div>

        {positions.length > 0 ? (
          <div className="space-y-3">
            {positions.map((pos) => (
              <PositionCard
                key={pos.id}
                position={pos}
                quote={liveQuotes[pos.symbol]}
                hasPendingClose={pendingCloseIds.has(pos.id)}
                onClose={closePosition}
                onSelectSymbol={onSelectSymbol}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 p-6 text-center bg-white/50 dark:bg-zinc-900/30">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400 mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Aún no tienes posiciones</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Tienes <strong>{formatCurrency(cashAvailable)}</strong> para comprar acciones (ganas si suben) o venderlas en corto (ganas si bajan).
            </p>
            <button
              type="button"
              onClick={onExploreMarkets}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold shadow-md ios-active"
            >
              <TrendingUp className="w-4 h-4" />
              Explorar mercados
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
