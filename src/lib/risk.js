function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function contractsForTrade(trade) {
  return Math.max(1, Math.floor(finiteNumber(trade.contracts ?? trade.suggestedContracts, 1)));
}

function maxLossForTrade(trade) {
  const maxLoss = finiteNumber(trade.maxLoss);
  if (maxLoss > 0) return maxLoss;
  const width = finiteNumber(trade.width);
  const credit = finiteNumber(trade.credit);
  return Math.max(0, (width - credit) * 100);
}

function riskForTrade(trade) {
  return maxLossForTrade(trade) * contractsForTrade(trade);
}

function percentOfAccount(value, accountSize) {
  const account = finiteNumber(accountSize);
  return account > 0 ? value / account : 0;
}

function activePositions(positions) {
  return (positions || []).filter((position) => !position.status || position.status === "open");
}

function summarizeByKey(trades, keyName) {
  const groups = new Map();
  for (const trade of trades) {
    const key = trade[keyName] || "Unassigned";
    const current = groups.get(key) || {
      key,
      openRisk: 0,
      proposedRisk: 0,
      totalRisk: 0,
      count: 0
    };
    current[trade.source === "proposed" ? "proposedRisk" : "openRisk"] += trade.risk;
    current.totalRisk += trade.risk;
    current.count += 1;
    groups.set(key, current);
  }
  return [...groups.values()].sort(
    (a, b) => b.totalRisk - a.totalRisk || a.key.localeCompare(b.key)
  );
}

function normalizeTrade(trade, source) {
  return {
    id: trade.id,
    symbol: trade.symbol || "Unknown",
    expiry: trade.expiry || "Unknown",
    correlationGroup: trade.correlationGroup || "Single name",
    contracts: contractsForTrade(trade),
    risk: riskForTrade(trade),
    source
  };
}

export function buildRiskReview({ positions = [], proposed = [], settings = {} }) {
  const accountSize = finiteNumber(settings.accountSize);
  const active = activePositions(positions).map((trade) => normalizeTrade(trade, "open"));
  const proposedTrades = proposed.map((trade) => normalizeTrade(trade, "proposed"));
  const trades = [...active, ...proposedTrades];
  const openRisk = active.reduce((sum, trade) => sum + trade.risk, 0);
  const proposedRisk = proposedTrades.reduce((sum, trade) => sum + trade.risk, 0);
  const totalRisk = openRisk + proposedRisk;
  const weeklyCap = accountSize * (finiteNumber(settings.maxWeeklyRiskPct) / 100);
  const correlationCap = accountSize * (finiteNumber(settings.correlationGroupCapPct) / 100);
  const byExpiry = summarizeByKey(trades, "expiry");
  const bySymbol = summarizeByKey(trades, "symbol");
  const byCorrelationGroup = summarizeByKey(trades, "correlationGroup");
  const warnings = [];

  for (const expiry of byExpiry) {
    if (weeklyCap > 0 && expiry.totalRisk > weeklyCap) {
      warnings.push({
        scope: "weekly",
        key: expiry.key,
        message: `${expiry.key} risk exceeds weekly cap`,
        risk: expiry.totalRisk,
        cap: weeklyCap
      });
    }
  }

  for (const group of byCorrelationGroup) {
    if (correlationCap > 0 && group.totalRisk > correlationCap) {
      warnings.push({
        scope: "correlation",
        key: group.key,
        message: `${group.key} risk exceeds correlation cap`,
        risk: group.totalRisk,
        cap: correlationCap
      });
    }
  }

  return {
    accountSize,
    openRisk,
    proposedRisk,
    totalRisk,
    totalRiskPct: percentOfAccount(totalRisk, accountSize),
    weeklyCap,
    correlationCap,
    byExpiry,
    bySymbol,
    byCorrelationGroup,
    warnings
  };
}
