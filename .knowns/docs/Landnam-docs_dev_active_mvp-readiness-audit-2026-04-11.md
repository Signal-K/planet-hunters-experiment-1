---
title: MVP Readiness Audit 2026-04-11
description: ''
createdAt: '2026-04-12T10:01:37.048Z'
updatedAt: '2026-05-13T08:07:48.780Z'
tags:
  - project-landnam
  - doc-kind-review
  - mvp
  - audit
---

[← Back to Index](../INDEX.md)

# MVP Readiness Audit — 2026-04-11

## Current call
The game is coherent and increasingly consistent, but it is not MVP-complete if MVP means production-ready citizen science. The hard blocker is production classification persistence.

## Ratings
- MVP readiness: 6.5 / 10
- Core loop stability: 8 / 10
- UX consistency: 7.5 / 10
- First-session clarity: 6 / 10
- Citizen-science credibility: 4.5 / 10 until persistence is live
- Installed-PWA-in-container confidence: skipped under the >500 MB rule

## MVP blocker
- `t8fm49`: live classifications do not persist to Supabase, so consensus is not actually live.

## UX findings
- Launchpad should remain spatial/sandboxy, but hierarchy and coaching need to reduce confusion without turning it into a wizard.
- Debrief only needs enough explanation to preserve trust.
- Control Station is optional and should not drive onboarding before multi-mission play exists.
- Candidate detail / annotation is a science-proof surface and needs MVP-grade framing.
- Scanner framing still needs stronger discovery-context messaging and better empty states.
- Emergency loan presentation needs to communicate stakes without overwhelming the base scene.

## Design work needed for MVP
- Launchpad coaching and hierarchy
- Debrief explanation clarity
- Candidate detail / annotation surface
- Scanner science-context framing
- Emergency loan modal behavior
- Empty-state quality for optional panels like Control Station and New Mission

## Constraint note
The installed-PWA-in-container step was skipped because the available container route already exceeded the user's >500 MB threshold.
