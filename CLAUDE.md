# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Stock Game": a mobile-first, iOS-styled paper-trading PWA (React 19 + TypeScript + Vite 6 + Tailwind 3). Players open long/short positions on real tickers using virtual cash, with multiple saved games, a public ranking, and cross-device sync through Supabase. **UI text is in Spanish**; keep new user-facing strings in Spanish. Amounts display in USD.

## Commands

```bash
npm run dev       # Vite dev server on :5173, host: true (reachable from phones on the LAN)
npm run build     # tsc -b && vite build -> dist/
npm run preview   # serve the built dist/
npm run lint      # oxlint (not in devDependencies; use `npx oxlint` if the binary is missing)
```

There is no test suite. `npm run build` (which type-checks) is the main correctness check.

## Deployment

- Hosted on **GitHub Pages** (https://cobosortamanuel.github.io/stock-game/): pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and deploys `dist/`.
- Market data comes from the **Supabase Edge Function** `market` (`supabase/functions/market/index.ts`, a Yahoo Finance proxy). It is NOT deployed by CI: after changing it run `npx supabase functions deploy market --project-ref vvxfewktdsltzsxfumio --no-verify-jwt` (or paste it in the dashboard editor).
- `.github/workflows/supabase-keepalive.yml` pings the database and the `market` function every 3 days so the free Supabase project is not paused, and re-enables itself through the API so GitHub does not disable it after 60 days without commits.
- `base: './'` in `vite.config.ts` keeps asset paths relative; the service worker is registered relative to `BASE_URL` in `src/main.tsx`.
- Every build regenerates `public/version.json` (tracked in git, so builds dirty the working tree) and injects `__APP_BUILD_ID__`. `src/services/versionChecker.ts` polls it and hard-reloads on a new build. `APP_VERSION` there is a hand-maintained display string.
- `public/sw.js` is a hand-written network-first service worker; bump `CACHE_NAME` when changing its caching behavior.

## Database (Supabase)

`supabase/migrations/20261107_secure_games.sql` must be applied (SQL Editor) before the current client works. After it:
- `games` is **read-only** for the app (RLS select-only). All writes go through RPCs: `sg_create_game`, `sg_save_game`, `sg_unlock_game`, `sg_set_pin`, `sg_delete_game`. They return `{ ok, error, token, ... }` instead of raising.
- PINs are optional (default none), 4–8 digits, stored bcrypt-hashed in `game_secrets` (no client access). A correct PIN returns a random **device token** (sha256 stored in `game_tokens`); writes to a PIN game require it. Changing the PIN revokes all tokens. 5+ failed PINs lock exponentially (max 24 h).
- `has_pin` and `equity_history` (net-worth snapshots `{t, v}`) are columns on `games`.

## Architecture

**Rule: nothing invented except the money.** Prices, changes, market state and history must come from real data; show "—"/loading when missing, never placeholders or multipliers.

**Navigation** is plain state in `src/App.tsx` (no router): `activeTab` picks a view from `src/views/`, and a non-null `selectedSymbol` replaces everything with `StockDetailView`. The lobby (`GamesLobbyView`: create or join by code) is forced open while there is no active game.

**`src/context/TradingContext.tsx`** holds theme, the active game (`GameSaveData`, single state object + `gameRef`), my games, lobby, and the trade actions. Views consume it via `useTrading()`.
- Persisted positions are core fields only (`Position`); prices/P&L are derived (`PositionView`) via `summarizePortfolio` in `src/lib/portfolio.ts`, so price refreshes never trigger saves.
- Local actions go through `updateGame()` → debounced `flushSave()`. Remote reloads (realtime on the active game id, focus) are skipped while a save is pending and only applied if newer than `lastSyncedAtRef`.
- An equity snapshot is appended every 15 min when all positions have fresh prices (`compactEquityHistory` downsamples old points).

**Quotes** live in `src/hooks/useMarketQuotes.ts`: refreshes positions + watchlist + needed FX every 30 s (visible tab only); views request more with `ensureQuotes`/`mergeQuotes`. Last quotes are cached in `apex_quote_cache_v1`.

**Currencies:** prices stay in the asset's native currency (`quote.currency`, incl. subunits like `GBp`); cash and P&L are USD. Positions store `currency` and `entryFx`; FX comes from Yahoo `XXXUSD=X` quotes (`getFxRate`). Legacy positions without `currency` are treated as USD.

**Services (`src/services/`)**
- `marketApi.ts` — curated catalog (`POPULAR_SYMBOLS`, `MARKET_CATEGORIES`, no prices), `fetchStockData`, `fetchBatchQuotes`, `fetchScreener` (real Yahoo lists: most active/gainers/losers by region, crypto, ETFs), `searchSymbols`, `getMarketStatus`, formatters. Calls the Supabase function (in dev, the local `/api/market` first).
- `gamesHubApi.ts` — create/join/load/save/PIN/delete, plus localStorage: joined ids (`apex_joined_games_v1`), device tokens (`apex_game_tokens_v1`), pending-sync flags, and caches (`apex_games_registry_v8`, `apex_game_save_v8_<id>`).
- `supabaseService.ts` — client, row mapping, RPC wrappers, per-game realtime subscription.

Domain types live in `src/types/market.ts`.

**Dev:** `npm run dev` serves `/api/market` through a Vite middleware that runs `supabase/functions/market/index.ts` locally, so function changes can be tested before deploying them.

**Styling:** Tailwind with custom iOS tokens (`ios-blue`, `ios-bg-light/dark`, `shadow-ios-*`, ...) in `tailwind.config.js`; dark mode is class-based and toggled from the context. Layout is constrained to `max-w-md` (phone width).

localStorage keys use the `apex_` prefix (from the app's former name, "Apex Trade") with version suffixes like `_v8`; changing a suffix orphans existing users' local data.
