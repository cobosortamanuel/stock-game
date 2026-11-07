import React, { useMemo, useState } from 'react';
import { Cloud, CloudOff, Layers, Loader2, PlusCircle, TrendingUp } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { ChartPoint, TimeRange } from '../types/market';
import { formatCurrency, formatPercent, formatTimeAgo, getMarketStatus } from '../services/marketApi';
import { PositionCard } from '../components/common/PositionCard';
import { StockChart } from '../components/common/StockChart';
import { equityValueAt, PortfolioPeriod, periodStart } from '../lib/portfolio';

interface PortfolioViewProps {
  onSelectSymbol: (symbol: string) => void;
  onExploreMarkets: () => void;
}

const PERIODS: TimeRange[] = ['1D', '1W', '1M', '1Y', 'ALL'];

function formatPointDate(ts: number, period: PortfolioPeriod): string {
  const d = new Date(ts);
  if (period === '1D') return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (period === '1W' || period === '1M') {
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({ onSelectSymbol, onExploreMarkets }) => {
  const {
    initialCash,
    cashAvailable,
    cashInvested,
    totalNetWorth,
    dailyPnL,
    dailyPnLPercent,
    equityHistory,
    positions,
    closePosition,
    lastQuotesUpdate,
    syncStatus,
    liveQuotes,
  } = useTrading();

  const [period, setPeriod] = useState<PortfolioPeriod>('ALL');

  // Gráfica del patrimonio: puntos reales guardados + el valor actual
  const chartData = useMemo<ChartPoint[]>(() => {
    const now = Date.now();
    const start = periodStart(period, equityHistory, now);
    const points = [
      { t: start, v: equityValueAt(equityHistory, start) },
      ...equityHistory.filter((p) => p.t > start && p.t < now),
      { t: now, v: totalNetWorth },
    ];
    return points.map((p) => ({ timestamp: p.t, dateStr: formatPointDate(p.t, period), price: Math.round(p.v * 100) / 100 }));
  }, [equityHistory, period, totalNetWorth]);

  const hasFewPoints = equityHistory.length < 3;
  const longPositions = positions.filter((p) => p.type === 'LONG').length;
  const shortPositions = positions.length - longPositions;
  const isDayUp = dailyPnL >= 0;
  // Si todos los mercados de tus posiciones están cerrados, el cambio es el de la última sesión
  const anyMarketOpen = positions.some((p) => liveQuotes[p.symbol] && getMarketStatus(liveQuotes[p.symbol]) !== 'CLOSED');

  return (
    <div className="space-y-4 pb-20 max-w-md mx-auto px-4 pt-2">
      {/* Tarjeta de patrimonio */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border border-black/5 dark:border-white/10 shadow-ios">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Patrimonio total</span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-400">
            {syncStatus === 'saving' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : syncStatus === 'synced' ? (
              <Cloud className="w-3 h-3 text-ios-green" />
            ) : (
              <CloudOff className="w-3 h-3 text-ios-orange" />
            )}
            {lastQuotesUpdate ? `Precios ${formatTimeAgo(lastQuotesUpdate)}` : 'Cargando precios...'}
          </span>
        </div>

        <StockChart
          data={chartData}
          timeRange={period}
          onTimeRangeChange={(r) => setPeriod(r as PortfolioPeriod)}
          ranges={PERIODS}
          height={150}
          currency="USD"
          periodLabel={period === 'ALL' ? 'desde el inicio' : undefined}
        />

        {hasFewPoints && (
          <p className="mt-2 text-[10px] text-zinc-400 text-center">
            La gráfica guarda tu patrimonio cada 15 minutos mientras la app está abierta.
          </p>
        )}

        {positions.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[11px] font-medium px-1">
            <span className="text-zinc-500 dark:text-zinc-400">{anyMarketOpen ? 'Hoy en bolsa' : 'Última sesión'}</span>
            <span className={`font-mono font-bold ${isDayUp ? 'text-ios-green' : 'text-ios-red'}`}>
              {isDayUp ? '+' : ''}
              {formatCurrency(dailyPnL)} ({formatPercent(dailyPnLPercent)})
            </span>
          </div>
        )}

        {/* Desglose */}
        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10 grid grid-cols-3 gap-2">
          <div className="bg-zinc-100/70 dark:bg-zinc-800/50 p-2.5 rounded-2xl min-w-0">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 block tracking-tight">Capital inicial</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-zinc-800 dark:text-zinc-200 block mt-0.5 truncate">
              {formatCurrency(initialCash, 'USD', false, true)}
            </span>
          </div>
          <div className="bg-zinc-100/70 dark:bg-zinc-800/50 p-2.5 rounded-2xl min-w-0">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 block tracking-tight">Invertido</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-ios-orange block mt-0.5 truncate">
              {formatCurrency(cashInvested, 'USD', false, true)}
            </span>
          </div>
          <div className="bg-zinc-100/70 dark:bg-zinc-800/50 p-2.5 rounded-2xl min-w-0">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 block tracking-tight">Disponible</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-ios-green block mt-0.5 truncate">
              {formatCurrency(cashAvailable, 'USD', false, true)}
            </span>
          </div>
        </div>

        {positions.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-medium px-1">
            <span>
              Posiciones abiertas: <strong>{positions.length}</strong>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-ios-green font-semibold">{longPositions} Largo</span>
              <span>•</span>
              <span className="text-ios-orange font-semibold">{shortPositions} Corto</span>
            </div>
          </div>
        )}
      </div>

      {/* Posiciones */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 leading-tight">Tus posiciones</h2>
            <p className="text-xs text-zinc-400">Valoradas con cotizaciones reales</p>
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
                onClose={(id) => closePosition(id)}
                onSelectSymbol={onSelectSymbol}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 text-center bg-white/50 dark:bg-zinc-900/30">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400 mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Aún no tienes posiciones</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Tienes <strong>{formatCurrency(cashAvailable)}</strong> para comprar acciones (ganas si suben) o venderlas en corto
              (ganas si bajan).
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
