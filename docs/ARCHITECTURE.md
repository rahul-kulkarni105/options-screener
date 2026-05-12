# Architecture

The project is intentionally small: one Express process serves both API routes and the React app.

## Runtime Model

- `npm run dev` sets `NODE_ENV=development` and runs `node server/index.js`.
- In development, `server/index.js` attaches Vite as middleware. There is no separate Vite server process.
- `npm run build` creates `dist/`.
- `npm run start` sets `NODE_ENV=production` and runs the same Express server, serving `dist/`.
- Default URL is `http://127.0.0.1:4173`, controlled by `HOST` and `PORT`.

## Server Flow

`server/index.js`

- Creates the Express app.
- Disables `x-powered-by`.
- Applies `helmet`, compression, JSON body limit, and `/api` rate limiting.
- Validates `/api/screen` with Zod before calling `screen(settings)`.
- Serves Vite middleware in development or static `dist/` in production.
- Converts Zod errors to HTTP 400 and unexpected errors to HTTP 500.

Routes:

- `GET /api/health`: health payload.
- `GET /api/defaults`: default settings plus computed next Friday expiry.
- `POST /api/screen`: validated settings in, screening result out.

## Screening Module Shape

`server/screener.js` is the domain engine. It exports only:

- `DEFAULT_SETTINGS`
- `nextFriday`
- `screen`

Internal responsibilities:

- Fetch and cache upstream text/JSON for 10 minutes.
- Normalize option-chain rows.
- Fetch price history from Yahoo, then Nasdaq fallback.
- Fetch event data from Nasdaq earnings, Federal Reserve FOMC calendar, BEA schedule, and manual macro input.
- Compute technical metrics and VIX regime.
- Build candidate put spreads, score them, and return ranked results plus skipped reasons.

## Client Flow

`src/main.jsx` mounts React with the Redux store.

`src/app/store.js` combines:

- `settings`: screener settings stored on explicit save.
- `positions`: locally tracked positions.
- `screenerApi`: RTK Query API cache/middleware.

`src/App.jsx`:

- Loads `/api/defaults` once and hydrates missing expiry.
- Does not screen automatically.
- Calls `POST /api/screen` only from the `Screen Picks` button.
- Holds the last screening result in component state for display.

## UI Component Ownership

- `src/features/screener/SettingsPanels.jsx`: presets, user-editable rules, save action, settings updates.
- `src/features/screener/ResultPanels.jsx`: events, VIX, ranked spreads, tickets, skipped symbols, source warnings.
- `src/features/exportImport/DataPortability.jsx`: local JSON backup export/import for settings, custom presets, positions, and journal snapshot.
- `src/features/positions/PositionMonitor.jsx`: local tracked-position cards and alert chips.
- `src/components/*.jsx`: small presentational primitives.
- `src/styles.css`: plain CSS for all layout and visual treatment.

## Data Persistence

Only browser `localStorage` is used:

- `putSpreadWeeklyScreener.settings`
- `putSpreadWeeklyScreener.customPresets`
- `putSpreadWeeklyScreener.positions`

There is no server-side database, account integration, auth, or broker integration.

Export/import uses a user-downloaded JSON file. Journal entries are restored through the imported positions because the journal is derived locally from closed and skipped positions.
