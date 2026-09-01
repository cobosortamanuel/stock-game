import React, { useState } from 'react';
import { Moon, Sun, RotateCcw, FolderKanban } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../services/marketApi';

export const SettingsView: React.FC = () => {
  const {
    isDarkMode,
    toggleDarkMode,
    initialCash,
    resetAccount,
    activeGameName,
    activeGameId,
    openLobby,
    gamesList,
  } = useTrading();

  const [isResetConfirming, setIsResetConfirming] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  const handleReset = () => {
    resetAccount(10000);
    setIsResetConfirming(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2000);
  };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4 pt-2">
      {/* Active Game & Multi-Save Lobby Switcher */}
      <div className="bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-ios-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-ios-blue/15 text-ios-blue flex items-center justify-center font-bold">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Gestor de Partidas en Vivo
              </h2>
              <p className="text-[11px] text-zinc-400">
                {gamesList.length} partida(s) sincronizadas en la nube
              </p>
            </div>
          </div>
        </div>

        {/* Current Game Pill */}
        <div className="p-3.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
              Partida Actual
            </span>
            <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              {activeGameName}
            </span>
            <span className="text-[11px] font-mono text-zinc-400 block">
              ID: {activeGameId}
            </span>
          </div>

          <button
            type="button"
            onClick={openLobby}
            className="py-2 px-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold shadow-sm ios-active flex items-center gap-1.5"
          >
            <FolderKanban className="w-3.5 h-3.5 text-ios-blue" />
            <span>Ver Partidas</span>
          </button>
        </div>
      </div>

      {/* Visual Theme Settings */}
      <div className="bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-ios-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
          Apariencia
        </h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
              {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-500" />}
            </div>
            <div>
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 block">
                Modo Oscuro / Claro
              </span>
              <span className="text-xs text-zinc-400">
                {isDarkMode ? 'Tema OLED oscuro activo' : 'Tema claro activo'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleDarkMode}
            className={`w-14 h-8 rounded-full transition-colors relative p-1 ios-active ${
              isDarkMode ? 'bg-ios-blue' : 'bg-zinc-300'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                isDarkMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Virtual Capital Reset */}
      <div className="bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-ios-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
          Reiniciar Partida
        </h2>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
          Si tus operaciones no han salido bien, puedes reiniciar tu cuenta en cualquier momento para volver a empezar con los <strong>10.000 €</strong> iniciales.
        </p>

        {isResetConfirming ? (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-2.5">
            <span className="text-xs font-medium text-ios-red block">
              ¿Seguro? Se borrarán todas las posiciones y el historial para reiniciar con {formatCurrency(10000)}.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2 rounded-xl bg-ios-red text-white text-xs font-bold ios-active"
              >
                Sí, Reiniciar Todo
              </button>
              <button
                type="button"
                onClick={() => setIsResetConfirming(false)}
                className="py-2 px-4 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold ios-active"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsResetConfirming(true)}
            className="w-full py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 ios-active hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar Cartera con {formatCurrency(10000)}
          </button>
        )}

        {resetSuccess && (
          <div className="mt-2 p-2 bg-ios-green/15 text-ios-green text-xs font-semibold rounded-xl text-center">
            Cartera reiniciada con 10.000 € con éxito.
          </div>
        )}
      </div>

      {/* Guide: How Long & Short Works */}
      <div className="bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-ios-sm space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Guía de Operaciones en el Juego
        </h2>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl">
            <div className="flex items-center gap-1.5 font-bold text-ios-green mb-1">
              <span>Apostar a Favor (Comprar en Largo)</span>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Compras acciones esperando que la empresa suba de valor. Si sube de $100 a $150 ganas el 50%. Si baja, pierdes el porcentaje correspondiente.
            </p>
          </div>

          <div className="p-3 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl">
            <div className="flex items-center gap-1.5 font-bold text-ios-orange mb-1">
              <span>Apostar en Corto (Venta en Corto / Short)</span>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Apuestas a que la empresa caerá. Vendes al precio actual y recompras más barato. Si la acción cae de $100 a $70 ganas un 30%. Si sube, pierdes dinero.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
