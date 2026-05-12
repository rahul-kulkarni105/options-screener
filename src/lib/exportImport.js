import { buildJournal } from "./journal.js";
import { normalizeCustomPresets } from "../features/screener/presets.js";

export const EXPORT_SCHEMA_VERSION = 1;

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function normalizeSettings(value) {
  return plainObject(value) ? { ...value } : {};
}

function normalizePositions(value) {
  return Array.isArray(value) ? value.filter(plainObject).map((position) => ({ ...position })) : [];
}

export function buildExportPayload({ customPresets = [], positions = [], settings = {} }) {
  const normalizedPositions = normalizePositions(positions);
  return {
    app: "put-spread-weekly-screener",
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: normalizeSettings(settings),
    customPresets: normalizeCustomPresets(customPresets),
    positions: normalizedPositions,
    journalEntries: buildJournal(normalizedPositions).trades
  };
}

export function normalizeImportPayload(payload) {
  if (!plainObject(payload)) throw new Error("Import file must contain a JSON object.");
  if (payload.app && payload.app !== "put-spread-weekly-screener") {
    throw new Error("Import file is for a different app.");
  }
  if (payload.schemaVersion && Number(payload.schemaVersion) > EXPORT_SCHEMA_VERSION) {
    throw new Error("Import file was created by a newer export format.");
  }

  return {
    customPresets: normalizeCustomPresets(payload.customPresets || []),
    positions: normalizePositions(payload.positions || []),
    settings: normalizeSettings(payload.settings || {})
  };
}

export function parseImportText(text) {
  try {
    return normalizeImportPayload(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError || error.name === "SyntaxError") {
      throw new Error("Import file must be valid JSON.");
    }
    throw error;
  }
}

export function exportFilename(date = new Date()) {
  return `put-spread-screener-${date.toISOString().slice(0, 10)}.json`;
}
