declare const __APP_BUILD_ID__: string;

export const CURRENT_BUILD_ID = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';
export const APP_VERSION = '1.0.8';
const RELOAD_GUARD_KEY = 'stock_game_last_reloaded_build_v1';

/**
 * Purges CacheStorage and Service Workers, then force reloads the web app.
 */
export async function forceHardReload(): Promise<void> {
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {}
  }

  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.update();
      }
    } catch {}
  }

  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set('v', String(Date.now()));
  window.location.replace(currentUrl.toString());
}

/**
 * Checks if a newer version of the web app is deployed on the server.
 * If a new build is detected, caches are cleared and the page is refreshed automatically.
 */
export async function checkAppVersion(isManual: boolean = false): Promise<boolean> {
  // If in dev environment without build ID, skip check
  if (CURRENT_BUILD_ID === 'dev' || !CURRENT_BUILD_ID) {
    if (isManual) {
      await forceHardReload();
      return true;
    }
    return false;
  }

  try {
    const base = (import.meta as any).env?.BASE_URL || './';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    const versionUrl = `${cleanBase}version.json?t=${Date.now()}`;

    const response = await fetch(versionUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

    if (!response.ok) {
      if (isManual) {
        await forceHardReload();
        return true;
      }
      return false;
    }

    const data = await response.json();
    if (data && data.buildId && (data.buildId !== CURRENT_BUILD_ID || isManual)) {
      console.log(`[VersionChecker] Nueva versión detectada: ${data.buildId} (actual: ${CURRENT_BUILD_ID}). Actualizando...`);

      if (!isManual) {
        const lastReloaded = sessionStorage.getItem(RELOAD_GUARD_KEY);
        if (lastReloaded === data.buildId) {
          return false;
        }
        sessionStorage.setItem(RELOAD_GUARD_KEY, data.buildId);
      }

      await forceHardReload();
      return true;
    }
  } catch (err) {
    console.debug('[VersionChecker] Check skipped or network error:', err);
    if (isManual) {
      await forceHardReload();
      return true;
    }
  }

  return false;
}

/**
 * Initializes the automatic version checker across all platforms (PWA, Safari WebClip, Chrome).
 */
export function initVersionChecker(): void {
  // 1. Initial check shortly after app startup
  setTimeout(() => {
    checkAppVersion();
  }, 1200);

  // 2. Check whenever user returns to the app / tab (crucial for PWA and iOS WebClips)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkAppVersion();
      }
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      checkAppVersion();
    });

    // 3. Heartbeat check every 3 minutes in case tab is left open
    setInterval(() => {
      checkAppVersion();
    }, 3 * 60 * 1000);
  }
}
