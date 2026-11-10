# Scene tree and review (2026-11-10, cycle 9)

Built from `GameScreenRouter.tsx`, `qa/scenes.json` (67 scene ids, 24 router screens), `useGameLoop.ts` exits and `MISSION_SETUP_FLOW.md`. Read it as a map of what exists today, then the review below it.

## Scene tree

```
Earth Base (hub)                      screen: hub / hub-subsurface
├─ New mission ───────────────────── missions (Mission Board: contracts, Space program, free run)
│    ├─ Contract / free run / shower run / survey flight
│    │     missions → targets → rocket-buy → fab → launchpad → transit → landing → mining → transit(return) → delivery/debrief → hub
│    ├─ Space program (satellite / telescope launch)
│    │     missions → rocket-buy → fab → launchpad → transit → debrief → instrument-hub   (the only mission that lands on the Data hub)
│    ├─ Shower run (Leonids, Orionids)
│    │     radio-meteors → missions → … same flight loop; ends back on missions
│    └─ Mission Board also opens: launchpad, asteroid-discovery, saturn-storm-search, radio-meteors, market (onOpenEvent)
├─ Marketplace ───────────────────── market   (also reached from flight dock, delivery, refinery)
├─ Instruments / Data hub ────────── instrument-hub
│    ├─ pick telescope → tap target on sky map → one of:
│    │     galaxy (TESS classify) · asteroid-discovery · saturn-storm-search · radio-meteors
│    │     classify → Back/Confirm → Data hub | Ask community
│    ├─ Logbook sheet: research calendar, **survey scan console**, survey charts, badges
│    └─ scan follow-up banner (SSL-803) → one of the three instrument screens
├─ Community research ────────────── community-research
│    ├─ weekly path → sky-pointing (SSL-800), claims, ballots, consensus goal
│    └─ review queue → galaxy | asteroid-discovery | saturn-storm-search (reviewing)
├─ Mission log ───────────────────── mission-history
├─ Narrative ledger ──────────────── narrative-ledger
├─ Hangar ────────────────────────── hangar → rocket-buy / fab
├─ Refinery ──────────────────────── refinery
├─ Launchpad (tower) ─────────────── launchpad
└─ Structures / build / subsurface ─ build, hub-subsurface
Side entries: Agency callout "N signals ready" → instrument-hub; hub scene building taps → instrument-hub / asteroid-discovery.
```

Mission run screens (the same five for every flight): `transit, landing, mining, delivery, debrief`, rendered by `MissionOperationRoutes.tsx`. Mission type changes data and exits, not scenes.

| Mission type | Setup | Run | Ends on |
| --- | --- | --- | --- |
| Client contract | missions → targets → rocket-buy → fab | five run screens | hub |
| Free run (own goal, SSL-796) | same, goal sheet on plan strip | five run screens | hub |
| Space program (satellite/telescope) | missions → rocket-buy → fab → launchpad | transit, debrief | **instrument-hub** (satellite) or launchpad (other program ops) |
| Shower run (Leonids/Orionids) | radio-meteors | five run screens, shower mining variant | **missions** |
| Survey flight to a discovered world (`exo-survey-*`) | missions | five run screens | hub |
| Tutorial missions (first-fab/first-return/transport-*/telescope-*) | authored fixtures | same screens, scripted | hub |

## Collisions (same thing, two names or two doors)

1. **Duplicate scene ids.** `qa/scenes.json` registers 7 pairs that load the same fixture: `control-station`/`instrument-hub`, `asteroid`/`asteroid-discovery`, `saturn`/`saturn-storm-search`, `mission-board`/`missions`, `mission-log`/`mission-history`, `tess`/`galaxy`, `hangar`/`hangar-assembly`. Two ids means two names in Linear, docs and the monitor. Suggest keeping the router screen name as the id and making the other an alias.
2. **"Transit" means three things.** Router screen `transit` is the rocket flight; the transit telescope is also "transit"; scene ids `flight` and `transit` point at different fixtures (`telescope-transit` vs `sandbox-transit`). Rename the flight screen `flight` (or the telescope one `transit-scope`).
3. **TESS lives on a screen called `galaxy`.** The component is `TessDiscoveryScreen` and the scene is "Galaxy Map" and "TESS classify". The sky map is the Data hub now, so `galaxy` should become `tess-discovery` to match `asteroid-discovery` and `saturn-storm-search`.
4. **Four names for the hub of instruments.** Control Station (scene registry, tests, `control-station-*` testids), Instrument hub (screen id), Data hub (title since SSL-801), Instruments (Base menu label). Pick Data hub everywhere the player sees it; the code ids can stay.
5. **Instruments open from six doors:** Base menu, Agency callout, hub-scene building taps, Mission Board `onOpenEvent`, Community research review queue, scan follow-up banner. They land in different states (some pass `inspectSignal`, some `reviewTarget`, some nothing), and the back button returns to different places (`onBack` goes to the Data hub, or `goBack()` when reviewing).
6. **Mission Log and Narrative ledger** are both "what happened" lists at Base. The ledger is a team document (live/adapting/planned), not a player scene.
7. **Where a mission ends is inconsistent.** Contracts end on the hub, satellite launches on the Data hub, shower runs on the Mission Board, other program operations on the launchpad.

## Confusion points

- **Scanning is buried.** The survey scan console is inside the Logbook sheet of the Data hub. It is the main way to earn community research from the hub and the way you get follow-up requests (SSL-803), yet there is no scan control on the map. Tapping a target on the sky map should offer Scan or Classify.
- **Pointing is asked in two places.** Community research start opens `sky-pointing`; the hub scene also has "point telescope" prompts (`onPointTelescope`). Only the first unpointed telescope is walked through; others need tabs.
- **Plan strip, goal sheet, targets list.** A free run now has the plan strip goal sheet and the old targets screen. The strip's cargo/goal choice and the `targets` map can disagree until the player picks a feasible target (handled, but it shows up as a jump).
- **Two "back to the hub" choices after classifying** (DATA HUB, ASK COMMUNITY) and a back button at top left that does the same as DATA HUB.
- **Tutorials follow the player into instruments.** `help.layer` coaches run on every instrument screen and reappear on first visit of each; the TESS training scene is a separate fixture from the real screen.

## Overly complex

- `GameScreenRouter.tsx` is the one place that holds `inspectSignal`, `reviewTarget` and `pendingReview`. Three nullable states drive one screen's behaviour, and setting one without clearing the others is how the wrong subject opens. Fold them into one `instrumentSession: { subject?, review?, pending? } | null`.
- The mission setup flow is five screens (missions, targets, rocket-buy, fab, launchpad) plus the plan strip. The strip now carries goal, vehicle and target, so `targets` and `rocket-buy` are mostly confirmation. A candidate simplification: pick contract, then one review screen with target, vehicle and goal, then launchpad.
- The instrument console has layered CSS passes (glass pass, flat pass, short-landscape pass); the SSL-798 block overrides rather than replaces the earlier ones. Worth one clean-up pass when the layout settles.
- 67 registered scene ids for about 25 real screens. Most of the extra ids are tutorial and checkpoint fixtures, which is fine, but the registry has no marker for "alias" vs "distinct fixture".

## Suggested order (small, one scene at a time)

1. Scan from the map: tap a target, choose Scan or Classify (touches the Data hub only).
2. Make every mission end somewhere predictable: a "what next" row on debrief (Data hub, Mission Board, Base) instead of four different exits.
3. Collapse router instrument state into one session object, then unify the six doors.
4. Rename `galaxy` and `transit`, alias the duplicate scene ids.
5. Replace targets/rocket-buy/fab with the single review screen only if Liam wants it; it touches the tutorial.
