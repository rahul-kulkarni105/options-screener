const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadRisk() {
  const source = fs.readFileSync(path.join(__dirname, "risk.js"), "utf8");
  const script = `${source.replace("export function buildRiskReview", "function buildRiskReview")}
globalThis.buildRiskReview = buildRiskReview;`;
  const context = {};
  vm.createContext(context);
  vm.runInContext(script, context);
  return context.buildRiskReview;
}

const settings = {
  accountSize: 50_000,
  maxWeeklyRiskPct: 5,
  correlationGroupCapPct: 2
};

test("buildRiskReview aggregates proposed and open active risk", () => {
  const buildRiskReview = loadRisk();
  const review = buildRiskReview({
    settings,
    proposed: [
      {
        id: "A",
        symbol: "AAPL",
        expiry: "2035-01-19",
        correlationGroup: "Mega-cap tech",
        maxLoss: 300,
        suggestedContracts: 2
      }
    ],
    positions: [
      {
        id: "B",
        symbol: "MSFT",
        expiry: "2035-01-19",
        correlationGroup: "Mega-cap tech",
        maxLoss: 250,
        contracts: 1
      },
      {
        id: "C",
        symbol: "TSLA",
        expiry: "2035-01-19",
        correlationGroup: "High-beta growth",
        maxLoss: 900,
        contracts: 1,
        status: "closed"
      },
      {
        id: "D",
        symbol: "NVDA",
        expiry: "2035-01-19",
        correlationGroup: "Semiconductors",
        maxLoss: 700,
        contracts: 1,
        status: "skipped"
      }
    ]
  });

  assert.equal(review.openRisk, 250);
  assert.equal(review.proposedRisk, 600);
  assert.equal(review.totalRisk, 850);
  assert.equal(review.byExpiry[0].key, "2035-01-19");
  assert.equal(review.byExpiry[0].totalRisk, 850);
  assert.equal(review.byCorrelationGroup[0].key, "Mega-cap tech");
  assert.equal(review.byCorrelationGroup[0].totalRisk, 850);
  assert.equal(
    review.bySymbol.some((row) => row.key === "TSLA"),
    false
  );
  assert.equal(
    review.bySymbol.some((row) => row.key === "NVDA"),
    false
  );
});

test("buildRiskReview warns when weekly or correlation caps are exceeded", () => {
  const buildRiskReview = loadRisk();
  const review = buildRiskReview({
    settings,
    proposed: [
      {
        id: "A",
        symbol: "AAPL",
        expiry: "2035-01-19",
        correlationGroup: "Mega-cap tech",
        maxLoss: 1_200,
        suggestedContracts: 1
      },
      {
        id: "B",
        symbol: "MSFT",
        expiry: "2035-01-19",
        correlationGroup: "Mega-cap tech",
        maxLoss: 1_400,
        suggestedContracts: 1
      }
    ]
  });

  assert.ok(review.warnings.some((warning) => warning.scope === "weekly"));
  assert.ok(review.warnings.some((warning) => warning.scope === "correlation"));
  assert.equal(review.weeklyCap, 2_500);
  assert.equal(review.correlationCap, 1_000);
});
