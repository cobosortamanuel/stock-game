import React from 'react';
import { History, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency, formatPercent } from '../services/marketApi';

export const HistoryView: React.FC = () => {
  const { tradeHistory } = useTrading();

  // Closed trades with realized P&L
  const closedTrades = tradeHistory.filter(t => t.realizedPnL !== undefined);
  const winningTrades = closedTrades.filter(t => (t.realizedPnL || 0) > 0);
  const totalRealizedPnL = closedTrades.reduce((acc, t) => acc + (t.realizedPnL || 0), 0);
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

  return (
    <div className="space-y-4 pb-20 max-w-md mx-auto px-4 pt-2">
      {/* Analytics Overview Cards */}
      <div className="bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-ios">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
          Rendimiento y Registro de Apuestas
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {/* Win Rate */}
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              <Target className="w-3.5 h-3.5 text-ios-blue" />
              <span>Tasa de Acierto</span>
            </div>
            <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-50 mt-1">
              {winRate.toFixed(1)}%
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              {winningTrades.length} de {closedTrades.length} apuestas
            </div>
          </div>

          {/* Realized P&L */}
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              <History className="w-3.5 h-3.5 text-ios-green" />
              <span>Beneficio Cerrado</span>
            </div>
            <div
              className={`text-xl font-bold font-mono mt-1 ${
                totalRealizedPnL >= 0 ? 'text-ios-green' : 'text-ios-red'
              }`}
            >
              {totalRealizedPnL >= 0 ? '+' : ''}{formatCurrency(totalRealizedPnL)}
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              {closedTrades.length} operaciones cerradas
            </div>
          </div>
        </div>
      </div>

      {/* Trades History List */}
      <div>
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-2 px-1">
          Historial de Movimientos ({tradeHistory.length})
        </h3>

        {tradeHistory.length > 0 ? (
          <div className="space-y-2.5">
            {tradeHistory.map((trade) => {
              const isClose = trade.action.startsWith('CLOSE');
              const isProfit = (trade.realizedPnL || 0) >= 0;
              const date = new Date(trade.timestamp);
              const dateFormatted = `${date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

              return (
                <div
                  key={trade.id}
                  className="bg-white dark:bg-ios-card-dark rounded-2xl p-3.5 border border-black/5 dark:border-white/5 shadow-ios-sm flex items-center justify-between"
                >
                  {/* Left info */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                        trade.type === 'LONG'
                          ? 'bg-ios-green/15 text-ios-green'
                          : 'bg-ios-orange/15 text-ios-orange'
                      }`}
                    >
                      {trade.type === 'LONG' ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                          {trade.symbol}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            trade.type === 'LONG'
                              ? 'bg-ios-green/15 text-ios-green'
                              : 'bg-ios-orange/15 text-ios-orange'
                          }`}
                        >
                          {trade.type === 'LONG' ? 'Largo' : 'Corto'}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {isClose ? 'Cierre' : 'Apertura'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {dateFormatted}
                      </p>
                    </div>
                  </div>

                  {/* Right numbers */}
                  <div className="text-right">
                    {isClose ? (
                      <div>
                        <div
                          className={`font-mono font-bold text-sm ${
                            isProfit ? 'text-ios-green' : 'text-ios-red'
                          }`}
                        >
                          {isProfit ? '+' : ''}{formatCurrency(trade.realizedPnL || 0)}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Retorno: {formatPercent(trade.realizedPnLPercent || 0)}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-mono font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                          {formatCurrency(trade.investedAmount)}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          a {formatCurrency(trade.entryPrice)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 text-center bg-white/50 dark:bg-zinc-900/30">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400 mb-3">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              No hay movimientos todavía
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Tus operaciones de compra en largo y venta en corto se guardarán aquí automáticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
