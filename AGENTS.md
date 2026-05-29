# Agent Operating Guide

This project is a local, single-process Node.js server that serves a Vite React bundle and exposes the screening API. Optimize future work for correctness, small context, and maintainability.

## Context Rules

- Read this file first, then inspect only the files relevant to the request.
- For project orientation after this file, read `docs/AI_QUICKSTART.md`; use `docs/README.md` to pick only the deeper doc needed for the task. For feature work, read `docs/FEATURE_PLAN.md` to see what already exists.
- Use `rg` and `rg --files` before broad file reads.
- Prefer small targeted edits over rewrites. Do not change screening math, data sources, or UX behavior unless the prompt asks for it.
- Keep server and client responsibilities separate:
  - `server/` owns data fetching, validation, screening, ranking, and static bundle serving.
  - `src/` owns UI state, RTK Query API calls, localStorage, and presentation.
- Never add a second always-running frontend server. Development uses Vite middleware inside `server/index.js`; production serves `dist/`.

## Hard Principles

- Security first: validate API inputs, keep request limits, keep `helmet`, avoid exposing secrets, never log account values or full upstream payloads unnecessarily.
- Performance first: cache upstream data carefully, avoid auto-screening on page load or setting changes, keep large lists bounded.
- Maintainability first: keep React components focused, avoid duplicated formatting logic, avoid magic values without nearby naming.
- UX first: mobile-first, compact, operational dashboard, no marketing landing pages.
- Trading caution: this is a screener, not advice. Preserve warnings and skipped-symbol transparency.

## Coding Standards

- Use React with Redux Toolkit and RTK Query.
- Keep CSS plain and mobile-first in `src/styles.css`.
- Use accessible native controls and clear button labels.
- Use `lucide-react` icons for icon buttons when helpful.
- Store user settings and tracked positions in localStorage only.
- Run `npm run check` before handoff when dependencies are installed.

## Commands

- Development, one process: `npm run dev`
- Production build: `npm run build`
- Production server, one process: `npm run start`
- Full verification: `npm run check`
