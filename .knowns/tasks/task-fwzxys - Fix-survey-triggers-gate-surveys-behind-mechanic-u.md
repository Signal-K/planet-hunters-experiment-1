---
id: fwzxys
title: 'Fix survey triggers: gate surveys behind mechanic use'
status: done
priority: high
labels:
  - surveys,ux,mobile
createdAt: '2026-03-23T00:48:49.657Z'
updatedAt: '2026-03-23T00:51:04.975Z'
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
<!-- SECTION:NOTES:END -->

