import React, { useState } from 'react';
import { Clock, X } from 'lucide-react';
import { PositionView } from '../../types/market';
import { formatCurrency } from '../../services/marketApi';

interface ClosePositionControlProps {
  position: PositionView;
  /** El mercado del activo está cerrado: el cierre se programa para la apertura */
  marketClosed: boolean;
  /** Ya hay un cierre programado para esta posición */
  hasPendingClose: boolean;
  onClose: (positionId: string, percentage: number) => { success: boolean; message: string };
  /** Botón secundario a la izquierda (p. ej. "Ver gráfica") */
  leading?: React.ReactNode;
}

const FRACTIONS = [25, 50, 75, 100];

/** Botón de cierre con selección de porcentaje (cierre total o parcial). */
export const ClosePositionControl: React.FC<ClosePositionControlProps> = ({
  position,
  marketClosed,
  hasPendingClose,
  onClose,
  leading,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [percent, setPercent] = useState(100);
  const [message, setMessage] = useState<{ success: boolean; message: string } | null>(null);

  const receive = position.currentValue * (percent / 100);

  if (hasPendingClose) {
    return (
      <div className="flex items-center gap-2">
        {leading}
        <div className="flex-1 py-2 px-3 rounded-xl bg-ios-orange/15 text-ios-orange text-[11px] font-semibold flex items-center justify-center gap-1.5">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          Cierre programado a la apertura
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {leading}
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setPercent(100);
              setIsOpen(true);
            }}
            disabled={!position.hasPrice && !marketClosed}
            className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold ios-active shadow-sm disabled:opacity-50"
          >
            Cerrar posición
          </button>
        </div>
        {message && (
          <div className={`p-2 rounded-xl text-[11px] font-medium ${message.success ? 'bg-ios-green/15 text-ios-green' : 'bg-red-500/10 text-ios-red'}`}>
            {message.message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-fadeIn">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">¿Cuánto quieres cerrar?</span>
        <button type="button" onClick={() => setIsOpen(false)} className="p-1 text-zinc-400 ios-active" aria-label="Cancelar">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {FRACTIONS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPercent(p)}
            className={`py-1.5 rounded-lg text-xs font-bold ios-active ${
              percent === p ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
            }`}
          >
            {p === 100 ? 'Todo' : `${p}%`}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          const res = onClose(position.id, percent);
          setMessage(res);
          setIsOpen(false);
        }}
        className="w-full py-2.5 rounded-xl bg-ios-red text-white text-xs font-bold shadow-sm ios-active"
      >
        {marketClosed
          ? `Programar cierre del ${percent}% a la apertura`
          : `Cerrar ${percent === 100 ? 'todo' : `el ${percent}%`} · recibes ${formatCurrency(receive)}`}
      </button>
      {marketClosed && (
        <p className="text-[10px] text-zinc-400 text-center">El mercado está cerrado: se ejecutará al precio de apertura.</p>
      )}
    </div>
  );
};
