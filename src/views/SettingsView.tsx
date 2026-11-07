import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FolderKanban,
  KeyRound,
  Loader2,
  LogOut,
  Moon,
  Pencil,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../services/marketApi';
import { PIN_RE } from '../services/gamesHubApi';
import { APP_VERSION, CURRENT_BUILD_ID, checkAppVersion } from '../services/versionChecker';

type PinMode = null | 'set' | 'remove';
type Confirm = null | 'reset' | 'leave' | 'delete';

const cardClass = 'bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-ios';
const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 text-sm font-mono tracking-widest text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 placeholder:tracking-normal border border-black/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-ios-blue';

export const SettingsView: React.FC = () => {
  const {
    isDarkMode,
    toggleDarkMode,
    isInstallable,
    installApp,
    activeGameId,
    activeGameName,
    activeGameHasPin,
    initialCash,
    renameActiveGame,
    setActiveGamePin,
    deleteActiveGame,
    leaveGame,
    resetAccount,
    openLobby,
  } = useTrading();

  const [isRenaming, setIsRenaming] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [copied, setCopied] = useState(false);

  const [pinMode, setPinMode] = useState<PinMode>(null);
  const [pinValue, setPinValue] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinMessage, setPinMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [confirm, setConfirm] = useState<Confirm>(null);
  const [dangerBusy, setDangerBusy] = useState(false);
  const [dangerError, setDangerError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  const handleCopyCode = async () => {
    if (!activeGameId) return;
    try {
      await navigator.clipboard.writeText(activeGameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    renameActiveGame(nameValue);
    setIsRenaming(false);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinBusy) return;
    if (pinMode === 'set' && !PIN_RE.test(pinValue)) {
      setPinMessage({ ok: false, text: 'El PIN debe tener entre 4 y 8 dígitos.' });
      return;
    }
    setPinBusy(true);
    setPinMessage(null);
    try {
      const res = await setActiveGamePin(pinMode === 'set' ? pinValue : null);
      if (res.ok) {
        setPinMessage({ ok: true, text: pinMode === 'set' ? 'PIN guardado. Apúntalo: no se puede recuperar.' : 'PIN eliminado.' });
        setPinMode(null);
        setPinValue('');
      } else {
        setPinMessage({ ok: false, text: res.error || 'No se ha podido cambiar el PIN.' });
      }
    } finally {
      setPinBusy(false);
    }
  };

  const handleConfirm = async () => {
    setDangerError(null);
    if (confirm === 'reset') {
      resetAccount();
      setResetDone(true);
      setTimeout(() => setResetDone(false), 2500);
      setConfirm(null);
      return;
    }
    if (confirm === 'leave' && activeGameId) {
      leaveGame(activeGameId);
      setConfirm(null);
      return;
    }
    if (confirm === 'delete') {
      setDangerBusy(true);
      try {
        const res = await deleteActiveGame();
        if (!res.ok) setDangerError(res.error || 'No se ha podido eliminar la partida.');
        else setConfirm(null);
      } finally {
        setDangerBusy(false);
      }
    }
  };

  const handleManualCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      const didUpdate = await checkAppVersion(true);
      if (!didUpdate) {
        setUpdateStatus('¡Tienes la última versión!');
        setTimeout(() => setUpdateStatus(null), 3000);
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const confirmTexts: Record<Exclude<Confirm, null>, { text: string; button: string }> = {
    reset: {
      text: `Se cerrarán todas tus posiciones sin cobrar, se borrará el historial y volverás a empezar con ${formatCurrency(initialCash, 'USD', false, true)}.`,
      button: 'Sí, reiniciar',
    },
    leave: {
      text: 'La partida seguirá existiendo. Podrás volver a entrar con su código (y su PIN, si tiene).',
      button: 'Sí, salir',
    },
    delete: {
      text: `Se eliminará "${activeGameName}" para todos los jugadores. No se puede deshacer.`,
      button: 'Sí, eliminar',
    },
  };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4 pt-2">
      {/* Partida */}
      <div className={`${cardClass} space-y-3`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Partida</h2>
          <button type="button" onClick={openLobby} className="text-xs font-semibold text-ios-blue flex items-center gap-1 ios-active">
            <FolderKanban className="w-3.5 h-3.5" />
            Cambiar de partida
          </button>
        </div>

        <div className="p-3.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl space-y-2">
          {isRenaming ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                maxLength={40}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 text-sm font-bold text-zinc-900 dark:text-zinc-50 border border-ios-blue focus:outline-none flex-1 min-w-0"
              />
              <button type="submit" disabled={!nameValue.trim()} className="p-2 rounded-xl bg-ios-green text-white ios-active disabled:opacity-50" aria-label="Guardar nombre">
                <Check className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setIsRenaming(false)} className="p-2 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-500 ios-active" aria-label="Cancelar">
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 truncate">{activeGameName}</span>
              <button
                type="button"
                onClick={() => {
                  setNameValue(activeGameName);
                  setIsRenaming(true);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 ios-active shrink-0"
                aria-label="Cambiar nombre"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">Código para invitar</span>
            <button type="button" onClick={handleCopyCode} className="flex items-center gap-1.5 font-mono font-bold tracking-widest text-zinc-900 dark:text-zinc-100 ios-active">
              {activeGameId}
              {copied ? <Check className="w-3.5 h-3.5 text-ios-green" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Seguridad */}
      <div className={`${cardClass} space-y-3`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Seguridad</h2>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
              activeGameHasPin ? 'bg-ios-green/15 text-ios-green' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
            }`}
          >
            {activeGameHasPin ? <ShieldCheck className="w-3 h-3" /> : <KeyRound className="w-3 h-3" />}
            {activeGameHasPin ? 'Con PIN' : 'Sin PIN'}
          </span>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {activeGameHasPin
            ? 'Para operar desde otro dispositivo hace falta el PIN. Se guarda cifrado y tras varios intentos fallidos se bloquea temporalmente.'
            : 'Cualquiera que tenga el código puede entrar y operar en esta partida. Ponle un PIN para que sólo tú puedas hacerlo.'}
        </p>

        {pinMode ? (
          <form onSubmit={handlePinSubmit} className="p-3.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl space-y-3 animate-fadeIn">
            {pinMode === 'set' ? (
              <>
                <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-ios-blue" />
                  {activeGameHasPin ? 'Nuevo PIN' : 'PIN'} (4 a 8 dígitos)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  maxLength={8}
                  value={pinValue}
                  onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className={inputClass}
                />
                {activeGameHasPin && (
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Los demás dispositivos tendrán que introducir el PIN nuevo.</p>
                )}
              </>
            ) : (
              <p className="text-xs text-zinc-700 dark:text-zinc-300">¿Quitar el PIN? Cualquiera con el código podrá operar en esta partida.</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pinBusy || (pinMode === 'set' && pinValue.length < 4)}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm ios-active flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                  pinMode === 'remove' ? 'bg-ios-red' : 'bg-ios-blue'
                }`}
              >
                {pinBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {pinMode === 'set' ? 'Guardar PIN' : 'Sí, quitar PIN'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPinMode(null);
                  setPinValue('');
                }}
                className="px-3 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold ios-active"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className={`grid gap-2 ${activeGameHasPin ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <button
              type="button"
              onClick={() => {
                setPinMessage(null);
                setPinMode('set');
              }}
              className="py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 ios-active"
            >
              <KeyRound className="w-4 h-4 text-ios-blue" />
              {activeGameHasPin ? 'Cambiar PIN' : 'Proteger con PIN'}
            </button>
            {activeGameHasPin && (
              <button
                type="button"
                onClick={() => {
                  setPinMessage(null);
                  setPinMode('remove');
                }}
                className="py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold ios-active"
              >
                Quitar PIN
              </button>
            )}
          </div>
        )}

        {pinMessage && (
          <div
            className={`p-2.5 text-xs font-semibold rounded-xl text-center ${
              pinMessage.ok ? 'bg-ios-green/15 text-ios-green' : 'bg-red-500/10 text-ios-red'
            }`}
          >
            {pinMessage.text}
          </div>
        )}
      </div>

      {/* Apariencia */}
      <div className={cardClass}>
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Apariencia</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
              {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-zinc-500" />}
            </div>
            <div>
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 block">Modo oscuro</span>
              <span className="text-xs text-zinc-400">{isDarkMode ? 'Activado' : 'Desactivado'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleDarkMode}
            className={`w-14 h-8 rounded-full transition-colors relative p-1 ios-active ${isDarkMode ? 'bg-ios-blue' : 'bg-zinc-300'}`}
            aria-label="Modo oscuro"
          >
            <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        {isInstallable && (
          <button
            type="button"
            onClick={installApp}
            className="mt-4 w-full py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 ios-active"
          >
            <Download className="w-4 h-4 text-ios-blue" />
            Instalar la app en este dispositivo
          </button>
        )}
      </div>

      {/* Cartera y zona de peligro */}
      <div className={`${cardClass} space-y-2`}>
        <h2 className="text-xs font-bold uppercase tracking-wider text-ios-red mb-1">Zona de peligro</h2>

        {confirm ? (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-2.5 animate-fadeIn">
            <span className="text-xs font-medium text-ios-red block">{confirmTexts[confirm].text}</span>
            {dangerError && (
              <div className="flex items-center gap-1.5 text-xs text-ios-red font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                {dangerError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={dangerBusy}
                className="flex-1 py-2 rounded-xl bg-ios-red text-white text-xs font-bold ios-active flex items-center justify-center gap-1.5"
              >
                {dangerBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {confirmTexts[confirm].button}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirm(null);
                  setDangerError(null);
                }}
                className="py-2 px-4 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold ios-active"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setConfirm('reset')}
              className="w-full py-3 rounded-2xl bg-red-500/10 text-ios-red text-xs font-bold flex items-center justify-center gap-2 ios-active hover:bg-red-500/20"
            >
              <RotateCcw className="w-4 h-4" />
              Reiniciar cartera ({formatCurrency(initialCash, 'USD', false, true)})
            </button>
            <button
              type="button"
              onClick={() => setConfirm('leave')}
              className="w-full py-3 rounded-2xl bg-red-500/10 text-ios-red text-xs font-bold flex items-center justify-center gap-2 ios-active hover:bg-red-500/20"
            >
              <LogOut className="w-4 h-4" />
              Salir de esta partida en este dispositivo
            </button>
            <button
              type="button"
              onClick={() => setConfirm('delete')}
              className="w-full py-3 rounded-2xl bg-red-500/10 text-ios-red text-xs font-bold flex items-center justify-center gap-2 ios-active hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar partida
            </button>
          </>
        )}

        {resetDone && (
          <div className="p-2 bg-ios-green/15 text-ios-green text-xs font-semibold rounded-xl text-center">Cartera reiniciada.</div>
        )}
      </div>

      {/* Versión */}
      <div className="p-4 bg-zinc-100/80 dark:bg-zinc-900/60 rounded-3xl border border-black/5 dark:border-white/5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Stock Game v{APP_VERSION}</span>
            <span className="text-[10px] font-mono text-zinc-400">({CURRENT_BUILD_ID.slice(0, 7)})</span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-0.5">{updateStatus || 'Cotizaciones: Yahoo Finance'}</p>
        </div>
        <button
          type="button"
          onClick={handleManualCheckUpdate}
          disabled={isCheckingUpdate}
          className="py-1.5 px-3 rounded-xl bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold shadow-sm border border-black/5 dark:border-white/10 ios-active flex items-center gap-1.5 disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin text-ios-blue' : 'text-zinc-500'}`} />
          <span>{isCheckingUpdate ? 'Buscando...' : 'Actualizar'}</span>
        </button>
      </div>
    </div>
  );
};
