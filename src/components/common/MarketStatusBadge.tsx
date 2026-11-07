import React from 'react';
import { StockQuote } from '../../types/market';
import { formatTimeAgo, getMarketStatus } from '../../services/marketApi';

interface MarketStatusBadgeProps {
  quote?: StockQuote;
  /** Versión compacta: sólo un punto de color con texto corto */
  compact?: boolean;
}

/** Indica si el mercado del activo está abierto, cerrado o si el precio va con retraso. */
export const MarketStatusBadge: React.FC<MarketStatusBadgeProps> = ({ quote, compact = false }) => {
  if (!quote) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-400">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
        Sin cotización
      </span>
    );
  }

  const status = getMarketStatus(quote);
  const lastTick = quote.marketTime ?? quote.fetchedAt;
  const config =
    status === 'OPEN'
      ? { dot: 'bg-ios-green animate-pulse', text: 'text-ios-green', label: 'Mercado abierto' }
      : status === 'DELAYED'
      ? { dot: 'bg-ios-orange', text: 'text-ios-orange', label: `Precio con retraso · ${formatTimeAgo(lastTick)}` }
      : { dot: 'bg-zinc-400', text: 'text-zinc-500 dark:text-zinc-400', label: 'Mercado cerrado' };

  const shortLabel = status === 'OPEN' ? 'Abierto' : status === 'DELAYED' ? 'Retraso' : 'Cerrado';

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold ${config.text}`}
      title={`Última cotización: ${new Date(lastTick).toLocaleString('es-ES')}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {compact ? shortLabel : config.label}
      {!compact && status === 'CLOSED' && (
        <span className="text-zinc-400 font-medium">
          · último precio {new Date(lastTick).toLocaleString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </span>
  );
};
