const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadSettingsValidation() {
  const source = fs.readFileSync(path.join(__dirname, "settingsValidation.js"), "utf8");
  const script = `${source
    .replace("export function validateSettings", "function validateSettings")
    .replace("export function firstSettingsError", "function firstSettingsError")}
globalThis.validateSettings = validateSettings;
globalThis.firstSettingsError = firstSettingsError;`;
  const context = { Date };
  vm.createContext(context);
  vm.runInContext(script, context);
  return {
    firstSettingsError: context.firstSettingsError,
    validateSettings: context.validateSettings
  };
}

function futureIso(days = 14) {
  const date = new Date(Date.now() + days * 86400000);
  return date.toISOString().slice(0, 10);
}

const validSettings = {
  expiry: futureIso(),
  minDelta: 0.16,
  maxDelta: 0.3,
  minCreditPct: 0.25,
  maxSpreadWidth: 10,
  minOpenInterest: 250,
  minVolume: 20,
  accountSize: 50000,
  riskPerIdeaPct: 1,
  maxWeeklyRiskPct: 5,
  correlationGroupCapPct: 2
};

test("validateSettings accepts coherent settings", () => {
  const { validateSettings } = loadSettingsValidation();

  assert.equal(Object.keys(validateSettings(validSettings)).length, 0);
});

test("validateSettings reports actionable client-side errors", () => {
  const { firstSettingsError, validateSettings } = loadSettingsValidation();
  const errors = validateSettings({
    ...validSettings,
    expiry: "2000-01-01",
    minDelta: 0.35,
    maxDelta: 0.2,
    macroEventMode: "panic",
    minVolume: 0,
    accountSize: 0,
    riskPerIdeaPct: 11
  });

  assert.match(errors.expiry[0], /past/);
  assert.match(errors.minDelta.join(" "), /less than or equal/);
  assert.match(errors.macroEventMode[0], /warn, block, or ignore/);
  assert.match(errors.minVolume[0], /positive whole number/);
  assert.match(errors.accountSize[0], /greater than 0/);
  assert.match(errors.riskPerIdeaPct.join(" "), /10% or less/);
  assert.ok(firstSettingsError(errors));
});
