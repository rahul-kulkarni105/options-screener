# Business Logic And Feature Audit

This document explains the screener in plain English. It is meant for a product owner or trader-user who wants to understand what the app does today, what rules it follows, and what is missing before it can be treated as a stronger decision-support tool.

This app is a screener. It does not know your brokerage account, it does not place trades, and it should not be treated as financial advice.

## What The Product Does

The app helps a user find weekly put credit spread candidates. A put credit spread is a defined-risk bullish-to-neutral options trade: sell a put at a higher strike, buy a put at a lower strike, collect a credit, and risk the difference between strikes minus the credit received.

The workflow is:

1. The user enters a symbol universe, expiry, strategy rules, market filters, and risk settings.
2. The user clicks `Screen Picks`.
3. The server fetches option chains, price history, events, and VIX data.
4. The server filters and ranks put spread candidates.
5. The UI shows ranked spreads, risk warnings, skipped-symbol reasons, and copyable ticket text.
6. The user can track a candidate locally for simple exit alerts.

The app intentionally does not auto-screen when settings change. This protects performance and avoids making the app feel like it is constantly issuing new trade suggestions.

## The Default Strategy

The default universe is:

```text
AAPL, MSFT, NVDA, AMD, AMZN, META, GOOGL, TSLA, QQQ, SPY, IWM
```

The default strategy looks for short put deltas between `0.16` and `0.30`, minimum credit of `25%` of the spread width, spread width up to `$10`, short-leg open interest of at least `250`, and short-leg volume of at least `20`.

The default risk settings assume a `$50,000` account, `1%` risk per idea, `5%` maximum weekly risk, and `2%` correlation-group cap. These settings produce a suggested contract count and power the local review panel, but they do not replace real portfolio risk management.

## Market Data Used

The screener uses public/delayed web data:

- Cboe delayed option chains for option quotes, strikes, expiry, IV, volume, open interest, delta, and underlying price.
- Yahoo daily price history for trend indicators.
- Nasdaq daily price history as a fallback if Yahoo fails.
- Yahoo VIX history for market regime.
- Nasdaq earnings calendar for earnings blocks.
- Federal Reserve FOMC calendar for major Fed event warnings.
- BEA release schedule for GDP, PCE, and related macro warnings.
- Manual macro events entered by the user.

Data is cached in memory for 10 minutes and each upstream request has a 15-second timeout.

## Event Rules

The screener checks events from today through the selected expiry.

Earnings are blocking events. If a symbol has earnings before expiry, the symbol is skipped.

High-impact macro events are warning events. They do not block the trade candidate, but the warning is added to every candidate spread.

Manual macro events are always included. If automatic events are turned off, the app still includes manual macro events, but it does not fetch earnings, Fed, or BEA events.

Important gap: the automatic macro coverage is incomplete. It covers FOMC and selected BEA releases, but it does not automatically cover every major market event a trader may care about, such as CPI or employment reports from BLS.

## VIX Rules

The VIX is used as a market regime filter and position-size adjustment.

| VIX level      | Meaning in the app | What the app does                                                  |
| -------------- | ------------------ | ------------------------------------------------------------------ |
| Below 15       | Thin premium       | Looks for slightly lower deltas and reduces suggested size to 75%. |
| 15 to 22       | Normal             | No delta or size adjustment.                                       |
| Above 22 to 30 | Rich premium       | Keeps delta range but reduces suggested size to 65%.               |
| Above 30       | Avoid              | If VIX gate is on, skips new weekly bullish put spreads.           |
| Unavailable    | Unknown            | Continues without VIX adjustment.                                  |

This is a simple rule set. It is not a volatility forecast.

## Trend And Momentum Rules

The app uses daily closing prices and lows to calculate:

- 20-day simple moving average.
- 50-day simple moving average.
- 5-day price change.
- Lowest low over the last 20 days.
- 14-period RSI.
- MACD histogram.

A symbol passes the trend gate when:

```text
latest close is above the 20-day average
AND 20-day average is at least 98.5% of the 50-day average
AND 5-day change is better than -4%
```

Momentum is labeled as:

- `Constructive` when RSI is at least 50 and MACD histogram is positive.
- `Mixed` when momentum is not clearly strong or weak.
- `Weak` when RSI is below 45 or MACD histogram is negative.
- `RSI stretched` when RSI is above 72.
- `Unknown` when the app does not have enough history.

If trend gate is enabled, failed-trend candidates are filtered out.

## How A Spread Is Built

For each eligible symbol, the screener looks at puts for the selected expiry. If the exact expiry is not available, it chooses the first available expiry at or after the requested date.

The short leg must:

- Be a put option.
- Expire on the chosen expiry.
- Have a strike below the current underlying price.
- Have bid and ask quotes.
- Have absolute delta inside the adjusted delta range.
- Meet minimum short-leg open interest and volume.

The long leg must:

- Be a lower-strike put with the same expiry.
- Create a spread width no larger than the configured maximum.
- Allow a positive credit after using short bid minus long ask.
- Meet the minimum credit as a percent of spread width.

The app pairs a short leg with the first lower-strike long leg that passes the rules. In practice, that usually favors the closest lower strike that still meets credit and width requirements.

## Key Formulas

Spread width:

```text
width = short strike - long strike
```

Credit:

```text
credit = short bid - long ask
```

The app uses this conservative bid/ask formula instead of midpoint pricing.

Credit percent:

```text
credit percent = credit / width
```

Maximum loss per contract:

```text
max loss = (width - credit) * 100
```

Breakeven:

```text
breakeven = short strike - credit
```

Expected move:

```text
expected move = stock price * IV30 * sqrt(days to expiry / 365)
expected-move low = stock price - expected move
```

Suggested contracts:

```text
risk budget = the smallest of:
  account size * risk per idea %
  account size * max weekly risk %
  account size * correlation cap %

raw contracts = floor(risk budget / max loss)
suggested contracts = raw contracts adjusted by the VIX size multiplier
```

Example: if account size is `$50,000`, risk per idea is `1%`, weekly cap is `5%`, and correlation cap is `2%`, the smallest risk budget is `$500`. If one contract has `$400` max loss, the raw contract count is `1`.

## How Ranking Works

Each candidate is scored with a heuristic score intended to add up to 100 points. The score rewards:

- Short delta close to the target delta.
- Higher credit relative to spread width.
- Better combined open interest.
- More distance between the stock price and short strike.
- Passing trend.
- Constructive or mixed momentum.
- Tighter bid/ask quotes.
- Short strike below the expected-move low.
- Short strike below 20-day support.

The spread object now sets `distancePct`, and scoring guards optional or unavailable fields so they do not turn the total score into `NaN`:

```text
distance percent = (stock price - short strike) / stock price
```

The returned payload also includes a score breakdown for fixture tests and future UI diagnostics.

## Warnings The User May See

The app can warn about:

- High-impact macro events before expiry.
- Stretched RSI.
- Weak RSI or MACD momentum.
- Short strike inside the expected move.
- Short strike above 20-day support.
- Wide option quotes.
- High-beta symbols.
- VIX risk regimes.

Important current issue: the trend-failure warning is not very useful as implemented. When the trend gate is on, failed-trend spreads are removed. When the trend gate is off, the app does not add the trend-failure warning. A future version should show weak-trend context when the user chooses to allow weak-trend candidates.

## Position Tracking

The local position monitor stores a selected spread in the browser. It records the entry credit, suggested contracts, underlying price at screening time, short delta at screening time, entry timestamp, manual notes, status, and update history.

It can show alerts for:

- 50% to 70% profit target.
- Spread value at least 2 times the entry credit.
- Short delta at or above 0.35.
- Underlying at or below the short strike.
- Expiry risk window within 2 days.

The user can manually update current spread value, current underlying, current short delta, notes, and status. Closing a position stores exit debit or credit, closed timestamp, and realized P/L. Critical current limitation: the monitor still does not fetch live spread value, live underlying price, or updated short delta automatically.

## Trade Journal

Closed and skipped local positions appear in the trade journal. The journal shows recent outcomes, entry and exit notes, entry warnings, realized P/L, and simple local statistics such as win rate, average credit captured, average days held, largest loss, P/L by symbol, and P/L by correlation group.

## Critical Missing Functionality

These are the most important business or feature gaps found in the audit.

1. Improve event coverage. Automatic events should include CPI, jobs reports, and other high-impact scheduled releases, or let the user configure event sources.
2. Add optional long-leg liquidity rules. The short leg has hard open-interest and volume filters; the long leg only affects score/display.
3. Add quote-quality controls. Wide quotes are only a warning today, not a hard filter.
4. Add probability and scenario context. The app does not estimate probability of profit, assignment risk, expected value, or price-at-expiry scenarios.

## High-Value Enhancements

The strongest next improvements are:

- Add configurable event severity and more macro sources.
- Add export/import for settings and tracked positions so local-only data is easier to preserve.

## Bottom Line

The app has a solid foundation for a conservative weekly put spread screener: it has configurable strategy rules, event awareness, trend checks, VIX regime handling, risk sizing, skipped-symbol transparency, and copyable tickets.

The critical gap is that some pieces look like production trading controls but are not fully functional yet. Event coverage needs to be broader, live position refresh is still absent, and export/import is needed before local-only history is easy to preserve.
