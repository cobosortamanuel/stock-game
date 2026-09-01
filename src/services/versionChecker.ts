declare const __APP_BUILD_ID__: string;

const CURRENT_BUILD_ID = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';
const RELOAD_GUARD_KEY = 'stock_game_last_reloaded_build_v1';

/**
 * Checks if a newer version of the web app is deployed on the server.
 * If a new build is detected, caches are cleared and the page is refreshed automatically.
 */
export async function checkAppVersion(): Promise<boolean> {
  // If in dev environment without build ID, skip check
  if (CURRENT_BUILD_ID === 'dev' || !CURRENT_BUILD_ID) return false;

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

    if (!response.ok) return false;

    const data = await response.json();
    if (data && data.buildId && data.buildId !== CURRENT_BUILD_ID) {
      console.log(`[VersionChecker] Nueva versión detectada: ${data.buildId} (actual: ${CURRENT_BUILD_ID}). Actualizando...`);

      // Guard against infinite reload loops
      const lastReloaded = sessionStorage.getItem(RELOAD_GUARD_KEY);
      if (lastReloaded === data.buildId) {
        return false;
      }
      sessionStorage.setItem(RELOAD_GUARD_KEY, data.buildId);

      // 1. Purge CacheStorage
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch {}
      }

      // 2. Update Service Workers
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.update();
          }
        } catch {}
      }

      // 3. Force clean reload bypassing cache
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('v', String(Date.now()));
      window.location.replace(currentUrl.toString());
      return true;
    }
  } catch (err) {
    console.debug('[VersionChecker] Check skipped or network error:', err);
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
