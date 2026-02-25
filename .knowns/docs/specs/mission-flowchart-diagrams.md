---
title: Mission Flowchart Diagrams
createdAt: '2026-02-25T09:57:01.332Z'
updatedAt: '2026-02-25T09:57:21.839Z'
description: Visual mission flowcharts for M1-M5 decision paths and outcomes
---
# Mission Flowchart Diagrams

These flowcharts visualize the mission progression described in @doc/specs/mission-system-specification.

## Mission 1 (M1) - Linear Tutorial Flow

```mermaid
flowchart TD
  A[Start M1] --> B[Build Starter Rocket 1]
  B --> C[Launch to Training Asteroid A]
  C --> D[Mine Resources]
  D --> E[Return to Earth]
  E --> F[Debrief Choice]
  F --> G{Payout Action}
  G -->|Sell/Scrap/Salvage| H[Mission Complete]
  H --> I[Unlock Mission 2 + SR2]
```

## Mission 2 (M2) - Upgrade Decision Path

```mermaid
flowchart TD
  A[Start M2] --> B{Has Starter Rocket 2?}
  B -->|No| C[Build/Unlock SR2]
  C --> D[Select Predefined Target B]
  B -->|Yes| D
  D --> E[Launch + Mine with L2]
  E --> F[Return + Debrief]
  F --> G{Payout Action}
  G -->|Complete| H[Mission Complete]
  H --> I[Unlock Mission 3 + Scanner Access]
```

## Mission 3 (M3) - Scanner Unlock and Target Selection

```mermaid
flowchart TD
  A[Start M3] --> B{Scanner Station Built?}
  B -->|No| C[Build Scanner Station (2B F)]
  C --> D[Run First Scan]
  B -->|Yes| D
  D --> E[View 5 Asteroids]
  E --> F{Choose Reachable Target}
  F -->|Blocked| E
  F -->|Valid| G[Launch + Mine + Return]
  G --> H[Debrief Complete]
  H --> I[Unlock Mission 4 + SR3]
```

## Mission 4 (M4) - Planet Toggle and Long-Range Exploration

```mermaid
flowchart TD
  A[Start M4] --> B{Has SR3?}
  B -->|No| C[Build/Unlock SR3]
  B -->|Yes| D[Open Scanner]
  C --> D
  D --> E[Toggle Target Type to Planets]
  E --> F[Select Planet Target]
  F --> G{Range/Level Check}
  G -->|Fail| E
  G -->|Pass| H[Launch + Mine Rare Minerals]
  H --> I[Debrief with Multi-Buyer Context]
  I --> J[Mission Complete]
```

## Mission 5 (M5) - Contractor Choice and Effects

```mermaid
flowchart TD
  A[Start M5] --> B[Show Contractor Offers]
  B --> C{Choose Contractor}
  C -->|Rocketlab| D[Apply Build Discount Path]
  C -->|Astroforge| E[Apply Payout Bonus Path]
  D --> F[Select Contract Asteroid]
  E --> F
  F --> G[Launch + Mine Requested Minerals]
  G --> H[Return + Debrief]
  H --> I{Apply Terms}
  I -->|Discount/Payout + Cap| J[Finalize Reward]
  J --> K[Increase Contractor Affinity]
```

## Notes

- M1 is intentionally linear for onboarding.
- M2 introduces upgrade dependency before launch.
- M3 introduces first meaningful target-choice branch.
- M4 introduces target-type toggle and hard range gating.
- M5 introduces strategic contractor branching with capped outcomes.
