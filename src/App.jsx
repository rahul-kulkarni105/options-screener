import { AlertCircle, BookOpen, LayoutDashboard, Play, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DataPortability } from "./features/exportImport/DataPortability.jsx";
import { TradeJournal } from "./features/journal/TradeJournal.jsx";
import { LearnPage } from "./features/learn/LearnPage.jsx";
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
import { ThemeToggle } from "./features/theme/ThemeToggle.jsx";

const DEFAULT_DATA_SOURCES = {
  cboe: "https://cdn.cboe.com/api/global/delayed_quotes/options/{SYMBOL}.json",
  nasdaqEarnings: "https://api.nasdaq.com/api/calendar/earnings",
  fedFomc: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
  beaSchedule: "https://apps.bea.gov/API/signup/release_dates.json",
  blsSchedule: "https://www.bls.gov/schedule/news_release/",
  yahooHistory: "https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}",
  nasdaqHistoryFallback: "https://api.nasdaq.com/api/quote/{SYMBOL}/historical"
};

const SOURCE_LABELS = {
  beaSchedule: "BEA release schedule",
  blsSchedule: "BLS release schedule",
  cboe: "Cboe delayed option chains",
  fedFomc: "Federal Reserve FOMC calendar",
  nasdaqEarnings: "Nasdaq earnings calendar",
  nasdaqHistoryFallback: "Nasdaq historical fallback",
  yahooHistory: "Yahoo daily history"
};

function firstApiValidationError(error) {
  const fieldErrors = error?.data?.details?.fieldErrors || {};
  return Object.values(fieldErrors).find((messages) => messages.length)?.[0] || "";
}

function currentRoute() {
  return window.location.pathname === "/learn" ? "/learn" : "/";
}

function sourceHref(url) {
  return String(url).replace("/{SYMBOL}", "").replace("{SYMBOL}", "");
}

function SourcesFooter({ result }) {
  const sources = Object.entries(result?.sources || DEFAULT_DATA_SOURCES);

  return (
    <footer className="app-footer">
      <div>
        <strong>Data Sources</strong>
        <span>Public and delayed market data used by the local screener.</span>
      </div>
      <nav aria-label="Data sources" className="footer-sources">
        {sources.map(([name, url]) => (
          <a href={sourceHref(url)} key={name} rel="noreferrer" target="_blank">
            <span>{SOURCE_LABELS[name] || name}</span>
            <small>{url}</small>
          </a>
        ))}
      </nav>
    </footer>
  );
}

export function App() {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.settings);
  const positions = useSelector((state) => state.positions);
  const [route, setRoute] = useState(() => currentRoute());
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

  useEffect(() => {
    function handlePopState() {
      setRoute(currentRoute());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function handleNavigate(nextRoute) {
    if (nextRoute === route) return;
    window.history.pushState({}, "", nextRoute);
    setRoute(nextRoute);
  }

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
        <div className="topbar__main">
          <div className="topbar__brand">
            <span>Put Spread Weekly Screener</span>
            <h1>{route === "/learn" ? "Learn" : "Dashboard"}</h1>
          </div>
          <div className="topbar__actions">
            {route === "/" ? (
              <button
                className="button button--primary topbar__screen"
                disabled={screenState.isLoading || Boolean(validationMessage)}
                type="button"
                onClick={handleScreen}
              >
                {screenState.isLoading ? (
                  <RefreshCw className="spin" size={17} />
                ) : (
                  <Play size={17} />
                )}
                <span>Screen Picks</span>
              </button>
            ) : null}
          </div>
        </div>
        <div className="topbar__utility">
          <ThemeToggle />
        </div>
        <nav className="topbar__nav" aria-label="Primary">
          <button
            aria-current={route === "/" ? "page" : undefined}
            className={route === "/" ? "nav-link is-active" : "nav-link"}
            type="button"
            onClick={() => handleNavigate("/")}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>
          <button
            aria-current={route === "/learn" ? "page" : undefined}
            className={route === "/learn" ? "nav-link is-active" : "nav-link"}
            type="button"
            onClick={() => handleNavigate("/learn")}
          >
            <BookOpen size={16} />
            <span>Learn</span>
          </button>
        </nav>
        <p className="topbar__status">
          {route === "/learn" ? "Beginner guide to the labels, workflow, and risk panels." : status}
        </p>
      </header>

      {route === "/learn" ? <LearnPage /> : null}
      {route === "/learn" ? null : (
        <>
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
      )}
      <SourcesFooter result={lastResult} />
    </>
  );
}
