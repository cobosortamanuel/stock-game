import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Trash2,
  ChevronRight,
  X,
  Loader2,
  RefreshCw,
  Pencil,
  Check,
  FolderKanban,
  Cloud,
  Lock,
  Globe,
  KeyRound,
  Dices,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency, formatPercent } from '../services/marketApi';
import { subscribeToSupabaseRealtime } from '../services/supabaseService';
import { isGameUnlocked, unlockGame, markGameUnlockedLocally } from '../services/gamesHubApi';
import { GameSummary } from '../types/market';

interface GamesLobbyViewProps {
  onClose: () => void;
}

export const GamesLobbyView: React.FC<GamesLobbyViewProps> = ({ onClose }) => {
  const {
    gamesList,
    activeGameId,
    isLoadingGames,
    fetchGamesList,
    createGame,
    renameGame,
    switchGame,
    deleteGame,
  } = useTrading();

  // Create form state
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newGameName, setNewGameName] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState<boolean>(true); // Default private as requested
  const [pinCode, setPinCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Delete state
  const [gameToDelete, setGameToDelete] = useState<string | null>(null);

  // PIN Unlock Modal for Locked Games
  const [pinModalGame, setPinModalGame] = useState<GameSummary | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pendingActionAfterUnlock, setPendingActionAfterUnlock] = useState<'enter' | 'delete' | null>(null);

  // Realtime subscription (debounced)
  useEffect(() => {
    fetchGamesList();
    let debounceTimer: any = null;
    const unsub = subscribeToSupabaseRealtime(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchGamesList();
      }, 1000);
    });
    return () => {
      clearTimeout(debounceTimer);
      unsub();
    };
  }, [fetchGamesList]);

  // Generate 4-digit PIN helper
  const handleGeneratePin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setPinCode(randomPin);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const finalPin = isPrivate ? (pinCode.trim() || Math.floor(1000 + Math.random() * 9000).toString()) : undefined;
      await createGame(newGameName.trim() || 'Nueva Partida', isPrivate, finalPin);
      setNewGameName('');
      setPinCode('');
      setIsCreating(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrigger = (game: GameSummary) => {
    const unlocked = isGameUnlocked(game);
    if (!unlocked) {
      setPinModalGame(game);
      setPendingActionAfterUnlock('delete');
      setPinInput('');
      setPinError(null);
      return;
    }
    setGameToDelete(game.id);
  };

  const handleDeleteConfirm = async (id: string) => {
    await deleteGame(id);
    setGameToDelete(null);
  };

  const handleEnterGame = async (game: GameSummary) => {
    const isUnlocked = isGameUnlocked(game);
    if (isUnlocked) {
      await switchGame(game.id);
      onClose();
    } else {
      setPinModalGame(game);
      setPendingActionAfterUnlock('enter');
      setPinInput('');
      setPinError(null);
    }
  };

  const handleUnlockAndAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModalGame) return;
    const ok = unlockGame(pinModalGame, pinInput);
    if (ok) {
      const action = pendingActionAfterUnlock;
      const targetId = pinModalGame.id;
      setPinError(null);
      setPinModalGame(null);
      setPendingActionAfterUnlock(null);

      if (action === 'delete') {
        await deleteGame(targetId);
      } else {
        await switchGame(targetId);
        onClose();
      }
    } else {
      setPinError('PIN incorrecto. Vuelve a intentarlo.');
    }
  };

  const canClose = gamesList.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ios-bg-light dark:bg-ios-bg-dark animate-fadeIn">
      {/* Top Header */}
      <div className="pt-safe px-4 pb-3 ios-glass-header border-b border-black/5 dark:border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Salas y Partidas
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Sincronizadas en tiempo real en todos tus dispositivos
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => fetchGamesList()}
            disabled={isLoadingGames}
            className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 ios-active"
            aria-label="Actualizar lista de partidas"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingGames ? 'animate-spin text-ios-blue' : ''}`} />
          </button>

          {canClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 ios-active"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-md mx-auto w-full space-y-4">
        {/* Cloud Sync Active Status Pill */}
        <div className="p-3.5 rounded-3xl bg-white dark:bg-ios-card-dark border border-black/5 dark:border-white/10 shadow-ios-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-ios-green/15 text-ios-green">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Nube Supabase Conectada
                </span>
                <span className="w-2 h-2 rounded-full bg-ios-green animate-pulse" />
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">
                Sincronización en vivo multidispositivo activa
              </p>
            </div>
          </div>
        </div>

        {/* Create Game Trigger Button */}
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="w-full py-4 px-4 rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-sm flex items-center justify-center gap-2 shadow-ios ios-active hover:opacity-95"
        >
          <PlusCircle className="w-5 h-5 text-ios-blue" />
          <span>Crear Nueva Partida</span>
        </button>

        {/* Create Modal Form */}
        {isCreating && (
          <div className="p-5 bg-white dark:bg-ios-card-dark rounded-3xl border border-black/10 dark:border-white/10 shadow-ios space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Nueva Partida de Trading
              </h2>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5">
                  Nombre de la partida:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                  placeholder="Ej: Reto 10k, Mis Inversiones..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-ios-blue"
                />
              </div>

              {/* Fixed Budget Badge */}
              <div className="p-3 bg-zinc-100 dark:bg-zinc-800/70 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                  Presupuesto Inicial:
                </span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(10000)}
                </span>
              </div>

              {/* Privacy Selector */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5">
                  Visibilidad y Privacidad:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrivate(true)}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ios-active ${
                      isPrivate
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent shadow-sm'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-black/5 dark:border-white/5'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Privada (con PIN)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPrivate(false)}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ios-active ${
                      !isPrivate
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent shadow-sm'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-black/5 dark:border-white/5'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5 text-ios-blue" />
                    <span>Pública</span>
                  </button>
                </div>
              </div>

              {/* PIN Code Setup for Private Game */}
              {isPrivate && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>PIN de Seguridad:</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePin}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <Dices className="w-3.5 h-3.5" />
                      <span>Generar PIN</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    placeholder="Ej: 1234 (o pulsa generar)"
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 text-sm font-mono tracking-widest text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />

                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">
                    En este dispositivo se quedará desbloqueada automáticamente. Guarda el PIN si quieres entrar desde tu móvil u otro dispositivo.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-2xl bg-ios-blue text-white text-xs font-bold shadow-md ios-active flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Empezar Partida</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-3 rounded-2xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold ios-active"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Games List Section */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Partidas Sincronizadas ({gamesList.length})
            </span>
          </div>

          {isLoadingGames && gamesList.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-ios-blue" />
              <p className="text-xs">Cargando tus partidas...</p>
            </div>
          ) : gamesList.length > 0 ? (
            <div className="space-y-3">
              {gamesList.map((game) => {
                const isActive = game.id === activeGameId;
                const isProfitable = (game.totalPnL || 0) >= 0;
                const isPriv = game.isPrivate ?? true;
                const unlocked = isGameUnlocked(game);
                const date = new Date(game.updatedAt);
                const timeAgo = `${date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

                return (
                  <div
                    key={game.id}
                    className={`bg-white dark:bg-ios-card-dark rounded-3xl p-4 border transition-all duration-200 shadow-ios-sm relative ${
                      isActive
                        ? 'border-ios-blue dark:border-ios-blue ring-2 ring-ios-blue/20'
                        : 'border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20'
                    }`}
                  >
                    {/* Header: Name, Privacy Badge & Delete Action */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50 truncate">
                            {game.name}
                          </h3>

                          {isPriv ? (
                            <span
                              title="Partida Privada"
                              className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold flex items-center gap-1"
                            >
                              <Lock className="w-2.5 h-2.5 text-amber-500" />
                              <span>{unlocked ? 'Desbloqueada' : 'PIN'}</span>
                            </span>
                          ) : (
                            <span
                              title="Partida Pública"
                              className="px-2 py-0.5 rounded-full bg-ios-blue/15 text-ios-blue text-[10px] font-bold flex items-center gap-1"
                            >
                              <Globe className="w-2.5 h-2.5" />
                              <span>Pública</span>
                            </span>
                          )}

                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full bg-ios-blue/15 text-ios-blue text-[10px] font-bold tracking-wider uppercase border border-ios-blue/30">
                              Activa
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          ID: {game.id} • Actualizado: {timeAgo}
                        </p>
                      </div>

                      {/* Delete Trigger */}
                      {gameToDelete === game.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteConfirm(game.id)}
                            className="px-2.5 py-1 rounded-lg bg-ios-red text-white text-[11px] font-bold ios-active shadow-sm"
                          >
                            Eliminar
                          </button>
                          <button
                            type="button"
                            onClick={() => setGameToDelete(null)}
                            className="p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteTrigger(game)}
                          className="p-2 text-zinc-400 hover:text-ios-red ios-active"
                          title="Eliminar partida"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Stats Row */}
                    <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 grid grid-cols-3 gap-2 text-left">
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">
                          Patrimonio
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(game.totalNetWorth || game.initialCash)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">
                          Rendimiento
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-bold font-mono flex items-center ${
                            isProfitable ? 'text-ios-green' : 'text-ios-red'
                          }`}
                        >
                          {isProfitable ? '+' : ''}{formatPercent(game.totalPnLPercent || 0)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">
                          Apuestas
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                          {game.positionsCount || 0} abiertas
                        </span>
                      </div>
                    </div>

                    {/* Enter Game Action */}
                    <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEnterGame(game)}
                        className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 ios-active transition-all ${
                          isActive
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-black/5 dark:border-white/5'
                            : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md'
                        }`}
                      >
                        {unlocked ? (
                          <>
                            <span>{isActive ? 'Continuar Partida Actual' : 'Entrar a esta Partida'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                            <span>Desbloquear con PIN</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 text-center bg-white/50 dark:bg-zinc-900/30 space-y-3">
              <FolderKanban className="w-10 h-10 text-zinc-400 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  No hay partidas creadas
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Crea tu primera partida para empezar a operar en el simulador.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="py-2.5 px-4 rounded-2xl bg-ios-blue text-white text-xs font-bold shadow-md ios-active inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Crear Primera Partida</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PIN Unlock Modal for Locked Game */}
      {pinModalGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/10 dark:border-white/10 shadow-2xl max-w-sm w-full space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {pendingActionAfterUnlock === 'delete' ? 'Confirmar PIN para Eliminar' : 'Desbloquear Partida'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPinModalGame(null);
                  setPendingActionAfterUnlock(null);
                  setPinInput('');
                  setPinError(null);
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {pendingActionAfterUnlock === 'delete'
                ? `Introduce el PIN de "${pinModalGame.name}" para autorizar su eliminación:`
                : `Introduce el PIN de "${pinModalGame.name}" para entrar y operar en este dispositivo:`}
            </p>

            <form onSubmit={handleUnlockAndAction} className="space-y-3">
              <input
                type="password"
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(null);
                }}
                placeholder="Escribe el PIN..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-center font-mono text-base tracking-widest text-zinc-900 dark:text-zinc-50 border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

              {pinError && (
                <div className="p-2 bg-red-500/10 text-ios-red text-xs rounded-xl flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={!pinInput.trim()}
                  className={`flex-1 py-3 rounded-2xl text-white font-bold text-xs shadow-md ios-active disabled:opacity-50 ${
                    pendingActionAfterUnlock === 'delete' ? 'bg-ios-red' : 'bg-amber-500'
                  }`}
                >
                  {pendingActionAfterUnlock === 'delete' ? 'Desbloquear y Eliminar' : 'Desbloquear y Entrar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPinModalGame(null);
                    setPendingActionAfterUnlock(null);
                    setPinInput('');
                    setPinError(null);
                  }}
                  className="px-4 py-3 rounded-2xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold ios-active"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
