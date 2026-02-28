---
id: 1428vo
title: 'Planet Hunters first-boot intro: citizen science context splash'
status: done
priority: high
labels:
  - citizen-science
  - onboarding
  - ux
  - experiment1
createdAt: '2026-02-28T09:42:46.809Z'
updatedAt: '2026-02-28T09:52:35.089Z'
timeSpent: 120
---
# Planet Hunters first-boot intro: citizen science context splash

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Show a full-screen splash ONCE on first launch that explains the Planet Hunters mission and citizen science connection. Users currently jump straight into tutorial mechanics with no science framing. This is the opening hook.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Splash shown once on first launch, never again (persisted flag)
- [x] #2 Content: Planet Hunters wordmark, 1 paragraph explaining real TESS/asteroid data, 'Start Mission' CTA
- [x] #3 Skip/dismiss button always visible
- [x] #4 Implemented as CanvasLayer overlay in AppController, shown before tutorial begins
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ PlanetHuntersIntroSplash.gd: full-screen overlay with planet hunters branding, body explaining real science, Begin Mission CTA
✓ Shown once via user://planet_hunters_intro_v1.cfg flag
✓ AppController._show_intro_splash_if_needed() integrates it
✓ Tutorial overlay suspended while splash is visible
<!-- SECTION:NOTES:END -->

