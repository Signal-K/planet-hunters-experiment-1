---
id: fwzxys
title: 'Fix survey triggers: gate surveys behind mechanic use'
status: done
priority: high
labels:
  - project-landnam
  - surveys,ux,mobile
createdAt: '2026-03-23T00:48:49.657Z'
updatedAt: '2026-03-23T00:57:24.355Z'
timeSpent: 0
assignee: '@Liam'
---
# Fix survey triggers: gate surveys behind mechanic use

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Surveys appear too early. Return-visit survey fires 3s after load on 2nd session regardless of game state. Need to gate all surveys behind actual gameplay engagement and increase minimum delay.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Return-visit survey only fires after 30s+ of active gameplay
- [x] #2 No survey fires within first 10s of page load
- [x] #3 Mechanic-specific surveys only fire after those mechanics are used
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added _gameEngagementTs flag set on first game message. maybeTriggerMicroSurvey and maybeTriggerFirstMissionSurvey both gate on 30s engagement. maybeShowReturnVisitSurvey now checks every 15s starting at 30s (not 3s). Removed early setTimeout.
Refined: removed broad 30s timer gate entirely. Return-visit survey now uses _pendingReturnVisitSurvey flag set on 2nd session load; fires only when a completion event fires (rocket_landed, mining_run_completed, contractor_signed, mission_debrief_resolved, scanner_scan_completed). All other surveys already event-gated.
<!-- SECTION:NOTES:END -->

