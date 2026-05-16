---
id: dby1wj
title: 'Starter flow: contractor-first onboarding + guided mission order'
status: done
priority: high
labels:
  - project-landnam
  - onboarding
  - tutorial
  - contractor
  - mining
  - debrief
createdAt: '2026-03-03T22:09:18.985Z'
updatedAt: '2026-03-04T12:18:26.831Z'
timeSpent: 1180
assignee: '@me'
---
# Starter flow: contractor-first onboarding + guided mission order

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update early-game flow so players complete a minimal tour, choose one of three starter contractors, fulfill contractor mineral order in mining, and get affinity-based debrief/retry behavior for early missions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 First-run onboarding includes a short in-game tour before mission actions.
- [x] #2 Player selects one of three starter contractors with clear thematic descriptions (military tech, consumer electronics, space innovation).
- [x] #3 Mining UI shows active contractor mineral order targets during early missions.
- [x] #4 Early mission debrief hides sell actions and instead evaluates contractor order completion with affinity feedback.
- [x] #5 If early mission mining ends without meeting contractor order, mission restarts instead of progressing debrief payout flow.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend tutorial stage 1 to start with a short guided base tour and a contractor-signing step before launch.
2. Add starter contractor contract data (3 options, improved thematic copy, per-contractor mineral order variants) and persist selected starter contractor + mission order.
3. Update launchpad stage-1 UI to require contractor selection before target/launch and record tutorial action for contractor signing.
4. Add mining HUD order tracker (top section) showing required minerals + progress for selected starter contractor mission.
5. Update early mission debrief flow: hide sell/scrap actions, evaluate contract completion, award contractor affinity, and show recap messaging.
6. Enforce early-mission failure behavior: if mining session ends without meeting order, trigger mission restart loop instead of normal debrief progression.
7. Run targeted tests (unit + e2e subset) and adjust any tutorial action mappings/checklists impacted by new action keys.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added stage-1 quick base tour step (Control Station) before launch flow.
- Added three starter contractors with updated thematic copy and per-contractor Iron/Nickel order variants.
- Gated stage-1 launch flow on contractor signing in Launchpad selector and launch button validation.
- Added mining top HUD order tracker with live collected/required progress and completion state.
- Added early debrief recap mode (no sell/scrap controls) that evaluates order completion and awards contractor affinity.
- Added early mission restart loop: incomplete starter order after mining completion triggers immediate mining restart.

## Verification
- `npm run test:unit` passed (4 suites / 21 tests).
- `npm run test:e2e -- --grep "SP14"` passed.
- `npm run test:e2e` ran; 26 passed, 2 narrative survey tests failed (NP03, NP05) unrelated to starter-flow logic.

✓ Follow-up fix: added explicit Control Station close step, removed hard open_launchpad stage-1 step, added close action recording, improved contractor step fallback guidance, and ensured launchpad selector panel is auto-created/shown in earth_launchpad.

✓ Verification rerun after tutorial-flow follow-up: npm run test:unit passed; npm run test:e2e -- --grep "SP14" passed; full npm run test:e2e now 28/28 passed.

✓ Verification: npm run test:unit passed; npm run test:e2e passed (28/28).
<!-- SECTION:NOTES:END -->

