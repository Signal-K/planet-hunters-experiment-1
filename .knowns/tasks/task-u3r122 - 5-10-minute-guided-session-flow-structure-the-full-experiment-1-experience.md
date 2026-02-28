---
id: u3r122
title: '5-10 minute guided session flow: structure the full experiment-1 experience'
status: done
priority: high
labels:
  - ux
  - session-design
  - experiment1
  - flow
createdAt: '2026-02-28T09:49:34.582Z'
updatedAt: '2026-02-28T10:07:17.323Z'
timeSpent: 127
---
# 5-10 minute guided session flow: structure the full experiment-1 experience

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The experiment needs a defined, paced flow that takes users from first boot to survey completion in 5-10 minutes. Currently a user can complete M1 in ~5 min but there is no 'session arc' — no clear beginning (intro), middle (mission), or end (contribution + survey). This ticket defines and implements the session structure.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Session arc: Intro splash (30s) → M1 tutorial flow (4-5 min) → Science image moment during transit → Debrief with science card → Survey prompt → Done
- [x] #2 A 'Mission Complete' beat plays after M1 debrief is resolved before survey triggers
- [x] #3 FeedbackBeacon is prominent on the earth_base hub so users can always access help
- [x] #4 The session flows linearly for first-time users with no dead ends
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AC1: full session arc complete (intro splash→tutorial→science transit→debrief science card→survey). AC2: Mission Complete beat added to MissionDebrief, auto-dismisses after 2.5s. AC3: FeedbackBeacon now applies PanelStyle (blue primary button). AC4: linear flow verified—no dead ends, tutorial always advances.
<!-- SECTION:NOTES:END -->

