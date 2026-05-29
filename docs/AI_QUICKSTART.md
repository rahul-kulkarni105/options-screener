# AI Quickstart

This is a local, single-process Node.js app for ranking weekly put credit spread candidates. It is a screener, not trading advice.

## Goal

Help a user configure conservative put credit spread rules, click `Screen Picks`, review ranked candidates, inspect source freshness and skipped-symbol reasons, copy order-ticket text, preview aggregate risk, and locally track positions for simple exit alerts.

## Tech Stack

- Server: Node.js CommonJS, Express, Zod, helmet, compression, express-rate-limit.
- Client: Vite, React, Redux Toolkit, RTK Query, plain CSS.
- State persistence: browser `localStorage` only for settings, custom presets, tracked positions, and theme preference.
- Runtime: one Node.js process. Development uses Vite middleware inside `server/index.js`; production serves `dist/`.

## Critical Boundaries

- `server/` owns input validation, upstream fetching, screening, ranking, event gating, risk sizing, and static bundle serving.
- `src/` owns UI state, RTK Query calls, localStorage, formatting, and presentation.
- Do not add another always-running frontend server.
- Do not auto-screen on load or on settings changes.
- Do not change screening math, data sources, warnings, or UX behavior unless requested.

## Main Files

- `docs/FEATURE_PLAN.md`: current page-by-page feature inventory and deliberate non-features.
- `server/index.js`: Express app, security middleware, request limits, API routes, error handling, Vite/static serving.
- `server/screener.js`: defaults, upstream fetch/cache, FOMC/BEA/BLS event detection, indicators, spread construction, scoring, response payload.
- `src/App.jsx`: top-level dashboard flow, user-triggered screening, simple route switch, and data-source footer.
- `src/features/screener/*`: settings UI, RTK Query API client, results UI.
- `src/features/exportImport/DataPortability.jsx`: local JSON backup and restore UI.
- `src/features/journal/TradeJournal.jsx`: local outcomes and journal statistics derived from tracked positions.
- `src/features/learn/LearnPage.jsx`: in-app usage guide and risk caveats.
- `src/features/positions/*`: local position tracking.
- `src/lib/exportImport.js`: pure export/import payload helpers.
- `src/lib/format.js`: display formatting and warning tone mapping.
- `src/styles.css`: all app styling, mobile-first.

## Verification

Run `npm run check` before handoff when dependencies are installed. It runs lint, Prettier check, offline fixture tests, Node syntax checks, and a Vite build.

## Safe Defaults For Future Changes

- Keep edits targeted.
- Check `docs/FEATURE_PLAN.md` before adding a user-visible feature.
- Preserve security middleware and API request limits.
- Keep large inputs and symbol lists bounded.
- Keep skipped-symbol transparency.
- Avoid logging account values, upstream payloads, or anything sensitive.
- Preserve trading caution language and warnings.
