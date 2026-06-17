# Mission Flowchart Diagrams

> Canonical flowcharts for M1–M3 mission decision paths.
> M4 and M5 sections were removed — they documented features that no longer exist.
> Source of truth: @doc/Landnam-docs_specs_missions_mission-flowchart-diagrams in Knowns.

## Mission 1 (M1) - Linear Tutorial Flow

```mermaid
flowchart TD
  A[Start M1] --> B[Build Launchpad<br/>coach step 0]
  B --> C[Hub → Missions nav<br/>coach step 1]
  C --> D[Pick M1 — Iron Starter Run<br/>coach step 2]
  D --> E[Pick target asteroid<br/>coach step 3]
  E --> F[Fabricator: assemble SR1<br/>coach step 4]
  F --> G[Launch → Mine 6 iron → Return]
  G --> H[Debrief → Sell]
  H --> I[M1 Complete]
  I --> J[SR2 Unlock Popup<br/>hull-mk2 + fusion-b2 + laser-t2]
```

## Mission 2 (M2) - Rocket Fabricator Tutorial

> M2 is a direct repeat of the M1 mining loop with a higher cargo requirement that forces
> the player to use the Fabricator to upgrade their hull. No Control Station, no TESS,
> no Satellite.

```mermaid
flowchart TD
  A[Start M2 — SR2 already unlocked] --> B[Hub coach step 20<br/>M2 needs 8 silicon — hull-mk2 holds 10]
  B --> C[Open Fabricator]
  C --> D[Fab coach step 21<br/>Swap Chassis slot to Hull MK2]
  D --> E[Pick M2 from Mission Board<br/>Silicon Bulk Order — 8 Si]
  E --> F[Pick silicon-rich asteroid target]
  F --> G[Launch → Mine 8 silicon → Return]
  G --> H[Debrief → Sell]
  H --> I[M2 Complete → M3 Unlocks]
```

### M2 Mechanical Gate
Hull MK1 cargo = 6 units. M2 requires 8 silicon. The player must open the Fabricator
and swap to Hull MK2 (cargo 10) before they can fill the order.

## Mission 3 (M3) - Exoplanet Target Selection

> Scanner Station purchase is possible from M3 onward but is **not** a hard gate before
> launch. Players may already have it built, or may build it during target selection.

```mermaid
flowchart TD
  A[Start M3] --> B[Open Target Picker]
  B --> C{Scanner available?}
  C --> |Yes| D[Run Scan — See classified targets]
  C --> |No| E[Select from default target list]
  D --> F{Choose Reachable Target}
  E --> F
  F --> |Blocked| B
  F --> |Valid| G[Launch + Mine + Return]
  G --> H[Debrief Complete]
  H --> I[SR3 Unlock → Free Operations]
```

## Notes

- M1 is intentionally linear for onboarding.
- M2 teaches the Fabricator: cargo upgrade is the only gate.
- M3 introduces target-choice and optional scanner usage — no hard scanner gate.
- There is no authored M4 or M5. Free Operations follows M3 directly.
