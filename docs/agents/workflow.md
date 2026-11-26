# Fast workflow

`AGENTS.md` wins on conflict. Landnam supports web only.

1. Inspect branch/status and the active Linear issue.
2. Locate the authored scene or mission and its web renderer.
3. Change web. Keep the fixture/deep link working independently.
4. Run only the relevant source check and open the changed scene in Simple
   Browser. Use `node scripts/scene.mjs <scene> --check`; it routes and
   exercises the follower tab without a browser runner.
`make ensure` owns the local preview on port 4320. Do not start duplicate
servers or a separate test stack. With the parent `~/Navigation` checkout and
Docker it runs `make up`; without them (cloud sessions) it runs `make dev`,
which needs only Go and Node: `pocketbase/cmd/shared-dev` stands in for the
shared backend on :8090, Landnam PocketBase runs on :8096.

Scene and mission work needs no account: `/game/stage?preset=<fixture>` (what
`scene.mjs` opens) starts from the fixture every load and saves nothing, so a
finished mission never leaves the next run in the wrong state. Accounts are
for the signed-in path only (sync, outbox, first run) before committing a
change that touches it: "Local: create test account" on `/game`, no Clerk
keys needed. CI runs typecheck and build only. The
independent fixture is the acceptance path; no full suite, browser test, or
Chromium installation is part of the workflow.
