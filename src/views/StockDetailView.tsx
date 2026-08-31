import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, TrendingUp, TrendingDown, Layers, Loader2 } from 'lucide-react';
import { StockQuote, ChartPoint, TimeRange, PositionType } from '../types/market';
import { fetchStockData, formatCurrency, formatPercent } from '../services/marketApi';
import { StockChart } from '../components/common/StockChart';
import { TradeModal } from '../components/common/TradeModal';
import { useTrading } from '../context/TradingContext';

interface StockDetailViewProps {
  symbol: string;
  onBack: () => void;
}

export const StockDetailView: React.FC<StockDetailViewProps> = ({
  symbol,
  onBack,
}) => {
  const { watchlist, toggleWatchlist, positions } = useTrading();
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tradeModalOpen, setTradeModalOpen] = useState<boolean>(false);
  const [tradeType, setTradeType] = useState<PositionType>('LONG');

  const isFavorited = watchlist.includes(symbol);
  const userPositions = positions.filter(p => p.symbol === symbol);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await fetchStockData(symbol, timeRange);
        if (isMounted) {
          setQuote(res.quote);
          setChartData(res.chart);
        }
      } catch (err) {
        console.error('Error fetching stock data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [symbol, timeRange]);

  const handleOpenTrade = (type: PositionType) => {
    setTradeType(type);
    setTradeModalOpen(true);
  };

  const isPositive = quote ? quote.change >= 0 : true;

  return (
    <div className="pb-36 max-w-md mx-auto px-4 pt-2">
      {/* Top Bar with Back and Actions */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-semibold text-ios-blue ios-active -ml-1 py-1.5 px-2.5 rounded-xl hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => toggleWatchlist(symbol)}
            className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 flex items-center justify-center text-zinc-500 hover:text-amber-400 ios-active shadow-sm"
          >
            <Star className={`w-4 h-4 ${isFavorited ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stock Identity Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            {symbol}
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold">
            {quote?.exchange || 'NASDAQ'}
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          {quote?.name || `${symbol} Corporation`}
        </p>
      </div>

      {/* Interactive Chart Section */}
      <div className="bg-white dark:bg-ios-card-dark rounded-3xl p-4 border border-black/5 dark:border-white/5 shadow-ios">
        {isLoading && chartData.length === 0 ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-zinc-400 gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-ios-blue" />
            <span className="text-xs">Cargando gráfico interactivo...</span>
          </div>
        ) : (
          <StockChart
            data={chartData}
            timeRange={timeRange}
            onTimeRangeChange={(r) => setTimeRange(r)}
            isPositive={isPositive}
            height={220}
            showTimeSelector={true}
          />
        )}
      </div>

      {/* Active Position in this asset if any */}
      {userPositions.length > 0 && (
        <div className="mt-4 p-4 bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-ios-blue" />
              <span>Tienes dinero apostado en {symbol}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20">
              {userPositions.length} posición(es)
            </span>
          </div>
          {userPositions.map((p) => (
            <div key={p.id} className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className={`font-bold ${p.type === 'LONG' ? 'text-ios-green' : 'text-ios-orange'}`}>
                  {p.type === 'LONG' ? 'Largo' : 'Corto'}:
                </span>{' '}
                <span className="font-mono text-zinc-300">{formatCurrency(p.investedAmount)} apostados</span>
              </div>
              <div className="font-mono font-semibold">
                {p.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(p.unrealizedPnL)} ({formatPercent(p.unrealizedPnLPercent)})
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Financial Key Statistics Grid */}
      <div className="mt-4 bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-ios-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
          Estadísticas Clave del Mercado
        </h3>

        <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
            <span className="text-zinc-500 dark:text-zinc-400">Apertura</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {quote?.open ? formatCurrency(quote.open) : '-'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
            <span className="text-zinc-500 dark:text-zinc-400">Cierre Previo</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {quote?.prevClose ? formatCurrency(quote.prevClose) : '-'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
            <span className="text-zinc-500 dark:text-zinc-400">Máx del Día</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {quote?.high ? formatCurrency(quote.high) : '-'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
            <span className="text-zinc-500 dark:text-zinc-400">Mín del Día</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {quote?.low ? formatCurrency(quote.low) : '-'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
            <span className="text-zinc-500 dark:text-zinc-400">Máx 52 Semanas</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {quote?.week52High ? formatCurrency(quote.week52High) : '-'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
            <span className="text-zinc-500 dark:text-zinc-400">Mín 52 Semanas</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {quote?.week52Low ? formatCurrency(quote.week52Low) : '-'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Volumen</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {quote?.volume || 'N/A'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Cap. de Mercado</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {quote?.marketCap || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Fixed Clean Bottom Action Bar for Long and Short with Safe Area Insets */}
      {quote && (
        <div className="fixed bottom-0 left-0 right-0 z-30 pb-safe pt-3 px-4 ios-glass-bar border-t border-black/10 dark:border-white/15 shadow-ios-sheet">
          <div className="max-w-md mx-auto grid grid-cols-2 gap-3 mb-2">
            {/* Apostar en Corto */}
            <button
              type="button"
              onClick={() => handleOpenTrade('SHORT')}
              className="py-3.5 px-3 rounded-2xl bg-ios-orange text-white font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-0.5 shadow-md ios-active hover:bg-amber-600 active:scale-95 transition-all"
            >
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" />
                <span>Apostar en Corto</span>
              </div>
              <span className="text-[10px] text-white/80 font-normal">A la baja</span>
            </button>

            {/* Apostar a Favor (Largo) */}
            <button
              type="button"
              onClick={() => handleOpenTrade('LONG')}
              className="py-3.5 px-3 rounded-2xl bg-ios-green text-white font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-0.5 shadow-md ios-active hover:bg-emerald-600 active:scale-95 transition-all"
            >
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>Apostar a Favor</span>
              </div>
              <span className="text-[10px] text-white/80 font-normal">Al alza</span>
            </button>
          </div>
        </div>
      )}

      {/* Trade Modal */}
      {quote && (
        <TradeModal
          quote={quote}
          isOpen={tradeModalOpen}
          onClose={() => setTradeModalOpen(false)}
          defaultType={tradeType}
        />
      )}
    </div>
  );
};
