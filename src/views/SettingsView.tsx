import React, { useState } from 'react';
import {
  Moon,
  Sun,
  RotateCcw,
  FolderKanban,
  KeyRound,
  Lock,
  Globe,
  Dices,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Pencil,
  X,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../services/marketApi';

export const SettingsView: React.FC = () => {
  const {
    isDarkMode,
    toggleDarkMode,
    resetAccount,
    activeGameName,
    activeGameId,
    isCurrentGamePrivate,
    isCurrentGameUnlocked,
    currentGamePin,
    renameGame,
    updatePin,
    setGamePrivacy,
    deleteGame,
    openLobby,
    gamesList,
  } = useTrading();

  const [isResetConfirming, setIsResetConfirming] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  // Delete active game state
  const [isDeleteConfirming, setIsDeleteConfirming] = useState<boolean>(false);

  // Rename state
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [newNameValue, setNewNameValue] = useState<string>('');
  const [renameSuccess, setRenameSuccess] = useState<boolean>(false);

  // Change PIN state
  const [isChangingPin, setIsChangingPin] = useState<boolean>(false);
  const [newPinValue, setNewPinValue] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [pinChangeSuccess, setPinChangeSuccess] = useState<boolean>(false);

  // Make Public / Private State
  const [isPrivacyConfirmOpen, setIsPrivacyConfirmOpen] = useState<boolean>(false);
  const [privacySuccess, setPrivacySuccess] = useState<boolean>(false);

  const handleReset = () => {
    resetAccount(10000);
    setIsResetConfirming(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2000);
  };

  const handleDeleteActiveGame = async () => {
    if (!activeGameId) return;
    await deleteGame(activeGameId);
    setIsDeleteConfirming(false);
  };

  const startRenaming = () => {
    setNewNameValue(activeGameName);
    setIsRenaming(true);
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGameId || !newNameValue.trim()) return;
    await renameGame(activeGameId, newNameValue.trim());
    setIsRenaming(false);
    setRenameSuccess(true);
    setTimeout(() => setRenameSuccess(false), 2000);
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinValue.trim()) return;
    await updatePin(newPinValue.trim());
    setIsChangingPin(false);
    setNewPinValue('');
    setPinChangeSuccess(true);
    setTimeout(() => setPinChangeSuccess(false), 2500);
  };

  const handleGenerateRandomPin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setNewPinValue(randomPin);
  };

  const handleTogglePrivacy = async (targetPrivate: boolean) => {
    if (targetPrivate) {
      const pinToSet = currentGamePin || Math.floor(1000 + Math.random() * 9000).toString();
      await setGamePrivacy(true, pinToSet);
    } else {
      await setGamePrivacy(false);
    }
    setIsPrivacyConfirmOpen(false);
    setPrivacySuccess(true);
    setTimeout(() => setPrivacySuccess(false), 2500);
  };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4 pt-2">
      {/* Active Game & Multi-Save Lobby Switcher */}
      <div className="bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-ios space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-ios-blue/15 text-ios-blue flex items-center justify-center font-bold">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Gestor de Partidas
              </h2>
              <p className="text-[11px] text-zinc-400">
                {gamesList.length} partida(s) sincronizadas en la nube
              </p>
            </div>
          </div>
        </div>

        {/* Current Game Pill & Rename Form */}
        <div className="p-3.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl space-y-2">
          {isRenaming ? (
            <form onSubmit={handleSaveRename} className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={newNameValue}
                onChange={(e) => setNewNameValue(e.target.value)}
                placeholder="Nombre de la partida..."
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 text-sm font-bold text-zinc-900 dark:text-zinc-50 border border-ios-blue focus:outline-none flex-1"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-ios-green text-white text-xs ios-active"
                title="Guardar nombre"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsRenaming(false)}
                className="p-2 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-500 text-xs ios-active"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                    {activeGameName}
                  </span>

                  {isCurrentGameUnlocked && (
                    <button
                      type="button"
                      onClick={startRenaming}
                      className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 ios-active"
                      title="Cambiar nombre de la partida"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isCurrentGamePrivate ? (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5 text-zinc-500" /> Privada
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-ios-blue/15 text-ios-blue text-[10px] font-bold flex items-center gap-0.5">
                      <Globe className="w-2.5 h-2.5" /> Pública
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-zinc-400 block mt-0.5">
                  ID: {activeGameId}
                </span>
              </div>

              <button
                type="button"
                onClick={openLobby}
                className="py-2 px-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold shadow-sm ios-active flex items-center gap-1.5 shrink-0"
              >
                <FolderKanban className="w-3.5 h-3.5 text-ios-blue" />
                <span>Ver Partidas</span>
              </button>
            </div>
          )}

          {renameSuccess && (
            <div className="p-2 bg-ios-green/15 text-ios-green text-xs font-medium rounded-xl text-center">
              Nombre de la partida actualizado con éxito.
            </div>
          )}
        </div>
      </div>

      {/* Security & PIN Settings Card */}
      {isCurrentGameUnlocked && (
        <div className="bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-ios space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Seguridad y Privacidad
            </h2>
            {isCurrentGamePrivate && currentGamePin && (
              <span className="text-xs font-mono font-bold text-zinc-500 flex items-center gap-1">
                PIN: {showPin ? currentGamePin : '••••'}
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="p-1 text-zinc-400 hover:text-zinc-600"
                  title={showPin ? 'Ocultar PIN' : 'Ver PIN'}
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {isCurrentGamePrivate
              ? 'Esta partida es privada y requiere PIN para operar desde otros dispositivos. Puedes cambiar el PIN o hacerla pública para que cualquiera pueda jugar.'
              : 'Esta partida es pública. Cualquiera puede meterse a jugar y hacer cambios. Puedes hacerla privada para protegerla con un PIN.'}
          </p>

          {/* Privacy Switch Action */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (!isCurrentGamePrivate) return;
                setIsPrivacyConfirmOpen(true);
              }}
              className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ios-active ${
                !isCurrentGamePrivate
                  ? 'bg-ios-blue/15 text-ios-blue border-ios-blue/30 font-extrabold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-black/5 dark:border-white/5 hover:bg-zinc-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isCurrentGamePrivate ? 'Hacer Pública' : 'Partida Pública'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isCurrentGamePrivate) return;
                handleTogglePrivacy(true);
              }}
              className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ios-active ${
                isCurrentGamePrivate
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent font-extrabold shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-black/5 dark:border-white/5 hover:bg-zinc-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isCurrentGamePrivate ? 'Partida Privada' : 'Hacer Privada'}</span>
            </button>
          </div>

          {/* Confirm Make Public Modal / Warning */}
          {isPrivacyConfirmOpen && (
            <div className="p-3.5 bg-zinc-100 dark:bg-zinc-800/80 border border-black/5 dark:border-white/10 rounded-2xl space-y-2.5 animate-fadeIn">
              <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-ios-blue" />
                <span>¿Hacer la partida pública?</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Al hacerla pública, cualquier usuario podrá entrar, apostar y modificar esta partida sin necesidad de PIN.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleTogglePrivacy(false)}
                  className="flex-1 py-2 rounded-xl bg-ios-blue text-white text-xs font-bold shadow-sm ios-active"
                >
                  Sí, Hacer Pública
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivacyConfirmOpen(false)}
                  className="px-3 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold ios-active"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Change PIN Section (Available if Private) */}
          {isCurrentGamePrivate && (
            <div>
              {isChangingPin ? (
                <form onSubmit={handleSavePin} className="p-3.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-ios-blue" />
                      <span>Nuevo PIN:</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomPin}
                      className="text-[11px] font-bold text-ios-blue hover:underline flex items-center gap-1"
                    >
                      <Dices className="w-3.5 h-3.5" />
                      <span>Generar aleatorio</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    autoFocus
                    value={newPinValue}
                    onChange={(e) => setNewPinValue(e.target.value)}
                    placeholder="Escribe el nuevo PIN (ej: 4829)..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 text-sm font-mono tracking-widest text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-ios-blue"
                  />

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={!newPinValue.trim()}
                      className="flex-1 py-2.5 rounded-xl bg-ios-blue text-white text-xs font-bold shadow-sm ios-active flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardar PIN</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingPin(false);
                        setNewPinValue('');
                      }}
                      className="px-3 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold ios-active"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNewPinValue(currentGamePin || '');
                    setIsChangingPin(true);
                  }}
                  className="w-full py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 ios-active hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  <KeyRound className="w-4 h-4 text-ios-blue" />
                  <span>Cambiar Código PIN</span>
                </button>
              )}
            </div>
          )}

          {pinChangeSuccess && (
            <div className="p-2.5 bg-ios-green/15 text-ios-green text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>PIN actualizado y sincronizado en la nube con éxito.</span>
            </div>
          )}

          {privacySuccess && (
            <div className="p-2.5 bg-ios-green/15 text-ios-green text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Visibilidad de la partida actualizada con éxito.</span>
            </div>
          )}
        </div>
      )}

      {/* Visual Theme Settings */}
      <div className="bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-ios">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
          Apariencia
        </h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
              {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-zinc-500" />}
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
      <div className="bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-ios">
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
                className="py-2 px-4 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold ios-active"
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

      {/* Delete Game Section (Only available when game is unlocked) */}
      {isCurrentGameUnlocked && activeGameId && (
        <div className="bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-ios">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ios-red mb-3">
            Zona de Peligro
          </h2>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Elimina permanentemente esta partida y su historial de la nube.
          </p>

          {isDeleteConfirming ? (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-2.5 animate-fadeIn">
              <span className="text-xs font-medium text-ios-red block">
                ¿Estás seguro de que deseas eliminar permanentemente <strong>"{activeGameName}"</strong>? Esta acción no se puede deshacer.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteActiveGame}
                  className="flex-1 py-2 rounded-xl bg-ios-red text-white text-xs font-bold ios-active"
                >
                  Sí, Eliminar Definitivamente
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirming(false)}
                  className="py-2 px-4 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold ios-active"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsDeleteConfirming(true)}
              className="w-full py-3 rounded-2xl bg-red-500/10 text-ios-red text-xs font-bold flex items-center justify-center gap-2 ios-active hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar Partida Actual</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
