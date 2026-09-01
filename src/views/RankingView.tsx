import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Lock,
  Globe,
  ChevronRight,
  X,
  Search,
  RefreshCw,
  KeyRound,
  AlertCircle,
  Briefcase,
  History,
  ShieldCheck,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { GameSummary, GameSaveData } from '../types/market';
import { formatCurrency, formatPercent } from '../services/marketApi';
import { loadGameData, isGameUnlocked, unlockGame } from '../services/gamesHubApi';
import { subscribeToSupabaseRealtime } from '../services/supabaseService';

export const RankingView: React.FC = () => {
  const {
    gamesList,
    activeGameId,
    fetchGamesList,
    switchGame,
    isLoadingGames,
  } = useTrading();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGameData, setSelectedGameData] = useState<GameSaveData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [detailTab, setDetailTab] = useState<'positions' | 'history'>('positions');

  // PIN Unlock Modal inside Detail
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Auto-refresh ranking on mount and realtime updates
  useEffect(() => {
    fetchGamesList();
    const unsub = subscribeToSupabaseRealtime(() => {
      fetchGamesList();
    });
    return () => unsub();
  }, [fetchGamesList]);

  // Sort leaderboard by Total Net Worth descending
  const sortedGames = useMemo(() => {
    return [...gamesList].sort((a, b) => {
      const netA = a.totalNetWorth ?? a.initialCash;
      const netB = b.totalNetWorth ?? b.initialCash;
      return netB - netA;
    });
  }, [gamesList]);

  // Filtered leaderboard
  const filteredGames = useMemo(() => {
    if (!searchQuery.trim()) return sortedGames;
    const query = searchQuery.toLowerCase().trim();
    return sortedGames.filter(
      (g) => g.name.toLowerCase().includes(query) || g.id.toLowerCase().includes(query)
    );
  }, [sortedGames, searchQuery]);

  const handleInspectGame = async (summary: GameSummary) => {
    setIsLoadingDetail(true);
    try {
      const fullData = await loadGameData(summary.id);
      if (fullData) {
        setSelectedGameData(fullData);
      } else {
        setSelectedGameData({
          ...summary,
          positions: [],
          tradeHistory: [],
          watchlist: [],
        });
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handlePlayGame = async (game: GameSummary | GameSaveData) => {
    const isUnlocked = isGameUnlocked(game);
    if (!isUnlocked) {
      setIsPinModalOpen(true);
      return;
    }
    await switchGame(game.id);
    setSelectedGameData(null);
  };

  const handleUnlockAndPlay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGameData) return;
    const ok = unlockGame(selectedGameData, pinInput);
    if (ok) {
      setPinError(null);
      setIsPinModalOpen(false);
      setPinInput('');
      await switchGame(selectedGameData.id);
      setSelectedGameData(null);
    } else {
      setPinError('PIN incorrecto. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4 pt-2">
      {/* Search and Refresh Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar jugador..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-ios-card-dark border border-black/5 dark:border-white/5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-ios-blue shadow-ios-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => fetchGamesList()}
          disabled={isLoadingGames}
          className="w-10 h-10 rounded-2xl bg-white dark:bg-ios-card-dark border border-black/5 dark:border-white/5 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shadow-ios-sm ios-active shrink-0"
          title="Actualizar ranking"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingGames ? 'animate-spin text-ios-blue' : ''}`} />
        </button>
      </div>

      {/* Leaderboard Table Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Clasificación ({filteredGames.length})
          </span>
          <span className="text-[11px] text-zinc-400 font-medium">Pulsa para ver apuestas</span>
        </div>

        {isLoadingGames && filteredGames.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 space-y-2 bg-white dark:bg-ios-card-dark rounded-3xl border border-black/5 dark:border-white/5 shadow-ios-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-ios-blue" />
            <p className="text-xs">Cargando clasificación...</p>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-ios-card-dark rounded-3xl border border-black/5 dark:border-white/5 text-zinc-400 text-xs shadow-ios-sm">
            No se encontraron jugadores que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="bg-white dark:bg-ios-card-dark rounded-3xl border border-black/5 dark:border-white/5 shadow-ios divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
            {filteredGames.map((game, idx) => {
              const rank = idx + 1;
              const isTop1 = rank === 1;
              const isTop2 = rank === 2;
              const isTop3 = rank === 3;
              const isActive = game.id === activeGameId;
              const isProfit = (game.totalPnL || 0) >= 0;
              const isPrivate = game.isPrivate ?? true;

              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => handleInspectGame(game)}
                  className={`w-full p-4 flex items-center justify-between text-left transition-colors ios-active hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${
                    isActive ? 'bg-ios-blue/5 dark:bg-ios-blue/10' : ''
                  }`}
                >
                  {/* Left: Rank Badge & Info */}
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isTop1
                          ? 'bg-amber-400/20 text-amber-500 font-extrabold ring-1 ring-amber-400/40'
                          : isTop2
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold'
                          : isTop3
                          ? 'bg-amber-700/15 text-amber-800 dark:text-amber-300 font-bold'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 font-mono'
                      }`}
                    >
                      {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${rank}`}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-sm font-bold truncate max-w-[130px] sm:max-w-[180px] ${
                            isTop1
                              ? 'text-zinc-900 dark:text-zinc-50 font-extrabold'
                              : 'text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {game.name}
                        </span>

                        {isPrivate ? (
                          <span
                            title="Partida Privada"
                            className="text-zinc-400 flex items-center"
                          >
                            <Lock className="w-3 h-3" />
                          </span>
                        ) : (
                          <span
                            title="Partida Pública"
                            className="text-ios-blue flex items-center"
                          >
                            <Globe className="w-3 h-3" />
                          </span>
                        )}

                        {isActive && (
                          <span className="px-1.5 py-0.5 rounded-md bg-ios-blue/15 text-ios-blue text-[9px] font-bold uppercase tracking-wider">
                            Tú
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-zinc-400 font-medium">
                        {game.positionsCount || 0} apuesta(s) activas
                      </span>
                    </div>
                  </div>

                  {/* Right: Net Worth & Percent Return */}
                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-50 block">
                        {formatCurrency(game.totalNetWorth || game.initialCash)}
                      </span>
                      <span
                        className={`text-[11px] font-mono font-bold flex items-center justify-end ${
                          isProfit ? 'text-ios-green' : 'text-ios-red'
                        }`}
                      >
                        {isProfit ? '+' : ''}
                        {formatPercent(game.totalPnLPercent || 0)}
                      </span>
                    </div>

                    <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Player Inspect Modal Sheet */}
      {selectedGameData && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-ios-bg-light dark:bg-ios-bg-dark rounded-t-3xl border-t border-black/10 dark:border-white/10 shadow-2xl max-h-[85vh] flex flex-col max-w-md mx-auto w-full animate-slideUp">
            {/* Modal Header */}
            <div className="p-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-ios-blue/15 text-ios-blue flex items-center justify-center font-bold">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 truncate max-w-[190px]">
                      {selectedGameData.name}
                    </h3>
                    {selectedGameData.isPrivate ?? true ? (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Privada
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-ios-blue/15 text-ios-blue text-[10px] font-bold flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" /> Pública
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-mono text-zinc-400">
                    ID: {selectedGameData.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGameData(null)}
                className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center ios-active"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stats Overview Pill */}
            <div className="p-4 bg-white dark:bg-ios-card-dark border-b border-black/5 dark:border-white/5 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                  Patrimonio
                </span>
                <span className="text-sm font-black font-mono text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(selectedGameData.totalNetWorth || selectedGameData.initialCash)}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                  Rendimiento
                </span>
                <span
                  className={`text-sm font-black font-mono ${
                    (selectedGameData.totalPnLPercent || 0) >= 0 ? 'text-ios-green' : 'text-ios-red'
                  }`}
                >
                  {(selectedGameData.totalPnLPercent || 0) >= 0 ? '+' : ''}
                  {formatPercent(selectedGameData.totalPnLPercent || 0)}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                  Disponible
                </span>
                <span className="text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(selectedGameData.cashAvailable || 0)}
                </span>
              </div>
            </div>

            {/* Tabs: Apuestas vs Historial */}
            <div className="flex border-b border-black/5 dark:border-white/10 px-4 pt-2 bg-ios-bg-light dark:bg-ios-bg-dark gap-2">
              <button
                type="button"
                onClick={() => setDetailTab('positions')}
                className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
                  detailTab === 'positions'
                    ? 'border-ios-blue text-ios-blue'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Apuestas Activas ({selectedGameData.positions?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('history')}
                className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
                  detailTab === 'history'
                    ? 'border-ios-blue text-ios-blue'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Historial ({selectedGameData.tradeHistory?.length || 0})</span>
              </button>
            </div>

            {/* Tab Content List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {detailTab === 'positions' ? (
                selectedGameData.positions && selectedGameData.positions.length > 0 ? (
                  selectedGameData.positions.map((pos) => {
                    const isLong = pos.type === 'LONG';
                    const isProfit = (pos.unrealizedPnL || 0) >= 0;

                    return (
                      <div
                        key={pos.id}
                        className="p-3 bg-white dark:bg-ios-card-dark rounded-2xl border border-black/5 dark:border-white/5 shadow-sm flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black font-mono text-zinc-900 dark:text-zinc-100">
                              {pos.symbol}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                isLong
                                  ? 'bg-ios-green/15 text-ios-green'
                                  : 'bg-ios-orange/15 text-ios-orange'
                              }`}
                            >
                              {isLong ? 'Largo' : 'Corto'}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-400 block truncate max-w-[180px]">
                            {pos.name}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">
                            Invertido: {formatCurrency(pos.investedAmount)} • Entrada: {formatCurrency(pos.entryPrice)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-50 block">
                            {formatCurrency(pos.currentValue)}
                          </span>
                          <span
                            className={`text-[11px] font-mono font-bold ${
                              isProfit ? 'text-ios-green' : 'text-ios-red'
                            }`}
                          >
                            {isProfit ? '+' : ''}
                            {formatCurrency(pos.unrealizedPnL || 0)} ({formatPercent(pos.unrealizedPnLPercent || 0)})
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-zinc-400 text-xs">
                    Este jugador no tiene apuestas abiertas en este momento.
                  </div>
                )
              ) : selectedGameData.tradeHistory && selectedGameData.tradeHistory.length > 0 ? (
                selectedGameData.tradeHistory.map((trade) => {
                  const isProfit = (trade.realizedPnL || 0) >= 0;
                  const date = new Date(trade.timestamp);
                  const formattedDate = `${date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

                  return (
                    <div
                      key={trade.id}
                      className="p-3 bg-white dark:bg-ios-card-dark rounded-2xl border border-black/5 dark:border-white/5 shadow-sm flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                            {trade.symbol}
                          </span>
                          <span className="text-[10px] font-medium text-zinc-400">
                            {trade.action.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block">{formattedDate}</span>
                      </div>

                      <div className="text-right font-mono font-bold">
                        {trade.realizedPnL !== undefined ? (
                          <span className={isProfit ? 'text-ios-green' : 'text-ios-red'}>
                            {isProfit ? '+' : ''}
                            {formatCurrency(trade.realizedPnL)}
                          </span>
                        ) : (
                          <span className="text-zinc-500">
                            {formatCurrency(trade.investedAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-zinc-400 text-xs">
                  No hay operaciones registradas en el historial.
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-black/5 dark:border-white/10 bg-white dark:bg-ios-card-dark flex gap-2">
              {selectedGameData.id === activeGameId ? (
                <div className="w-full py-3 rounded-2xl bg-ios-blue/15 text-ios-blue text-xs font-bold text-center flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Tu partida en curso</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePlayGame(selectedGameData)}
                  className="w-full py-3.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold shadow-md ios-active flex items-center justify-center gap-2"
                >
                  {isGameUnlocked(selectedGameData) ? (
                    <>
                      <span>Entrar a esta Partida</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 text-amber-500" />
                      <span>Desbloquear con PIN para Operar</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PIN Unlock Modal */}
      {isPinModalOpen && selectedGameData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/10 dark:border-white/10 shadow-2xl max-w-sm w-full space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Partida Privada Protegida
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPinModalOpen(false);
                  setPinInput('');
                  setPinError(null);
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Introduce el PIN de <strong>"{selectedGameData.name}"</strong> para desbloquear el control y operar en este dispositivo:
            </p>

            <form onSubmit={handleUnlockAndPlay} className="space-y-3">
              <input
                type="password"
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(null);
                }}
                placeholder="Escribe el PIN..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-center font-mono text-base tracking-widest text-zinc-900 dark:text-zinc-50 border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-ios-blue"
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
                  className="flex-1 py-3 rounded-2xl bg-ios-blue text-white font-bold text-xs shadow-md ios-active disabled:opacity-50"
                >
                  Desbloquear y Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPinModalOpen(false);
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
