# Feature Plan And Inventory

This is the current feature inventory for the app. Use it before proposing or building product work so existing pages, panels, flows, and deliberate non-features are not duplicated.

The product is a local put credit spread screener. It is not trading advice, broker automation, or portfolio management.

## Routes And Shell

Routes are handled by lightweight browser history state in `src/App.jsx`.

- `/`: Dashboard.
- `/learn`: Learn page.

Shared shell features:

- Top bar with app name, current page title, status text, Dashboard/Learn navigation, and theme toggle.
- `Screen Picks` primary action on the Dashboard only.
- Client-side settings validation blocks screening and shows a compact alert.
- `/api/defaults` hydrates missing default settings once.
- `Data Sources` footer appears on both pages.
- Footer shows the default source set before screening and result-provided source endpoints after screening.
- Source links open in a new tab and point to public/delayed data endpoints.
- Light/dark theme toggle persists in localStorage.

## Dashboard Page

The Dashboard is the working screener interface. It is rendered only on `/` and is intentionally manual: changing settings does not screen automatically.

### Global Dashboard Notices

- `DataNotice` states that the app is a screener only, uses public/delayed data, and is not advice or an execution instruction.
- Validation/API errors show in an app alert under the top bar.
- Source warnings from partial event-source failures show in `SourceWarnings`.
- `ResultSummary` appears after a run and shows ranked count, ticket count, skipped count, event count, expiry, and generated time.

### Strategy Presets

Component: `src/features/screener/SettingsPanels.jsx`.

Built-in presets:

- Conservative.
- Balanced.
- ETF Only.
- Small Account.
- Premium Seeking.

Preset features:

- Select built-in or custom presets.
- Apply a preset into the visible settings form.
- Duplicate any selected preset into a custom preset.
- Save current visible rules as a custom preset.
- Restore conservative defaults.
- Custom presets persist in `putSpreadWeeklyScreener.customPresets`.
- Presets are starting rules only; they do not alter screening formulas or imply advice.

### Strategy Rules

Component: `src/features/screener/SettingsPanels.jsx`.

User-editable rules:

- Symbol universe.
- Expiry.
- Manual blocklist.
- Minimum short delta.
- Maximum short delta.
- Minimum credit percent of width.
- Maximum spread width.
- Minimum short-leg open interest.
- Minimum short-leg volume.
- Save settings to localStorage.

Validation exists both client-side and server-side. Expiry must not be in the past, delta bounds must be coherent, and numeric risk/filter inputs are bounded.

### Market And Risk Rules

Component: `src/features/screener/SettingsPanels.jsx`.

User-editable market/risk controls:

- Trend gate toggle.
- VIX regime gate toggle.
- Auto events toggle.
- Account size.
- Macro event mode: `warn`, `block`, or `ignore`.
- Risk per idea percent.
- Max weekly risk percent.
- Correlation cap percent.
- Manual macro events text area.

Behavior:

- Manual macro events remain available even when automatic events are disabled.
- `warn` prepends high-impact macro warnings to candidates.
- `block` skips candidates while a high-impact macro event is before expiry.
- `ignore` keeps macro events visible without affecting candidates.
- Risk values power per-candidate suggested contracts and aggregate `Review Trades` warnings.

### Export / Import

Component: `src/features/exportImport/DataPortability.jsx`.

Features:

- Export local settings, custom presets, tracked positions, and a journal snapshot to JSON.
- Import a backup JSON file.
- Imported JSON is parsed and normalized before replacing local settings, positions, and custom presets.
- Import dispatches a custom event so the preset picker refreshes.
- There is no server-side persistence.

### Auto Events

Component: `src/features/screener/ResultPanels.jsx`.

Features:

- Shows VIX value, regime, and direction.
- Lists earnings, macro, manual macro, and source-warning events in the selected expiry window.
- Empty/loading states distinguish no run, loading, and no returned events.

Automatic event sources:

- Nasdaq earnings calendar.
- Federal Reserve FOMC calendar.
- BEA release-date JSON endpoint with BEA schedule-page fallback.
- BLS release schedule.
- Manual macro events entered by the user.

Event behavior:

- Earnings block matching symbols.
- High-impact macro events obey `macroEventMode`.
- Source failures are surfaced as warnings where possible.

### Source Freshness

Component: `src/features/screener/ResultPanels.jsx`.

Features:

- Shows last run timestamp.
- Shows number of sources in the result payload.
- Shows data mode as `Public / delayed`.
- Lists source keys and URLs from the last screening result.
- Explains that public web sources can be delayed, unavailable, or partially parsed.

### Ranked Spreads

Component: `src/features/screener/ResultPanels.jsx`.

Features:

- Shows up to 24 globally ranked spread candidates.
- Cards show symbol, price, correlation group, score, IV30, sell/buy strikes, credit, max loss, breakeven, suggested contracts, expected-move low, RSI, MACD histogram, momentum, short delta, distance OTM, quote tightness, and warnings.
- Warning chips use tone mapping from `src/lib/format.js`.
- Each card can be selected for `Review Trades`.
- Each card can copy its order ticket.
- Each card can be tracked locally as a position.
- Empty/loading states guide the user to run screening or inspect skipped symbols.

### Review Trades

Component: `src/features/screener/ResultPanels.jsx`.

Features:

- Aggregates selected proposed spreads with open tracked positions.
- Shows open risk, proposed risk, total risk, weekly cap, correlation cap, and selected count.
- Warns when weekly or correlation caps are exceeded.
- Shows risk by expiry, correlation group, and symbol.
- Closed positions are excluded from active risk.
- This is a risk preview only, not a recommendation or order instruction.

### Order Tickets

Component: `src/features/screener/ResultPanels.jsx`.

Features:

- Shows copyable order-ticket text for ranked spreads.
- Copy action uses the browser clipboard.
- Ticket text is convenience text for manual review and entry elsewhere.
- The app does not place orders.

### Skipped Symbols

Component: `src/features/screener/ResultPanels.jsx`.

Features:

- Shows symbols rejected during screening.
- Each skipped row has a primary reason.
- Diagnostic chips show bounded filter categories and counts.
- Common categories include manual blocklist, earnings blocked, macro blocked, VIX blocked, no chain, no expiry, missing history, trend failed, no puts below price, quote missing, no delta match, low liquidity, width too wide, no positive credit, and credit too low.

### Position Monitor

Component: `src/features/positions/PositionMonitor.jsx`.

Features:

- Tracks selected spreads locally.
- Shows symbol, expiry, short/long put strikes, entry credit, contracts, entry timestamp, realized P/L when closed, and update count.
- Manual editable fields: current mark, underlying, current short delta, status, and notes.
- Status values: open, closed, skipped.
- Alerts from manual values include profit target, loss/risk, short-delta, underlying, and expiry-risk conditions.
- Close flow captures exit side, exit value, exit notes, closed timestamp, and realized P/L.
- Save update appends local update history.
- Remove one position or clear all positions.
- There is no live broker, mark, price, or delta refresh.

### Trade Journal

Component: `src/features/journal/TradeJournal.jsx`.

Features:

- Derived from tracked positions; no separate journal localStorage key.
- Shows closed count, skipped count, win rate, average credit captured, average days held, total P/L, and largest loss.
- Lists recent closed/skipped outcomes with opened/closed dates, entry credit, exit side/value, P/L, entry notes, exit notes, and entry warnings.
- Shows P/L by symbol and by correlation group.

## Learn Page

Component: `src/features/learn/LearnPage.jsx`.

The Learn page is a beginner guide to the dashboard. It does not run screening or mutate screener data.

Features:

- Intro explaining the app's learning purpose and non-advice boundary.
- Short version card explaining the dashboard flow.
- `Dashboard In 5 Steps` workflow:
  - Choose rules.
  - Screen picks.
  - Read results.
  - Review risk.
  - Track and journal.
- Dashboard tour grouped into:
  - Set Up.
  - Run & Inspect.
  - Decide Carefully.
  - Follow Up.
- Accordion-like panel details for Strategy Presets, Strategy Rules, Market & Risk Rules, Export / Import, Auto Events, Source Freshness, Data Sources Footer, Ranked Spreads, Skipped Symbols, Review Trades, Order Tickets, Position Monitor, and Trade Journal.
- Fake spread mini-lab with sliders for stock price, short put strike, spread width, and credit collected.
- Mini-lab calculates long put, credit percent of width, max loss per contract, breakeven, distance OTM, and a plain-English breakeven statement.
- Plain-English glossary for put credit spread, credit, max loss, delta, open interest, VIX, and expected move.
- Safety notes for screener-only usage, public/delayed data, sizing limitations, ticket-copy limitations, and study/paper-trading caution.

## API And Domain Features

Routes:

- `GET /api/health`.
- `GET /api/defaults`.
- `POST /api/screen`.

Server features:

- Express one-process runtime.
- Vite middleware in development.
- Static `dist/` serving in production.
- `helmet`, compression, JSON body limit, and `/api` rate limiting.
- Zod validation in `server/settingsValidation.js`.
- In-memory upstream cache with 10-minute TTL.
- Timeout-bound upstream fetches.
- Cboe option chains.
- Yahoo history primary and Nasdaq history fallback.
- Yahoo VIX history through the same history path.
- Nasdaq earnings.
- Federal Reserve FOMC parsing that keeps meeting dates and avoids minutes-release dates.
- BEA release-date JSON parsing with HTML fallback.
- BLS high-impact release parsing.
- Manual macro event parsing.
- VIX regime classification and size/delta adjustments.
- Trend and momentum metrics.
- Candidate spread construction and scoring.
- Skipped-symbol diagnostics.
- Source warnings for partial failures.
- Response payload includes generated time, expiry, symbols, settings, sources, VIX, auto events, event warnings, ranked spreads, order tickets, and skipped symbols.

## Persistence

Browser localStorage keys:

- `putSpreadWeeklyScreener.settings`.
- `putSpreadWeeklyScreener.customPresets`.
- `putSpreadWeeklyScreener.positions`.
- `putSpreadWeeklyScreener.theme`.

Not persisted:

- Upstream payloads.
- Option chains.
- Ranked results.
- Secrets.
- Broker identifiers.
- Account-linked data.
- Server-side data.

## Deliberate Non-Features

These are not currently part of the app:

- Broker integration.
- Order placement.
- Authentication.
- Server-side accounts or database persistence.
- Scheduled/background screening.
- Real-time alerts.
- Live position refresh after tracking.
- Backtesting.
- Probability of profit, expected value, or assignment-risk modeling.
- Configurable source adapters.
- A second always-running frontend server.

## Maintenance Rule

When adding, removing, renaming, or materially changing a user-visible feature, update this file in the same change. If the feature changes screening behavior or risk semantics, also update `docs/SCREENING_LOGIC.md`, `docs/BUSINESS_LOGIC_MODEL.md`, and tests.
