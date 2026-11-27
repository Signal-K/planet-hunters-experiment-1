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
| Refinery screen | see git log, subject "Refinery" | Recipes in `web/lib/data/structures.ts` and `refineryQueue` state stay. |
