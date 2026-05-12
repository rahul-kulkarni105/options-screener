const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadPresetsModule() {
  const source = fs.readFileSync(path.join(__dirname, "presets.js"), "utf8");
  const script = `${source.replaceAll("export const ", "const ").replaceAll("export function ", "function ")}
globalThis.presetsApi = {
  BASE_PRESET_SETTINGS,
  BUILT_IN_PRESETS,
  CUSTOM_PRESETS_STORAGE_KEY,
  PRESET_FIELDS,
  loadCustomPresets,
  makeCustomPreset,
  normalizeCustomPresets,
  persistCustomPresets,
  presetSettingsFrom,
  uniquePresetName
};`;
  const context = { Date, JSON };
  vm.createContext(context);
  vm.runInContext(script, context);
  return context.presetsApi;
}

function mockStorage() {
  return {
    data: {},
    getItem(key) {
      return this.data[key] || null;
    },
    setItem(key, value) {
      this.data[key] = value;
    }
  };
}

test("built-in presets include required strategy starting points", () => {
  const { BUILT_IN_PRESETS } = loadPresetsModule();

  assert.deepEqual(
    Array.from(BUILT_IN_PRESETS, (preset) => preset.name),
    ["Conservative", "Balanced", "ETF Only", "Small Account", "Premium Seeking"]
  );
});

test("presetSettingsFrom keeps only preset-managed visible rules", () => {
  const { BASE_PRESET_SETTINGS, presetSettingsFrom } = loadPresetsModule();
  const preset = presetSettingsFrom({
    ...BASE_PRESET_SETTINGS,
    expiry: "2035-01-19",
    manualMacroEvents: "2035-01-10 CPI",
    minDelta: 0.2,
    trendGate: false,
    unknown: "ignored"
  });

  assert.equal(preset.minDelta, 0.2);
  assert.equal(preset.trendGate, false);
  assert.equal(preset.expiry, undefined);
  assert.equal(preset.manualMacroEvents, undefined);
  assert.equal(preset.unknown, undefined);
});

test("custom preset helpers normalize, name, and persist presets", () => {
  const {
    CUSTOM_PRESETS_STORAGE_KEY,
    loadCustomPresets,
    makeCustomPreset,
    persistCustomPresets,
    uniquePresetName
  } = loadPresetsModule();
  const storage = mockStorage();
  const existing = [{ id: "old", name: "Balanced Copy", settings: { minDelta: 0.18 } }];
  const name = uniquePresetName("Balanced Copy", existing);
  const preset = makeCustomPreset({
    idFactory: () => "new",
    name,
    settings: { universe: "SPY, QQQ", minDelta: 0.21, trendGate: false }
  });

  const persisted = persistCustomPresets([...existing, preset], storage);
  const loaded = loadCustomPresets(storage);

  assert.equal(name, "Balanced Copy 2");
  assert.equal(preset.id, "new");
  assert.equal(preset.settings.universe, "SPY, QQQ");
  assert.equal(preset.settings.trendGate, false);
  assert.equal(storage.data[CUSTOM_PRESETS_STORAGE_KEY], JSON.stringify(persisted));
  assert.deepEqual(loaded, persisted);
});
