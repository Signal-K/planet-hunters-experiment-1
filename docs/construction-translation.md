# Construction progress becomes agency unlocks (SSL-889)

Nothing is retired yet. `web/lib/agency/construction-translation.ts` records what the Base gave a player as
`player.agencyUnlocks`, so a later change can retire a building-gated path without taking anything away.

| Building state | Unlock |
| --- | --- |
| launchpad placed (level 2 or `launchpadUpgraded`, level 3) | `launch` (`heavy-hulls`, `bulk-hulls`) |
| surface silo placed | `ore-storage` |
| refinery placed | `refining` |
| market placed | `exchange` |
| hangar placed, level 2+ | `rocket-discounts` |
| control station placed, or retired `controlBuilt` | `data-hub` (`probe-fleet` with a placed probe) |
| any ground telescope placed | `ground-telescope` |
| any off-world `remoteStorage` ore | `remote-storage` |

Rules: only `agencyUnlocks` is written; unlocks only grow and merge by union across devices; a job still in
`underConstruction` grants nothing until it completes, and is left running; balances, stash, silo, research,
completed missions, client and tech progress and active deliveries are untouched. Stage 2 gets no unlock.

Runs in `normalizeAndRepair` (every load and every remote merge), so reload and reconnect both translate.

Entry points that still gate on buildings (read these before retiring): `GameScreenRouter.tsx`, `HubScreen.tsx`,
`hub/EarthBaseModules.tsx`, `hub/Building.tsx`, `hub/HubSubsurfaceView.tsx`, `hub/SurfaceSiloPanel.tsx`,
`lib/control-station.ts`, `lib/systems/AgencyOnboardingSystem.ts`, `lib/systems/EconomySystem.ts`,
`lib/systems/InstrumentFeedSystem.ts`, `lib/data/structures.ts`.
