import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "putSpreadWeeklyScreener.positions";

function loadPositions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function persist(positions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

const positionsSlice = createSlice({
  name: "positions",
  initialState: loadPositions(),
  reducers: {
    trackPosition(state, action) {
      state.unshift({
        ...action.payload,
        contracts: action.payload.suggestedContracts || 1,
        currentValue: action.payload.credit,
        underlying: action.payload.price,
        currentShortDelta: action.payload.shortDelta,
        entryNotes: "",
        notes: "",
        status: "open",
        trackedAt: new Date().toISOString(),
        warningsAtEntry: action.payload.warnings || []
      });
      persist(state);
    },
    updatePosition(state, action) {
      const { index, updates } = action.payload;
      const position = state[index];
      if (!position) return;
      const updatedAt = new Date().toISOString();
      Object.assign(position, updates, { updatedAt });
      position.updateHistory = [
        ...(position.updateHistory || []),
        {
          at: updatedAt,
          type: "manual_update",
          updates
        }
      ];
      persist(state);
    },
    closePosition(state, action) {
      const { exitNotes = "", exitSide = "debit", exitValue, index } = action.payload;
      const position = state[index];
      if (!position) return;
      const closedAt = new Date().toISOString();
      const contracts = Number(position.contracts || 1);
      const entryCredit = Number(position.credit || 0);
      const exitPrice = Number(exitValue || 0);
      const exitMultiplier = exitSide === "credit" ? 1 : -1;
      const realizedPnL =
        Math.round((entryCredit + exitPrice * exitMultiplier) * 100 * contracts * 100) / 100;
      Object.assign(position, {
        closedAt,
        currentValue: exitPrice,
        exitSide,
        exitNotes,
        exitValue: exitPrice,
        entryNotes: position.entryNotes ?? position.notes ?? "",
        realizedPnL,
        status: "closed",
        updatedAt: closedAt
      });
      position.updateHistory = [
        ...(position.updateHistory || []),
        {
          at: closedAt,
          exitNotes,
          exitSide,
          exitValue: exitPrice,
          realizedPnL,
          type: "closed"
        }
      ];
      persist(state);
    },
    removePosition(state, action) {
      state.splice(action.payload, 1);
      persist(state);
    },
    replacePositions(_state, action) {
      const positions = Array.isArray(action.payload) ? action.payload : [];
      persist(positions);
      return positions;
    },
    clearPositions() {
      persist([]);
      return [];
    }
  }
});

export const {
  clearPositions,
  closePosition,
  removePosition,
  replacePositions,
  trackPosition,
  updatePosition
} = positionsSlice.actions;
export default positionsSlice.reducer;
