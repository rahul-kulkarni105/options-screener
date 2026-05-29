const CACHE_MS = 1000 * 60 * 10;
const cache = new Map();

const DEFAULT_SETTINGS = {
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

const CORRELATION_GROUPS = {
  AAPL: "Mega-cap tech",
  MSFT: "Mega-cap tech",
  GOOGL: "Mega-cap tech",
  GOOG: "Mega-cap tech",
  META: "Mega-cap tech",
  AMZN: "Consumer/platform",
  TSLA: "High-beta growth",
  NVDA: "Semiconductors",
  AMD: "Semiconductors",
  AVGO: "Semiconductors",
  SMH: "Semiconductors",
  QQQ: "Nasdaq beta",
  TQQQ: "Nasdaq beta",
  SPY: "Broad market",
  SPX: "Broad market",
  IWM: "Small caps",
  XLF: "Financials",
  JPM: "Financials",
  BAC: "Financials",
  XLE: "Energy",
  XOM: "Energy",
  CVX: "Energy"
};

const HIGH_BETA = new Set([
  "TSLA",
  "NVDA",
  "AMD",
  "COIN",
  "MARA",
  "PLTR",
  "SNOW",
  "ROKU",
  "SHOP",
  "TQQQ",
  "ARKK",
  "IWM"
]);

const DIAGNOSTIC_LABELS = {
  manual_blocklist: "Manual blocklist",
  earnings_blocked: "Earnings before expiry",
  macro_blocked: "High-impact macro event before expiry",
  vix_blocked: "VIX avoid regime",
  no_chain: "No option chain data",
  no_expiry: "No matching expiry",
  missing_history: "Historical data unavailable",
  trend_failed: "Trend gate failed",
  no_puts_below_price: "No puts below price",
  quote_missing: "Missing bid/ask quotes",
  no_delta_match: "No short delta match",
  low_liquidity: "Low liquidity",
  width_too_wide: "Width too wide",
  no_positive_credit: "No positive credit",
  credit_too_low: "Credit too low"
};

const requestHeaders = {
  accept: "application/json,text/html;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
};

const SOURCE_LABELS = [
  ["cdn.cboe.com", "Cboe option chain"],
  ["query1.finance.yahoo.com", "Yahoo history"],
  ["query2.finance.yahoo.com", "Yahoo history"],
  ["api.nasdaq.com/api/calendar/earnings", "Nasdaq earnings calendar"],
  ["api.nasdaq.com/api/quote", "Nasdaq history"],
  ["federalreserve.gov", "Federal Reserve calendar"],
  ["apps.bea.gov/API/signup/release_dates.json", "BEA release schedule"],
  ["bea.gov", "BEA release schedule"],
  ["bls.gov", "BLS release schedule"]
];

function sourceLabel(url) {
  return SOURCE_LABELS.find(([pattern]) => url.includes(pattern))?.[1] || "Public data source";
}

class UpstreamFetchError extends Error {
  constructor(url, response) {
    const label = sourceLabel(url);
    super(`${label} returned ${response.status} ${response.statusText}`.trim());
    this.name = "UpstreamFetchError";
    this.source = label;
    this.status = response.status;
    this.statusText = response.statusText;
    this.url = url;
  }
}

function sourceWarning(error, fallbackSource) {
  const source = error.source || fallbackSource || "Public data source";
  if (error.status) {
    return `${source} unavailable (${error.status} ${error.statusText || "HTTP error"}).`;
  }
  return `${source} unavailable (${error.message}).`;
}

async function fetchText(url, options = {}) {
  const key = `${url}:${JSON.stringify(options.headers || {})}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < CACHE_MS) return hit.value;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { ...requestHeaders, ...options.headers }
    });
    if (!response.ok) throw new UpstreamFetchError(url, response);
    const text = await response.text();
    cache.set(key, { time: Date.now(), value: text });
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, options = {}) {
  const text = await fetchText(url, options);
  return JSON.parse(text);
}

function parseSymbols(value) {
  return String(value || "")
    .split(/[\s,;]+/)
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .filter((symbol, index, all) => all.indexOf(symbol) === index)
    .slice(0, 30);
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function nextFriday() {
  const date = new Date();
  const day = date.getDay();
  const add = (5 - day + 7) % 7 || 7;
  date.setDate(date.getDate() + add);
  return toIsoDate(date);
}

function daysBetween(startIso, endIso) {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  return Math.max(1, Math.round((end - start) / 86400000));
}

function dateRange(startIso, endIso) {
  const dates = [];
  const cur = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  while (cur <= end) {
    dates.push(toIsoDate(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function monthNumber(name) {
  return {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12
  }[String(name || "").toLowerCase()];
}

function cleanHtmlText(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function cleanNumber(value) {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value).replace(/[$,%\s,]/g, "");
  if (!text || text === "--" || text.toLowerCase() === "n/a") return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function normalizeOption(raw) {
  const option = raw.option || raw.symbol || raw.option_symbol || raw.root || "";
  let expiry = raw.expiration_date || raw.expiration || raw.expiry || "";
  let strike = cleanNumber(raw.strike || raw.strike_price);
  let type = String(raw.option_type || raw.type || raw.put_call || "").toUpperCase();
  const occ = String(option).match(/([A-Z.]+)(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/i);
  if (occ) {
    const year = Number(`20${occ[2]}`);
    expiry = `${year}-${occ[3]}-${occ[4]}`;
    type = occ[5].toUpperCase() === "P" ? "PUT" : "CALL";
    strike = Number(occ[6]) / 1000;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(expiry) === false && /^\d{2}\/\d{2}\/\d{4}$/.test(expiry)) {
    const [m, d, y] = expiry.split("/");
    expiry = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return {
    option,
    expiry,
    strike,
    type: type.startsWith("P") ? "PUT" : type.startsWith("C") ? "CALL" : type,
    bid: cleanNumber(raw.bid),
    ask: cleanNumber(raw.ask),
    mid: cleanNumber(raw.mid) || mid(cleanNumber(raw.bid), cleanNumber(raw.ask)),
    last: cleanNumber(raw.last_trade_price || raw.last || raw.close),
    delta: cleanNumber(raw.delta),
    iv: cleanNumber(raw.iv || raw.implied_volatility),
    volume: cleanNumber(raw.volume) || 0,
    openInterest: cleanNumber(raw.open_interest || raw.openInterest) || 0
  };
}

function mid(bid, ask) {
  if (bid == null || ask == null) return null;
  return (bid + ask) / 2;
}

function quoteWidth(bid, ask) {
  if (bid == null || ask == null) return 999;
  const m = Math.max(0.01, (bid + ask) / 2);
  return (ask - bid) / m;
}

function cboeSymbol(symbol) {
  return symbol.replace(".", "_").replace("^", "").toUpperCase();
}

async function fetchCboeChain(symbol) {
  const normalizedSymbol = cboeSymbol(symbol);
  const url = `https://cdn.cboe.com/api/global/delayed_quotes/options/${encodeURIComponent(normalizedSymbol)}.json`;
  const json = await fetchJson(url, {
    headers: {
      referer: `https://www.cboe.com/delayed_quotes/${encodeURIComponent(normalizedSymbol)}/quote_table`
    }
  });
  const data = json.data || json;
  const options = Array.isArray(data.options) ? data.options.map(normalizeOption) : [];
  return {
    symbol,
    price: cleanNumber(data.current_price || data.currentPrice || data.price || data.last_price),
    iv30: cleanNumber(data.iv30 || data.iv_30 || data.implied_volatility_30_day),
    options,
    source: url
  };
}

async function fetchYahooHistory(symbol, range = "9mo") {
  const yahooSymbol = symbol === "VIX" ? "^VIX" : symbol;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=1d&events=history`;
  const json = await fetchJson(url, {
    headers: {
      referer: `https://finance.yahoo.com/quote/${encodeURIComponent(yahooSymbol)}/history`
    }
  });
  const result = json.chart && json.chart.result && json.chart.result[0];
  if (!result) throw new Error("Yahoo returned no chart data");
  const quote = result.indicators.quote[0];
  return result.timestamp
    .map((time, index) => ({
      date: toIsoDate(new Date(time * 1000)),
      close: quote.close[index],
      high: quote.high[index],
      low: quote.low[index],
      volume: quote.volume[index]
    }))
    .filter((row) => Number.isFinite(row.close));
}

async function fetchNasdaqHistory(symbol) {
  const end = toIsoDate(new Date());
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 9);
  const start = toIsoDate(startDate);
  const url = `https://api.nasdaq.com/api/quote/${encodeURIComponent(symbol)}/historical?assetclass=stocks&fromdate=${start}&todate=${end}&limit=9999`;
  const json = await fetchJson(url, {
    headers: { origin: "https://www.nasdaq.com", referer: "https://www.nasdaq.com/" }
  });
  const rows = (((json || {}).data || {}).tradesTable || {}).rows || [];
  return rows
    .map((row) => ({
      date: row.date,
      close: cleanNumber(row.close),
      high: cleanNumber(row.high),
      low: cleanNumber(row.low),
      volume: cleanNumber(row.volume)
    }))
    .filter((row) => Number.isFinite(row.close))
    .reverse();
}

async function fetchHistory(symbol) {
  try {
    return { source: "Yahoo", rows: await fetchYahooHistory(symbol) };
  } catch (yahooError) {
    try {
      return { source: "Nasdaq", rows: await fetchNasdaqHistory(symbol) };
    } catch (nasdaqError) {
      throw new Error(
        `Historical data unavailable: Yahoo ${yahooError.message}; Nasdaq ${nasdaqError.message}`
      );
    }
  }
}

function sma(values, length) {
  if (values.length < length) return null;
  const slice = values.slice(-length);
  return slice.reduce((sum, value) => sum + value, 0) / length;
}

function rsi(values, length = 14) {
  if (values.length <= length) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - length; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function emaSeries(values, length) {
  const k = 2 / (length + 1);
  const out = [];
  let prev = values[0];
  for (const value of values) {
    prev = value * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function macdHistogram(values) {
  if (values.length < 35) return null;
  const fast = emaSeries(values, 12);
  const slow = emaSeries(values, 26);
  const macd = fast.map((value, index) => value - slow[index]);
  const signal = emaSeries(macd, 9);
  return macd.at(-1) - signal.at(-1);
}

function trendMetrics(history) {
  const closes = history.map((row) => row.close).filter(Number.isFinite);
  const lows = history
    .map((row) => (Number.isFinite(row.low) ? row.low : row.close))
    .filter(Number.isFinite);
  const last = closes.at(-1) || null;
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const change5 = closes.length > 5 ? (last - closes.at(-6)) / closes.at(-6) : null;
  const support20 = lows.length >= 20 ? Math.min(...lows.slice(-20)) : null;
  const rsi14 = rsi(closes, 14);
  const macdHist = macdHistogram(closes);
  const trendOk =
    last != null &&
    sma20 != null &&
    sma50 != null &&
    last > sma20 &&
    sma20 >= sma50 * 0.985 &&
    (change5 || 0) > -0.04;
  const momentumStatus =
    rsi14 == null || macdHist == null
      ? "Unknown"
      : rsi14 > 72
        ? "RSI stretched"
        : rsi14 < 45 || macdHist < 0
          ? "Weak"
          : rsi14 >= 50 && macdHist >= 0
            ? "Constructive"
            : "Mixed";
  return { last, sma20, sma50, change5, support20, rsi14, macdHist, trendOk, momentumStatus };
}

function vixState(history) {
  const closes = history.map((row) => row.close).filter(Number.isFinite);
  const value = closes.at(-1) || null;
  const change5 = closes.length > 5 ? value - closes.at(-6) : 0;
  const change10 = closes.length > 10 ? value - closes.at(-11) : change5;
  const direction = Math.abs(change5) < 0.75 ? "stable" : change5 > 0 ? "rising" : "falling";
  let regime = "unknown";
  let note = "VIX unavailable";
  let deltaAdjustment = 0;
  let sizeMultiplier = 1;
  let avoid = false;
  if (value != null) {
    if (value < 15) {
      regime = "thin premium";
      note = "VIX < 15: thin premium, lower delta/size.";
      deltaAdjustment = -0.03;
      sizeMultiplier = 0.75;
    } else if (value <= 22) {
      regime = "normal";
      note = "VIX 15-22: normal premium.";
    } else if (value <= 30) {
      regime = "rich premium";
      note = "VIX 22-30: rich premium, reduce size.";
      sizeMultiplier = 0.65;
    } else {
      regime = "avoid";
      note = "VIX > 30: avoid new weekly bullish spreads.";
      sizeMultiplier = 0;
      avoid = true;
    }
  }
  return {
    value,
    change5,
    change10,
    direction,
    regime,
    note,
    deltaAdjustment,
    sizeMultiplier,
    avoid
  };
}

async function fetchNasdaqEarnings(symbols, expiryIso) {
  const today = toIsoDate(new Date());
  const events = [];
  const symbolSet = new Set(symbols);
  const days = dateRange(today, expiryIso).slice(0, 18);
  for (const date of days) {
    const url = `https://api.nasdaq.com/api/calendar/earnings?date=${date}`;
    try {
      const json = await fetchJson(url, {
        headers: {
          origin: "https://www.nasdaq.com",
          referer: "https://www.nasdaq.com/market-activity/earnings"
        }
      });
      const rows = ((json || {}).data || {}).rows || [];
      for (const row of rows) {
        const symbol = String(row.symbol || "").toUpperCase();
        if (symbolSet.has(symbol)) {
          events.push({
            type: "earnings",
            source: "Nasdaq",
            date,
            symbol,
            title: `${symbol} earnings ${row.time || ""}`.trim()
          });
        }
      }
    } catch (error) {
      events.push({
        type: "source-warning",
        source: "Nasdaq",
        date,
        title: `${sourceWarning(error, "Nasdaq earnings calendar")} Date: ${date}.`
      });
      break;
    }
  }
  return events;
}

function extractYearBlock(text, year, marker) {
  const startMatch = new RegExp(`\\b${year}\\s+${marker}\\b`, "i").exec(text);
  if (!startMatch) return text;
  const start = startMatch.index + startMatch[0].length;
  const rest = text.slice(start);
  const endMatch = new RegExp(`\\b\\d{4}\\s+${marker}\\b`, "i").exec(rest);
  return endMatch ? rest.slice(0, endMatch.index) : rest;
}

function parseFomcEvents(html, expiryIso) {
  const year = new Date(`${expiryIso}T00:00:00Z`).getUTCFullYear();
  const text = String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s*(\d{4}\s+FOMC Meetings)\s*/gi, "\n$1\n");
  const block = extractYearBlock(text, year, "FOMC Meetings");
  const lines = block
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const events = [];
  const seen = new Set();
  const monthLineRegex =
    /^(January|February|March|April|May|June|July|August|September|October|November|December)(?:\/(January|February|March|April|May|June|July|August|September|October|November|December))?$/i;

  for (let index = 0; index < lines.length; index += 1) {
    const monthMatch = lines[index].match(monthLineRegex);
    if (!monthMatch) continue;
    const dayMatch = lines[index + 1]?.match(/^(\d{1,2})(?:-(\d{1,2}))?\*?(?:\s|$)/);
    if (!dayMatch) continue;
    const startDay = Number(dayMatch[1]);
    const endDay = Number(dayMatch[2] || dayMatch[1]);
    const monthName = monthMatch[2] && endDay < startDay ? monthMatch[2] : monthMatch[1];
    const month = monthNumber(monthName);
    const day = endDay;
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (seen.has(date)) continue;
    seen.add(date);
    events.push({
      type: "macro",
      impact: "high",
      source: "Federal Reserve",
      date,
      title: `FOMC meeting ${lines[index]} ${dayMatch[1]}${dayMatch[2] ? `-${dayMatch[2]}` : ""}`
    });
  }
  return events.filter((event) => event.date <= expiryIso);
}

async function fetchFomcEvents(expiryIso) {
  const html = await fetchText("https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm", {
    headers: { referer: "https://www.federalreserve.gov/monetarypolicy.htm" }
  });
  return parseFomcEvents(html, expiryIso);
}

function beaImpact(title) {
  return /(GDP|Gross Domestic Product|Personal Income|Outlays|PCE|International Trade|Corporate Profits)/i.test(
    title
  )
    ? "high"
    : "medium";
}

function parseBeaJsonEvents(json, expiryIso) {
  const events = [];
  const seen = new Set();
  for (const [title, payload] of Object.entries(json || {})) {
    if (title === "file_last_updated" || !Array.isArray(payload?.release_dates)) continue;
    for (const releaseDate of payload.release_dates) {
      const parsedDate = new Date(releaseDate);
      if (Number.isNaN(parsedDate.getTime())) continue;
      const date = toIsoDate(parsedDate);
      if (!date || date > expiryIso) continue;
      const key = `${date}:${title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({
        type: "macro",
        impact: beaImpact(title),
        source: "BEA",
        date,
        title
      });
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

function parseBeaHtmlEvents(html, expiryIso) {
  const year = new Date(`${expiryIso}T00:00:00Z`).getUTCFullYear();
  const text = html
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
  const events = [];
  const regex =
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s+(\d{1,2}:\d{2}\s+[AP]M)\s+([A-Z]\s*)?\s*([^|]{8,140}?)(?=(January|February|March|April|May|June|July|August|September|October|November|December|To Be Announced|Page last modified|$))/gi;
  let match;
  while ((match = regex.exec(text))) {
    const month = monthNumber(match[1]);
    const date = `${year}-${String(month).padStart(2, "0")}-${String(Number(match[2])).padStart(2, "0")}`;
    const title = cleanHtmlText(match[5]).replace(
      /^(N\s*ews|D\s*ata|V\s*isual Data|A\s*rticle)\s+/i,
      ""
    );
    if (date <= expiryIso) {
      events.push({ type: "macro", impact: beaImpact(title), source: "BEA", date, title });
    }
  }
  return events;
}

async function fetchBeaEvents(expiryIso) {
  try {
    const json = await fetchJson("https://apps.bea.gov/API/signup/release_dates.json", {
      headers: { referer: "https://www.bea.gov/news/schedule" }
    });
    const events = parseBeaJsonEvents(json, expiryIso);
    if (events.length) return events;
  } catch {
    // Fall back to the public schedule page below.
  }

  const html = await fetchText("https://www.bea.gov/news/schedule", {
    headers: { referer: "https://www.bea.gov/" }
  });
  return parseBeaHtmlEvents(html, expiryIso);
}

const BLS_HIGH_IMPACT_RELEASES = [
  {
    regex: /Employment Situation|Nonfarm|Unemployment/i,
    title: "Employment Situation (jobs, unemployment, nonfarm payrolls)"
  },
  { regex: /Consumer Price Index|\bCPI\b/i, title: "Consumer Price Index (CPI)" },
  { regex: /Producer Price Index|\bPPI\b/i, title: "Producer Price Index (PPI)" },
  {
    regex: /Job Openings|Labor Turnover|JOLTS/i,
    title: "Job Openings and Labor Turnover Survey (JOLTS)"
  },
  { regex: /Import and Export Price/i, title: "Import and Export Price Indexes" },
  { regex: /Real Earnings/i, title: "Real Earnings" }
];

function blsReleaseTitle(text) {
  const release = BLS_HIGH_IMPACT_RELEASES.find((item) => item.regex.test(text));
  return release?.title || "";
}

function parseBlsDate(text, fallbackYear) {
  const monthMatch = text.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})?/i
  );
  if (monthMatch) {
    const year = Number(monthMatch[3] || fallbackYear);
    const month = monthNumber(monthMatch[1]);
    const day = Number(monthMatch[2]);
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (slashMatch) {
    return `${slashMatch[3]}-${String(Number(slashMatch[1])).padStart(2, "0")}-${String(
      Number(slashMatch[2])
    ).padStart(2, "0")}`;
  }

  return "";
}

function parseBlsEvents(html, expiryIso) {
  const expiryYear = new Date(`${expiryIso}T00:00:00Z`).getUTCFullYear();
  const rows = [...String(html || "").matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((match) =>
    match[0].replace(/<\/t[dh]>/gi, " | ")
  );
  const candidates = rows.length ? rows : String(html || "").split(/\n+/);
  const events = [];
  const seen = new Set();

  for (const candidate of candidates) {
    const text = cleanHtmlText(candidate);
    const title = blsReleaseTitle(text);
    if (!title) continue;
    const date = parseBlsDate(text, expiryYear);
    if (!date || date > expiryIso) continue;
    const key = `${date}:${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push({ type: "macro", impact: "high", source: "BLS", date, title });
  }

  return events;
}

async function fetchBlsEvents(expiryIso) {
  const html = await fetchText("https://www.bls.gov/schedule/news_release/", {
    headers: { referer: "https://www.bls.gov/" }
  });
  return parseBlsEvents(html, expiryIso);
}

function parseManualMacroEvents(text, expiryIso) {
  return String(text || "")
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const date = (line.match(/\d{4}-\d{2}-\d{2}/) || [toIsoDate(new Date())])[0];
      return { type: "macro", impact: "high", source: "Manual", date, title: line };
    })
    .filter((event) => event.date <= expiryIso);
}

async function autoEvents(symbols, expiryIso, manualMacroEvents, enabled) {
  const today = toIsoDate(new Date());
  const inWindow = (event) => event.date >= today && event.date <= expiryIso;
  const manual = parseManualMacroEvents(manualMacroEvents, expiryIso);
  if (!enabled) return { events: manual.filter(inWindow), blocked: [], warnings: [] };
  const [earnings, fomcResult, beaResult, blsResult] = await Promise.allSettled([
    fetchNasdaqEarnings(symbols, expiryIso),
    fetchFomcEvents(expiryIso),
    fetchBeaEvents(expiryIso),
    fetchBlsEvents(expiryIso)
  ]);
  const events = [...manual];
  const warnings = [];
  for (const result of [earnings, fomcResult, beaResult, blsResult]) {
    if (result.status === "fulfilled") events.push(...result.value);
    else warnings.push(sourceWarning(result.reason));
  }
  const windowEvents = events.filter((event) => !event.date || inWindow(event));
  warnings.push(
    ...windowEvents.filter((event) => event.type === "source-warning").map((event) => event.title)
  );
  const blocked = windowEvents
    .filter((event) => event.type === "earnings")
    .map((event) => event.symbol);
  return { events: windowEvents, blocked, warnings };
}

function pickExpiry(options, selectedExpiry) {
  const expiries = [...new Set(options.map((option) => option.expiry).filter(Boolean))].sort();
  if (selectedExpiry && expiries.includes(selectedExpiry)) return selectedExpiry;
  return expiries.find((expiry) => expiry >= selectedExpiry) || expiries[0] || selectedExpiry;
}

function estimateIv30(chain, expiry) {
  if (chain.iv30 && chain.iv30 > 0) return chain.iv30 > 2 ? chain.iv30 / 100 : chain.iv30;
  const near = chain.options.filter(
    (option) => option.expiry === expiry && option.iv && option.iv > 0
  );
  if (!near.length) return null;
  const sorted = near
    .sort((a, b) => Math.abs(a.strike - chain.price) - Math.abs(b.strike - chain.price))
    .slice(0, 8);
  const avg = sorted.reduce((sum, option) => sum + option.iv, 0) / sorted.length;
  return avg > 2 ? avg / 100 : avg;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampScoreRatio(value) {
  const number = finiteNumber(value);
  if (number == null) return 0;
  return Math.max(0, Math.min(1, number));
}

function isFiniteLessThan(left, right) {
  const leftNumber = finiteNumber(left);
  const rightNumber = finiteNumber(right);
  return leftNumber != null && rightNumber != null && leftNumber < rightNumber;
}

function scoreSpread(spread) {
  const shortDelta = finiteNumber(spread.shortDelta);
  const targetDelta = finiteNumber(spread.targetDelta);
  const deltaScore =
    shortDelta == null || targetDelta == null
      ? 0
      : clampScoreRatio(1 - Math.abs(shortDelta - targetDelta) / 0.12) * 18;
  const minCreditPct = Math.max(0.01, (finiteNumber(spread.minCreditPct) ?? 0) * 1.5);
  const creditScore = clampScoreRatio((finiteNumber(spread.creditPct) ?? 0) / minCreditPct) * 18;
  const liquidityScore =
    clampScoreRatio(
      ((finiteNumber(spread.shortOpenInterest) ?? 0) +
        (finiteNumber(spread.longOpenInterest) ?? 0)) /
        2000
    ) * 14;
  const distanceScore = clampScoreRatio((finiteNumber(spread.distancePct) ?? 0) / 0.08) * 12;
  const trendScore = spread.trendOk ? 12 : 0;
  const momentumScore =
    spread.momentumStatus === "Constructive" ? 10 : spread.momentumStatus === "Mixed" ? 5 : 0;
  const quoteScore = clampScoreRatio(1 - (finiteNumber(spread.quoteTightness) ?? 1) / 0.55) * 8;
  const expectedMoveScore = isFiniteLessThan(spread.shortStrike, spread.expectedMoveLow) ? 5 : 0;
  const supportScore = isFiniteLessThan(spread.shortStrike, spread.support20) ? 3 : 0;
  const breakdown = {
    delta: deltaScore,
    credit: creditScore,
    liquidity: liquidityScore,
    distance: distanceScore,
    trend: trendScore,
    momentum: momentumScore,
    quote: quoteScore,
    expectedMove: expectedMoveScore,
    support: supportScore
  };
  const total = Object.values(breakdown).reduce(
    (sum, value) => sum + (finiteNumber(value) ?? 0),
    0
  );
  return {
    total: finiteNumber(total) == null ? 0 : Math.round(total),
    breakdown
  };
}

function compareRankedSpreads(a, b) {
  const scoreDiff = (finiteNumber(b.score) ?? 0) - (finiteNumber(a.score) ?? 0);
  if (scoreDiff !== 0) return scoreDiff;
  return (
    [
      String(a.symbol || "").localeCompare(String(b.symbol || "")),
      String(a.expiry || "").localeCompare(String(b.expiry || "")),
      (finiteNumber(b.shortStrike) ?? 0) - (finiteNumber(a.shortStrike) ?? 0),
      (finiteNumber(b.longStrike) ?? 0) - (finiteNumber(a.longStrike) ?? 0)
    ].find((diff) => diff !== 0) || 0
  );
}

function createDiagnostics() {
  return new Map();
}

function addDiagnostic(diagnostics, category, count = 1) {
  diagnostics.set(category, (diagnostics.get(category) || 0) + count);
}

function formatDiagnostics(diagnostics, limit = 5) {
  return [...diagnostics.entries()]
    .map(([category, count]) => ({
      category,
      label: DIAGNOSTIC_LABELS[category] || category,
      count
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function skippedSymbol(symbol, category, details = {}) {
  return {
    symbol,
    reason: DIAGNOSTIC_LABELS[category] || category,
    category,
    diagnostics: [
      {
        category,
        label: DIAGNOSTIC_LABELS[category] || category,
        count: 1
      }
    ],
    ...details
  };
}

function skippedFromDiagnostics(symbol, diagnostics, details = {}) {
  const formatted = formatDiagnostics(diagnostics);
  const primary = formatted[0];
  return {
    symbol,
    reason: primary?.label || "No spreads passed filters",
    category: primary?.category || "unknown",
    diagnostics: formatted,
    ...details
  };
}

function buildSpreads(symbol, chain, history, expiry, settings, vix) {
  const metrics = trendMetrics(history.rows);
  const iv30 = estimateIv30(chain, expiry);
  const price = chain.price || metrics.last;
  if (!price) throw new Error("No underlying price available");
  const diagnostics = createDiagnostics();
  if (settings.trendGate && !metrics.trendOk) addDiagnostic(diagnostics, "trend_failed");
  const dte = daysBetween(toIsoDate(new Date()), expiry);
  const expectedMove = iv30 ? price * iv30 * Math.sqrt(dte / 365) : null;
  const expectedMoveLow = expectedMove ? price - expectedMove : null;
  const expiryOptions = chain.options.filter((option) => option.expiry === expiry);
  const putsBelowPrice = expiryOptions.filter(
    (option) => option.type === "PUT" && option.strike < price
  );
  const missingQuoteCount = putsBelowPrice.filter(
    (option) => option.bid == null || option.ask == null
  ).length;
  if (!putsBelowPrice.length) addDiagnostic(diagnostics, "no_puts_below_price");
  if (missingQuoteCount) addDiagnostic(diagnostics, "quote_missing", missingQuoteCount);
  const puts = putsBelowPrice
    .filter((option) => option.bid != null && option.ask != null)
    .sort((a, b) => b.strike - a.strike);
  const minDelta = Math.max(0.05, Number(settings.minDelta) + (vix.deltaAdjustment || 0));
  const maxDelta = Math.max(
    minDelta + 0.04,
    Number(settings.maxDelta) + (vix.deltaAdjustment || 0)
  );
  const targetDelta = (minDelta + maxDelta) / 2;
  const candidates = [];
  for (const short of puts) {
    const absDelta = Math.abs(short.delta || 0);
    if (short.delta == null || absDelta < minDelta || absDelta > maxDelta) {
      addDiagnostic(diagnostics, "no_delta_match");
      continue;
    }
    if (
      short.openInterest < Number(settings.minOpenInterest) ||
      short.volume < Number(settings.minVolume)
    ) {
      addDiagnostic(diagnostics, "low_liquidity");
      continue;
    }
    let sawWidth = false;
    let sawPositiveCredit = false;
    let sawLowCredit = false;
    for (const long of puts.filter((option) => option.strike < short.strike)) {
      const width = short.strike - long.strike;
      if (width <= 0 || width > Number(settings.maxSpreadWidth)) continue;
      sawWidth = true;
      const credit = Number(((short.bid || 0) - (long.ask || 0)).toFixed(2));
      if (credit <= 0) continue;
      sawPositiveCredit = true;
      const creditPct = credit / width;
      if (creditPct < Number(settings.minCreditPct)) {
        sawLowCredit = true;
        continue;
      }
      const maxLoss = (width - credit) * 100;
      const rawContracts = Math.floor(
        Math.min(
          (Number(settings.accountSize) * Number(settings.riskPerIdeaPct)) / 100,
          (Number(settings.accountSize) * Number(settings.maxWeeklyRiskPct)) / 100,
          (Number(settings.accountSize) * Number(settings.correlationGroupCapPct)) / 100
        ) / maxLoss
      );
      const suggestedContracts = Math.max(0, Math.floor(rawContracts * (vix.sizeMultiplier ?? 1)));
      const warnings = [];
      if (settings.trendGate && !metrics.trendOk) warnings.push("Trend gate failed");
      if (metrics.rsi14 > 70) warnings.push("RSI stretched");
      if (metrics.rsi14 < 45 || metrics.macdHist < 0) warnings.push("Weak RSI/MACD momentum");
      if (expectedMoveLow != null && short.strike >= expectedMoveLow)
        warnings.push("Short strike inside expected move");
      if (metrics.support20 != null && short.strike >= metrics.support20)
        warnings.push("Short strike above 20-day support");
      if (quoteWidth(short.bid, short.ask) > 0.35 || quoteWidth(long.bid, long.ask) > 0.35)
        warnings.push("Wide quote spreads");
      if (HIGH_BETA.has(symbol)) warnings.push("High-beta name");
      if (vix.regime === "thin premium" || vix.regime === "rich premium" || vix.regime === "avoid")
        warnings.push(`VIX risk regime: ${vix.regime}`);
      const spread = {
        id: `${symbol}-${expiry}-${short.strike}-${long.strike}`,
        symbol,
        price,
        expiry,
        dte,
        iv30,
        shortStrike: short.strike,
        longStrike: long.strike,
        distancePct: (price - short.strike) / price,
        shortDelta: absDelta,
        targetDelta,
        credit,
        creditPct,
        minCreditPct: Number(settings.minCreditPct),
        width,
        maxLoss,
        breakeven: short.strike - credit,
        suggestedContracts,
        correlationGroup: CORRELATION_GROUPS[symbol] || "Single name",
        expectedMoveLow,
        support20: metrics.support20,
        rsi14: metrics.rsi14,
        macdHistogram: metrics.macdHist,
        momentumStatus: metrics.momentumStatus,
        trendOk: metrics.trendOk,
        shortOpenInterest: short.openInterest,
        longOpenInterest: long.openInterest,
        shortVolume: short.volume,
        longVolume: long.volume,
        quoteTightness: Math.max(quoteWidth(short.bid, short.ask), quoteWidth(long.bid, long.ask)),
        warnings,
        orderTicket: `SELL ${suggestedContracts || 1} ${symbol} ${expiry} ${short.strike}P / BUY ${suggestedContracts || 1} ${symbol} ${expiry} ${long.strike}P @ ${credit.toFixed(2)} CREDIT`
      };
      const score = scoreSpread(spread);
      spread.score = score.total;
      spread.scoreBreakdown = score.breakdown;
      candidates.push(spread);
      break;
    }
    if (!candidates.some((spread) => spread.shortStrike === short.strike)) {
      if (!sawWidth) addDiagnostic(diagnostics, "width_too_wide");
      else if (!sawPositiveCredit) addDiagnostic(diagnostics, "no_positive_credit");
      else if (sawLowCredit) addDiagnostic(diagnostics, "credit_too_low");
    }
  }
  const rankedCandidates = candidates
    .filter((spread) => !(settings.trendGate && !spread.trendOk))
    .sort(compareRankedSpreads)
    .slice(0, 3);
  return {
    metrics,
    expiry,
    price,
    iv30,
    expectedMoveLow,
    diagnostics: formatDiagnostics(diagnostics),
    candidates: rankedCandidates
  };
}

async function screen(body, providers = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...body };
  const expiry = settings.expiry || nextFriday();
  const symbols = parseSymbols(settings.universe);
  const fetchChain = providers.fetchCboeChain || fetchCboeChain;
  const fetchPriceHistory = providers.fetchHistory || fetchHistory;
  const getAutoEvents = providers.autoEvents || autoEvents;
  const manualBlock = new Set(parseSymbols(settings.manualBlocklist));
  const macroEventMode = ["warn", "block", "ignore"].includes(settings.macroEventMode)
    ? settings.macroEventMode
    : DEFAULT_SETTINGS.macroEventMode;
  const eventData = await getAutoEvents(
    symbols,
    expiry,
    settings.manualMacroEvents,
    settings.autoEvents
  );
  const eventBlock = new Set(eventData.blocked);
  const vixHistory = await fetchPriceHistory("VIX").catch((error) => ({
    error: error.message,
    rows: []
  }));
  const vix = vixHistory.rows.length ? vixState(vixHistory.rows) : vixState([]);
  const results = [];
  const skipped = [];
  const highImpactMacro = eventData.events.filter(
    (event) => event.type === "macro" && event.impact === "high"
  );
  const macroBlocksCandidates = macroEventMode === "block" && highImpactMacro.length > 0;
  const macroWarnings =
    macroEventMode === "warn"
      ? highImpactMacro.map((event) => `High-impact macro: ${event.title} (${event.date})`)
      : [];
  for (const symbol of symbols) {
    if (manualBlock.has(symbol)) {
      skipped.push(skippedSymbol(symbol, "manual_blocklist"));
      continue;
    }
    if (eventBlock.has(symbol)) {
      skipped.push(skippedSymbol(symbol, "earnings_blocked"));
      continue;
    }
    if (macroBlocksCandidates) {
      skipped.push(
        skippedSymbol(symbol, "macro_blocked", {
          details: {
            events: highImpactMacro.map((event) => ({
              date: event.date,
              source: event.source,
              title: event.title
            }))
          }
        })
      );
      continue;
    }
    if (settings.vixGate && vix.avoid) {
      skipped.push(skippedSymbol(symbol, "vix_blocked"));
      continue;
    }
    try {
      const [chainResult, historyResult] = await Promise.allSettled([
        fetchChain(symbol),
        fetchPriceHistory(symbol)
      ]);
      if (chainResult.status === "rejected") {
        skipped.push(
          skippedSymbol(symbol, "no_chain", { details: { message: chainResult.reason.message } })
        );
        continue;
      }
      if (historyResult.status === "rejected") {
        skipped.push(
          skippedSymbol(symbol, "missing_history", {
            details: { message: historyResult.reason.message }
          })
        );
        continue;
      }
      const chain = chainResult.value;
      const history = historyResult.value;
      if (!Array.isArray(chain.options) || !chain.options.length) {
        skipped.push(skippedSymbol(symbol, "no_chain"));
        continue;
      }
      const actualExpiry = pickExpiry(chain.options, expiry);
      if (!actualExpiry) {
        skipped.push(skippedSymbol(symbol, "no_expiry"));
        continue;
      }
      const built = buildSpreads(symbol, chain, history, actualExpiry, settings, vix);
      for (const spread of built.candidates) spread.warnings.unshift(...macroWarnings);
      if (built.candidates.length) results.push(...built.candidates);
      else
        skipped.push(
          skippedFromDiagnostics(
            symbol,
            new Map(built.diagnostics.map((item) => [item.category, item.count])),
            {
              details: { actualExpiry, trendOk: built.metrics.trendOk }
            }
          )
        );
    } catch (error) {
      skipped.push({
        symbol,
        reason: error.message,
        category: "unknown",
        diagnostics: []
      });
    }
  }
  results.sort(compareRankedSpreads);
  return {
    generatedAt: new Date().toISOString(),
    expiry,
    symbols,
    settings,
    sources: {
      cboe: "https://cdn.cboe.com/api/global/delayed_quotes/options/{SYMBOL}.json",
      nasdaqEarnings: "https://api.nasdaq.com/api/calendar/earnings",
      fedFomc: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
      beaSchedule: "https://apps.bea.gov/API/signup/release_dates.json",
      blsSchedule: "https://www.bls.gov/schedule/news_release/",
      yahooHistory: "https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}",
      nasdaqHistoryFallback: "https://api.nasdaq.com/api/quote/{SYMBOL}/historical"
    },
    vix,
    autoEvents: eventData.events,
    eventWarnings: eventData.warnings,
    rankedSpreads: results.slice(0, 24),
    orderTickets: results
      .slice(0, 24)
      .map((spread) => ({ id: spread.id, symbol: spread.symbol, ticket: spread.orderTicket })),
    skipped
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  nextFriday,
  screen,
  _test: {
    buildSpreads,
    parseBeaJsonEvents,
    parseFomcEvents,
    parseBlsEvents,
    autoEvents,
    scoreSpread,
    trendMetrics,
    vixState
  }
};
