const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadPositionAlerts() {
  const source = fs.readFileSync(path.join(__dirname, "positionAlerts.js"), "utf8");
  const script = `${source.replace("export function positionAlerts", "function positionAlerts")}
globalThis.positionAlerts = positionAlerts;`;
  const context = { Date };
  vm.createContext(context);
  vm.runInContext(script, context);
  return context.positionAlerts;
}

function isoDaysFromNow(days) {
  const date = new Date(Date.now() + days * 86400000);
  return date.toISOString().slice(0, 10);
}

test("positionAlerts reports profit, risk, delta, underlying, and expiry alerts", () => {
  const positionAlerts = loadPositionAlerts();
  const alerts = positionAlerts({
    credit: 1,
    currentValue: 0.45,
    shortDelta: 0.36,
    underlying: 94,
    shortStrike: 95,
    expiry: isoDaysFromNow(1)
  });

  assert.deepEqual(Array.from(alerts), [
    "50%-70% profit target",
    "Short delta 0.35+",
    "Underlying at/below short strike",
    "Expiry risk window"
  ]);
});

test("positionAlerts stays quiet for positions away from alert thresholds", () => {
  const positionAlerts = loadPositionAlerts();
  const alerts = positionAlerts({
    credit: 1,
    currentValue: 0.8,
    shortDelta: 0.2,
    underlying: 100,
    shortStrike: 95,
    expiry: isoDaysFromNow(10)
  });

  assert.deepEqual(Array.from(alerts), []);
});

test("positionAlerts uses manual short delta and ignores inactive statuses", () => {
  const positionAlerts = loadPositionAlerts();

  assert.deepEqual(
    Array.from(
      positionAlerts({
        credit: 1,
        currentShortDelta: 0.36,
        currentValue: 0.9,
        expiry: isoDaysFromNow(10),
        shortDelta: 0.2,
        shortStrike: 95,
        underlying: 100
      })
    ),
    ["Short delta 0.35+"]
  );
  assert.deepEqual(
    Array.from(
      positionAlerts({
        credit: 1,
        currentShortDelta: 0.5,
        currentValue: 2,
        expiry: isoDaysFromNow(1),
        shortStrike: 95,
        status: "closed",
        underlying: 90
      })
    ),
    []
  );
});
