import { configureStore } from "@reduxjs/toolkit";
import { screenerApi } from "../features/screener/screenerApi.js";
import settingsReducer from "../features/screener/settingsSlice.js";
import positionsReducer from "../features/positions/positionsSlice.js";

export const store = configureStore({
  reducer: {
    settings: settingsReducer,
    positions: positionsReducer,
    [screenerApi.reducerPath]: screenerApi.reducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(screenerApi.middleware)
});
