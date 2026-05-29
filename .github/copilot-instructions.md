# Copilot Repository Instructions

Follow `AGENTS.md` as the canonical project guide.

This is a local, single-process Node.js app for ranking weekly put credit spread candidates. It is a screener, not trading advice.

For fast orientation, read `docs/AI_QUICKSTART.md`. For deeper context, use `docs/README.md` to open only the doc relevant to the task. Use `docs/FEATURE_PLAN.md` before adding or changing user-visible features. Use `docs/DEV_PRINCIPLES.md` when changing feature behavior, standards, or documentation.

Hard rules:

- Keep server and client responsibilities separate.
- Do not add a second always-running frontend server.
- Do not auto-screen on page load or setting changes.
- Do not change screening math, data sources, warnings, or UX behavior unless explicitly requested.
- Preserve API validation, request limits, `helmet`, skipped-symbol transparency, and trading caution.
- Keep source freshness, footer source links, and source warnings visible when changing data-source behavior.
- Run `npm run check` before handoff when dependencies are installed.
