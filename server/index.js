const fs = require("fs");
const path = require("path");
const compression = require("compression");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { z } = require("zod");
const { DEFAULT_SETTINGS, nextFriday, screen } = require("./screener");
const { settingsSchema } = require("./settingsValidation");
const { clientRoot, distDir, host, isProduction, port } = require("./config");

const app = express();

app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
          }
        }
      : false
  })
);
app.use(compression());
app.use(express.json({ limit: "256kb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "Put Spread Weekly Screener" });
});

app.get("/api/defaults", (_req, res) => {
  res.set("cache-control", "no-store");
  res.json({ ...DEFAULT_SETTINGS, expiry: nextFriday() });
});

app.post("/api/screen", async (req, res, next) => {
  try {
    const settings = settingsSchema.parse(req.body || {});
    res.set("cache-control", "no-store");
    res.json(await screen(settings));
  } catch (error) {
    next(error);
  }
});

async function attachClient() {
  if (!isProduction) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      root: clientRoot,
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      try {
        const indexPath = path.join(clientRoot, "index.html");
        const template = fs.readFileSync(indexPath, "utf8");
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).type("html").send(html);
      } catch (error) {
        vite.ssrFixStacktrace(error);
        next(error);
      }
    });
    return;
  }

  app.use(
    express.static(distDir, {
      index: false,
      immutable: true,
      maxAge: "1y",
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) {
          res.setHeader("cache-control", "no-store");
        }
      }
    })
  );
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

function errorHandler(error, _req, res, _next) {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: "Invalid screening settings", details: error.flatten() });
    return;
  }
  res.status(500).json({ error: error.message || "Unexpected server error" });
}

attachClient()
  .then(() => {
    app.use(errorHandler);
    app.listen(port, host, () => {
      console.log(`Put Spread Weekly Screener running at http://${host}:${port}`);
      console.log(
        isProduction ? "Serving React bundle from dist/" : "Serving React through Vite middleware"
      );
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
