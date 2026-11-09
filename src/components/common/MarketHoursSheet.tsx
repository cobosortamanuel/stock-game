import React, { useEffect, useMemo, useState } from 'react';
import { Clock, X } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { PendingOrder } from '../../types/market';
import { formatCurrency } from '../../services/marketApi';
import { EXCHANGES, ExchangeInfo, exchangeOf, formatExchangeOpen, formatLocalOpen, sessionInfo } from '../../lib/exchanges';

interface MarketHoursSheetProps {
  onClose: () => void;
  onSelectSymbol: (symbol: string) => void;
}

const OTHER_KEY = '__other__';

const OpeningLine: React.FC<{ ex: ExchangeInfo; now: number; symbol?: string }> = ({ ex, now, symbol }) => {
  const { liveQuotes } = useTrading();
  const info = sessionInfo(ex, now, symbol ? liveQuotes[symbol] : undefined);
  if (info.isOpen) {
    return (
      <span className="text-[11px] font-semibold text-ios-green">
        Abierto{info.closesAt ? ` · cierra a las ${new Date(info.closesAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : ''}
      </span>
    );
  }
  if (!info.nextOpen) return <span className="text-[11px] text-zinc-400">—</span>;
  const exchangeTime = formatExchangeOpen(info.nextOpen, ex);
  return (
    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
      Abre <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatLocalOpen(info.nextOpen)}</span>
      {exchangeTime && <span className="text-zinc-400"> ({exchangeTime})</span>}
    </span>
  );
};

const OrderRow: React.FC<{ order: PendingOrder; onCancel: () => void; onSelect: () => void }> = ({ order, onCancel, onSelect }) => (
  <div className="p-3.5 flex items-center justify-between gap-2">
    <button type="button" onClick={onSelect} className="min-w-0 text-left">
      <div className="flex items-center gap-1.5">
        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50">{order.symbol}</span>
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
            order.kind === 'CLOSE'
              ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
              : order.type === 'LONG'
              ? 'bg-ios-green/15 text-ios-green'
              : 'bg-ios-orange/15 text-ios-orange'
          }`}
        >
          {order.kind === 'CLOSE' ? `Cerrar ${Math.round((order.fraction || 1) * 100)}%` : order.type === 'LONG' ? 'Compra' : 'Corto'}
        </span>
      </div>
      <p className="text-[11px] text-zinc-400 leading-snug truncate">
        {order.kind === 'OPEN' ? `${formatCurrency(order.amount || 0)} reservados · ` : ''}
        {order.name}
      </p>
    </button>
    <button
      type="button"
      onClick={onCancel}
      className="py-1.5 px-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-semibold flex items-center gap-1 ios-active shrink-0"
    >
      <X className="w-3 h-3" />
      Cancelar
    </button>
  </div>
);

export const MarketHoursSheet: React.FC<MarketHoursSheetProps> = ({ onClose, onSelectSymbol }) => {
  const { pendingOrders, cancelOrder, ensureQuotes } = useTrading();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Cotizaciones de los valores con órdenes: dan la sesión real de su bolsa
  const orderSymbolsKey = Array.from(new Set(pendingOrders.map((o) => o.symbol))).sort().join(',');
  useEffect(() => {
    if (orderSymbolsKey) ensureQuotes(orderSymbolsKey.split(','), 60_000);
  }, [orderSymbolsKey, ensureQuotes]);

  // Órdenes agrupadas por bolsa, ordenadas por próxima apertura
  const groups = useMemo(() => {
    const map = new Map<string, { ex: ExchangeInfo | null; orders: PendingOrder[] }>();
    pendingOrders.forEach((o) => {
      const ex = exchangeOf(o.symbol);
      const key = ex?.id ?? OTHER_KEY;
      if (!map.has(key)) map.set(key, { ex, orders: [] });
      map.get(key)!.orders.push(o);
    });
    const rank = (g: { ex: ExchangeInfo | null; orders: PendingOrder[] }) => {
      if (!g.ex) return Infinity;
      const info = sessionInfo(g.ex, now);
      return info.isOpen ? 0 : info.nextOpen ?? Infinity;
    };
    return Array.from(map.values()).sort((a, b) => rank(a) - rank(b));
  }, [pendingOrders, now]);

  const withOrders = new Set(groups.map((g) => g.ex?.id));
  const otherMarkets = EXCHANGES.filter((ex) => ex.main && !withOrders.has(ex.id))
    .map((ex) => ({ ex, info: sessionInfo(ex, now) }))
    .sort((a, b) => (a.info.isOpen ? 0 : a.info.nextOpen ?? Infinity) - (b.info.isOpen ? 0 : b.info.nextOpen ?? Infinity));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fadeIn">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 rounded-t-3xl sm:rounded-3xl border border-black/10 dark:border-white/10 shadow-ios-sheet animate-slideUp sm:animate-scaleUp max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Clock className="w-5 h-5 text-ios-orange" />
            Aperturas de mercado
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 ios-active" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-6 space-y-4">
          {/* Órdenes para la apertura, por bolsa */}
          {groups.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
                Órdenes para la apertura ({pendingOrders.length})
              </h3>
              {groups.map(({ ex, orders }) => (
                <div
                  key={ex?.id ?? OTHER_KEY}
                  className="bg-white dark:bg-ios-card-dark rounded-3xl border border-black/5 dark:border-white/5 shadow-ios-sm overflow-hidden"
                >
                  <div className="px-3.5 pt-3 pb-2 bg-zinc-50 dark:bg-zinc-800/40 border-b border-black/5 dark:border-white/5">
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{ex?.name ?? 'Otros mercados'}</div>
                    {ex ? (
                      <OpeningLine ex={ex} now={now} symbol={orders[0].symbol} />
                    ) : (
                      <span className="text-[11px] text-zinc-400">Al abrir el mercado</span>
                    )}
                  </div>
                  <div className="divide-y divide-black/5 dark:divide-white/5">
                    {orders.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        onCancel={() => cancelOrder(order.id)}
                        onSelect={() => {
                          onClose();
                          onSelectSymbol(order.symbol);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 px-1">
              No tienes órdenes pendientes. Si operas con un mercado cerrado, la orden se ejecuta al precio de apertura de la siguiente sesión.
            </p>
          )}

          {/* Resto de mercados */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
              {groups.length > 0 ? 'Otros mercados' : 'Mercados principales'}
            </h3>
            <div className="bg-white dark:bg-ios-card-dark rounded-3xl border border-black/5 dark:border-white/5 shadow-ios-sm divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
              {otherMarkets.map(({ ex }) => (
                <div key={ex.id} className="px-3.5 py-2.5">
                  <div className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-50">{ex.name}</div>
                  <OpeningLine ex={ex} now={now} />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-400 px-1 leading-snug">
              Horario habitual de cada bolsa. Si un día es festivo, las órdenes se ejecutan en la siguiente sesión.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
