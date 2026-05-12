# Business Logic Model Spec

Lean source-of-truth guide for future model and agent work. This documents current behavior from `server/screener.js`, `server/index.js`, and the relevant React state/results modules. It is a screener specification, not investment advice.

## Product Contract

- Purpose: rank weekly put credit spread candidates, surface risk warnings, produce copyable order-ticket text, and let the user locally track simple exit alerts.
- User action: screening runs only when the user clicks `Screen Picks`.
- Persistence: browser `localStorage` only for settings and tracked positions.
- Server owns: validation, data fetching, event gating, trend/VIX logic, spread construction, scoring, sizing, skipped reasons.
- Client owns: settings form state, local save, result display, ticket copy, local position tracking.

## Inputs

Defaults:

```js
{
  universe: "AAPL, MSFT, NVDA, AMD, AMZN, META, GOOGL, TSLA, QQQ, SPY, IWM",
  expiry: nextFriday(),
  manualBlocklist: "",
  autoEvents: true,
  manualMacroEvents: "",
  minDelta: 0.16,
  maxDelta: 0.30,
  minCreditPct: 0.25,
  maxSpreadWidth: 10,
  minOpenInterest: 250,
  minVolume: 20,
  trendGate: true,
  vixGate: true,
  accountSize: 50000,
  riskPerIdeaPct: 1,
  maxWeeklyRiskPct: 5,
  correlationGroupCapPct: 2
}
```

Validation lives in `server/index.js`. Symbols are split on whitespace, comma, or semicolon, uppercased, deduplicated, and capped at 30.

## Data Sources

- Cboe delayed option chains: underlying price, expiry, option type, strike, bid, ask, delta, IV, volume, open interest.
- Yahoo daily history: primary OHLC history.
- Nasdaq daily history: fallback OHLC history.
- Yahoo `^VIX`: VIX regime history through the same history path.
- Nasdaq earnings calendar: earnings blocks.
- Federal Reserve FOMC page: high-impact macro warnings.
- BEA release schedule: high/medium macro events.
- Manual macro events: user text, one event per line or semicolon.

Fetch behavior:

- In-memory cache key: URL plus request headers.
- Cache TTL: 10 minutes.
- Timeout: 15 seconds.

## Screening Flow

1. Merge request body over defaults.
2. Resolve expiry to request expiry or `nextFriday()`.
3. Parse symbol universe and manual blocklist.
4. Fetch event data.
5. Fetch VIX history and compute VIX state. If unavailable, use `unknown`.
6. For each parsed symbol:
   - Skip if manually blocked.
   - Skip if earnings event is in the expiry window.
   - Skip if `vixGate` is enabled and VIX is avoid regime.
   - Fetch Cboe option chain and price history in parallel.
   - Pick selected expiry if present, else first chain expiry at or after selected expiry, else first returned expiry.
   - Build candidate spreads.
7. Keep up to 3 spreads per symbol.
8. Sort all spreads by score and return up to 24.
9. Return skipped symbols and source warnings.

## Event Logic

Window: today through selected expiry, inclusive.

- Earnings events block the matching symbol.
- High-impact macro events do not block. They are prepended to every candidate warning list.
- Manual macro events are always parsed. If `autoEvents` is disabled, only manual macro events are returned and earnings/FOMC/BEA are not fetched.
- Manual macro event date is the first `YYYY-MM-DD` found in the line, otherwise today.
- BEA events are high impact when the title matches `GDP`, `Personal Income`, `Outlays`, `PCE`, `International Trade`, or `Corporate Profits`; otherwise medium impact.

## Technical Metrics

Given daily closes and lows:

- `last = latest close`
- `sma20 = average(last 20 closes)`
- `sma50 = average(last 50 closes)`
- `change5 = (last - close 5 sessions ago) / close 5 sessions ago`
- `support20 = min(last 20 lows)`
- `rsi14 = 100 - 100 / (1 + gains / losses)` using last 14 close-to-close changes
- `macdHistogram = EMA12(close) - EMA26(close) - EMA9(MACD)`

Trend gate:

```text
trendOk =
  last > sma20
  AND sma20 >= sma50 * 0.985
  AND change5 > -0.04
```

Momentum label:

- `Unknown`: RSI or MACD unavailable.
- `RSI stretched`: RSI > 72.
- `Weak`: RSI < 45 or MACD histogram < 0.
- `Constructive`: RSI >= 50 and MACD histogram >= 0.
- `Mixed`: all other available cases.

## VIX Logic

- `value = latest VIX close`
- `change5 = value - VIX close 5 sessions ago`
- `change10 = value - VIX close 10 sessions ago`
- `direction = stable` if `abs(change5) < 0.75`, else `rising` or `falling`

Regimes:

| VIX value         | Regime         | Delta adjustment | Size multiplier | Avoid |
| ----------------- | -------------- | ---------------: | --------------: | ----- |
| unavailable       | `unknown`      |                0 |            1.00 | false |
| `< 15`            | `thin premium` |            -0.03 |            0.75 | false |
| `15 <= VIX <= 22` | `normal`       |                0 |            1.00 | false |
| `22 < VIX <= 30`  | `rich premium` |                0 |            0.65 | false |
| `> 30`            | `avoid`        |                0 |            0.00 | true  |

Adjusted short-delta range:

```text
adjustedMinDelta = max(0.05, minDelta + vix.deltaAdjustment)
adjustedMaxDelta = max(adjustedMinDelta + 0.04, maxDelta + vix.deltaAdjustment)
targetDelta = (adjustedMinDelta + adjustedMaxDelta) / 2
```

## Spread Construction

Eligible puts:

- Same chosen expiry.
- Type is put.
- Strike is below underlying price.
- Bid and ask are present.

Short leg filter:

- Absolute delta is within adjusted delta range.
- Short open interest >= `minOpenInterest`.
- Short volume >= `minVolume`.

Long leg pairing:

- Long strike must be below short strike.
- Width must be `> 0` and `<= maxSpreadWidth`.
- The first lower-strike put that passes all checks is used for that short leg.
- Long leg open interest and volume are displayed and scored but not hard-filtered.

Pricing and risk formulas:

```text
width = shortStrike - longStrike
credit = roundToCents(shortBid - longAsk)
creditPct = credit / width
maxLoss = (width - credit) * 100
breakeven = shortStrike - credit
dte = max(1, calendarDays(today, expiry))
iv30 = chain.iv30 if present, else avg IV of 8 options nearest underlying for expiry
expectedMove = price * iv30 * sqrt(dte / 365)
expectedMoveLow = price - expectedMove
quoteWidth = (ask - bid) / max(0.01, (bid + ask) / 2)
quoteTightness = max(shortQuoteWidth, longQuoteWidth)
```

Credit filter:

```text
credit > 0
AND creditPct >= minCreditPct
```

## Sizing

```text
riskBudget = min(
  accountSize * riskPerIdeaPct / 100,
  accountSize * maxWeeklyRiskPct / 100,
  accountSize * correlationGroupCapPct / 100
)

rawContracts = floor(riskBudget / maxLoss)
suggestedContracts = max(0, floor(rawContracts * vix.sizeMultiplier))
```

Important current limitation: `maxWeeklyRiskPct` and `correlationGroupCapPct` are applied per candidate, not across all returned candidates or tracked positions.

## Warnings

Candidate warnings:

- High-impact macro event in the expiry window.
- Trend gate failed.
- RSI stretched.
- Weak RSI/MACD momentum.
- Short strike inside expected move.
- Short strike above 20-day support.
- Wide quote spreads when either leg quote width is above 35%.
- High-beta name.
- VIX risk regime: thin premium, rich premium, or avoid.

Current behavior caveats:

- `Trend gate failed` is effectively not visible: when `trendGate` is on, failed-trend candidates are filtered out; when it is off, the warning condition is not added.
- Missing RSI currently compares like a low value in the warning expression, so unavailable RSI can produce a weak momentum warning.

## Scoring

Intended total score is a rounded 0-100 heuristic:

```text
deltaScore = max(0, 1 - abs(shortDelta - targetDelta) / 0.12) * 18
creditScore = min(1, creditPct / max(0.01, minCreditPct * 1.5)) * 18
liquidityScore = min(1, (shortOpenInterest + longOpenInterest) / 2000) * 14
distanceScore = min(1, distancePct / 0.08) * 12
trendScore = trendOk ? 12 : 0
momentumScore = Constructive ? 10 : Mixed ? 5 : 0
quoteScore = max(0, 1 - quoteTightness / 0.55) * 8
expectedMoveScore = shortStrike < expectedMoveLow ? 5 : 0
supportScore = shortStrike < support20 ? 3 : 0
score = round(sum)
```

`distancePct` is set during spread construction and included in score fixtures:

```text
distancePct = (price - shortStrike) / price
```

## Output

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

Each spread includes symbol, price, expiry, DTE, IV30, strikes, delta, credit, credit percent, width, max loss, breakeven, suggested contracts, correlation group, expected-move low, support, RSI, MACD histogram, momentum, liquidity, quote tightness, warnings, order ticket, and score.

## Position Tracking

Tracking is local only. When a spread is tracked:

- `contracts = suggestedContracts || 1`
- `currentValue = credit`
- `underlying = entry price`
- `currentShortDelta = entry short delta`
- `status = open`
- `trackedAt = now`
- `updateHistory = manual updates and close events`

Alerts:

```text
profitPct = (credit - currentValue) / credit
50%-70% profit target if 0.50 <= profitPct <= 0.70
spread value 2x entry credit if currentValue >= credit * 2
short delta alert if shortDelta >= 0.35
underlying alert if underlying <= shortStrike
expiry risk window if daysToExpiry <= 2
```

Manual updates can change current mark, underlying, short delta, notes, and status. Closing a position stores exit side, exit value, closed timestamp, and realized P/L. Critical limitation: no live mark, underlying, or delta refresh exists after tracking.

Closed and skipped positions feed the local trade journal. Journal stats include win rate, average credit captured, average days held, largest loss, total P/L, P/L by symbol, and P/L by correlation group.

## Critical Missing Functionality

1. Add automatic coverage for major non-BEA macro events such as CPI, jobs reports, and BLS releases, or make event sources configurable.
2. Add live position refresh if the app ever moves beyond manual local tracking.
