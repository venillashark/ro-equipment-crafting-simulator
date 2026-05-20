# AGENTS.md

Guidance for agents working in this repository.

## Project Shape
- This is a React + Vite UI for an RO equipment crafting simulator.
- The active UI entrypoint is `src/main.jsx`, with styling in `src/styles.css`.
- Core simulator APIs are exposed by `src/core.js` in the browser and mirrored by `src/core.cjs` for tests.

## Hard Rules
- Do not change the calculation logic in `src/core.js` or `src/core.cjs` unless the user explicitly asks for a core logic change.
- Do not add large UI frameworks or chart libraries without explaining why they are necessary first.
- Prefer keeping UI changes in `src/main.jsx` and `src/styles.css`; lightweight components under `src/components/` are fine when they reduce complexity.
- Preserve existing user-facing behavior: localStorage autosave, reset defaults, target settings, material prices, route calculation, Monte Carlo simulation, and quote settings.

## UI Notes
- Dashboard mode switching is visual and prioritizes information only; it must not introduce new pricing formulas.
- P90, P95, and simulation average must come only from an executed `simulateMonteCarlo` result.
- If inputs change after a simulation, show that the simulation result is stale and needs rerun.
- Cost breakdowns should be named "成本摘要" or "報價組成" unless the data is a precise material-level decomposition.

## Verification
- Run `npm test` after changes that could affect simulator behavior.
- Run `npm run build` after UI or Vite changes.
- If a local dev server is needed, use `npm run dev -- --host 127.0.0.1 --port 5173`.
