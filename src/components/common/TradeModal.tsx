import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { StockQuote, PositionType } from '../../types/market';
import { useTrading } from '../../context/TradingContext';
import { formatCurrency, formatPercent } from '../../services/marketApi';

interface TradeModalProps {
  quote: StockQuote;
  isOpen: boolean;
  onClose: () => void;
  defaultType?: PositionType;
}

export const TradeModal: React.FC<TradeModalProps> = ({
  quote,
  isOpen,
  onClose,
  defaultType = 'LONG',
}) => {
  const { cashAvailable, openPosition } = useTrading();
  const [positionType, setPositionType] = useState<PositionType>(defaultType);
  const [amount, setAmount] = useState<string>('1000');
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setPositionType(defaultType);
    setFeedback(null);
  }, [defaultType, isOpen]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const price = quote.price || 1;
  const estimatedShares = numAmount > 0 ? numAmount / price : 0;
  const isAffordable = numAmount > 0 && numAmount <= cashAvailable;

  const handlePercentageSelect = (pct: number) => {
    const calculated = (cashAvailable * pct) / 100;
    setAmount(Math.floor(calculated).toString());
  };

  const handleExecuteTrade = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAffordable) return;
    const res = openPosition(quote.symbol, quote.name, numAmount, positionType, quote.price);
    setFeedback(res);
    if (res.success) {
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fadeIn">
      {/* Backdrop tap to close */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Bottom Sheet Card with strict z-10 and stopPropagation */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 rounded-t-3xl sm:rounded-3xl p-5 border border-black/10 dark:border-white/10 shadow-ios-sheet animate-slideUp sm:animate-scaleUp max-h-[90vh] overflow-y-auto"
      >
        {/* iOS Handle Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-black/5 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {quote.symbol}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold">
                {quote.exchange}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-[200px] sm:max-w-[280px]">
              {quote.name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-mono font-bold text-base text-zinc-900 dark:text-zinc-50">
                {formatCurrency(quote.price)}
              </div>
              <div className={`text-xs font-semibold ${quote.change >= 0 ? 'text-ios-green' : 'text-ios-red'}`}>
                {quote.change >= 0 ? '+' : ''}{formatCurrency(quote.change)} ({formatPercent(quote.changePercent)})
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 ios-active"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Order Type Selector: LONG vs SHORT */}
        <div className="mt-4 grid grid-cols-2 gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-800/90 rounded-2xl border border-black/5 dark:border-white/5">
          {/* LONG / A FAVOR */}
          <button
            type="button"
            onClick={() => setPositionType('LONG')}
            className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center transition-all ios-active ${
              positionType === 'LONG'
                ? 'bg-ios-green text-white shadow-md font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span className="truncate">Apostar a Favor</span>
            </div>
            <span className={`text-[10px] mt-0.5 ${positionType === 'LONG' ? 'text-white/80' : 'text-zinc-400'}`}>
              Ganas si sube
            </span>
          </button>

          {/* SHORT / EN CORTO */}
          <button
            type="button"
            onClick={() => setPositionType('SHORT')}
            className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center transition-all ios-active ${
              positionType === 'SHORT'
                ? 'bg-ios-orange text-white shadow-md font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <TrendingDown className="w-4 h-4 shrink-0" />
              <span className="truncate">Apostar en Corto</span>
            </div>
            <span className={`text-[10px] mt-0.5 ${positionType === 'SHORT' ? 'text-white/80' : 'text-zinc-400'}`}>
              Ganas si baja
            </span>
          </button>
        </div>

        {/* Amount Input */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">Dinero a apostar (USD):</span>
            <span className="text-zinc-600 dark:text-zinc-300 font-mono">
              Disponible: <strong className="text-zinc-900 dark:text-zinc-100">{formatCurrency(cashAvailable)}</strong>
            </span>
          </div>

          <div className="relative rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-black/5 dark:border-white/10 p-3.5 flex items-center justify-between">
            <span className="text-xl font-bold font-mono text-zinc-400">$</span>
            <input
              type="number"
              min="1"
              max={cashAvailable}
              step="10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent text-right font-mono font-bold text-2xl text-zinc-900 dark:text-zinc-50 focus:outline-none"
            />
          </div>

          {/* Quick Percentages */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePercentageSelect(pct)}
                className="py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 ios-active"
              >
                {pct === 100 ? 'MAX' : `${pct}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Position Summary Card */}
        <div className="mt-4 p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-black/5 dark:border-white/5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Acciones / Títulos simulados:</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {estimatedShares.toFixed(4)} {quote.symbol}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Precio de ejecución:</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(price)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Tipo de operación:</span>
            <span className={`font-semibold ${positionType === 'LONG' ? 'text-ios-green' : 'text-ios-orange'}`}>
              {positionType === 'LONG' ? 'Compra en Largo' : 'Venta en Corto'}
            </span>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              feedback.success
                ? 'bg-ios-green/15 text-ios-green border border-ios-green/30'
                : 'bg-ios-red/15 text-ios-red border border-ios-red/30'
            }`}
          >
            {feedback.success ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            {feedback.message}
          </div>
        )}

        {/* Execute Button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={handleExecuteTrade}
            disabled={!isAffordable || numAmount <= 0}
            className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide shadow-lg ios-active transition-all ${
              !isAffordable || numAmount <= 0
                ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed'
                : positionType === 'LONG'
                ? 'bg-ios-green text-white hover:bg-emerald-600 active:scale-[0.98]'
                : 'bg-ios-orange text-white hover:bg-amber-600 active:scale-[0.98]'
            }`}
          >
            {numAmount > cashAvailable
              ? 'Fondos Insuficientes'
              : positionType === 'LONG'
              ? `Confirmar Apuesta a Favor ($${numAmount.toLocaleString()})`
              : `Confirmar Apuesta en Corto ($${numAmount.toLocaleString()})`}
          </button>
        </div>
      </div>
    </div>
  );
};
