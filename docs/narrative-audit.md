# Narrative audit and decisions (2026-10-24)

Canonical copy of the decisions lives in ZenNotes: `projects/landnam/decisions/Narrative spine and parked surfaces 2026-10-24`.
This file records the audit evidence. Screen classification is enforced in `web/lib/narrative-surface.ts`.

## Sources reconciled

- ZenNotes, Client-led narrative operating model (2026-09-02, amended 09-04): launch day, clients, daily cycle, sites, treasury.
- Craft progression review: the ten-screen contract sequence is the main friction; five stops recommended.
- Liam, Oct 2026: semi-sandbox with no strict path, Exchange restored, scenes not pages, one-minute objectives, rover is a separate surface mode.

## Findings

1. **The earlier version of this file overclaimed.** It listed "Applied overhaul" for the five-stop loop. What shipped was the harness registry and Studio contract. A first mission still crosses nine screens (intro, build, hub, missions, fab, targets, mining, debrief) plus transit, landing and delivery on the way home. The five stops exist as a rule, not yet as the experience. The remaining work is the Plan, Launch and Result merges in SSL-675.
2. **Parked systems were fully reachable.** Academy opened from the mission board and the Academy building, Skills from Settings, and two catalog missions routed into them. "Parked" was a sentence, not a state. **Resolved 2026-10-24: both screens, their scenes, missions, help, presets and the Academy building are deleted on web and iOS** (SSL-676). The crew and skill state fields stay in saves so old saves load; the dead game logic behind them is the next removal.
3. **A tutorial hint pointed at the rover.** The `mine-survey` hint existed in the mining try; the flow itself only routes to the rover for missions that declare a starter-rover survey. The hint stays because survey missions do enter the rover screen. First-run mining never entered the rover.
4. **Two narratives were live at once.** The operating model says Earth refinery L1, sites, deeds and treasury are live; the five-stop note said refinery and settlements were parked. Both cannot be true.
5. **No contractor wording remains in player copy.** Only the legacy-save migration in `game-state.ts` mentions it, which is correct.
6. **Narrative Ledger was dev-only** (`dev: true` route; it is now a shipped service screen and the roadmap) and is accurate: client growth planned, market/refining/treasury adapting.
7. **Registry gaps (SSL-677): resolved.** 14 scene TOMLs had no registry row; all are registered and a test enforces it. Hub subsurface and Targets share an iOS fixture with the Hub shaft and Mission board because iOS has no dedicated scene for them.

## Decisions

| # | Decision |
| --- | --- |
| D1 | The spine is five stops: Plan, Launch, Flight, Work, Result. A new screen must declare its role in `narrative-surface.ts` or typecheck fails. |
| D2 (SSL-675) | The first-run tutorial is cut to the spine: place pad, take contract, launch, mine, debrief. Target 7 steps or fewer, no more than 7 screens. Flight and landing are one zero-tap sequence, so no return-leg steps. |
| D3 | Rover-survey leaves the mining tutorial. It stays an extension reached from Surface Ops. Laser mining is the only first-run Work verb. |
| D4 | **Base services stay** (Free Ops only): Exchange, Earth refinery L1, Hangar, Mission log, subsurface. They are places in the yard, never mission tracks. |
| D5 | **Extensions stay, each needing its own fixture:** Instruments and citizen science (an instrument feed, not a mission type) and the Rover survey. **Sites, Surface Ops, site rights, treasury and loans were deleted on 2026-10-24** (not integrated, not early game, unfinished server side). |
| D6 (SSL-676) | **Removed: Academy and Skills.** Deleted outright rather than parked (Liam, 2026-10-24: remove everything removable). Crew keep no citizen-science role. |
| D7 | **Not started and not to be presented as shipped:** daily client growth, completed-build event feed, treasury-funded loans and contribution rewards, off-world refinery, colonies, settlement build missions (`program-build-mars-mining-settlement`). The ledger carries their state. |
| D8 | **Mission kinds are four:** client contract (extraction, transport), Free Ops mining, event variant (Orionids is a mining run), own-program build. Nothing else gets a mission tag. |
| D9 | Narrative decisions live in ZenNotes. This file holds evidence. Do not add a third copy. |

## Rule for new work

Add a screen or mission only when it extends the spine, ships with an independent web and iOS fixture, and has a row in `NARRATIVE_ROLE`.

## Deleted 2026-10-24 (restore from git history, not from stubs)

Academy, crew, hiring and training; Skill tree, skill points and licence grades; Sites and Surface Ops; site rights, deeds, treasury and bankruptcy loans; the Takeon field sandbox (structure palette, crafting, ownership, territory claims, biosphere seeding); Community hub; own-program build missions, remote silo, off-world refinery and site-right gating; dark-shipped habitat training and the off-world non-mining build flag; crew ship rooms and their art; the legacy GameApp shell and preview pages; 569 dead CSS rules. Saves keep unknown fields, so old saves still load. The PocketBase collections and daily-economy workflow are untouched and now have no client.

## Restored 2026-10-24 (shipping this week)

Friends (callsign, requests, daily gifts, read-only visits, presence heartbeat, notification bell) and the Narrative Ledger were deleted in 1eb8b5b6 and restored the same day on web and iOS. World Space Week and the Orionids event were never removed. Friends opens from the Base menu on web and from the top-right HUD on iOS. The Narrative Ledger is now the in-game roadmap: every deleted system above is listed there as planned with how it was previously built, and the Hub menu opens it (role `service`). A friend visit now shows discoveries only, because the field builds it used to show are deleted.
