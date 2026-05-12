import { Chip } from "../../components/Chip.jsx";
import { Metric } from "../../components/Metric.jsx";
import { Panel } from "../../components/Panel.jsx";
import { money, num, pct } from "../../lib/format.js";
import { buildJournal } from "../../lib/journal.js";

function PnlRows({ rows }) {
  if (!rows.length) return <p className="empty">No closed trade P/L yet.</p>;

  return (
    <div className="journal-table">
      {rows.slice(0, 6).map((row) => (
        <div className="journal-row" key={row.key}>
          <strong>{row.key}</strong>
          <span>
            {money(row.realizedPnL)} across {row.count} closed
          </span>
        </div>
      ))}
    </div>
  );
}

export function TradeJournal({ positions }) {
  const journal = buildJournal(positions);

  return (
    <Panel className="wide result-panel" title="Trade Journal">
      <div className="summary-grid">
        <Metric label="Closed" value={journal.stats.closedCount} />
        <Metric label="Skipped" value={journal.stats.skippedCount} />
        <Metric label="Win rate" value={pct(journal.stats.winRate)} />
        <Metric label="Avg captured" value={pct(journal.stats.averageCreditCaptured)} />
        <Metric label="Avg days" value={num(journal.stats.averageDaysHeld, 1)} />
        <Metric
          label="Total P/L"
          tone={journal.stats.totalPnL < 0 ? "warn" : ""}
          value={money(journal.stats.totalPnL)}
        />
        <Metric
          label="Largest loss"
          tone={journal.stats.largestLoss < 0 ? "warn" : ""}
          value={money(journal.stats.largestLoss)}
        />
      </div>

      <div className="journal-sections">
        <section>
          <h3>Recent Outcomes</h3>
          {journal.trades.length ? (
            <div className="journal-table">
              {journal.trades.slice(0, 8).map((trade) => (
                <div
                  className="journal-row"
                  key={`${trade.id}-${trade.closedAt || trade.openedAt}`}
                >
                  <strong>
                    {trade.symbol} {trade.status}
                  </strong>
                  <span>
                    Opened {trade.openedAt ? new Date(trade.openedAt).toLocaleDateString() : "n/a"}
                    {trade.closedAt
                      ? ` | Closed ${new Date(trade.closedAt).toLocaleDateString()}`
                      : ""}
                  </span>
                  <span>
                    Entry {money(trade.entryCredit)} | Exit{" "}
                    {trade.exitSide ? `${trade.exitSide} ${money(trade.exitValue)}` : "n/a"} | P/L{" "}
                    {money(trade.realizedPnL)}
                  </span>
                  {trade.entryNotes || trade.exitNotes ? (
                    <span>
                      {trade.entryNotes ? `Entry: ${trade.entryNotes}` : ""}
                      {trade.entryNotes && trade.exitNotes ? " | " : ""}
                      {trade.exitNotes ? `Exit: ${trade.exitNotes}` : ""}
                    </span>
                  ) : null}
                  {trade.warningsAtEntry.length ? (
                    <div className="chips">
                      {trade.warningsAtEntry.slice(0, 4).map((warning) => (
                        <Chip key={warning}>{warning}</Chip>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">Closed and skipped positions will appear here.</p>
          )}
        </section>
        <section>
          <h3>P/L By Symbol</h3>
          <PnlRows rows={journal.stats.bySymbol} />
        </section>
        <section>
          <h3>P/L By Group</h3>
          <PnlRows rows={journal.stats.byCorrelationGroup} />
        </section>
      </div>
    </Panel>
  );
}
