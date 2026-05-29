# Options Screener - Dev Principles

> Mandatory reference for future feature work, fixes, refactors, reviews, and AI prompts.
> This project is a local options screening dashboard, not a trading advice product.

## 1. Project Identity

- Product: local dashboard for ranking weekly put credit spread candidates.
- Runtime: one Node.js process serves both the Express API and the Vite React app.
- Primary user flow: configure conservative screening rules, click `Screen Picks`, review ranked spreads, inspect warnings/skipped symbols, copy order-ticket text, and locally track positions.
- Product stance: this is a screener and workflow tool. Never present output as a recommendation, guaranteed edge, or portfolio management system.
- Default URL: `http://127.0.0.1:4173`, controlled by `HOST` and `PORT`.

## 2. Stack Standards

- Server: Node.js `>=22`, CommonJS, Express, Zod, helmet, compression, express-rate-limit.
- Client: Vite, React, Redux Toolkit, RTK Query, plain CSS.
- Icons: `lucide-react` when an icon improves scannability or saves space.
- Tests: Node's built-in test runner with `.test.cjs` files.
- Lint/format/build: oxlint, Prettier, Vite build.
- Module style: keep server files CommonJS unless a tool requires dynamic ESM import, as `server/index.js` does for Vite.
- No TypeScript migration or mixed TS/JS unless explicitly requested.
- No new framework, CSS library, router, state library, charting library, database, auth layer, or background worker unless the prompt specifically requires it and the tradeoff is documented.

## 3. Runtime Model

- Development runs with `npm run dev`, which executes `NODE_ENV=development node server/index.js`.
- In development, `server/index.js` attaches Vite as middleware. Do not add a second always-running Vite/frontend server.
- Production uses `npm run build` to create `dist/`, then `npm run start` to serve the built app from the same Express server.
- Keep the API and client under the same origin so RTK Query can use `/api` without CORS complexity.
- Do not add server-side persistence, account integrations, broker integrations, or scheduled jobs unless specifically requested.

## 4. Ownership Boundaries

- `server/` owns API validation, upstream fetching, caching, event detection, screening math, ranking, risk sizing, skipped reasons, source warnings, and static bundle serving.
- `src/` owns UI state, RTK Query calls, localStorage persistence, formatting for display, forms, dashboard layout, and presentation.
- `src/lib/format.js` owns shared display formatting; do not duplicate money, percent, tone, or label formatting across components.
- `src/styles.css` owns all application styling. Keep styles plain CSS and mobile-first.
- Documentation lives in `docs/`; compact GitHub Copilot guidance lives in `.github/copilot-instructions.md`. Keep both layered and task-specific.

## 5. Read Order For Future Work

- Always start with `AGENTS.md`, then `docs/AI_QUICKSTART.md`.
- Use `docs/README.md` to choose only the deeper docs needed for the task.
- For user-visible feature work: read `docs/FEATURE_PLAN.md` before designing or implementing.
- For architecture/runtime/API work: read `docs/ARCHITECTURE.md`.
- For screening math, filters, scoring, risk, and events: read `docs/SCREENING_LOGIC.md` and the relevant functions in `server/screener.js`.
- For implementation standards: read `docs/ENGINEERING_STANDARDS.md`.
- For known fragility and avoid-list context: read `docs/RISKS_AND_GAPS.md`.
- Use `rg` and `rg --files` before broad file reads. Keep context small and targeted.

## 6. Security Principles

- Preserve `helmet`, production CSP, compression, JSON body limits, and `/api` rate limiting.
- Validate every API input with Zod before it reaches domain logic.
- Keep user-provided strings and symbol lists bounded.
- Keep upstream requests timeout-bound.
- Never log account size, risk inputs, full upstream payloads, option-chain dumps, or localStorage contents.
- Do not expose secrets. This app should not require secrets for its current public data sources.
- Treat the user-entered account size as local-only sizing input. It may be saved in local settings by the existing app, but it should never be logged, sent anywhere except the local `/api/screen` call, or persisted server-side.
- External links must use `rel="noopener noreferrer"` when opened in a new tab.
- Do not use `dangerouslySetInnerHTML` unless content is explicitly sanitized and the reason is documented near the code.
- Return concise API errors. Do not leak upstream payloads or stack traces to the client.

## 7. Performance Principles

- Screening must stay user-triggered through `Screen Picks`.
- Do not auto-screen on page load, settings changes, route changes, theme changes, or localStorage hydration.
- Preserve upstream caching unless a task explicitly changes freshness semantics.
- Keep large lists bounded: symbols, manual blocklists, macro-event text, option chains, skipped reasons, warnings, and rendered result lists.
- Avoid extra API calls when existing RTK Query data or component state is sufficient.
- Use memoization only when it removes measurable repeated work or stabilizes expensive derived data.
- Keep Vite bundle growth intentional; avoid heavyweight dependencies for small UI tasks.
- Prefer offline fixture tests over live-source tests in normal verification.

## 8. Screening And Trading Logic

- Do not change screening math, filters, scoring, data sources, event gating, risk sizing, defaults, warnings, or skipped-symbol transparency unless the prompt asks for it.
- Current upstream/domain sources include Cboe option chains, Yahoo price/VIX history, Nasdaq history fallback, Nasdaq earnings, Federal Reserve FOMC calendar, BEA release-date JSON with schedule-page fallback, BLS release schedule, and user-entered manual macro events.
- FOMC parsing should keep meeting dates and avoid minutes-release dates. BEA parsing should prefer the official JSON feed before falling back to HTML.
- Manual macro events must remain available even when automatic event fetching is disabled.
- When changing screening behavior, update fixture-backed tests and the relevant docs.
- Keep skipped-symbol reasons visible. Missing or rejected candidates should be explainable to the user.
- Keep source warnings visible. Do not silently swallow partial-source failures.
- Preserve trading caution language and avoid advice-like phrasing.
- Treat suggested contract count as a sizing helper only, not a risk-management guarantee.
- Be careful with date logic. Expiry validation must reject past dates and use `YYYY-MM-DD`.

## 9. API Principles

- Current routes:
  - `GET /api/health`
  - `GET /api/defaults`
  - `POST /api/screen`
- `/api/defaults` and `/api/screen` should remain `cache-control: no-store`.
- Keep `/api/screen` input validation in sync between server and client.
- Zod validation belongs in `server/settingsValidation.js`; UI validation belongs in `src/features/screener/settingsValidation.js`.
- Keep response payload field names stable because result panels depend on them.
- If adding an endpoint, add validation, request limits, error handling, and docs for request/response shape.

## 10. Settings Change Checklist

When adding, removing, or changing a setting, update all relevant places:

- `server/screener.js` `DEFAULT_SETTINGS`
- `server/settingsValidation.js`
- `src/features/screener/settingsValidation.js`
- `src/features/screener/settingsSlice.js`
- `src/features/screener/presets.js` when preset behavior is affected
- `src/features/screener/SettingsPanels.jsx`
- `src/features/screener/ResultPanels.jsx` if output labels, warnings, or summaries change
- `src/lib/risk.js` when account, position risk, weekly risk, or correlation-cap behavior changes
- Export/import helpers and tests if persisted payloads change
- Focused server/client tests
- Relevant docs in `docs/`

## 11. State And Persistence

- Use Redux Toolkit slices for shared client state.
- Use RTK Query for API calls and API cache.
- Use local component state for view-only state such as selected rows, transient status messages, and route state.
- Persist only local user settings, custom presets, tracked positions, and theme preference.
- The journal is derived from tracked positions. It is exported as a snapshot for user backup, but there is no separate journal localStorage key.
- Current localStorage keys include:
  - `putSpreadWeeklyScreener.settings`
  - `putSpreadWeeklyScreener.customPresets`
  - `putSpreadWeeklyScreener.positions`
  - `putSpreadWeeklyScreener.theme`
- Do not persist upstream payloads, option chains, rankings, secrets, broker identifiers, credentials, or account-linking data.
- `accountSize` is currently part of saved local settings because it drives risk sizing. Do not expand that into account identity, balances from an institution, holdings, or broker data.
- Treat imported JSON as untrusted input. Validate and normalize before storing.

## 12. React Standards

- Keep components focused on one responsibility.
- Prefer existing small primitives in `src/components/` where they fit.
- Keep business rules outside JSX when they are non-trivial or reused.
- Use accessible native controls for forms.
- Avoid duplicated formatting and validation logic.
- Keep event handlers explicit and easy to trace.
- Avoid adding global state for purely local UI behavior.
- Preserve the app's simple route model unless a full router is explicitly needed.

## 13. UI And UX Principles

- The UI is a compact operational dashboard, not a marketing landing page.
- Mobile-first layout is the baseline; desktop should use extra width for denser scanning, not oversized decorative space.
- Preserve the core workflow: configure, screen manually, review candidates, inspect warnings/skips, copy tickets, track positions.
- Warnings, blocked candidates, source freshness, footer source links, and skipped symbols should remain easy to find.
- Use concise labels and helper text that reduce trading ambiguity.
- Avoid decorative sections, hero layouts, nested cards, and purely aesthetic UI churn.
- Buttons must make the action clear. Icon-only buttons need accessible labels.
- Long symbols, tickets, warning text, and metric values must wrap without breaking layout.
- Loading, empty, error, disabled, and success states should be visible and calm.

## 14. CSS And Theme Principles

- Keep all styling in `src/styles.css` unless a task explicitly introduces another supported asset.
- CSS is mobile-first. Start from a 320-375px usable viewport, then add wider layouts with `min-width` media queries.
- Use the existing CSS custom properties in `:root` and `:root[data-theme="dark"]`.
- Do not create a separate `tokens.css` or theme file without a specific refactor request.
- Avoid hardcoded colors in component styles. Add or reuse `--color-*`, `--shadow-*`, or surface variables in `src/styles.css`.
- Every new UI element must work in light and dark themes.
- Keep border radii, spacing, and typography consistent with the current compact dashboard style.
- Do not scale font size with viewport width.
- Ensure focus styles remain visible in both themes.

## 15. Accessibility Standards

- Prefer native `button`, `input`, `select`, `textarea`, and `label` elements.
- Every form control needs a visible label or a clear accessible name.
- Icon-only buttons require `aria-label`.
- Use `aria-current="page"` for active navigation states.
- Disable controls when actions are invalid or in progress, and show the reason nearby when practical.
- Ensure keyboard navigation works for forms, navigation, exports/imports, copy actions, and position actions.
- Use semantic headings in panel order.
- Do not use `tabIndex={0}` on non-interactive elements unless creating a deliberate composite interaction.
- If adding modals or drawers, include focus management, Escape close, labelled dialog semantics, and background interaction handling.

## 16. Code Quality

- Prefer small, targeted edits over rewrites.
- Match existing file conventions before adding a new pattern.
- Optimize for code that is easy to delete and safe to change.
- Add abstractions only when they remove real duplication or clarify a repeated concept.
- Keep comments sparse and useful; explain why, not what.
- Avoid magic values. Give domain constants local names near their use.
- Keep pure helpers pure where possible, especially in `src/lib/` and screening helpers.
- Do not mix unrelated refactors into feature or bug-fix changes.
- Preserve public function/export shapes unless the task requires changing them.

## 17. Dependency Principles

- Prefer standard platform APIs and existing dependencies.
- Add a dependency only when it meaningfully reduces risk or complexity.
- Before adding a dependency, check package size, maintenance posture, security surface, and whether the feature can be done with current tools.
- Do not add dependencies for trivial formatting, simple date handling, basic tables, simple charts, or small UI controls without a strong reason.
- Keep `package.json` scripts aligned with the one-process runtime model.

## 18. Testing Principles

- Run `npm run check` before handoff when dependencies are installed.
- `npm run check` currently runs lint, Prettier check, offline tests, Node syntax checks, and a Vite build.
- Keep tests offline by default. Do not make routine tests depend on Cboe, Yahoo, Nasdaq, Federal Reserve, BEA, or BLS availability.
- Add focused tests for changed screening math, validation, persistence/import behavior, alert logic, formatting, and reducers.
- Use fixtures for domain behavior and edge cases.
- If a full check cannot run, state exactly what was run and why the full check was skipped.

## 19. Documentation Principles

- Keep `docs/AI_QUICKSTART.md` compact and high-signal.
- Keep `docs/FEATURE_PLAN.md` current with all user-visible pages, panels, flows, and deliberate non-features.
- Put detailed behavior in the matching task-specific doc, not everywhere.
- Update docs only when behavior, workflow, architecture, or standards change.
- Do not paste large code blocks into docs.
- Keep docs accurate for the current repo, not aspirational for a different stack.

## 20. Commands

- Development: `npm run dev`
- Production build: `npm run build`
- Production server: `npm run start`
- Tests: `npm run test`
- Lint: `npm run lint`
- Format: `npm run format`
- Full verification: `npm run check`

## 21. Hard Rules

- Do not add a second always-running frontend server.
- Do not auto-screen in the background.
- Do not remove request limits, input bounds, `helmet`, or production CSP.
- Do not hide skipped symbols or source warnings.
- Do not present results as financial advice.
- Do not add server-side persistence, auth, account linking, broker integration, or order placement without an explicit request.
- Do not casually change screening math, data sources, scoring, defaults, or risk sizing.
- Do not store sensitive or account-level data beyond local settings needed for the tool.
- Do not replace the plain CSS dashboard with a marketing-style page.
- Do not broaden live network dependencies in tests.

## 22. Handoff Checklist

- Relevant docs were read, not the entire docs folder by default.
- Changes stayed inside the requested scope.
- Server/client ownership boundaries are intact.
- Validation is updated on both server and client when settings changed.
- Security middleware, request limits, and input bounds are preserved.
- Screening remains manual.
- Warnings and skipped-symbol transparency are preserved.
- Light and dark themes still work for changed UI.
- `npm run check` was run, or skipped with a clear reason.
- User-facing behavior and docs are consistent.
