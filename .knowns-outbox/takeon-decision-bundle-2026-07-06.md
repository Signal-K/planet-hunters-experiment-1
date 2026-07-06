---
title: Takeon integration decision bundle
description: User answers to grouped Takeon-related planning questions for Landnam and Star Sailors.
tags:
  - project-landnam
  - takeon
  - decisions
---

# Takeon Integration Decision Bundle

Collected on 2026-07-06 from grouped workspace questions about `takeon`.

## Resolved Direction

1. **Scope:** `takeon` should be treated as a shared Star Sailors module, not Landnam-only.
2. **Module split:** Splitting into pieces such as world state, terrain, rover, settlements/construction, scanning, and missions is acceptable; exact package boundaries can be decided during implementation.
3. **Near-term surface:** This belongs to a future mission once landing on targets is available. For now, build it as a local demo page rather than wiring it into the live mission loop.
4. **Current Landnam scenes:** Keep the existing Landnam scenes mostly as-is for this year's current work.
5. **Runtime:** PixiJS remains the direction for non-takeon Landnam scenes. Takeon itself may use the runtime that best fits its demo/integration needs.
6. **First Takeon-backed mechanic:** Exploration is the first mechanic to prove.
7. **Bumble reuse:** No plan yet for Bumble or other Star Sailors games to reuse `takeon`; do not design around that as an immediate requirement.
8. **Shared schema:** Persistent state should use a shared schema that Star Sailors frontends can read/write.
9. **Offline support:** `takeon` should be fully offline from the start.
10. **Notifications:** Notification hooks/events are for next week's sprint, not the current slice.
11. **Current goal:** Integration and basic capacity are the current goal.

## Implications For Existing Work

- Treat existing rover/survey/construction tickets as downstream consumers of this direction, not as blockers for the first demo page.
- Keep M1-M3 onboarding untouched.
- Do not require citizen-science, notification, or Bumble integration for the first slice.
- The first implementation should demonstrate that the module can mount locally, persist state offline, and support a basic exploration loop/capacity model.

## Related Workspace Items

- `task-urxlq9` — Modular rover research and upgrade system
- `task-21r02s` — Conveyor/rover landing animation
- `task-1vn4ha` — Starter rover on-world mining loop prototype
- `task-patoqr` — Survey/exploration mission seed templates
- `task-s0q12u` — Survey scan minigame
- `task-6g8eh6` — Satellite complete-scan mission system
- `task-4tva5p` — PixiJS target interaction scene for construction placement
- `task-k1k2pn` — Construction and survey templates for high-affinity contractors
- `task-150eoa` — Construction mission seed/template catalog
- `task-wnsp4a` — Advanced construction: settlements, refineries, research labs
- `task-f93i0h` — Citizen-science satellite mission type/state
- `task-3jcu5z` — Exoplanet visit/follow-up mission loop
