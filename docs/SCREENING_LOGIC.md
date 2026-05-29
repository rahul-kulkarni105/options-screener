# Screening Logic

This app ranks weekly put credit spread candidates. It should stay framed as a screener, not as advice or execution automation.

## User Inputs

Default settings live in `server/screener.js` and mirror the client initial state in `src/features/screener/settingsSlice.js`.

Important settings:

- Symbol universe, parsed to uppercase unique symbols and capped at 30.
- Expiry, defaulting to next Friday.
- Manual blocklist.
- Auto event toggle, macro event mode, and manual macro events.
- Short-delta range.
- Minimum credit as percent of spread width.
- Maximum spread width.
- Minimum open interest and volume.
- Trend gate and VIX gate.
- Account size and risk caps.

Server-side Zod validation in `server/settingsValidation.js` is the API contract. Update it with any new setting.

Strategy presets are client-side starting points only. Applying one copies its rules into the visible settings form; presets do not change screening math and should stay framed as configuration help, not advice.

## Upstream Data

- Cboe delayed option chains: option quotes, strikes, expiry, IV, volume, open interest, underlying price.
- Yahoo daily history: primary historical source.
- Nasdaq daily history: fallback when Yahoo history fails.
- Nasdaq earnings calendar: blocks symbols with earnings before expiry.
- Federal Reserve FOMC calendar: high-impact macro events; parser keeps meeting dates and excludes minutes-release dates.
- BEA release schedule: primary official JSON release-date feed, with HTML schedule fallback.
- BLS release schedule: high-impact CPI, Employment Situation, unemployment, nonfarm payrolls, PPI, JOLTS, and related labor/inflation releases.
- Manual macro input: user-entered high-impact events.

Upstream responses are cached in memory for 10 minutes by URL and relevant headers.

## Event Gating

`autoEvents(symbols, expiryIso, manualMacroEvents, enabled)` returns events, blocked symbols, and source warnings.

- Earnings in the expiry window block that symbol.
- High-impact macro events follow `macroEventMode`:
  - `warn`: prepend macro warnings to candidate spread warnings.
  - `block`: skip all candidates while the macro event is before expiry.
  - `ignore`: keep events visible but do not affect candidates.
- Manual macro events are included even when automatic events are disabled.
- When automatic events are enabled, earnings, FOMC, BEA, and BLS sources are fetched concurrently and partial-source failures become source warnings.
- Event source failures are surfaced as warnings where possible.

## VIX Regime

VIX history is fetched through the same history path.

Regimes:

- `< 15`: thin premium, lower target delta and reduce size.
- `15-22`: normal.
- `22-30`: rich premium, reduce size.
- `> 30`: avoid new weekly bullish spreads when VIX gate is enabled.

The VIX state can adjust target delta and suggested size. If VIX data is unavailable, the regime is `unknown`.

## Trend And Momentum

Trend metrics are computed from daily closes/lows:

- SMA 20
- SMA 50
- 5-day price change
- 20-day support
- RSI 14
- MACD histogram

Trend is considered OK when price is above SMA 20, SMA 20 is close to or above SMA 50, and recent 5-day change is not sharply negative.

Momentum labels:

- `Constructive`
- `Mixed`
- `Weak`
- `RSI stretched`
- `Unknown`

If `trendGate` is enabled, candidates with failed trend are filtered out after warning construction.

## Candidate Spread Construction

For each eligible symbol:

1. Fetch option chain and history in parallel.
2. Pick requested expiry if available, otherwise the first returned expiry at or after the selected expiry.
3. Use put options below current price with bid/ask quotes.
4. Filter short legs by adjusted delta range, open interest, and volume.
5. Pair each short leg with a lower-strike long leg within max spread width.
6. Calculate credit as short bid minus long ask.
7. Require credit percent of width to meet the configured minimum.
8. Compute max loss, breakeven, suggested contracts, warnings, and score.
9. Keep up to 3 candidates per symbol, then globally rank and return up to 24.

When no spread survives, the server returns bounded skipped-symbol diagnostics so users can tell whether the likely cause was trend, moneyness, quotes, delta, liquidity, width, or credit.

## Risk Sizing

Max loss per contract is `(width - credit) * 100`.

Raw contracts use the smallest of:

- Account size times risk per idea percent.
- Account size times max weekly risk percent.
- Account size times correlation group cap percent.

The VIX size multiplier is then applied. Suggested contracts can be zero.

The `Review Trades` panel aggregates selected proposed spreads with locally tracked open positions. It shows total max-loss exposure by expiry, symbol, and correlation group, and warns when aggregate weekly or correlation caps would be exceeded. Positions with `status: "closed"` are excluded from active risk.

## Score Components

Scores are intentionally heuristic and rounded. Components include:

- Delta closeness to target.
- Credit as percent of width.
- Combined open interest.
- Distance from underlying price.
- Trend pass.
- Momentum status.
- Quote tightness.
- Short strike below expected-move low.
- Short strike below 20-day support.

Do not tune these weights casually; changes affect the product’s core behavior.

## Output Shape

`screen(settings)` returns:

- `generatedAt`
- `expiry`
- `symbols`
- `settings`
- `sources`
- `vix`
- `autoEvents`
- `eventWarnings`
- `rankedSpreads`
- `orderTickets`
- `skipped`

Skipped items include a primary `reason`, a machine-readable `category`, and compact `diagnostics` entries with category, label, and count. Preserve these reasons when changing filters. They are important user transparency.

The UI surfaces `generatedAt`, source endpoints in both the source freshness panel and footer, source warnings, and a persistent delayed-data/non-advice notice. This should stay visible because all market data is public or delayed and can be incomplete.
