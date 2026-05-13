const { DEFAULT_SETTINGS, nextFriday } = require("../server/screener");

module.exports = function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.json({ ...DEFAULT_SETTINGS, expiry: nextFriday() });
};
