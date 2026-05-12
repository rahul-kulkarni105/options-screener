const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const reduxToolkit = require("@reduxjs/toolkit");

function loadPositionsSlice() {
  const source = fs.readFileSync(path.join(__dirname, "positionsSlice.js"), "utf8");
  const script = `${source
    .replace(
      'import { createSlice } from "@reduxjs/toolkit";',
      "const { createSlice } = reduxToolkit;"
    )
    .replace(
      "export const {\n  clearPositions,\n  closePosition,\n  removePosition,\n  replacePositions,\n  trackPosition,\n  updatePosition\n} =",
      "const {\n  clearPositions,\n  closePosition,\n  removePosition,\n  replacePositions,\n  trackPosition,\n  updatePosition\n} ="
    )
    .replace("export default positionsSlice.reducer;", "")}
globalThis.actions = { clearPositions, closePosition, removePosition, replacePositions, trackPosition, updatePosition };
globalThis.reducer = positionsSlice.reducer;`;
  const localStorage = {
    getItem: () => "[]",
    setItem: () => {}
  };
  const context = { Date, localStorage, reduxToolkit };
  vm.createContext(context);
  vm.runInContext(script, context);
  return { actions: context.actions, reducer: context.reducer };
}

const spread = {
  id: "AAPL-2035-01-19-95-90",
  symbol: "AAPL",
  expiry: "2035-01-19",
  shortStrike: 95,
  longStrike: 90,
  credit: 1.5,
  maxLoss: 350,
  price: 100,
  shortDelta: 0.22,
  suggestedContracts: 2,
  warnings: ["Wide quote spreads"]
};

test("positions reducer tracks and manually updates positions with history", () => {
  const { actions, reducer } = loadPositionsSlice();
  const tracked = reducer([], actions.trackPosition(spread));
  const updated = reducer(
    tracked,
    actions.updatePosition({
      index: 0,
      updates: {
        currentShortDelta: 0.36,
        currentValue: 0.7,
        entryNotes: "tightened stop",
        notes: "tightened stop",
        status: "open",
        underlying: 96
      }
    })
  );

  assert.equal(updated[0].status, "open");
  assert.equal(updated[0].currentValue, 0.7);
  assert.equal(updated[0].currentShortDelta, 0.36);
  assert.equal(updated[0].notes, "tightened stop");
  assert.equal(updated[0].entryNotes, "tightened stop");
  assert.deepEqual(updated[0].warningsAtEntry, ["Wide quote spreads"]);
  assert.equal(updated[0].updateHistory.length, 1);
  assert.equal(updated[0].updateHistory[0].type, "manual_update");
});

test("positions reducer replaces imported positions", () => {
  const { actions, reducer } = loadPositionsSlice();
  const imported = [{ id: "imported", status: "open", symbol: "SPY" }];
  const replaced = reducer([spread], actions.replacePositions(imported));

  assert.deepEqual(replaced, imported);
});

test("positions reducer closes positions with realized P/L history", () => {
  const { actions, reducer } = loadPositionsSlice();
  const tracked = reducer([], actions.trackPosition(spread));
  const closed = reducer(
    tracked,
    actions.closePosition({
      exitNotes: "target hit",
      exitSide: "debit",
      exitValue: 0.4,
      index: 0
    })
  );

  assert.equal(closed[0].status, "closed");
  assert.equal(closed[0].exitSide, "debit");
  assert.equal(closed[0].exitValue, 0.4);
  assert.equal(closed[0].exitNotes, "target hit");
  assert.equal(closed[0].realizedPnL, 220);
  assert.equal(closed[0].updateHistory[0].type, "closed");
});
