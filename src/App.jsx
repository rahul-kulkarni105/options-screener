import { AlertCircle, Play, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DataPortability } from "./features/exportImport/DataPortability.jsx";
import { TradeJournal } from "./features/journal/TradeJournal.jsx";
import { PositionMonitor } from "./features/positions/PositionMonitor.jsx";
import {
  AutoEventsPanel,
  DataNotice,
  OrderTicketsPanel,
  RankedSpreadsPanel,
  ReviewTradesPanel,
  ResultSummary,
  SourceFreshness,
  SkippedSymbolsPanel,
  SourceWarnings
} from "./features/screener/ResultPanels.jsx";
import { SettingsPanels } from "./features/screener/SettingsPanels.jsx";
import { useGetDefaultsQuery, useScreenMutation } from "./features/screener/screenerApi.js";
import { hydrateDefaults } from "./features/screener/settingsSlice.js";
import { firstSettingsError, validateSettings } from "./features/screener/settingsValidation.js";

function firstApiValidationError(error) {
  const fieldErrors = error?.data?.details?.fieldErrors || {};
  return Object.values(fieldErrors).find((messages) => messages.length)?.[0] || "";
}

export function App() {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.settings);
  const positions = useSelector((state) => state.positions);
  const [status, setStatus] = useState("Configure rules, then run screening.");
  const [lastResult, setLastResult] = useState(null);
  const [selectedSpreadIds, setSelectedSpreadIds] = useState(() => new Set());
  const defaultsQuery = useGetDefaultsQuery();
  const [screen, screenState] = useScreenMutation();
  const validationErrors = validateSettings(settings);
  const validationMessage = firstSettingsError(validationErrors);

  useEffect(() => {
    if (defaultsQuery.data) {
      dispatch(hydrateDefaults(defaultsQuery.data));
    }
  }, [defaultsQuery.data, dispatch]);

  async function handleScreen() {
    if (validationMessage) {
      setStatus(`Fix settings: ${validationMessage}`);
      return;
    }
    setStatus("Fetching chains, events, historical closes, and VIX.");
    try {
      const result = await screen(settings).unwrap();
      setLastResult(result);
      setSelectedSpreadIds(new Set());
      setStatus(
        `Screened ${result.symbols.length} symbols for ${result.expiry}; ${result.rankedSpreads.length} ranked spreads.`
      );
    } catch (error) {
      setStatus(
        firstApiValidationError(error) || error?.data?.error || error?.error || "Screening failed."
      );
    }
  }

  function handleSelectSpread(id) {
    setSelectedSpreadIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar__copy">
          <h1>Put Spread Weekly Screener</h1>
          <p>{status}</p>
        </div>
        <button
          className="button button--primary"
          disabled={screenState.isLoading || Boolean(validationMessage)}
          type="button"
          onClick={handleScreen}
        >
          {screenState.isLoading ? <RefreshCw className="spin" size={17} /> : <Play size={17} />}
          Screen Picks
        </button>
      </header>

      <DataNotice />
      {(validationMessage || screenState.error) && (
        <div className="app-alert">
          <AlertCircle size={16} />
          <span>
            {validationMessage ||
              firstApiValidationError(screenState.error) ||
              screenState.error?.data?.error ||
              "Screening failed."}
          </span>
        </div>
      )}
      <SourceWarnings result={lastResult} />
      <ResultSummary result={lastResult} />

      <main className="dashboard">
        <SettingsPanels
          validationErrors={validationErrors}
          onSaved={(message) => setStatus(message || "Settings saved locally.")}
        />
        <DataPortability onStatus={setStatus} />
        <AutoEventsPanel isLoading={screenState.isLoading} result={lastResult} />
        <SourceFreshness isLoading={screenState.isLoading} result={lastResult} />
        <RankedSpreadsPanel
          isLoading={screenState.isLoading}
          result={lastResult}
          selectedSpreadIds={selectedSpreadIds}
          onSelectSpread={handleSelectSpread}
          onStatus={setStatus}
        />
        <ReviewTradesPanel
          positions={positions}
          result={lastResult}
          selectedSpreadIds={selectedSpreadIds}
          settings={settings}
        />
        <OrderTicketsPanel
          isLoading={screenState.isLoading}
          onStatus={setStatus}
          result={lastResult}
        />
        <SkippedSymbolsPanel isLoading={screenState.isLoading} result={lastResult} />
        <PositionMonitor />
        <TradeJournal positions={positions} />
      </main>
    </>
  );
}
