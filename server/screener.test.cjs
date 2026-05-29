const assert = require("node:assert/strict");
const test = require("node:test");
const { DEFAULT_SETTINGS, _test, screen } = require("./screener");
const {
  EXPIRY,
  bullishHistory,
  sampleChain,
  vixHistories,
  weakHistory
} = require("./fixtures/screenerFixtures.cjs");

const fixtureSettings = {
  ...DEFAULT_SETTINGS,
  expiry: EXPIRY,
  minCreditPct: 0.25,
  minOpenInterest: 100,
  minVolume: 20,
  trendGate: true,
  vixGate: false
};

function assertClose(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 0.0000001,
    `${message}: expected ${expected}, got ${actual}`
  );
}

function diagnosticCategories(built) {
  return built.diagnostics.map((diagnostic) => diagnostic.category);
}

function futureIso(days = 14) {
  const date = new Date(Date.now() + days * 86400000);
  return date.toISOString().slice(0, 10);
}

test("buildSpreads calculates credit, risk, distance, and finite score from fixtures", () => {
  const vix = _test.vixState(vixHistories.normal.rows);
  const built = _test.buildSpreads(
    "FIXT",
    sampleChain,
    bullishHistory,
    EXPIRY,
    fixtureSettings,
    vix
  );
  const spread = built.candidates.find((candidate) => candidate.shortStrike === 95);

  assert.ok(spread, "expected the fixture spread to pass filters");
  assert.equal(spread.longStrike, 90);
  assertClose(spread.credit, 1.55, "credit");
  assertClose(spread.creditPct, 0.31, "credit percent");
  assertClose(spread.maxLoss, 345, "max loss");
  assertClose(spread.breakeven, 93.45, "breakeven");
  assertClose(spread.distancePct, 0.05, "distance percent");
  assert.equal(Number.isFinite(spread.score), true);
  assert.equal(Number.isFinite(spread.scoreBreakdown.distance), true);
  assert.ok(spread.scoreBreakdown.distance > 0);
});

test("scoreSpread is finite and gives farther OTM strikes more distance credit", () => {
  const baseSpread = {
    shortDelta: 0.22,
    targetDelta: 0.23,
    creditPct: 0.31,
    minCreditPct: 0.25,
    shortOpenInterest: 1200,
    longOpenInterest: 800,
    trendOk: true,
    momentumStatus: "Constructive",
    quoteTightness: 0.1,
    shortStrike: 90,
    expectedMoveLow: 92,
    support20: 94
  };

  const near = _test.scoreSpread({ ...baseSpread, distancePct: 0.02 });
  const far = _test.scoreSpread({ ...baseSpread, distancePct: 0.08 });
  const sparse = _test.scoreSpread({ distancePct: Number.NaN });

  assert.equal(Number.isFinite(near.total), true);
  assert.equal(Number.isFinite(far.total), true);
  assert.equal(Number.isFinite(sparse.total), true);
  assert.ok(far.breakdown.distance > near.breakdown.distance);
  assert.ok(far.total > near.total);
});

test("trend gate filters candidates when fixture trend fails", () => {
  const vix = _test.vixState(vixHistories.normal.rows);
  const built = _test.buildSpreads("FIXT", sampleChain, weakHistory, EXPIRY, fixtureSettings, vix);

  assert.equal(_test.trendMetrics(weakHistory.rows).trendOk, false);
  assert.equal(built.candidates.length, 0);
  assert.ok(diagnosticCategories(built).includes("trend_failed"));
});

test("buildSpreads reports actionable skipped-symbol diagnostics", () => {
  const vix = _test.vixState(vixHistories.normal.rows);
  const cases = [
    [{ ...fixtureSettings, minDelta: 0.4, maxDelta: 0.5 }, "no_delta_match"],
    [{ ...fixtureSettings, minOpenInterest: 2_000 }, "low_liquidity"],
    [{ ...fixtureSettings, maxSpreadWidth: 2 }, "width_too_wide"],
    [{ ...fixtureSettings, minCreditPct: 0.5 }, "credit_too_low"]
  ];

  for (const [settings, expectedCategory] of cases) {
    const built = _test.buildSpreads("FIXT", sampleChain, bullishHistory, EXPIRY, settings, vix);
    assert.equal(built.candidates.length, 0);
    assert.ok(
      diagnosticCategories(built).includes(expectedCategory),
      `expected ${expectedCategory}`
    );
  }
});

test("buildSpreads reports quote and moneyness diagnostics before spread pairing", () => {
  const vix = _test.vixState(vixHistories.normal.rows);
  const missingQuotes = {
    ...sampleChain,
    options: sampleChain.options.map((option) => ({ ...option, bid: null }))
  };
  const noPutsBelowPrice = {
    ...sampleChain,
    price: 80
  };

  assert.ok(
    diagnosticCategories(
      _test.buildSpreads("FIXT", missingQuotes, bullishHistory, EXPIRY, fixtureSettings, vix)
    ).includes("quote_missing")
  );
  assert.ok(
    diagnosticCategories(
      _test.buildSpreads("FIXT", noPutsBelowPrice, bullishHistory, EXPIRY, fixtureSettings, vix)
    ).includes("no_puts_below_price")
  );
});

test("vixState classifies thin, normal, rich, and avoid regimes", () => {
  assert.equal(_test.vixState(vixHistories.thin.rows).regime, "thin premium");
  assert.equal(_test.vixState(vixHistories.normal.rows).regime, "normal");
  assert.equal(_test.vixState(vixHistories.rich.rows).regime, "rich premium");
  assert.equal(_test.vixState(vixHistories.avoid.rows).regime, "avoid");
  assert.equal(_test.vixState(vixHistories.avoid.rows).avoid, true);
});

test("screen uses fixture providers and blocks event symbols without upstream fetches", async () => {
  const fetchedChains = [];
  const result = await screen(
    {
      ...fixtureSettings,
      universe: "FIXT BLOCK"
    },
    {
      autoEvents: async () => ({
        events: [
          {
            type: "earnings",
            source: "Fixture",
            date: EXPIRY,
            symbol: "BLOCK",
            title: "BLOCK earnings"
          }
        ],
        blocked: ["BLOCK"],
        warnings: []
      }),
      fetchCboeChain: async (symbol) => {
        fetchedChains.push(symbol);
        if (symbol === "FIXT") return sampleChain;
        throw new Error(`unexpected chain fetch for ${symbol}`);
      },
      fetchHistory: async (symbol) => {
        if (symbol === "VIX") return vixHistories.normal;
        if (symbol === "FIXT") return bullishHistory;
        throw new Error(`unexpected history fetch for ${symbol}`);
      }
    }
  );

  assert.deepEqual(fetchedChains, ["FIXT"]);
  assert.equal(result.rankedSpreads.length, 1);
  assert.equal(result.rankedSpreads[0].symbol, "FIXT");
  assert.equal(result.orderTickets.length, 1);
  assert.equal(result.skipped[0].symbol, "BLOCK");
  assert.equal(result.skipped[0].category, "earnings_blocked");
  assert.equal(result.skipped[0].reason, "Earnings before expiry");
  assert.equal(result.skipped[0].diagnostics[0].category, "earnings_blocked");
});

test("screen blocks candidates when high-impact macro mode is block", async () => {
  const fetchedChains = [];
  const result = await screen(
    {
      ...fixtureSettings,
      macroEventMode: "block",
      universe: "FIXT OTHER"
    },
    {
      autoEvents: async () => ({
        events: [
          {
            type: "macro",
            impact: "high",
            source: "BLS",
            date: EXPIRY,
            title: "Consumer Price Index (CPI)"
          }
        ],
        blocked: [],
        warnings: []
      }),
      fetchCboeChain: async (symbol) => {
        fetchedChains.push(symbol);
        throw new Error(`unexpected chain fetch for ${symbol}`);
      },
      fetchHistory: async (symbol) => {
        if (symbol === "VIX") return vixHistories.normal;
        throw new Error(`unexpected history fetch for ${symbol}`);
      }
    }
  );

  assert.deepEqual(fetchedChains, []);
  assert.equal(result.rankedSpreads.length, 0);
  assert.deepEqual(
    result.skipped.map((item) => item.category),
    ["macro_blocked", "macro_blocked"]
  );
  assert.equal(result.skipped[0].reason, "High-impact macro event before expiry");
  assert.equal(result.autoEvents[0].source, "BLS");
});

test("screen warns or ignores high-impact macro events based on severity mode", async () => {
  async function run(mode) {
    return screen(
      {
        ...fixtureSettings,
        macroEventMode: mode,
        universe: "FIXT"
      },
      {
        autoEvents: async () => ({
          events: [
            {
              type: "macro",
              impact: "high",
              source: "BLS",
              date: EXPIRY,
              title: "Employment Situation (jobs, unemployment, nonfarm payrolls)"
            }
          ],
          blocked: [],
          warnings: []
        }),
        fetchCboeChain: async () => sampleChain,
        fetchHistory: async (symbol) => (symbol === "VIX" ? vixHistories.normal : bullishHistory)
      }
    );
  }

  const warned = await run("warn");
  const ignored = await run("ignore");

  assert.match(warned.rankedSpreads[0].warnings.join(" "), /High-impact macro/);
  assert.doesNotMatch(ignored.rankedSpreads[0].warnings.join(" "), /High-impact macro/);
});

test("autoEvents preserves manual macro events when automatic sources are disabled", async () => {
  const eventDate = futureIso(7);
  const expiry = futureIso(14);
  const result = await _test.autoEvents([], expiry, `${eventDate} CPI`, false);

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].source, "Manual");
  assert.match(result.events[0].title, /CPI/);
  assert.deepEqual(result.blocked, []);
});

test("autoEvents reports source-specific upstream 403 warnings", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    const href = String(url);
    if (href.includes("federalreserve.gov")) {
      return {
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => ""
      };
    }
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => (href.includes("api.nasdaq.com") ? '{"data":{"rows":[]}}' : "<html></html>")
    };
  };

  try {
    const result = await _test.autoEvents([], futureIso(2), "", true);

    assert.deepEqual(result.events, []);
    assert.deepEqual(result.blocked, []);
    assert.ok(
      result.warnings.some((warning) =>
        warning.includes("Federal Reserve calendar unavailable (403 Forbidden).")
      )
    );
    assert.ok(!result.warnings.includes("403 Forbidden"));
  } finally {
    global.fetch = originalFetch;
  }
});

test("parseFomcEvents extracts meeting dates without minutes release dates", () => {
  const html = `
    <h4>2026 FOMC Meetings</h4>
    <div>January</div><div>27-28</div>
    <p>Minutes: Released February 18, 2026</p>
    <div>June</div><div>16-17*</div>
    <h4>2025 FOMC Meetings</h4>
    <div>July</div><div>29-30</div>`;

  const events = _test.parseFomcEvents(html, "2026-06-30");

  assert.deepEqual(
    events.map((event) => event.date),
    ["2026-01-28", "2026-06-17"]
  );
  assert.ok(events.every((event) => event.source === "Federal Reserve"));
});

test("parseBeaJsonEvents extracts BEA releases and impact labels", () => {
  const events = _test.parseBeaJsonEvents(
    {
      "Gross Domestic Product": {
        release_dates: ["2034-06-25T12:30:00+00:00", "2034-07-25T12:30:00+00:00"]
      },
      "Outdoor Recreation Economic Statistics": {
        release_dates: ["2034-06-05T14:00:00+00:00"]
      },
      file_last_updated: "2034-01-01T00:00:00"
    },
    "2034-06-30"
  );

  assert.deepEqual(
    events.map((event) => `${event.date}:${event.title}:${event.impact}`),
    [
      "2034-06-05:Outdoor Recreation Economic Statistics:medium",
      "2034-06-25:Gross Domestic Product:high"
    ]
  );
});

test("parseBlsEvents extracts high-impact BLS releases before expiry", () => {
  const html = `
    <table>
      <tr><td>June 7, 2034</td><td>Employment Situation</td></tr>
      <tr><td>June 12, 2034</td><td>Consumer Price Index</td></tr>
      <tr><td>06/13/2034</td><td>Producer Price Index</td></tr>
      <tr><td>June 20, 2034</td><td>Productivity and Costs</td></tr>
      <tr><td>July 5, 2034</td><td>Job Openings and Labor Turnover Survey</td></tr>
    </table>`;

  const events = _test.parseBlsEvents(html, "2034-06-30");

  assert.deepEqual(
    events.map((event) => event.title),
    [
      "Employment Situation (jobs, unemployment, nonfarm payrolls)",
      "Consumer Price Index (CPI)",
      "Producer Price Index (PPI)"
    ]
  );
  assert.ok(events.every((event) => event.source === "BLS" && event.impact === "high"));
});
