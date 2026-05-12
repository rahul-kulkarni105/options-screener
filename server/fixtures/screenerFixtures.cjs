const EXPIRY = "2035-01-19";

function rowsFromCloses(closes) {
  const start = new Date("2026-01-02T00:00:00Z");
  return closes.map((close, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      close,
      high: close + 1,
      low: close - 2,
      volume: 1_000_000
    };
  });
}

function repeatedHistory(close) {
  return {
    source: "fixture",
    rows: rowsFromCloses(Array.from({ length: 70 }, () => close))
  };
}

const bullishHistory = {
  source: "fixture",
  rows: rowsFromCloses(Array.from({ length: 70 }, (_value, index) => 70 + index * 0.45))
};

const weakHistory = {
  source: "fixture",
  rows: rowsFromCloses(Array.from({ length: 70 }, (_value, index) => 120 - index * 0.4))
};

const sampleChain = {
  symbol: "FIXT",
  price: 100,
  iv30: 0.3,
  source: "fixture",
  options: [
    {
      option: `FIXT${EXPIRY}95P`,
      expiry: EXPIRY,
      strike: 95,
      type: "PUT",
      bid: 1.85,
      ask: 2.05,
      mid: 1.95,
      last: 1.9,
      delta: -0.22,
      iv: 0.31,
      volume: 120,
      openInterest: 1200
    },
    {
      option: `FIXT${EXPIRY}90P`,
      expiry: EXPIRY,
      strike: 90,
      type: "PUT",
      bid: 0.22,
      ask: 0.3,
      mid: 0.26,
      last: 0.25,
      delta: -0.1,
      iv: 0.32,
      volume: 80,
      openInterest: 800
    },
    {
      option: `FIXT${EXPIRY}85P`,
      expiry: EXPIRY,
      strike: 85,
      type: "PUT",
      bid: 0.05,
      ask: 0.1,
      mid: 0.075,
      last: 0.08,
      delta: -0.04,
      iv: 0.34,
      volume: 40,
      openInterest: 500
    }
  ]
};

module.exports = {
  EXPIRY,
  bullishHistory,
  sampleChain,
  vixHistories: {
    thin: repeatedHistory(14),
    normal: repeatedHistory(18),
    rich: repeatedHistory(25),
    avoid: repeatedHistory(31)
  },
  weakHistory
};
