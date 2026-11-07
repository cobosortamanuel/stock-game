import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronRight, Info, KeyRound, Loader2, Lock, LogIn, PlusCircle, RefreshCw, TrendingUp, X } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency, formatPercent } from '../services/marketApi';
import { DEFAULT_INITIAL_CASH, PIN_RE } from '../services/gamesHubApi';
import { JoinGameSheet } from '../components/common/JoinGameSheet';
import { GameSummary } from '../types/market';

const CAPITAL_OPTIONS = [1000, 10000, 50000, 100000];

export const GamesLobbyView: React.FC = () => {
  const {
    activeGameId,
    myGames,
    isLoadingGames,
    refreshMyGames,
    createGame,
    switchGame,
    closeLobby,
    lobbyNotice,
  } = useTrading();

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [capital, setCapital] = useState(DEFAULT_INITIAL_CASH);
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [joinSheet, setJoinSheet] = useState<{ code?: string; name?: string; hasPin?: boolean; message?: string } | null>(null);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  // Aviso que pide volver a introducir el PIN de una partida
  useEffect(() => {
    if (lobbyNotice?.joinGameId) {
      setJoinSheet({ code: lobbyNotice.joinGameId, hasPin: true, message: lobbyNotice.message });
    }
  }, [lobbyNotice]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (usePin && !PIN_RE.test(pin)) {
      setFormError('El PIN debe tener entre 4 y 8 dígitos.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await createGame(name, capital, usePin ? pin : undefined);
      if (!res.ok) setFormError(res.error || 'No se ha podido crear la partida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnter = async (game: GameSummary) => {
    setListError(null);
    setEnteringId(game.id);
    try {
      const res = await switchGame(game.id);
      if (!res.ok) {
        if (res.needsPin) setJoinSheet({ code: game.id, name: game.name, hasPin: true });
        else setListError(res.error || 'No se ha podido abrir la partida.');
      }
    } finally {
      setEnteringId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ios-bg-light dark:bg-ios-bg-dark animate-fadeIn">
      {/* Cabecera */}
      <div className="pt-safe ios-glass-header border-b border-black/5 dark:border-white/10">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-ios-green text-white flex items-center justify-center shadow-sm">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-tight">Stock Game</h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Invierte con cotizaciones reales</p>
            </div>
          </div>
          {activeGameId && (
            <button
              type="button"
              onClick={closeLobby}
              className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 ios-active"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto w-full px-4 py-4 space-y-4">
          {lobbyNotice && !lobbyNotice.joinGameId && (
            <div className="p-3 rounded-2xl bg-ios-blue/10 text-ios-blue text-xs font-medium flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{lobbyNotice.message}</span>
            </div>
          )}

          {!activeGameId && myGames.length === 0 && (
            <div className="text-center pt-4 pb-2 space-y-1">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Empieza a invertir</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
                Crea tu propia partida o únete a la de un amigo con su código.
              </p>
            </div>
          )}

          {/* Acciones principales */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setIsCreating((v) => !v);
                setFormError(null);
              }}
              className="py-4 px-3 rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-sm flex items-center justify-center gap-2 shadow-ios ios-active"
            >
              <PlusCircle className="w-5 h-5 text-ios-blue" />
              <span>Crear partida</span>
            </button>
            <button
              type="button"
              onClick={() => setJoinSheet({})}
              className="py-4 px-3 rounded-3xl bg-white dark:bg-ios-card-dark border border-black/5 dark:border-white/10 text-zinc-900 dark:text-zinc-50 font-bold text-sm flex items-center justify-center gap-2 shadow-ios-sm ios-active"
            >
              <LogIn className="w-5 h-5 text-ios-blue" />
              <span>Unirme</span>
            </button>
          </div>

          {/* Formulario de creación */}
          {isCreating && (
            <form
              onSubmit={handleCreate}
              className="p-5 bg-white dark:bg-ios-card-dark rounded-3xl border border-black/10 dark:border-white/10 shadow-ios space-y-4 animate-fadeIn"
            >
              <div>
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5">Nombre</label>
                <input
                  type="text"
                  autoFocus
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Mi cartera, Reto con amigos..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-ios-blue"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5">Capital inicial</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {CAPITAL_OPTIONS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setCapital(amount)}
                      className={`py-2 rounded-xl text-xs font-bold font-mono transition-all ios-active ${
                        capital === amount
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {formatCurrency(amount, 'USD', false, true)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-ios-blue" />
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">Proteger con PIN</span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Sin PIN, cualquiera con el código puede operar</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUsePin((v) => !v)}
                    className={`w-12 h-7 rounded-full transition-colors relative p-0.5 ios-active shrink-0 ${usePin ? 'bg-ios-blue' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                    aria-label="Proteger con PIN"
                  >
                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${usePin ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                {usePin && (
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    maxLength={8}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="PIN de 4 a 8 dígitos"
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 text-sm font-mono tracking-widest text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 placeholder:tracking-normal border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-ios-blue animate-fadeIn"
                  />
                )}
              </div>

              {formError && (
                <div className="p-2 bg-red-500/10 text-ios-red text-xs rounded-xl flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-ios-blue text-white text-xs font-bold shadow-md ios-active flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Empezar con {formatCurrency(capital, 'USD', false, true)}</span>
              </button>
            </form>
          )}

          {/* Mis partidas */}
          {myGames.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Mis partidas</span>
                <button
                  type="button"
                  onClick={() => refreshMyGames()}
                  disabled={isLoadingGames}
                  className="p-1 text-zinc-400 hover:text-zinc-600 ios-active"
                  aria-label="Actualizar"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGames ? 'animate-spin text-ios-blue' : ''}`} />
                </button>
              </div>

              {listError && (
                <div className="mb-2 p-2 bg-red-500/10 text-ios-red text-xs rounded-xl flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{listError}</span>
                </div>
              )}

              <div className="bg-white dark:bg-ios-card-dark rounded-3xl border border-black/5 dark:border-white/5 shadow-ios divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
                {myGames.map((game) => {
                  const isActive = game.id === activeGameId;
                  const isUp = (game.totalPnLPercent || 0) >= 0;
                  return (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => handleEnter(game)}
                      className={`w-full p-4 flex items-center justify-between text-left ios-active hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${
                        isActive ? 'bg-ios-blue/5 dark:bg-ios-blue/10' : ''
                      }`}
                    >
                      <div className="min-w-0 mr-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">{game.name}</span>
                          {game.hasPin && <Lock className="w-3 h-3 text-zinc-400 shrink-0" />}
                          {isActive && (
                            <span className="px-1.5 py-0.5 rounded-md bg-ios-blue/15 text-ios-blue text-[9px] font-bold uppercase tracking-wider shrink-0">
                              Actual
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-400 font-mono">{game.id}</span>
                      </div>
                      <div className="flex items-center gap-2 text-right shrink-0">
                        <div>
                          <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-50 block">
                            {formatCurrency(game.totalNetWorth)}
                          </span>
                          <span className={`text-[11px] font-mono font-bold ${isUp ? 'text-ios-green' : 'text-ios-red'}`}>
                            {formatPercent(game.totalPnLPercent || 0)}
                          </span>
                        </div>
                        {enteringId === game.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-ios-blue" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isLoadingGames && myGames.length === 0 && (
            <div className="py-8 text-center text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-ios-blue" />
            </div>
          )}
        </div>
      </div>

      {joinSheet && (
        <JoinGameSheet
          initialCode={joinSheet.code}
          gameName={joinSheet.name}
          knownHasPin={joinSheet.hasPin}
          message={joinSheet.message}
          onClose={() => setJoinSheet(null)}
        />
      )}
    </div>
  );
};
