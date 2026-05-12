function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function daysBetween(startIso, endIso) {
  if (!startIso || !endIso) return 0;
  const start = new Date(startIso);
  const end = new Date(endIso);
  const days = Math.ceil((end - start) / 86400000);
  return Number.isFinite(days) ? Math.max(0, days) : 0;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function roundedRatio(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function summarizePnL(trades, keyName) {
  const groups = new Map();
  for (const trade of trades) {
    if (trade.status !== "closed") continue;
    const key = trade[keyName] || "Unassigned";
    const current = groups.get(key) || { key, count: 0, realizedPnL: 0 };
    current.count += 1;
    current.realizedPnL += trade.realizedPnL;
    groups.set(key, current);
  }
  return [...groups.values()].sort(
    (a, b) => b.realizedPnL - a.realizedPnL || a.key.localeCompare(b.key)
  );
}

function normalizeJournalTrade(position) {
  const contracts = Math.max(1, Math.floor(finiteNumber(position.contracts, 1)));
  const credit = finiteNumber(position.credit);
  const maxCredit = credit * 100 * contracts;
  const realizedPnL = finiteNumber(position.realizedPnL);
  const closedAt = position.closedAt || position.updatedAt || "";
  return {
    id: position.id,
    symbol: position.symbol || "Unknown",
    correlationGroup: position.correlationGroup || "Single name",
    status: position.status || "open",
    openedAt: position.trackedAt || "",
    closedAt,
    daysHeld: daysBetween(position.trackedAt, closedAt),
    entryCredit: credit,
    exitSide: position.exitSide || "",
    exitValue: finiteNumber(position.exitValue),
    contracts,
    realizedPnL,
    creditCapturedPct: maxCredit > 0 ? realizedPnL / maxCredit : 0,
    entryNotes: position.entryNotes ?? position.notes ?? "",
    exitNotes: position.exitNotes || "",
    warningsAtEntry: position.warningsAtEntry || position.warnings || []
  };
}

export function buildJournal(positions = []) {
  const trades = positions
    .filter((position) => position.status === "closed" || position.status === "skipped")
    .map(normalizeJournalTrade)
    .sort((a, b) =>
      String(b.closedAt || b.openedAt).localeCompare(String(a.closedAt || a.openedAt))
    );
  const closedTrades = trades.filter((trade) => trade.status === "closed");
  const winners = closedTrades.filter((trade) => trade.realizedPnL > 0);
  const losses = closedTrades.map((trade) => trade.realizedPnL).filter((value) => value < 0);

  return {
    trades,
    stats: {
      closedCount: closedTrades.length,
      skippedCount: trades.filter((trade) => trade.status === "skipped").length,
      winRate: roundedRatio(closedTrades.length ? winners.length / closedTrades.length : 0),
      averageCreditCaptured: roundedRatio(
        average(closedTrades.map((trade) => trade.creditCapturedPct))
      ),
      averageDaysHeld: average(closedTrades.map((trade) => trade.daysHeld)),
      largestLoss: losses.length ? Math.min(...losses) : 0,
      totalPnL: closedTrades.reduce((sum, trade) => sum + trade.realizedPnL, 0),
      bySymbol: summarizePnL(closedTrades, "symbol"),
      byCorrelationGroup: summarizePnL(closedTrades, "correlationGroup")
    }
  };
}
