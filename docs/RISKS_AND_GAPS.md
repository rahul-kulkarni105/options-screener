# Risks And Gaps

This file records known fragility and future work. It is not a bug list requiring immediate action.

## Upstream Fragility

- Cboe, Yahoo, Nasdaq, Federal Reserve, and BEA endpoints are public web/data sources and may change shape or block requests.
- Some source parsing is HTML/text based and can break when pages redesign.
- Cboe option chains are delayed and may not include every symbol or expiry.
- Nasdaq history is only a fallback and may be affected by headers or asset class differences.

Mitigation already present:

- 15-second fetch timeout.
- 10-minute in-memory cache.
- Yahoo-to-Nasdaq history fallback.
- Event warnings and skipped reasons.

## Domain Risks

- Scoring is heuristic and not a probability model.
- Suggested contract count is a simple sizing helper, not portfolio risk management.
- Correlation groups are static and incomplete.
- Position monitoring depends on manual updates and does not fetch live marks after tracking.
- Manual macro parsing is permissive and date-driven; malformed event text may still become a warning.

## Product Gaps

- No authentication, accounts, broker integration, or order placement.
- No server-side persistence.
- No configurable source adapters.
- No backtesting.

## Engineering Risks

- `server/screener.js` is a dense domain module. Prefer extracting only when a change creates clear repeated complexity.
- Defaults are duplicated between server and client. Any setting change must update both.
- The response payload is implicitly coupled to result panels. Rename fields carefully.
- Formatting helpers are shared by UI displays; changing `pct`, `money`, or `warningTone` can affect many panels.
- The fixture test suite covers core screening formulas and gates, but it is not a substitute for live-source smoke testing.

## Hard Avoids

- Do not present candidates as recommendations or guaranteed edge.
- Do not hide skipped symbols or source warnings.
- Do not add background auto-screening.
- Do not add a second dev server process.
- Do not remove security middleware to simplify local development.
- Do not broaden request limits or input sizes without a specific reason.
