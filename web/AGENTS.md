# AGENTS (web)

Root rules: ../AGENTS.md (token budget, map, standing rules). Do not copy rules here.

- Run `npm` from `web/`. Search with `rg -n X lib/ components/`; read windows, not whole files.
- Big files: `app/globals.css` (190 KB, rg only), `lib/contexts/useGameLoop.ts` (72 KB), `lib/contexts/useAuthSync.ts`, `lib/game-state.ts`, `screens/MiningScreen.tsx`. Never open `package-lock.json`, `public/game/assets/**`, `*-sheet.json`, `vendor/`.
- Tests sit next to code (`foo.ts` + `foo.test.ts`).

Targeted checks (use these while iterating)
```bash
npm run test:file -- lib/systems/EconomySystem.test.ts     # one vitest file
npm run test:file -- lib/sync -t "ledger"                  # one dir / one test name
npm run test:related -- lib/mission-flow.ts                 # tests that import a file
npm run test:scene -- tests/scenes/flow-launchpad.spec.ts   # one Playwright spec
npm run typecheck
```
Full suite (`npm run test:unit`, `npm run test:scenes`) once, at the end.

<!-- BEGIN:nextjs-agent-rules -->
This is NOT the Next.js you know: APIs and file structure differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code.
<!-- END:nextjs-agent-rules -->
