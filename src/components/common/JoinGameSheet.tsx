import React, { useState } from 'react';
import { AlertCircle, KeyRound, Loader2, LogIn, X } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

interface JoinGameSheetProps {
  /** Código ya conocido (desde el ranking o un aviso); si no, se pide */
  initialCode?: string;
  /** Nombre de la partida, si se conoce */
  gameName?: string;
  /** Si ya se sabe que tiene PIN */
  knownHasPin?: boolean;
  message?: string;
  onClose: () => void;
  onJoined?: () => void;
}

/** Hoja para unirse a una partida por código (y PIN si lo tiene). */
export const JoinGameSheet: React.FC<JoinGameSheetProps> = ({
  initialCode = '',
  gameName,
  knownHasPin = false,
  message,
  onClose,
  onJoined,
}) => {
  const { joinGame } = useTrading();
  const [code, setCode] = useState(initialCode);
  const [pin, setPin] = useState('');
  const [needsPin, setNeedsPin] = useState(knownHasPin);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await joinGame(code, needsPin ? pin : undefined);
      if (res.ok) {
        onJoined?.();
        onClose();
        return;
      }
      if (res.needsPin) {
        // La primera vez sólo avisamos de que hace falta PIN, sin mostrarlo como error
        if (!needsPin) {
          setNeedsPin(true);
          return;
        }
        setPin('');
      }
      setError(res.error || 'No se ha podido entrar en la partida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/10 dark:border-white/10 shadow-2xl max-w-sm w-full space-y-4 animate-scaleUp">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-ios-blue/15 text-ios-blue flex items-center justify-center">
              {needsPin ? <KeyRound className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {gameName ? `Unirse a "${gameName}"` : 'Unirse a una partida'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        {message && <p className="text-xs text-zinc-500 dark:text-zinc-400">{message}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          {!initialCode && (
            <div>
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5">Código de la partida</label>
              <input
                type="text"
                autoFocus
                value={code}
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                  setError(null);
                }}
                placeholder="Ej: 7KQ2MX"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-center font-mono text-base tracking-[0.3em] uppercase text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 placeholder:tracking-normal border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-ios-blue"
              />
            </div>
          )}

          {initialCode && (
            <div className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
              <span>Código</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 tracking-widest">{initialCode}</span>
            </div>
          )}

          {needsPin && (
            <div className="animate-fadeIn">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5">
                Esta partida está protegida. Introduce su PIN:
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={pin}
                maxLength={8}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setError(null);
                }}
                placeholder="PIN"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-center font-mono text-base tracking-widest text-zinc-900 dark:text-zinc-50 border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-ios-blue"
              />
            </div>
          )}

          {error && (
            <div className="p-2 bg-red-500/10 text-ios-red text-xs rounded-xl flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting || code.length !== 6 || (needsPin && pin.length < 4)}
              className="flex-1 py-3 rounded-2xl bg-ios-blue text-white font-bold text-xs shadow-md ios-active disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Entrar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-2xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold ios-active"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
