# Landnam Minimal

The simple, no-context version of Landnam (SSL-864), served at playlandnam.space/minimal.
Sign-in is required. Rules: notes/decisions "Landnam Minimal is one side-on view of the base".

- One side-on view. `src/Stage.tsx` draws home (the base, from Landnam's base-site map) and a
  destination (the same frame in that world's colours, its ore in the ground). Only the rocket
  travels between them.
- `src/App.tsx` is the whole flow: the base with a counter under each structure, NEXT MISSION,
  a briefing sheet, LAUNCH off the pad, one job at the destination (tap ore, or one button), the
  rocket landing back on the pad, and a report sheet. The current meteor shower shows in the sky.
- Rules and data are Landnam's: missions (`src/chapters.ts`), structure levels
  (`src/structures.ts`), results (`src/progress.ts`). Progress syncs to the account
  (`src/progressSync.ts`); francs are shared with Landnam (`src/sharedSave.ts`).
- `cd web && npm run dev:minimal` serves it at http://localhost:4330/minimal/ (Landnam's dev
  server on :4320 serves /game and /fonts). `?stage=1` plays as a stand-in pilot;
  `&runs=client-contract:2,satellite:1` seeds finished runs.
- `npm run build:minimal` builds into `web/public/minimal/`; `npm run typecheck:minimal` checks it.
