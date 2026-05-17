---
id: hdjceu
title: Remove non-Planet-Hunters surveys from PostHog project
status: done
priority: high
labels:
  - project-landnam
  - posthog
  - analytics
  - surveys
createdAt: '2026-02-28T06:21:56.504Z'
updatedAt: '2026-03-08T02:33:41.587Z'
timeSpent: 447
---
# Remove non-Planet-Hunters surveys from PostHog project

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The PostHog project (ID 199773) is shared across Star Sailors minigames. Active surveys for Bee Garden (Bumble) and DailySail are being shown to Planet Hunters Experiment 1 users because the PostHog JS SDK auto-displays all active popover surveys for a project token. These foreign surveys confuse Planet Hunters testers.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Surveys for Bee Garden/Bumble are archived or deleted from PostHog
- [x] #2 DailySail exit survey is archived or deleted from PostHog
- [x] #3 Only Planet Hunters-relevant surveys remain active in the project
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Archived 5 surveys via PostHog API:
- Quick Feedback: Hives and Orders (Bee Garden)
- Basics Completion NPS (Bee Garden)
- Quick Feedback: Classification (Bee Garden)
- Quick Feedback: Core Farming (Bee Garden)
- DailySail Exit Survey (v1)

Remaining active: Star Sailors Feedback, Open feedback, Webapp Loop Survey, Experiment 1 Exit Survey (Godot)

2026-03-08: Re-ran archiving. Previous run set archived:true but PostHog list filter had a bug masking it. Confirmed via direct field check all 6 non-PH popovers now archived: Hives/Orders, Basics NPS, Classification, Core Farming, DailySail v1, Webapp Loop Survey 2.2.
<!-- SECTION:NOTES:END -->

