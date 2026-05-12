import { createSlice } from "@reduxjs/toolkit";
import { BASE_PRESET_SETTINGS, PRESET_FIELDS } from "./presets.js";

const STORAGE_KEY = "putSpreadWeeklyScreener.settings";

const initialState = BASE_PRESET_SETTINGS;

function loadSettings() {
  try {
    return { ...initialState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return initialState;
  }
}

const settingsSlice = createSlice({
  name: "settings",
  initialState: loadSettings(),
  reducers: {
    applyPreset(state, action) {
      for (const field of PRESET_FIELDS) {
        if (field in action.payload) state[field] = action.payload[field];
      }
    },
    hydrateDefaults(state, action) {
      return { ...action.payload, ...state, expiry: state.expiry || action.payload.expiry };
    },
    replaceSettings(_state, action) {
      const nextState = { ...BASE_PRESET_SETTINGS, ...action.payload };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      return nextState;
    },
    resetSettings(state) {
      const nextState = { ...BASE_PRESET_SETTINGS, expiry: state.expiry };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      return nextState;
    },
    updateSetting(state, action) {
      const { name, value } = action.payload;
      state[name] = value;
    },
    saveSettings(state) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }
});

export const {
  applyPreset,
  hydrateDefaults,
  replaceSettings,
  resetSettings,
  saveSettings,
  updateSetting
} = settingsSlice.actions;
export default settingsSlice.reducer;
