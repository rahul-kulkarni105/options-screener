# Project Docs Index

These docs are optimized for future model runs. Start small, then open only the file that matches the task.

## Read Order

1. `AGENTS.md` - canonical operating rules for this repo.
2. `docs/AI_QUICKSTART.md` - compact project map and highest-risk rules.
3. Task-specific docs:
   - `docs/FEATURE_PLAN.md` for the current page-by-page feature inventory and deliberate non-features.
   - `docs/DEV_PRINCIPLES.md` for the comprehensive current guardrails and handoff checklist.
   - `docs/ARCHITECTURE.md` for file ownership, data flow, API shape, and dev server behavior.
   - `docs/SCREENING_LOGIC.md` for business logic, scoring, filters, risk sizing, and event handling.
   - `docs/BUSINESS_LOGIC_MODEL.md` for a lean model-facing business rules and formulas spec.
   - `docs/BUSINESS_LOGIC_USER.md` for a plain-English business logic guide and feature audit.
   - `docs/ENGINEERING_STANDARDS.md` for implementation, UX, security, testing, and style conventions.
   - `docs/RISKS_AND_GAPS.md` for known fragility, future work, and things to avoid changing casually.

## Token Budget Guidance

- For small UI changes, read `AI_QUICKSTART.md`, then the touched component and `src/styles.css`.
- For feature additions, removals, or UX changes, read `FEATURE_PLAN.md` first to avoid duplicating existing behavior.
- For API or validation changes, read `AI_QUICKSTART.md`, `ARCHITECTURE.md`, `server/index.js`, and only the relevant part of `server/screener.js`.
- For screening math or trading behavior, read `AI_QUICKSTART.md`, `SCREENING_LOGIC.md`, and the relevant functions in `server/screener.js`.
- For risk review, read `RISKS_AND_GAPS.md` plus the code paths named there.
- For documentation or agent-instruction work, read `DEV_PRINCIPLES.md` and update `.github/copilot-instructions.md` when compact auto-loaded guidance changes.

Do not preload every doc by default. These files are deliberately layered so context can stay small.

## Tool Entrypoints

- Codex and many coding agents: `AGENTS.md`.
- Claude Code: `CLAUDE.md`, which points back to `AGENTS.md` and this docs index.
- GitHub Copilot: `.github/copilot-instructions.md`, which keeps Copilot's auto-loaded context compact.
