const { z } = require("zod");
const { screen } = require("../server/screener");
const { settingsSchema } = require("../server/settingsValidation");

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

async function requestBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return req.body ? JSON.parse(req.body) : {};

  const raw = await readRawBody(req);
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const settings = settingsSchema.parse(await requestBody(req));
    res.setHeader("Cache-Control", "no-store");
    res.json(await screen(settings));
  } catch (error) {
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: "Request body must be valid JSON" });
      return;
    }
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid screening settings", details: error.flatten() });
      return;
    }
    res.status(500).json({ error: error.message || "Unexpected server error" });
  }
};
