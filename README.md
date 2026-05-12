# Put Spread Weekly Screener

Local dashboard for ranking weekly put credit spread candidates. The app runs as one Node.js process: Express serves the API and either Vite middleware in development or the built React bundle in production.

## Workflow

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4173`.

For production-style local serving:

```bash
npm run build
npm run start
```

## Checks

```bash
npm run check
```

## Notes

- Screening runs only when `Screen Picks` is clicked.
- Settings and tracked positions are stored in localStorage.
- Server-side validation, request limits, security headers, compression, and upstream caching are enabled.
- The server pulls delayed option chains and public calendar/history data from upstream sources; upstream availability can vary.

## Model-Friendly Docs

Future model runs should start with `AGENTS.md`, then `docs/AI_QUICKSTART.md`. Use `docs/README.md` to choose only the deeper doc needed for the task.
