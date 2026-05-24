---
id: mn94m8
title: Add PostHog nav-test survey triggered by 3 launchpad-back cycles
status: done
priority: medium
labels:
  - survey
  - analytics
  - test
createdAt: '2026-05-24T15:19:07.734Z'
updatedAt: '2026-05-24T15:19:07.734Z'
timeSpent: 0
---
# Add PostHog nav-test survey triggered by 3 launchpad-back cycles

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Test survey to validate the in-game SurveyOverlay system works on web prod. Survey fires after the user opens New Mission then goes back 3 times. Uses a new count_and_fire() method on PostHogNativeSurveyBridge that has no web guard, so it works in the web export. Survey ID 019e5a8a-840d-0000-7d68-d43089c0fd61 created in PostHog US project 199773.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
<!-- AC:END -->

