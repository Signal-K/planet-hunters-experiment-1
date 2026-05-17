---
id: f31ywm
title: Implement mission onboarding overlays and briefing screens
status: done
priority: high
labels:
  - project-landnam
  - ux
  - onboarding
  - missions
createdAt: '2026-02-26T01:52:18.365Z'
updatedAt: '2026-02-26T02:20:42.053Z'
timeSpent: 135
assignee: '@me'
parent: blav3e
---
# Implement mission onboarding overlays and briefing screens

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add contextual mission guidance overlays and first-view briefing screens aligned with mission progression spec.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 M1-M5 each have clear onboarding/briefing content
- [x] #2 Briefings are skippable after first view
- [x] #3 Tutorial messaging is mission-contextual without wall-of-text regressions
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-enable mission briefing gate in LaunchpadSelectorPanel using mission stage data and mission_briefings_seen persistence in RocketsManager.
2. Add concise per-mission (M1-M5) briefing payloads with objective/mechanic-focused copy to avoid wall-of-text.
3. Ensure first-view behavior is gated once per mission and skippable thereafter (Skip + Continue actions both persist seen state).
4. Wire tutorial action breadcrumbs from briefing CTA paths and keep existing target-selection flow intact.
5. Add/update focused tests around briefing-seen persistence and gating behavior.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Re-enabled mission briefing gate in LaunchpadSelectorPanel using mission_briefings_seen persistence from RocketsManager.

✓ Added concise M1-M5 briefing UI card with objective/mechanic/loadout/reward/unlock summary; avoids wall-of-text.

✓ Added Continue + Skip Briefing actions; both mark briefing as seen and proceed to target selection.

✓ Added run_structure_tests coverage for mission briefing seen persistence (RocketsManager mark/is flow).

Note: verification in this pass is code-level/static only; no Godot runtime execution in sandbox.
<!-- SECTION:NOTES:END -->

