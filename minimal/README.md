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
- Destination scenes come from TakeOn's minimal scene (`createMinimalScene`, signal-k/takeon,
  KES-530): a read-only diorama of the body with the rover parked by a deposit. Its build is
  vendored in `vendor/takeon/` (Minimal's only own dependency; Landnam's TakeOn is unchanged).
  To update it: `npm run build -w @takeon/engine` in takeon, `npm pack` into `vendor/takeon/`,
  then `npm install` here (clear the npm cache if the file name is unchanged).

See `docs/simple-landnam.md` for why and the plan, and
`notes/decisions/Landnam Minimal is a separate game at playlandnam.space-minimal (2026-11-19).md`.
