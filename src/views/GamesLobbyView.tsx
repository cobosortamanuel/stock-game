import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, ChevronRight, X, Loader2, RefreshCw, Pencil, Check, FolderKanban, Cloud, Link2, Copy, CheckCircle2 } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency, formatPercent } from '../services/marketApi';
import {
  isCloudConnected,
  getSupabaseCredentials,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  subscribeToSupabaseRealtime,
} from '../services/supabaseService';

interface GamesLobbyViewProps {
  onClose: () => void;
}

const SUPABASE_SQL_SETUP = `-- Ejecuta este script en el SQL Editor de tu proyecto Supabase:
create table if not exists games (
  id text primary key,
  name text not null,
  initial_cash numeric not null default 100000,
  cash_available numeric not null default 100000,
  cash_invested numeric not null default 0,
  total_net_worth numeric not null default 100000,
  total_pnl numeric not null default 0,
  total_pnl_percent numeric not null default 0,
  positions_count integer not null default 0,
  positions jsonb default '[]'::jsonb,
  trade_history jsonb default '[]'::jsonb,
  watchlist jsonb default '[]'::jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

alter table games enable row level security;
create policy "Public Access" on games for all using (true) with check (true);
alter publication supabase_realtime add table games;`;

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

  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newGameName, setNewGameName] = useState<string>('');
  const [selectedCapital, setSelectedCapital] = useState<number>(100000);
  const [gameToDelete, setGameToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Renaming state
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState<string>('');

  // Supabase Cloud Config Modal State
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);
  const [supabaseUrl, setSupabaseUrl] = useState<string>('');
  const [supabaseKey, setSupabaseKey] = useState<string>('');
  const [cloudConnected, setCloudConnected] = useState<boolean>(() => isCloudConnected());
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  useEffect(() => {
    const creds = getSupabaseCredentials();
    if (creds) {
      setSupabaseUrl(creds.url);
      setSupabaseKey(creds.key);
      setCloudConnected(true);
    }
  }, []);

  // Realtime subscription if connected
  useEffect(() => {
    if (cloudConnected) {
      const unsub = subscribeToSupabaseRealtime(() => {
        fetchGamesList();
      });
      return () => unsub();
    }
  }, [cloudConnected, fetchGamesList]);

  const capitalOptions = [10000, 50000, 100000, 500000, 1000000];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createGame(newGameName.trim() || 'Nueva Partida', selectedCapital);
      setNewGameName('');
      setIsCreating(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const startRenaming = (id: string, currentName: string) => {
    setEditingGameId(id);
    setEditNameValue(currentName);
  };

  const saveRenaming = async (id: string) => {
    if (editNameValue.trim()) {
      await renameGame(id, editNameValue.trim());
    }
    setEditingGameId(null);
  };

  const handleDeleteConfirm = async (id: string) => {
    await deleteGame(id);
    setGameToDelete(null);
  };

  const handleSaveCloudConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseKey.trim()) return;

    const ok = saveSupabaseCredentials(supabaseUrl.trim(), supabaseKey.trim());
    if (ok) {
      setCloudConnected(true);
      setIsCloudModalOpen(false);
      await fetchGamesList();
    }
  };

  const handleDisconnectCloud = () => {
    clearSupabaseCredentials();
    setCloudConnected(false);
    setSupabaseUrl('');
    setSupabaseKey('');
    setIsCloudModalOpen(false);
    fetchGamesList();
  };

  const copySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
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
            Crea, cambia o sincroniza tus partidas
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
        {/* Supabase Cloud Sync Status Pill */}
        <div className="p-3.5 rounded-3xl bg-white dark:bg-ios-card-dark border border-black/5 dark:border-white/10 shadow-ios-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cloudConnected ? 'bg-ios-green/15 text-ios-green' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Nube Supabase
                </span>
                <span className={`w-2 h-2 rounded-full ${cloudConnected ? 'bg-ios-green animate-pulse' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">
                {cloudConnected ? 'Sincronización multidispositivo activa' : 'Conecta tu Supabase para sincronizar PC y móvil'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCloudModalOpen(true)}
            className="text-xs font-bold text-ios-blue px-3 py-1.5 rounded-xl bg-ios-blue/10 hover:bg-ios-blue/20 ios-active"
          >
            {cloudConnected ? 'Ajustes' : 'Conectar'}
          </button>
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
                  placeholder="Ej: Reto $10k, Take Two Only, Cortos..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-ios-blue"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5">
                  Capital Inicial de Inicio (USD):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {capitalOptions.map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setSelectedCapital(cap)}
                      className={`py-2 px-2 rounded-xl text-xs font-mono font-bold border transition-all ios-active ${
                        selectedCapital === cap
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent shadow-sm'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-black/5 dark:border-white/5'
                      }`}
                    >
                      {formatCurrency(cap, 'USD', true)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
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

        {/* Cloud Config Modal */}
        {isCloudModalOpen && (
          <div className="p-5 bg-white dark:bg-ios-card-dark rounded-3xl border border-black/10 dark:border-white/10 shadow-ios space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-ios-blue" />
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Configurar Nube Supabase
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCloudModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCloudConfig} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                  Project URL:
                </label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 border border-black/5 dark:border-white/10 font-mono focus:outline-none focus:ring-2 focus:ring-ios-blue"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                  Anon / Public Key:
                </label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 border border-black/5 dark:border-white/10 font-mono focus:outline-none focus:ring-2 focus:ring-ios-blue"
                />
              </div>

              {/* SQL setup copy helper */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={copySql}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold flex items-center justify-between border border-black/5 dark:border-white/5"
                >
                  <span className="truncate">Copiar código SQL de la tabla</span>
                  {copiedSql ? (
                    <span className="text-ios-green flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Copiado
                    </span>
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-ios-blue text-white text-xs font-bold shadow-sm ios-active"
                >
                  Guardar y Sincronizar
                </button>

                {cloudConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnectCloud}
                    className="px-3 py-2.5 rounded-2xl bg-ios-red/10 text-ios-red text-xs font-bold ios-active"
                  >
                    Desconectar
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Games List Section */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Partidas ({gamesList.length})
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
                const date = new Date(game.updatedAt);
                const timeAgo = `${date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

                const isEditingThis = editingGameId === game.id;

                return (
                  <div
                    key={game.id}
                    className={`bg-white dark:bg-ios-card-dark rounded-3xl p-4 border transition-all duration-200 shadow-ios-sm relative ${
                      isActive
                        ? 'border-ios-blue dark:border-ios-blue ring-2 ring-ios-blue/20'
                        : 'border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20'
                    }`}
                  >
                    {/* Header: Name, Rename & Delete */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-2">
                        {isEditingThis ? (
                          <div className="flex items-center gap-1.5 mb-1">
                            <input
                              type="text"
                              autoFocus
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveRenaming(game.id);
                                if (e.key === 'Escape') setEditingGameId(null);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm font-bold text-zinc-900 dark:text-zinc-50 border border-ios-blue focus:outline-none w-full"
                            />
                            <button
                              type="button"
                              onClick={() => saveRenaming(game.id)}
                              className="p-1.5 rounded-xl bg-ios-green text-white text-xs ios-active"
                              title="Guardar nombre"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingGameId(null)}
                              className="p-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-500 text-xs ios-active"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">
                              {game.name}
                            </h3>
                            <button
                              type="button"
                              onClick={() => startRenaming(game.id, game.name)}
                              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 ios-active"
                              title="Renombrar partida"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full bg-ios-blue/15 text-ios-blue text-[10px] font-bold tracking-wider uppercase border border-ios-blue/30">
                                Activa
                              </span>
                            )}
                          </div>
                        )}

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
                          onClick={() => setGameToDelete(game.id)}
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
                        onClick={() => switchGame(game.id)}
                        className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 ios-active transition-all ${
                          isActive
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-black/5 dark:border-white/5'
                            : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md'
                        }`}
                      >
                        <span>{isActive ? 'Continuar Partida Actual' : 'Entrar a esta Partida'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
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
    </div>
  );
};
