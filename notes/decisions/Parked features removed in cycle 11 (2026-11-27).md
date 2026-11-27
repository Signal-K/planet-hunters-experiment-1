# Parked features removed in cycle 11 (2026-11-27)

From Liam, 27 Nov. Cycle 11 launches a smaller game that is fully playable, enjoyable and understandable: pick a body on the solar-system map, fly its missions, grow the agency through solar-system progress. Anything too complex or needing too much prior work is **deleted from the codebase** (not hidden). These features return in a later release on the simpler flow, reusing much of the same code and flow, but the old implementations were not good and are reference only.

- Last commit before any removal: git tag `pre-simplification-cycle11`. Read a deleted file with `git show pre-simplification-cycle11:<path>`.
- Linear project: "Landnam — Parked from cycle 11 (return later, simpler)" (P-SSL-33). One issue per parked feature.
- Saved-state fields are kept in the data model so old saves are never reset. A save resting on a removed screen lands on the Base (`RETIRED_SCREENS` in `web/lib/game-screens.ts`, applied by `repairStateRoute`).
- Kept for now: citizen science (TESS, asteroid, Saturn, ground telescopes, Agency Hub, probes), events and community, meta screens (log, ledger, planner, programme), mining and its variants.

## What was cut

Decided by Liam: building and construction (Hub placement, build screen, upgrades, subsurface, silo panel), rocket builder and hangar, and the economy extras (refinery, market screen and price alerts, laser capacitor, delivery and belt-courier transport runs, client contracts).

| Feature | Removed in | Notes |
| --- | --- | --- |
| Refinery screen | commit 189d4860 | Recipes in `web/lib/data/structures.ts` and `refineryQueue` state stay. |
| Exchange market screen, price alerts UI, `M` shortcut | commit 97310320 | Pricing in `EconomySystem` and `MarketplaceSystem`, and `priceAlerts` state stay. |
| Build screen, placement mode, arrange, building upgrades, Unplaced tray, annex placing, Build menu entries | this commit | The Base is a fixed starter Base: launchpad, hangar, Agency Hub, silo. `placed`, `placementPlots`, `buildingLevels`, `baseArrangement` stay in saves and agency levels still read them. Old tutorial step "Place the launchpad" is gone. |
| Subsurface view (excavate, underground rooms, mineral vault) | this commit | `subsurfaceExcavated`, `subsurfaceBuilt` state and `SUBSURFACE_*` data stay. The Surface Silo panel stays. |
| Scenes `build`, `hub-subsurface`/`subsurface`, `hub-structures`, `storage-build`, `hub-unplaced` tray, `hub-buildings-l2`, `hub-buildings-l3` | this commit | Fixtures `ui-build`, `ui-subsurface`, `ui-subsurface-dug-out`, `storage-hub`, `storage-build` deleted. |
| Free Ops "Storage Silo" activity, the Exchange on the starter Base | this commit | New games start with launchpad, hangar, Agency Hub and silo. |
| Laser capacitor purchase in the debrief | commit after 9d2350fd | `laserCapacitorLevel` state and `laserCapacitorBonus` stay, so a bought capacitor still gives its extra charges. |

## Client contracts stay, without their own screen

Client contracts are kept as missions. They appear in a location's "Client missions" list on the solar-system map, next to its agency missions, with no separate menu, tab or screen. The old Contracts tab (paged offer strip, group filters) and the Program tab on the Mission Board are deleted (they were already unreachable); the commit is the one that added this section.
