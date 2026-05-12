const assert = require("node:assert/strict");
const test = require("node:test");
const { DEFAULT_SETTINGS } = require("./screener");
const { settingsSchema } = require("./settingsValidation");

function futureIso(days = 14) {
  const date = new Date(Date.now() + days * 86400000);
  return date.toISOString().slice(0, 10);
}

function fieldErrorsFor(settings) {
  const result = settingsSchema.safeParse(settings);
  assert.equal(result.success, false, "expected settings to fail validation");
  return result.error.flatten().fieldErrors;
}

test("settingsSchema accepts coherent default-style settings", () => {
  const result = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, expiry: futureIso() });

  assert.equal(result.success, true);
});

test("settingsSchema rejects inverted delta bounds", () => {
  const errors = fieldErrorsFor({ minDelta: 0.35, maxDelta: 0.2 });

  assert.match(errors.minDelta.join(" "), /less than or equal/);
});

test("settingsSchema rejects unknown macro event modes", () => {
  const errors = fieldErrorsFor({ macroEventMode: "panic" });

  assert.ok(errors.macroEventMode.length);
});

test("settingsSchema rejects stale or malformed expiries", () => {
  const pastErrors = fieldErrorsFor({ expiry: "2000-01-01" });
  const malformedErrors = fieldErrorsFor({ expiry: "01/01/2035" });

  assert.match(pastErrors.expiry.join(" "), /past/);
  assert.match(malformedErrors.expiry.join(" "), /YYYY-MM-DD/);
});

test("settingsSchema rejects non-positive account, risk, width, and liquidity settings", () => {
  const errors = fieldErrorsFor({
    accountSize: 0,
    riskPerIdeaPct: 0,
    maxWeeklyRiskPct: 0,
    correlationGroupCapPct: 0,
    maxSpreadWidth: 0,
    minOpenInterest: 0,
    minVolume: 0
  });

  assert.ok(errors.accountSize.length);
  assert.ok(errors.riskPerIdeaPct.length);
  assert.ok(errors.maxWeeklyRiskPct.length);
  assert.ok(errors.correlationGroupCapPct.length);
  assert.ok(errors.maxSpreadWidth.length);
  assert.ok(errors.minOpenInterest.length);
  assert.ok(errors.minVolume.length);
});

test("settingsSchema rejects impractical or incoherent risk percentages", () => {
  const capErrors = fieldErrorsFor({
    riskPerIdeaPct: 11,
    maxWeeklyRiskPct: 51,
    correlationGroupCapPct: 26
  });
  const relationErrors = fieldErrorsFor({
    riskPerIdeaPct: 3,
    maxWeeklyRiskPct: 2,
    correlationGroupCapPct: 2
  });

  assert.ok(capErrors.riskPerIdeaPct.length);
  assert.ok(capErrors.maxWeeklyRiskPct.length);
  assert.ok(capErrors.correlationGroupCapPct.length);
  assert.match(relationErrors.riskPerIdeaPct.join(" "), /max weekly risk|correlation cap/);
});
