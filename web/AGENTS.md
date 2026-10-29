# Web agent notes

Follow `../AGENTS.md`. Run npm from `web/` and keep the Simple Browser follower
on port 4320. A screen must be independently reachable through
`/game/stage?preset=<fixture>` and registered in `qa/scenes.json`.

Use `npm run typecheck`, then run `node ../scripts/scene.mjs <scene> --check`.
The fixture is the acceptance path. There are no browser runners,
browser-test scripts, or full test suites.

Do not open `app/globals.css`, `package-lock.json`, generated assets, or build
output wholesale; use `rg` and narrow reads.
