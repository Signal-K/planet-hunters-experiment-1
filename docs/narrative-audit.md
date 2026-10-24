# Narrative audit and decisions (2026-10-24)

Canonical copy of the decisions lives in ZenNotes: `projects/landnam/decisions/Narrative spine and parked surfaces 2026-10-24`.
This file records the audit evidence. Screen classification is enforced in `web/lib/narrative-surface.ts`.

## Sources reconciled

- ZenNotes, Client-led narrative operating model (2026-09-02, amended 09-04): launch day, clients, daily cycle, sites, treasury.
- Craft progression review: the ten-screen contract sequence is the main friction; five stops recommended.
- Liam, Oct 2026: semi-sandbox with no strict path, Exchange restored, scenes not pages, one-minute objectives, rover is a separate surface mode.

## Findings

1. **The earlier version of this file overclaimed.** It listed "Applied overhaul" for the five-stop loop. What shipped was the harness registry and Studio contract. The player-facing tutorial still walks 14 steps over 12 screens (launchpad, intro, build, hub, missions, fab, targets, rover-survey, mining, debrief, transit, landing, delivery). The five stops exist as a rule, not yet as the experience.
2. **Parked systems are fully reachable.** Academy opens from the mission board Program tab and from the Academy building. Skills opens from Settings. A catalog mission (`story-astronaut-academy`) and a crew mission (`freeops-crewed-prospecting`) route into them. "Parked" in `docs/agents/product.md` was a sentence, not a state.
3. **The mining tutorial contradicts the rover rule.** Step `mine-survey` sends the first-time player to rover-survey, while the standing rule is that rover/Takeon is a separate surface mode and never hijacks laser mining.
4. **Two narratives were live at once.** The operating model says Earth refinery L1, sites, deeds and treasury are live; the five-stop note said refinery and settlements were parked. Both cannot be true.
5. **No contractor wording remains in player copy.** Only the legacy-save migration in `game-state.ts` mentions it, which is correct.
6. **Narrative Ledger is dev-only** (`dev: true` route) and is accurate: client growth planned, market/refining/treasury adapting.
7. **Registry gaps (SSL-677):** 15 scene TOMLs have no `qa/scenes.json` row (Hangar, Delivery, Skills, Missions, Targets and others).

## Decisions

| # | Decision |
| --- | --- |
| D1 | The spine is five stops: Plan, Launch, Flight, Work, Result. A new screen must declare its role in `narrative-surface.ts` or typecheck fails. |
| D2 (SSL-675) | The first-run tutorial is cut to the spine: place pad, take contract, launch, mine, debrief. Target 7 steps or fewer, no more than 7 screens. Flight and landing are one zero-tap sequence, so no return-leg steps. |
| D3 | Rover-survey leaves the mining tutorial. It stays an extension reached from Surface Ops. Laser mining is the only first-run Work verb. |
| D4 | **Base services stay** (Free Ops only): Exchange, Earth refinery L1, Hangar, Mission log, subsurface. They are places in the yard, never mission tracks. |
| D5 | **Extensions stay, each needing its own fixture:** Instruments and citizen science (an instrument feed, not a mission type), Sites and deeds with treasury, Surface Ops, Rover. |
| D6 (SSL-676) | **Parked: Academy and Skills.** Remove every player entry point (mission board Program step, Academy building focus, Settings row) and the two catalog missions. Delete the code at the end of cycle 4 unless an approved independent harness exists. Crew keep no citizen-science role. |
| D7 | **Not started and not to be presented as shipped:** daily client growth, completed-build event feed, treasury-funded loans and contribution rewards, off-world refinery, colonies, settlement build missions (`program-build-mars-mining-settlement`). The ledger carries their state. |
| D8 | **Mission kinds are four:** client contract (extraction, transport), Free Ops mining, event variant (Orionids is a mining run), own-program build. Nothing else gets a mission tag. |
| D9 | Narrative decisions live in ZenNotes. This file holds evidence. Do not add a third copy. |

## Rule for new work

Add a screen or mission only when it extends the spine, ships with an independent web and iOS fixture, and has a row in `NARRATIVE_ROLE`.
