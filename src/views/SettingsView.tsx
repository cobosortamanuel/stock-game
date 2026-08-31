import React, { useState } from 'react';
import { Moon, Sun, RotateCcw, Smartphone, Cloud, UploadCloud, DownloadCloud, Copy, Check, Loader2 } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../services/marketApi';

export const SettingsView: React.FC = () => {
  const {
    isDarkMode,
    toggleDarkMode,
    initialCash,
    resetAccount,
    cloudSaveId,
    isCloudSyncing,
    syncToCloud,
    loadFromCloud,
  } = useTrading();

  const [selectedCapital, setSelectedCapital] = useState<number>(initialCash);
  const [isResetConfirming, setIsResetConfirming] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);
  const [inputCode, setInputCode] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const capitalOptions = [10000, 50000, 100000, 500000, 1000000];

  const handleReset = () => {
    resetAccount(selectedCapital);
    setIsResetConfirming(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2000);
  };

  const handleSaveToCloud = async () => {
    const res = await syncToCloud();
    setSyncStatus(res);
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleLoadFromCloud = async () => {
    if (!inputCode.trim()) return;
    const res = await loadFromCloud(inputCode.trim());
    setSyncStatus(res);
    if (res.success) {
      setInputCode('');
    }
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(cloudSaveId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4 pt-2">
      {/* Cloud Save & Cross-device Sync */}
      <div className="bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-ios-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-ios-blue/15 text-ios-blue flex items-center justify-center font-bold">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Guardado en la Nube y Sincronización
              </h2>
              <p className="text-[11px] text-zinc-400">
                Guarda tu partida online para continuarla en cualquier dispositivo.
              </p>
            </div>
          </div>
        </div>

        {/* Current Code Pill */}
        <div className="p-3 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
              Tu Código de Partida
            </span>
            <span className="text-lg font-mono font-extrabold text-zinc-900 dark:text-zinc-50 tracking-wider">
              {cloudSaveId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyCodeToClipboard}
              className="p-2 rounded-xl bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1 shadow-sm ios-active"
            >
              {copiedCode ? <Check className="w-4 h-4 text-ios-green" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleSaveToCloud}
              disabled={isCloudSyncing}
              className="py-2 px-3 rounded-xl bg-ios-blue text-white text-xs font-bold flex items-center gap-1.5 shadow-sm ios-active"
            >
              {isCloudSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              <span>Guardar en Nube</span>
            </button>
          </div>
        </div>

        {/* Restore with code */}
        <div className="pt-2 border-t border-black/5 dark:border-white/5 flex gap-2">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder="Introduce código de partida (ej. 8K2M9X)"
            className="flex-1 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-semibold placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-ios-blue"
          />
          <button
            type="button"
            onClick={handleLoadFromCloud}
            disabled={!inputCode.trim() || isCloudSyncing}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 ios-active ${
              !inputCode.trim()
                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'
                : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
            }`}
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Cargar</span>
          </button>
        </div>

        {syncStatus && (
          <div
            className={`p-2.5 rounded-xl text-xs font-medium text-center ${
              syncStatus.success
                ? 'bg-ios-green/15 text-ios-green border border-ios-green/30'
                : 'bg-ios-red/15 text-ios-red border border-ios-red/30'
            }`}
          >
            {syncStatus.message}
          </div>
        )}
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
          Capital Virtual de Inicio
        </h2>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          Elige con cuánto dinero ficticio deseas empezar o reiniciar tu cuenta:
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {capitalOptions.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setSelectedCapital(amount)}
              className={`py-2 px-2 rounded-xl text-xs font-mono font-bold border transition-all ios-active ${
                selectedCapital === amount
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-black/5 dark:border-white/5'
              }`}
            >
              {formatCurrency(amount, 'USD', true)}
            </button>
          ))}
        </div>

        {isResetConfirming ? (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-2">
            <span className="text-xs font-medium text-ios-red block">
              ¿Seguro? Se borrarán todas las posiciones y el historial para reiniciar con {formatCurrency(selectedCapital)}.
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
            Reiniciar Cartera con {formatCurrency(selectedCapital)}
          </button>
        )}

        {resetSuccess && (
          <div className="mt-2 p-2 bg-ios-green/15 text-ios-green text-xs font-semibold rounded-xl text-center">
            Cartera reiniciada con éxito.
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

      {/* Android Mobile Install Instructions */}
      <div className="bg-white dark:bg-ios-card-dark rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-ios-sm">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="w-4 h-4 text-ios-blue" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Jugar 24/7 en tu Móvil Android
          </h2>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Una vez subida a la nube (Vercel o Netlify):
        </p>
        <ol className="mt-2 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300 list-decimal list-inside">
          <li>Abre el enlace web en Google Chrome en tu móvil Android.</li>
          <li>Tu partida se guardará automáticamente en el navegador y en la nube.</li>
          <li>Pulsa en el menú (tres puntos) y elige <strong>"Instalar aplicación"</strong> para tenerla como app nativa.</li>
        </ol>
      </div>
    </div>
  );
};
