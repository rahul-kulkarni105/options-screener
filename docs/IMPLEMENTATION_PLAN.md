# Implementation Plan

This plan turns the current screener into a more business-ready decision-support workflow. The product should remain a screener, not financial advice, broker execution, or an automated trading system.

## Product Direction

Position the app as:

```text
A conservative options spread decision-support dashboard that helps users find candidates,
understand why candidates passed or failed, avoid event and risk traps, and manage open
spread risk.
```

The strongest business wedge is trust plus risk workflow. More raw picks are less valuable than reliable ranking, clear diagnostics, portfolio-aware risk controls, and useful position follow-up.

## Recommended Sequence

1. [x] Fix ranking trust.
2. [x] Add tests and fixture mode.
3. [x] Strengthen settings validation.
4. [x] Improve skipped-symbol diagnostics.
5. [x] Add portfolio risk review.
6. [x] Add manual position updates.
7. [x] Add trade journal and outcomes.
8. [x] Upgrade event coverage.
9. [x] Add strategy presets.
10. [x] Add export/import and beta polish.

## Session 1: Ranking Trust Fix

Status: Done.

### Objective

Make the ranked candidate list reliable and explainable.

### Work

- Add the missing `distancePct` field during spread construction.
- Guard score components against `null`, `undefined`, and `NaN`.
- Ensure every returned score is a finite number.
- Keep ranking behavior stable when optional market data is unavailable.
- Optionally add a score breakdown object for debugging or future UI display.

### Likely Files

- `server/screener.js`
- `src/features/screener/ResultPanels.jsx`

### Acceptance Criteria

- No ranked candidate displays `NaN`.
- Sorting is stable and deterministic for valid candidates.
- A farther out-of-the-money short strike receives appropriate distance credit.
- Missing optional fields do not poison the total score.
- `npm run check` passes.

### Business Value

Users must be able to trust the first ranked list before any higher-level workflow matters.

## Session 2: Test And Fixture Foundation

Status: Done.

### Objective

Make future business-logic changes safe and repeatable.

### Work

- Add fixture-backed tests for core formulas and filters.
- Cover scoring, credit math, max loss, breakeven, VIX regimes, trend gate, event blocking, and position alerts.
- Add fixed sample option-chain and price-history fixtures.
- Avoid upstream API calls in tests.
- Add the test command to `npm run check`.

### Likely Files

- `server/screener.js`
- `server/*.test.js`
- `server/fixtures/*`
- `package.json`

### Acceptance Criteria

- Tests run offline.
- Ranking defects like missing `distancePct` would be caught.
- Core trading formulas have deterministic tests.
- `npm run check` includes the test suite.

### Business Value

The app can improve without silently breaking the logic users rely on.

## Session 3: Stronger Settings Validation

Status: Done.

### Objective

Prevent incoherent settings from producing misleading results.

### Work

- Validate `minDelta <= maxDelta`.
- Reject stale or past expiries.
- Validate positive account size.
- Validate practical risk percentages.
- Validate positive spread width and liquidity thresholds.
- Add clear UI error messages where practical.
- Keep server-side Zod validation as the real API contract.

### Likely Files

- `server/index.js`
- `src/features/screener/SettingsPanels.jsx`
- `src/features/screener/settingsSlice.js`

### Acceptance Criteria

- Bad settings fail clearly before or during submit.
- API validation returns actionable errors.
- Incoherent risk settings cannot reach the screening engine.

### Business Value

This reduces confusion, protects trust, and lowers support burden.

## Session 4: Skipped-Symbol Diagnostics

Status: Done.

### Objective

Explain why symbols and spreads disappeared from the ranked results.

### Work

- Track failure categories during screening.
- Replace vague `No spreads passed filters` outcomes with specific reasons.
- Return compact diagnostics per skipped symbol.
- Show diagnostics in the UI without overwhelming the dashboard.

### Suggested Failure Categories

- `manual_blocklist`
- `earnings_blocked`
- `vix_blocked`
- `no_chain`
- `no_expiry`
- `missing_history`
- `trend_failed`
- `no_puts_below_price`
- `quote_missing`
- `no_delta_match`
- `low_liquidity`
- `width_too_wide`
- `no_positive_credit`
- `credit_too_low`

### Likely Files

- `server/screener.js`
- `src/features/screener/ResultPanels.jsx`
- `src/styles.css`

### Acceptance Criteria

- Users can tell whether to loosen delta, liquidity, credit, width, or trend settings.
- Existing skipped-symbol transparency is preserved.
- Diagnostics remain bounded and readable for large universes.

### Business Value

The product feels intelligent and educational instead of opaque.

## Session 5: Portfolio Risk Review

Status: Done.

### Objective

Turn candidates into a portfolio-aware decision workflow.

### Work

- Add a way to select candidate spreads for review.
- Create a `Review Trades` panel.
- Aggregate proposed and open tracked risk by total max loss, expiry week, symbol, and correlation group.
- Show risk as dollars and percent of account.
- Warn when weekly or correlation caps would be exceeded.
- Keep the workflow non-advisory and non-execution-oriented.

### Likely Files

- `src/App.jsx`
- `src/features/screener/ResultPanels.jsx`
- `src/features/positions/*`
- `src/lib/risk.js`
- `src/styles.css`

### Acceptance Criteria

- User can see total proposed risk before tracking or copying tickets.
- Existing tracked open positions affect available risk.
- Weekly and correlation cap warnings are based on aggregate exposure.
- Closed positions do not count as active risk.

### Business Value

This is one of the highest-value business features because it helps users avoid over-sizing and concentration risk.

## Session 6: Manual Position Updates

Status: Done.

### Objective

Make position tracking useful without broker integration.

### Work

- Add editable fields for tracked positions:
  - Current spread value.
  - Current underlying price.
  - Current short delta.
  - Notes.
  - Status: `open`, `closed`, or `skipped`.
- Recalculate alerts from updated values.
- Store update history locally.
- Add a close-position flow with exit debit or credit and realized P/L.

### Likely Files

- `src/features/positions/PositionMonitor.jsx`
- `src/features/positions/positionsSlice.js`
- `src/styles.css`

### Acceptance Criteria

- User can manually update an open position.
- Profit target, loss, delta, underlying, and expiry alerts change based on updates.
- Closed positions no longer count as active risk.
- Updates persist in localStorage.

### Business Value

Users have a reason to return after screening instead of using the app only once before entry.

## Session 7: Trade Journal And Outcomes

Status: Done.

### Objective

Create long-term user value through learning and review.

### Work

- Add a journal view for closed and skipped trades.
- Track opened date, closed date, entry credit, exit debit, contracts, realized P/L, entry notes, exit notes, and warnings present at entry.
- Add simple local statistics:
  - Win rate.
  - Average credit captured.
  - Average days held.
  - Largest loss.
  - P/L by symbol.
  - P/L by correlation group.

### Likely Files

- `src/features/positions/*`
- `src/features/journal/*`
- `src/App.jsx`
- `src/styles.css`

### Acceptance Criteria

- Closed positions are preserved.
- Journal stats are computed locally.
- No server-side persistence is required.
- Journal data can be exported in a later session.

### Business Value

The app becomes a learning system, not only a scanner.

## Session 8: Event Coverage Upgrade

Status: Done.

### Objective

Improve one of the product's strongest risk-management differentiators.

### Work

- Add automatic coverage for major non-BEA macro events where practical:
  - CPI.
  - Jobs report.
  - Unemployment.
  - Nonfarm payrolls.
  - Other high-impact BLS releases.
- Add event severity settings: `warn`, `block`, or `ignore`.
- Let users configure whether high-impact macro events should block candidates before expiry.
- Preserve manual macro events.
- Surface source failures clearly.

### Likely Files

- `server/screener.js`
- `src/features/screener/SettingsPanels.jsx`
- `src/features/screener/ResultPanels.jsx`
- `src/styles.css`

### Acceptance Criteria

- Major scheduled macro events before expiry are visible.
- User can choose warning or blocking behavior for high-impact events.
- Manual events still work when automatic events are disabled.
- Source failures do not silently disappear.

### Business Value

Conservative weekly spread traders care deeply about scheduled event risk, so this strengthens the product's core promise.

## Session 9: Strategy Presets

Status: Done.

### Objective

Reduce onboarding friction while keeping rules transparent.

### Work

- Add editable presets:
  - Conservative.
  - Balanced.
  - ETF Only.
  - Small Account.
  - Premium Seeking.
- Applying a preset should populate visible settings rather than hide rules.
- Add reset-to-default and duplicate-preset actions.
- Store custom presets in localStorage.

### Likely Files

- `src/features/screener/settingsSlice.js`
- `src/features/screener/SettingsPanels.jsx`
- `src/styles.css`

### Acceptance Criteria

- User can apply a preset and still inspect every rule.
- Custom presets survive reload.
- Defaults remain conservative.
- Presets do not imply guaranteed edge or advice.

### Business Value

This lowers adoption friction and helps newer users configure the product responsibly.

## Session 10: Export, Import, And Beta Polish

Status: Done.

### Objective

Prepare the product for real-user beta usage.

### Work

- Add export/import for:
  - Settings.
  - Presets.
  - Tracked positions.
  - Journal entries.
- Add source freshness display.
- Strengthen delayed-data and non-advice disclaimers.
- Improve empty, loading, error, and partial-data states.
- Review mobile layout.
- Run full verification.

### Likely Files

- `src/features/screener/*`
- `src/features/positions/*`
- `src/features/journal/*`
- `src/lib/exportImport.js`
- `src/styles.css`

### Acceptance Criteria

- User can preserve and restore local-only data.
- The product clearly communicates data limitations.
- Mobile and desktop workflows remain compact and operational.
- `npm run check` passes.

### Business Value

This makes the product more durable for early users without adding accounts, databases, or broker integration.

## Deferred Ideas

These are valuable, but they should wait until the core workflow is trusted.

- Broker integration.
- Order placement.
- Server-side accounts and persistence.
- Paid subscriptions.
- Real-time alerts.
- Backtesting engine.
- Advanced probability or expected-value modeling.

## Business Priority Summary

The highest-value path is:

1. Make the screener trustworthy.
2. Make risk visible at the portfolio level.
3. Make tracking useful after entry.
4. Make outcomes reviewable.
5. Make onboarding easier with presets and export/import.

Brokerage automation can come later. The near-term product should win by being conservative, transparent, and hard to fool with bad settings or hidden risk.
