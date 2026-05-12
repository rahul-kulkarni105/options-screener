const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadJournal() {
  const source = fs.readFileSync(path.join(__dirname, "journal.js"), "utf8");
  const script = `${source.replace("export function buildJournal", "function buildJournal")}
globalThis.buildJournal = buildJournal;`;
  const context = { Date };
  vm.createContext(context);
  vm.runInContext(script, context);
  return context.buildJournal;
}

test("buildJournal computes local outcome stats and P/L groups", () => {
  const buildJournal = loadJournal();
  const journal = buildJournal([
    {
      id: "A",
      symbol: "AAPL",
      correlationGroup: "Mega-cap tech",
      status: "closed",
      trackedAt: "2035-01-01T00:00:00.000Z",
      closedAt: "2035-01-06T00:00:00.000Z",
      credit: 1,
      exitSide: "debit",
      exitValue: 0.4,
      contracts: 2,
      realizedPnL: 120,
      entryNotes: "clean setup",
      exitNotes: "target",
      warningsAtEntry: ["Wide quote spreads"]
    },
    {
      id: "B",
      symbol: "MSFT",
      correlationGroup: "Mega-cap tech",
      status: "closed",
      trackedAt: "2035-01-02T00:00:00.000Z",
      closedAt: "2035-01-04T00:00:00.000Z",
      credit: 1,
      exitSide: "debit",
      exitValue: 1.5,
      contracts: 1,
      realizedPnL: -50
    },
    {
      id: "C",
      symbol: "TSLA",
      correlationGroup: "High-beta growth",
      status: "skipped",
      trackedAt: "2035-01-03T00:00:00.000Z",
      credit: 1,
      contracts: 1
    },
    {
      id: "D",
      symbol: "NVDA",
      status: "open",
      realizedPnL: 999
    }
  ]);

  assert.equal(journal.trades.length, 2 + 1);
  assert.equal(journal.stats.closedCount, 2);
  assert.equal(journal.stats.skippedCount, 1);
  assert.equal(journal.stats.winRate, 0.5);
  assert.equal(journal.stats.averageCreditCaptured, 0.05);
  assert.equal(journal.stats.averageDaysHeld, 3.5);
  assert.equal(journal.stats.largestLoss, -50);
  assert.equal(journal.stats.totalPnL, 70);
  assert.equal(journal.stats.bySymbol.find((row) => row.key === "AAPL").realizedPnL, 120);
  assert.equal(
    journal.stats.byCorrelationGroup.find((row) => row.key === "Mega-cap tech").realizedPnL,
    70
  );
  assert.equal(
    journal.trades.some((trade) => trade.symbol === "NVDA"),
    false
  );
});
