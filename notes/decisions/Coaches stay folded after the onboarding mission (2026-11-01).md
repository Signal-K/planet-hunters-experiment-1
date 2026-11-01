---
type: decision
title: Coaches stay folded after the onboarding mission
project: Landnam
status: decided
created: 2026-11-01
---

# Coaches stay folded after the onboarding mission (2026-11-01)

Decided by Liam (Freeform board "Landnam 31/10/2026", SSL-727).

## Decision

- Once the onboarding mission (the mining try) is complete, the coach for every later mission
  or activity is hidden by default: it takes up valuable screen space.
- Hidden means folded to its "?" chip. The player opens it with the chip, and a Menu replay of
  a training try opens it too.
- The same goes for help sheets that used to open by themselves on a first visit (telescope,
  Control Station): after onboarding they stay behind their "?" button.
- Web: `onboardingMissionDone` and `completeFlightPlanEvent` in `lib/systems/FlightPlanSystem.ts`.
  iOS: `FlightPlanProgress.onboardingMissionDone` and `complete(_:)`.
