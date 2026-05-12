# Engineering Standards

Use this file when changing code. `AGENTS.md` remains the canonical operating guide.

## General

- Prefer small targeted edits.
- Use existing patterns before adding abstractions.
- Keep server and client responsibilities separate.
- Keep comments sparse and useful.
- Use ASCII unless the touched file already clearly uses non-ASCII.

## Server

- Validate all API inputs in `server/index.js`.
- Keep JSON body limits and `/api` rate limits.
- Keep `helmet` and production CSP.
- Do not log account size, risk inputs, full upstream payloads, or option-chain dumps.
- Keep upstream requests timeout-bound.
- Keep symbol lists and user-provided text bounded.
- Surface source warnings or skipped reasons rather than silently swallowing important failures.

## Client

- Use Redux Toolkit and RTK Query for app state and API calls.
- Store settings and tracked positions only in `localStorage`.
- Keep screening user-triggered through `Screen Picks`.
- Use shared display helpers in `src/lib/format.js`.
- Use existing component primitives where they fit.
- Keep forms accessible through native labels and controls.

## UI And CSS

- Plain CSS only, in `src/styles.css`.
- Mobile-first, compact operational dashboard.
- Avoid marketing-page patterns, decorative hero sections, and oversized empty layouts.
- Keep panels compact and scannable.
- Use `lucide-react` icons when an icon improves a button or action.
- Ensure long symbols, tickets, warnings, and metric values wrap without breaking layout.

## Adding Or Changing Settings

Update all relevant places:

- `server/screener.js` `DEFAULT_SETTINGS`
- `server/index.js` Zod schema
- `src/features/screener/settingsSlice.js` initial state and numeric handling if needed
- `src/features/screener/SettingsPanels.jsx` controls
- Result handling docs or tests if behavior changes

## Testing And Verification

Run `npm run check` before handoff when dependencies are installed.

`npm run check` currently runs:

- `npm run lint`
- `prettier --check .`
- `npm run test`
- `node --check server/index.js`
- `node --check server/screener.js`
- `vite build`

When changing screening logic, add or update focused fixture-backed tests. The test suite should stay offline and avoid upstream API calls.

## Documentation Maintenance

- Keep docs layered. Put short orientation in `AI_QUICKSTART.md`; put deeper details in task-specific docs.
- Do not duplicate large code blocks in docs.
- When behavior changes, update only the affected doc file.
