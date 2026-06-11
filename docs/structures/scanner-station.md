# Scanner Station — Stashed for Post-MVP

> Status: **Not part of the M1-M3 MVP.** Per the Landnam audit (Conflict 4),
> the scanner station is deferred until after the first shippable version.
> This document preserves the design ideas, costs, and unlock logic so the
> feature can be re-introduced later without re-deriving it from scratch.

## Concept

A buildable structure (alongside Launchpad, Control Base, Satellite Uplink,
Refinery, Vehicle Garage in `web/lib/data.ts` `STRUCTURES`) that would scan
nearby targets to reveal hidden mineral deposits or candidate exoplanets
before launch, reducing the guesswork in target selection.

## Proposed unlock & cost (pre-audit values)

- Unlock gate: after Tier 2 progression (mirrors Satellite Uplink/Refinery
  unlock tier).
- Build cost: in the same order of magnitude as the Satellite Uplink
  (~1,200,000,000 ₣).
- Constants previously sketched for this feature (never implemented in the
  current Next.js codebase, only referenced informally):
  - `SCANNER_BUILD_COST`
  - `SCANNER_UNLOCK_COMPLETED_MISSIONS`

## Asset notes

- The art asset `scanner_array_t2.png` was repurposed as the Tier 2 laser
  drill icon (`laser-t2` part) and has been renamed to
  `web/public/parts/laser_drill_t2.png` to avoid implying scanner
  functionality exists. If the scanner station is built, source new art
  rather than reclaiming this asset.

## Re-introduction checklist

1. Add a `scanner` entry to `STRUCTURES` in `web/lib/data.ts` with a real
   build cost and `unlocksAt` tier.
2. Add scan-related state to `GameState` in `web/game-context.tsx` (e.g.
   `scannedTargets: string[]`).
3. Add a build action and HUD affordance for triggering a scan.
4. Add UI to reveal hidden target/mineral info once scanned.
5. Update tutorial steps in `web/lib/data.ts` only if the scanner becomes
   part of the core M1-M3 loop (it should not be, per the MVP scope).
