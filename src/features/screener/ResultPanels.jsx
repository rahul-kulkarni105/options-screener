import { AlertTriangle, Clock, Copy, Crosshair, ShieldAlert } from "lucide-react";
import { useDispatch } from "react-redux";
import { Chip } from "../../components/Chip.jsx";
import { Metric } from "../../components/Metric.jsx";
import { Panel } from "../../components/Panel.jsx";
import { money, num, pct, warningTone } from "../../lib/format.js";
import { buildRiskReview } from "../../lib/risk.js";
import { trackPosition } from "../positions/positionsSlice.js";

function copyTicket(ticket, onStatus) {
  navigator.clipboard.writeText(ticket);
  onStatus?.("Order ticket copied.");
}

function SpreadCard({ isSelected, onSelect, onStatus, spread }) {
  const dispatch = useDispatch();
  const warnings = spread.warnings?.length ? spread.warnings : ["No warnings"];

  return (
    <article className="spread-card">
      <div className="spread-card__head">
        <div>
          <strong>{spread.symbol}</strong>
          <span>
            {money(spread.price)} | {spread.correlationGroup}
          </span>
        </div>
        <div className="score">{num(spread.score, 0)}</div>
      </div>

      <div className="facts">
        <Metric label="IV30" value={pct(spread.iv30)} />
        <Metric label="Sell / buy" value={`${spread.shortStrike} / ${spread.longStrike}`} />
        <Metric label="Credit" value={money(spread.credit)} />
        <Metric label="Max loss" value={money(spread.maxLoss)} />
        <Metric label="Breakeven" value={money(spread.breakeven)} />
        <Metric label="Contracts" value={spread.suggestedContracts} />
        <Metric label="EM low" value={money(spread.expectedMoveLow)} />
        <Metric label="RSI 14" value={num(spread.rsi14, 1)} />
        <Metric label="MACD hist" value={num(spread.macdHistogram, 3)} />
        <Metric label="Momentum" value={spread.momentumStatus} />
        <Metric label="Delta" value={num(spread.shortDelta, 2)} />
        <Metric label="OTM" value={pct(spread.distancePct)} />
        <Metric label="Quote" value={pct(spread.quoteTightness)} />
      </div>

      <div className="chips">
        {warnings.map((warning) => (
          <Chip key={warning} tone={warning === "No warnings" ? "" : warningTone(warning)}>
            {warning}
          </Chip>
        ))}
      </div>

      <div className="actions">
        <label className="review-toggle">
          <input checked={isSelected} type="checkbox" onChange={() => onSelect?.(spread.id)} />
          <span>Review</span>
        </label>
        <button type="button" onClick={() => copyTicket(spread.orderTicket, onStatus)}>
          <Copy size={15} />
          Copy Ticket
        </button>
        <button
          type="button"
          onClick={() => {
            dispatch(trackPosition(spread));
            onStatus?.(`${spread.symbol} position tracked locally.`);
          }}
        >
          <Crosshair size={15} />
          Track Position
        </button>
      </div>
    </article>
  );
}

export function AutoEventsPanel({ isLoading, result }) {
  const vix = result?.vix || {};
  const events = result?.autoEvents || [];

  return (
    <Panel title="Auto Events">
      <div className="summary-grid">
        <Metric label="VIX" value={num(vix.value, 2)} />
        <Metric label="Regime" value={vix.regime || "n/a"} />
        <Metric label="Direction" value={vix.direction || "n/a"} />
      </div>
      <div className="list">
        {events.length ? (
          events.map((event) => (
            <div className="list-row" key={`${event.source}-${event.date}-${event.title}`}>
              <strong>
                {event.date} {event.symbol ? `${event.symbol} ` : ""}
                {event.title}
              </strong>
              <span>
                {event.source || "Source"} | {event.impact || event.type}
              </span>
            </div>
          ))
        ) : (
          <p className="empty">
            {isLoading
              ? "Fetching earnings and macro events."
              : result
                ? "No auto or manual events were returned for the selected expiry window."
                : "No screening run yet."}
          </p>
        )}
      </div>
    </Panel>
  );
}

export function RankedSpreadsPanel({
  isLoading,
  onSelectSpread,
  onStatus,
  result,
  selectedSpreadIds
}) {
  const spreads = result?.rankedSpreads || [];

  return (
    <Panel className="wide result-panel" title="Ranked Spreads">
      {spreads.length ? (
        <div className="spread-grid">
          {spreads.map((spread) => (
            <SpreadCard
              isSelected={selectedSpreadIds?.has(spread.id)}
              key={spread.id}
              spread={spread}
              onSelect={onSelectSpread}
              onStatus={onStatus}
            />
          ))}
        </div>
      ) : (
        <p className="empty">
          {isLoading
            ? "Ranking candidates from option chains, history, events, and VIX state."
            : result
              ? "No spreads passed the current filters. Check Skipped Symbols for the filter reasons."
              : "Click Screen Picks to rank candidates."}
        </p>
      )}
    </Panel>
  );
}

function RiskRows({ cap, rows }) {
  if (!rows.length) return <p className="empty">No active risk in this view.</p>;

  return (
    <div className="risk-table">
      {rows.slice(0, 6).map((row) => (
        <div className="risk-row" key={row.key}>
          <strong>{row.key}</strong>
          <span>
            {money(row.totalRisk)} total | {money(row.openRisk)} open | {money(row.proposedRisk)}{" "}
            proposed
          </span>
          {cap > 0 ? <span>{pct(row.totalRisk / cap)} of cap</span> : null}
        </div>
      ))}
    </div>
  );
}

export function ReviewTradesPanel({ positions, result, selectedSpreadIds, settings }) {
  const spreads = result?.rankedSpreads || [];
  const proposed = spreads.filter((spread) => selectedSpreadIds?.has(spread.id));
  const review = buildRiskReview({ positions, proposed, settings });

  return (
    <Panel className="wide result-panel" title="Review Trades">
      <p className="empty">
        Risk preview only. This is not a recommendation or execution instruction.
      </p>
      <div className="summary-grid">
        <Metric label="Open risk" value={money(review.openRisk)} />
        <Metric label="Proposed risk" value={money(review.proposedRisk)} />
        <Metric
          label="Total risk"
          tone={review.warnings.length ? "warn" : ""}
          value={`${money(review.totalRisk)} (${pct(review.totalRiskPct)})`}
        />
        <Metric label="Weekly cap" value={money(review.weeklyCap)} />
        <Metric label="Correlation cap" value={money(review.correlationCap)} />
        <Metric label="Selected" value={proposed.length} />
      </div>

      {review.warnings.length ? (
        <div className="risk-warnings">
          {review.warnings.map((warning) => (
            <Chip key={`${warning.scope}-${warning.key}`} tone="bad">
              <AlertTriangle size={13} />
              {warning.message}: {money(warning.risk)} / {money(warning.cap)}
            </Chip>
          ))}
        </div>
      ) : (
        <p className="empty">Select ranked spreads to preview aggregate risk before tracking.</p>
      )}

      <div className="risk-sections">
        <section>
          <h3>By Expiry</h3>
          <RiskRows cap={review.weeklyCap} rows={review.byExpiry} />
        </section>
        <section>
          <h3>By Group</h3>
          <RiskRows cap={review.correlationCap} rows={review.byCorrelationGroup} />
        </section>
        <section>
          <h3>By Symbol</h3>
          <RiskRows cap={0} rows={review.bySymbol} />
        </section>
      </div>
    </Panel>
  );
}

export function OrderTicketsPanel({ isLoading, onStatus, result }) {
  const tickets = result?.orderTickets || [];

  return (
    <Panel title="Order Tickets">
      <div className="list">
        {tickets.length ? (
          tickets.map((ticket) => (
            <div className="list-row ticket" key={ticket.id}>
              <strong>{ticket.symbol}</strong>
              <code>{ticket.ticket}</code>
              <button type="button" onClick={() => copyTicket(ticket.ticket, onStatus)}>
                <Copy size={15} />
                Copy
              </button>
            </div>
          ))
        ) : (
          <p className="empty">
            {isLoading ? "Building tickets from ranked candidates." : "No tickets yet."}
          </p>
        )}
      </div>
    </Panel>
  );
}

export function SkippedSymbolsPanel({ isLoading, result }) {
  const skipped = result?.skipped || [];

  return (
    <Panel title="Skipped Symbols">
      <div className="list">
        {skipped.length ? (
          skipped.map((item) => (
            <div className="list-row" key={`${item.symbol}-${item.reason}`}>
              <strong>{item.symbol}</strong>
              <span>{item.reason}</span>
              {item.diagnostics?.length ? (
                <div className="diagnostic-chips">
                  {item.diagnostics.map((diagnostic) => (
                    <span className="diagnostic-chip" key={diagnostic.category}>
                      {diagnostic.label}
                      {diagnostic.count > 1 ? ` x${diagnostic.count}` : ""}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="empty">{isLoading ? "Collecting skipped-symbol diagnostics." : "None."}</p>
        )}
      </div>
    </Panel>
  );
}

export function SourceWarnings({ result }) {
  const warnings = result?.eventWarnings || [];
  if (!warnings.length) return null;

  return (
    <div className="source-warning">
      <ShieldAlert size={16} />
      <span>{warnings.join(" | ")}</span>
    </div>
  );
}

export function SourceFreshness({ isLoading, result }) {
  const sources = Object.entries(result?.sources || {});
  const generated = result?.generatedAt ? new Date(result.generatedAt).toLocaleString() : "";

  return (
    <Panel title="Source Freshness">
      <div className="summary-grid">
        <Metric
          label="Last run"
          value={isLoading ? "Screening..." : generated || "No run yet"}
          tone={result ? "good" : ""}
        />
        <Metric label="Sources" value={sources.length || "n/a"} />
        <Metric label="Data mode" value="Public / delayed" />
      </div>
      <div className="source-list">
        {sources.length ? (
          sources.map(([name, url]) => (
            <div className="source-row" key={name}>
              <strong>{name}</strong>
              <span>{url}</span>
            </div>
          ))
        ) : (
          <p className="empty">Run a screen to see source timestamps and endpoints.</p>
        )}
      </div>
      <p className="preset-note">
        Quotes and histories come from public web sources and can be delayed, unavailable, or
        partially parsed.
      </p>
    </Panel>
  );
}

export function ResultSummary({ result }) {
  if (!result) return null;

  const ranked = result.rankedSpreads?.length || 0;
  const skipped = result.skipped?.length || 0;
  const tickets = result.orderTickets?.length || 0;
  const events = result.autoEvents?.length || 0;

  return (
    <div className="result-summary">
      <Metric label="Ranked" value={ranked} tone={ranked ? "good" : "warn"} />
      <Metric label="Tickets" value={tickets} />
      <Metric label="Skipped" value={skipped} tone={skipped ? "warn" : ""} />
      <Metric label="Events" value={events} />
      <Metric label="Expiry" value={result.expiry} />
      <Metric label="Generated" value={new Date(result.generatedAt).toLocaleTimeString()} />
    </div>
  );
}

export function DataNotice() {
  return (
    <div className="product-notice">
      <Clock size={16} />
      <span>
        Screener only. Data is public or delayed, may be incomplete, and is not financial advice or
        an execution instruction.
      </span>
    </div>
  );
}
