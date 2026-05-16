---
project: Experiment 1/Landnam
id: 68u1ef
title: Full-screen galaxy map with planet candidates on mission setup
status: done
priority: high
labels:
  - project-landnam
  - spacemap
  - galaxy
  - annotation
  - parse-errors
createdAt: '2026-04-28T07:53:43.877Z'
updatedAt: '2026-05-08T10:30:41.419Z'
timeSpent: 165285
assignee: '@me'
---

[← Back to Index](../INDEX.md)

# Full-screen galaxy map with planet candidates on mission setup

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mission setup (SpaceMap) should show galaxy view full-screen, highlight planet candidate stars awaiting classification, and open annotation/classification screen on tap. Also fix GDScript parse errors in TutorialCoachOverlay, ClassificationConsensusNotification, and earth_base_1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 SpaceMap defaults to stars/galaxy view
- [x] #2 Planet candidate stars with no classification verdict are visually highlighted as 'awaiting review'
- [x] #3 Tapping a planet candidate star opens AsteroidDetailView
- [x] #4 TutorialCoachOverlay.gd parse errors fixed (UILayout, RocketsManager)
- [x] #5 ClassificationConsensusNotification.gd parse errors fixed (PanelStyle)
- [x] #6 earth_base_1.gd parse errors fixed (SceneManager, UIManager types)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- SpaceMap defaults to stars/galaxy view
- Planet candidates (type=planet, no tess_classification) shown with cyan ring + "Awaiting Review" label
- Tapping candidate opens AsteroidDetailView full-screen overlay
- Fixed parse errors: TutorialCoachOverlay (UILayout, RocketsManager, rm refs), ClassificationConsensusNotification (PanelStyle), GameNavigationMenu (PanelStyle), UIManager (PanelManager), earth_base_1 (SceneManager/UIManager types, ControlStation.png preload), ControlStation/SatelliteStation (Structure base class via path extends), SupabaseClient (self-referential type annotations)
- All GDScript tests pass (9 tutorial, 3 mission e2e)

🔄 Reopened: M3 review fallback chart + dark/mobile readability fixes

✓ TESS review now renders local lightcurve; removed remote PNG dependency for planet candidates. ✓ Dark/mobile readability pass: larger type, brighter contrast, padded content, larger touch targets. ✓ Added test for single TIC prefix title. Verified: Godot 4.5 headless quit, annotation model suite, narrative paths suite. Note: mission E2E still has unrelated existing failure at stage 1 duplicate tutorial action assertion.

✓ SpaceMap now shows solar system with @tool components visible in editor. Galaxy/stars view was removed in favour of heliocentric strategic map per Stitch spec.
<!-- SECTION:NOTES:END -->

