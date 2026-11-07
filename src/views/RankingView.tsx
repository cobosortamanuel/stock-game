import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, ChevronRight, History, Loader2, Lock, LogIn, RefreshCw, Search, Trophy, X } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { GameSaveData, GameSummary } from '../types/market';
import { formatCurrency, formatPercent, formatTimeAgo } from '../services/marketApi';
import { fetchRanking, getJoinedIds } from '../services/gamesHubApi';
import { fetchGame, RankingEntry } from '../services/supabaseService';
import { equityValueAt, valuePosition } from '../lib/portfolio';
import { SegmentedControl } from '../components/common/SegmentedControl';

type RankPeriod = 'ALL' | '1M' | '1W';
const PERIOD_DAYS: Record<RankPeriod, number> = { ALL: 0, '1M': 30, '1W': 7 };
const PERIOD_LABEL: Record<RankPeriod, string> = { ALL: 'desde el inicio', '1M': 'en 30 días', '1W': 'en 7 días' };

/** Rentabilidad de una partida en el periodo, con su histórico diario real. */
function periodReturn(game: RankingEntry, period: RankPeriod, now: number): number {
  let base = game.initialCash;
  if (period !== 'ALL') {
    const from = now - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000;
    const history = game.dailyHistory.filter((p) => p.t >= game.createdAt);
    if (history.length > 0 && history[0].t <= from) base = equityValueAt(history, from);
  }
  return base > 0 ? ((game.totalNetWorth - base) / base) * 100 : 0;
}
import { JoinGameSheet } from '../components/common/JoinGameSheet';

export const RankingView: React.FC = () => {
  const { activeGameId, switchGame, liveQuotes, fxRates, ensureQuotes } = useTrading();

  const [games, setGames] = useState<RankingEntry[]>([]);
  const [period, setPeriod] = useState<RankPeriod>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selected, setSelected] = useState<GameSaveData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<'positions' | 'history'>('positions');
  const [joinTarget, setJoinTarget] = useState<GameSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await fetchRanking();
      setLoadError(!list);
      if (list) setGames(list);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  // Clasificación por rentabilidad (cada partida puede empezar con un capital distinto)
  const ranked = useMemo(() => {
    const now = Date.now();
    return games
      .map((g) => ({ ...g, periodPct: periodReturn(g, period, now) }))
      .sort((a, b) => b.periodPct - a.periodPct);
  }, [games, period]);

  const rankOf = useMemo(() => new Map(ranked.map((g, i) => [g.id, i + 1])), [ranked]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return q ? ranked.filter((g) => g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q)) : ranked;
  }, [ranked, searchQuery]);

  const handleInspect = async (summary: GameSummary) => {
    setActionError(null);
    setDetailTab('positions');
    setIsLoadingDetail(true);
    setSelected({ ...summary, positions: [], tradeHistory: [], watchlist: [], equityHistory: [], pendingOrders: [], dailyHistory: [] });
    try {
      const res = await fetchGame(summary.id);
      if (res.status === 'ok') {
        setSelected(res.game);
        ensureQuotes(Array.from(new Set(res.game.positions.map((p) => p.symbol))), 60_000);
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handlePlay = async (game: GameSummary) => {
    setActionError(null);
    if (getJoinedIds().includes(game.id)) {
      const res = await switchGame(game.id);
      if (res.ok) {
        setSelected(null);
        return;
      }
      if (!res.needsPin) {
        setActionError(res.error || 'No se ha podido abrir la partida.');
        return;
      }
    }
    setJoinTarget(game);
  };

  const selectedViews = useMemo(
    () => (selected ? selected.positions.map((p) => valuePosition(p, liveQuotes[p.symbol], fxRates)) : []),
    [selected, liveQuotes, fxRates]
  );

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4 pt-2">
      {/* Buscador */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar partida o código..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white dark:bg-ios-card-dark border border-black/5 dark:border-white/5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-ios-blue shadow-ios-sm"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" aria-label="Borrar">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="w-10 h-10 rounded-2xl bg-white dark:bg-ios-card-dark border border-black/5 dark:border-white/5 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shadow-ios-sm ios-active shrink-0"
          aria-label="Actualizar ranking"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-ios-blue' : ''}`} />
        </button>
      </div>

      <SegmentedControl<RankPeriod>
        options={[
          { label: 'Total', value: 'ALL' },
          { label: 'Mes', value: '1M' },
          { label: 'Semana', value: '1W' },
        ]}
        value={period}
        onChange={setPeriod}
        size="sm"
      />

      {/* Clasificación */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Clasificación ({filtered.length})</span>
          <span className="text-[11px] text-zinc-400 font-medium">Rentabilidad {PERIOD_LABEL[period]}</span>
        </div>

        {isLoading && games.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 bg-white dark:bg-ios-card-dark rounded-3xl border border-black/5 dark:border-white/5 shadow-ios-sm">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-ios-blue" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-ios-card-dark rounded-3xl border border-black/5 dark:border-white/5 text-zinc-400 text-xs shadow-ios-sm">
            {loadError ? 'No se ha podido cargar el ranking. Comprueba tu conexión.' : 'No hay partidas que coincidan con la búsqueda.'}
          </div>
        ) : (
          <div className="bg-white dark:bg-ios-card-dark rounded-3xl border border-black/5 dark:border-white/5 shadow-ios divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
            {filtered.map((game) => {
              const rank = rankOf.get(game.id) ?? 0;
              const isActive = game.id === activeGameId;
              const isUp = game.periodPct >= 0;
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => handleInspect(game)}
                  className={`w-full p-4 flex items-center justify-between text-left transition-colors ios-active hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${
                    isActive ? 'bg-ios-blue/5 dark:bg-ios-blue/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-zinc-100 dark:bg-zinc-800 ${
                        rank <= 3 ? 'text-zinc-900 dark:text-zinc-50 ring-1 ring-black/5 dark:ring-white/10 shadow-sm' : 'text-zinc-400 font-mono'
                      }`}
                    >
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[140px] sm:max-w-[180px]">{game.name}</span>
                        {game.hasPin && <Lock className="w-3 h-3 text-zinc-400 shrink-0" />}
                        {isActive && (
                          <span className="px-1.5 py-0.5 rounded-md bg-ios-blue/15 text-ios-blue text-[9px] font-bold uppercase tracking-wider">Tú</span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400 font-medium">
                        {game.positionsCount} posiciones · {formatTimeAgo(game.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-right shrink-0">
                    <div>
                      <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-50 block">{formatCurrency(game.totalNetWorth)}</span>
                      <span className={`text-[11px] font-mono font-bold ${isUp ? 'text-ios-green' : 'text-ios-red'}`}>
                        {formatPercent(game.periodPct)}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-zinc-400 text-center px-4">
          Ordenado por rentabilidad, porque cada partida puede empezar con un capital distinto. El patrimonio se actualiza cada día al cierre y cuando el jugador usa la app.
        </p>
      </div>

      {/* Detalle de una partida */}
      {selected && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setSelected(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-ios-bg-light dark:bg-ios-bg-dark rounded-t-3xl border-t border-black/10 dark:border-white/10 shadow-2xl max-h-[85vh] flex flex-col max-w-md mx-auto w-full animate-slideUp"
          >
            <div className="p-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-ios-blue/15 text-ios-blue flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 truncate max-w-[200px]">{selected.name}</h3>
                    {selected.hasPin && <Lock className="w-3 h-3 text-zinc-400" />}
                  </div>
                  <p className="text-[10px] font-mono text-zinc-400">Código: {selected.id}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center ios-active" aria-label="Cerrar">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white dark:bg-ios-card-dark border-b border-black/5 dark:border-white/5 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Patrimonio</span>
                <span className="text-sm font-black font-mono text-zinc-900 dark:text-zinc-50">{formatCurrency(selected.totalNetWorth)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Rentabilidad</span>
                <span className={`text-sm font-black font-mono ${selected.totalPnLPercent >= 0 ? 'text-ios-green' : 'text-ios-red'}`}>
                  {formatPercent(selected.totalPnLPercent)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Disponible</span>
                <span className="text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300">{formatCurrency(selected.cashAvailable)}</span>
              </div>
            </div>

            <div className="flex border-b border-black/5 dark:border-white/10 px-4 pt-2 gap-2">
              {(['positions', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setDetailTab(tab)}
                  className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
                    detailTab === tab ? 'border-ios-blue text-ios-blue' : 'border-transparent text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  {tab === 'positions' ? <Briefcase className="w-3.5 h-3.5" /> : <History className="w-3.5 h-3.5" />}
                  <span>
                    {tab === 'positions' ? `Posiciones (${selected.positions.length})` : `Historial (${selected.tradeHistory.length})`}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {isLoadingDetail ? (
                <div className="py-10 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-ios-blue" />
                </div>
              ) : detailTab === 'positions' ? (
                selectedViews.length > 0 ? (
                  selectedViews.map((pos) => {
                    const isUp = pos.unrealizedPnL >= 0;
                    return (
                      <div key={pos.id} className="p-3 bg-white dark:bg-ios-card-dark rounded-2xl border border-black/5 dark:border-white/5 shadow-sm flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black font-mono text-zinc-900 dark:text-zinc-100">{pos.symbol}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 rounded-md ${
                                pos.type === 'LONG' ? 'bg-ios-green/15 text-ios-green' : 'bg-ios-orange/15 text-ios-orange'
                              }`}
                            >
                              {pos.type === 'LONG' ? 'Largo' : 'Corto'}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-400 block truncate max-w-[180px]">{pos.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">
                            Invertido {formatCurrency(pos.investedAmount)} · entrada {formatCurrency(pos.entryPrice, pos.currency)}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-50 block">
                            {pos.hasPrice ? formatCurrency(pos.currentValue) : '—'}
                          </span>
                          {pos.hasPrice && (
                            <span className={`text-[11px] font-mono font-bold ${isUp ? 'text-ios-green' : 'text-ios-red'}`}>
                              {formatPercent(pos.unrealizedPnLPercent)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-zinc-400 text-xs">No tiene posiciones abiertas ahora mismo.</div>
                )
              ) : selected.tradeHistory.length > 0 ? (
                selected.tradeHistory.map((trade) => {
                  const isUp = (trade.realizedPnL || 0) >= 0;
                  const date = new Date(trade.timestamp);
                  const isOpen = trade.action.startsWith('OPEN');
                  return (
                    <div key={trade.id} className="p-3 bg-white dark:bg-ios-card-dark rounded-2xl border border-black/5 dark:border-white/5 shadow-sm flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{trade.symbol}</span>
                          <span className="text-[10px] font-medium text-zinc-400">
                            {isOpen ? (trade.type === 'LONG' ? 'Compra' : 'Venta en corto') : 'Cierre'}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block">
                          {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}{' '}
                          {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-right font-mono font-bold">
                        {trade.realizedPnL !== undefined ? (
                          <span className={isUp ? 'text-ios-green' : 'text-ios-red'}>
                            {isUp ? '+' : ''}
                            {formatCurrency(trade.realizedPnL)}
                          </span>
                        ) : (
                          <span className="text-zinc-500">{formatCurrency(trade.investedAmount)}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-zinc-400 text-xs">Todavía no hay operaciones.</div>
              )}
            </div>

            <div className="p-4 pb-safe border-t border-black/5 dark:border-white/10 bg-white dark:bg-ios-card-dark space-y-2">
              {actionError && <div className="p-2 bg-red-500/10 text-ios-red text-xs rounded-xl font-medium">{actionError}</div>}
              {selected.id === activeGameId ? (
                <div className="w-full py-3 rounded-2xl bg-ios-blue/15 text-ios-blue text-xs font-bold text-center">Es tu partida actual</div>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePlay(selected)}
                  className="w-full py-3.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold shadow-md ios-active flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{getJoinedIds().includes(selected.id) ? 'Cambiar a esta partida' : 'Unirme a esta partida'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {joinTarget && (
        <JoinGameSheet
          initialCode={joinTarget.id}
          gameName={joinTarget.name}
          knownHasPin={joinTarget.hasPin}
          onClose={() => setJoinTarget(null)}
          onJoined={() => setSelected(null)}
        />
      )}
    </div>
  );
};
