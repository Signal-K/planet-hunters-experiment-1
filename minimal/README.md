# Landnam Minimal

The simple, no-context version of Landnam (SSL-864, decided 2026-11-19): a standalone game
with Landnam's mechanics, research, narrative and missions, told as a numbered story with one
button per screen. Sign-in is required. Served at playlandnam.space/minimal.

It is its own module in this repo, not part of the Landnam app:

- `cd web && npm run dev:minimal` serves it at http://localhost:4330/minimal/
  (add `?stage=1` to play as a stand-in pilot locally; `make ensure` first for fonts).
- `cd web && npm run build:minimal` builds it into `web/public/minimal/`, which Landnam's
  site serves. `npm run typecheck:minimal` type-checks it.
- It imports Landnam's sources instead of copying them: `@landnam/*` is `web/`, `@shared/*`
  is `shared/`. React comes from `web/node_modules`. Change a mission or rule in Landnam.
- Every screen stands on a TakeOn minimal scene (`createMinimalScene`, signal-k/takeon, KES-530),
  a read-only diorama: sign-in watches a `launch` from the home outpost, the chapter route sits
  over the `outpost`, and a briefing shows the destination's `deposit` with the rover parked by
  ore of the kind the contract wants (Landnam minerals map to TakeOn resources through
  `LANDNAM_TO_TAKEON_MINERAL`, so platinum shows as crystal). Worlds are dressed with Landnam's
  own biomes and colours (`src/takeonWorlds.ts`, reusing `lib/takeon/sandbox.ts` and
  `terrainColour.ts`); home is a lichen-steppe outpost.
- TakeOn's engine is vendored in `vendor/takeon/` (Minimal's only own dependency; Landnam's
  TakeOn is unchanged) and loads lazily after the first paint. To update it from a TakeOn
  checkout: `minimal/scripts/update-takeon.sh [path-to-takeon]` (default `../takeon`).

- START plays the chapter's run (`src/RunScene.tsx`): one chapter per Landnam mission type
  (`src/chapters.ts`). Mining is Minimal's own top-down pass (`src/MineScene.tsx`, SSL-865):
  drag to steer and FIRE at the deposits; the probe survey already marked them, because ships never scan. The
  shower chapter still uses Landnam's mining scene for CATCH. With `&dev=1`, P pauses the
  ground (the ship still steers) so a shot can be lined up by hand. Progress, earnings and stored
  materials are Minimal's own, per pilot on the device (`src/progress.ts`). In dev,
  `?stage=1&chapter=N` opens a briefing, `&run=1` starts it, and `&dev=1` shows Landnam's
  SKIP MINING button.

See `docs/simple-landnam.md` for why and the plan, and
`notes/decisions/Landnam Minimal is a separate game at playlandnam.space-minimal (2026-11-19).md`.
