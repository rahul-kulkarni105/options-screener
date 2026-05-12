export const BASE_PRESET_SETTINGS = {
  universe: "AAPL, MSFT, NVDA, AMD, AMZN, META, GOOGL, TSLA, QQQ, SPY, IWM",
  expiry: "",
  manualBlocklist: "",
  autoEvents: true,
  macroEventMode: "warn",
  manualMacroEvents: "",
  minDelta: 0.16,
  maxDelta: 0.3,
  minCreditPct: 0.25,
  maxSpreadWidth: 10,
  minOpenInterest: 250,
  minVolume: 20,
  trendGate: true,
  vixGate: true,
  accountSize: 50000,
  riskPerIdeaPct: 1,
  maxWeeklyRiskPct: 5,
  correlationGroupCapPct: 2
};

export const PRESET_FIELDS = [
  "universe",
  "manualBlocklist",
  "autoEvents",
  "macroEventMode",
  "minDelta",
  "maxDelta",
  "minCreditPct",
  "maxSpreadWidth",
  "minOpenInterest",
  "minVolume",
  "trendGate",
  "vixGate",
  "accountSize",
  "riskPerIdeaPct",
  "maxWeeklyRiskPct",
  "correlationGroupCapPct"
];

export const CUSTOM_PRESETS_STORAGE_KEY = "putSpreadWeeklyScreener.customPresets";

export const BUILT_IN_PRESETS = [
  {
    id: "conservative",
    name: "Conservative",
    settings: {
      ...BASE_PRESET_SETTINGS
    }
  },
  {
    id: "balanced",
    name: "Balanced",
    settings: {
      ...BASE_PRESET_SETTINGS,
      minDelta: 0.18,
      maxDelta: 0.32,
      minCreditPct: 0.22,
      minOpenInterest: 200,
      minVolume: 15,
      riskPerIdeaPct: 1.25,
      maxWeeklyRiskPct: 6,
      correlationGroupCapPct: 2.5
    }
  },
  {
    id: "etf-only",
    name: "ETF Only",
    settings: {
      ...BASE_PRESET_SETTINGS,
      universe: "SPY, QQQ, IWM, DIA, XLK, XLF, XLE, XLV, XLY, XLP, TLT, GLD",
      minDelta: 0.16,
      maxDelta: 0.28,
      minCreditPct: 0.2,
      minOpenInterest: 500,
      minVolume: 50,
      correlationGroupCapPct: 3
    }
  },
  {
    id: "small-account",
    name: "Small Account",
    settings: {
      ...BASE_PRESET_SETTINGS,
      universe: "AAPL, MSFT, NVDA, AMD, AMZN, GOOGL, QQQ, SPY, IWM",
      accountSize: 10000,
      maxSpreadWidth: 5,
      minOpenInterest: 100,
      minVolume: 10,
      riskPerIdeaPct: 0.75,
      maxWeeklyRiskPct: 3,
      correlationGroupCapPct: 1.5
    }
  },
  {
    id: "premium-seeking",
    name: "Premium Seeking",
    settings: {
      ...BASE_PRESET_SETTINGS,
      minDelta: 0.22,
      maxDelta: 0.35,
      minCreditPct: 0.3,
      minOpenInterest: 300,
      minVolume: 30,
      riskPerIdeaPct: 1,
      maxWeeklyRiskPct: 5,
      correlationGroupCapPct: 2
    }
  }
];

export function presetSettingsFrom(settings) {
  return PRESET_FIELDS.reduce((preset, field) => {
    preset[field] = settings[field] ?? BASE_PRESET_SETTINGS[field];
    return preset;
  }, {});
}

export function uniquePresetName(baseName, presets) {
  const normalized = new Set(presets.map((preset) => preset.name.trim().toLowerCase()));
  let name = baseName.trim() || "Custom Preset";
  let suffix = 2;
  while (normalized.has(name.toLowerCase())) {
    name = `${baseName} ${suffix}`.trim();
    suffix += 1;
  }
  return name;
}

export function makeCustomPreset({
  idFactory = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
  name,
  settings
}) {
  return {
    id: idFactory(),
    name: name.trim() || "Custom Preset",
    settings: presetSettingsFrom(settings)
  };
}

export function normalizeCustomPresets(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((preset) => preset && typeof preset.id === "string" && typeof preset.name === "string")
    .map((preset) => ({
      id: preset.id,
      name: preset.name.trim() || "Custom Preset",
      settings: presetSettingsFrom(preset.settings || {})
    }));
}

export function loadCustomPresets(storage = globalThis.localStorage) {
  try {
    return normalizeCustomPresets(JSON.parse(storage.getItem(CUSTOM_PRESETS_STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
}

export function persistCustomPresets(presets, storage = globalThis.localStorage) {
  const normalized = normalizeCustomPresets(presets);
  storage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
