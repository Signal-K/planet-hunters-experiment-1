---
id: 05fjgo
title: Add PostHog micro-surveys for uncovered game mechanics
status: done
priority: high
labels:
  - project-landnam
  - analytics
  - posthog
  - surveys
createdAt: '2026-03-08T01:05:56.289Z'
updatedAt: '2026-03-08T01:06:13.909Z'
timeSpent: 0
---
# Add PostHog micro-surveys for uncovered game mechanics

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Four in-game micro-surveys (1-2 questions each) were identified and created to cover mechanics not addressed by the existing exit survey: contractor signing, mining feel, real science awareness, and mission progression clarity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Contractor survey triggers after first contractor is signed
- [x] #2 Mining survey triggers after first mining run completes
- [x] #3 Science awareness survey triggers after first scanner scan
- [x] #4 Progression clarity survey triggers after mission 2, 3, 4 debrief (once per stage)
- [x] #5 No survey overlaps with exit survey or other micro-surveys
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implemented 2026-03-08

**4 surveys created in PostHog:**
- Contractor First Impression → `019ccaf8-4299-0000-b3ad-92a57ab75b95`
- Mining Loop Feel → `019ccaf8-c4d8-0000-901b-aa850dfd43c5`
- Real Science Awareness → `019ccaf9-0259-0000-d411-e11fdc643d97`
- Mission Progression Clarity → `019ccaf9-3453-0000-b6b9-0e41fcae8f1c`

**Files changed:**
- `react-shell.js`: Added MICRO_SURVEY_KEYS/IDS constants, maybeTriggerMicroSurvey helper, 4 trigger functions, wired into onGameMessage
- `scene/Scripts/Earth/LaunchpadSelectorPanel.gd`: Added contractor_signed analytics emit in _on_starter_contractor_pressed
<!-- SECTION:NOTES:END -->

