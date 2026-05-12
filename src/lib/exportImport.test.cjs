const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadExportImport() {
  const source = fs.readFileSync(path.join(__dirname, "exportImport.js"), "utf8");
  const script = `${source
    .replace('import { buildJournal } from "./journal.js";', "")
    .replace('import { normalizeCustomPresets } from "../features/screener/presets.js";', "")
    .replaceAll("export const ", "const ")
    .replaceAll("export function ", "function ")}
function buildJournal(positions) {
  return { trades: positions.filter((position) => position.status === "closed" || position.status === "skipped") };
}
function normalizeCustomPresets(value) {
  return Array.isArray(value) ? value.filter((preset) => preset && preset.id && preset.name) : [];
}
globalThis.exportImportApi = {
  buildExportPayload,
  exportFilename,
  normalizeImportPayload,
  parseImportText
};`;
  const context = { Date, JSON };
  vm.createContext(context);
  vm.runInContext(script, context);
  return context.exportImportApi;
}

test("buildExportPayload packages local data and journal snapshot", () => {
  const { buildExportPayload } = loadExportImport();
  const payload = buildExportPayload({
    customPresets: [{ id: "preset-1", name: "My Rules", settings: {} }],
    positions: [
      { id: "open", status: "open", symbol: "AAPL" },
      { id: "closed", status: "closed", symbol: "MSFT" }
    ],
    settings: { universe: "AAPL, MSFT" }
  });

  assert.equal(payload.app, "put-spread-weekly-screener");
  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.settings.universe, "AAPL, MSFT");
  assert.equal(payload.customPresets.length, 1);
  assert.equal(payload.positions.length, 2);
  assert.deepEqual(
    payload.journalEntries.map((entry) => entry.id),
    ["closed"]
  );
});

test("parseImportText validates app and JSON shape", () => {
  const { parseImportText } = loadExportImport();
  const imported = parseImportText(
    JSON.stringify({
      app: "put-spread-weekly-screener",
      customPresets: [{ id: "preset-1", name: "My Rules" }],
      positions: [{ id: "p1", status: "open" }],
      settings: { accountSize: 25000 }
    })
  );

  assert.equal(imported.settings.accountSize, 25000);
  assert.equal(imported.positions.length, 1);
  assert.equal(imported.customPresets.length, 1);
  assert.throws(() => parseImportText("{bad json"), /valid JSON/);
  assert.throws(() => parseImportText(JSON.stringify({ app: "other-app" })), /different app/);
});

test("exportFilename uses the export date", () => {
  const { exportFilename } = loadExportImport();

  assert.equal(
    exportFilename(new Date("2035-01-19T12:00:00Z")),
    "put-spread-screener-2035-01-19.json"
  );
});
