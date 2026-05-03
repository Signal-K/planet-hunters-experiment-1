---
id: 14z9mn
title: PostHog surveys not popping up — blank iframe poisons session survey gate
status: todo
priority: high
labels:
  - posthog,surveys,bug,analytics
createdAt: '2026-05-03T11:50:56.065Z'
updatedAt: '2026-05-03T11:50:56.065Z'
timeSpent: 0
assignee: '@Liam'
---
# PostHog surveys not popping up — blank iframe poisons session survey gate

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Root cause: when POSTHOG_PROJECT_TOKEN is not set in Vercel env vars, showInlineSurvey renders a blank PostHog iframe. This blank overlay still consumed the _surveyShownInThisBoot boot-level flag, blocking ALL subsequent micro-surveys for the entire session. Fix: maybeTriggerFirstMissionSurvey and maybeTriggerMicroSurvey now check for a valid PostHog project token before showing any iframe survey — if no token, they return early without poisoning the boot flag. Micro-surveys also no longer set _surveyShownInThisBoot (each has its own localStorage gate already). To enable surveys: set POSTHOG_PROJECT_TOKEN in Vercel environment variables.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 No blank survey overlay appears when PostHog is not configured
- [ ] #2 Micro-surveys are not blocked by the boot-level flag
- [ ] #3 POSTHOG_PROJECT_TOKEN is set in Vercel env and surveys display correctly
<!-- AC:END -->

