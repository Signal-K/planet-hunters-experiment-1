---
id: 5ierg4
title: Fix ux-tour failures and perform scene/script hygiene sweep
status: in-progress
priority: high
labels:
  - project-landnam
  - godot
  - cleanup
  - ux-tour
  - tech-debt
createdAt: '2026-03-28T04:40:26.281Z'
updatedAt: '2026-04-13T14:03:46.889Z'
timeSpent: 1385840
assignee: '@me'
---
# Fix ux-tour failures and perform scene/script hygiene sweep

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Address all issues surfaced by make ux-tour, remove or disable broken UX-tour blockers, audit oversized GDScript and duplicate/dead scene candidates, and move UI/button structure out of runtime code into scene files where appropriate. Context: @doc/specs/godot-hygiene-sweep-plan @doc/dev/scene-vs-script-refactoring-guide @doc/specs/in-scene-button-handbook
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 make ux-tour completes without current blocking errors and key UX-tour issues are either fixed or explicitly downgraded to non-blocking warnings
- [x] #2 High-confidence runtime-created UI/button nodes are moved to scene files or documented as intentionally dynamic
- [x] #3 Oversized/duplicate/dead scene or script candidates are identified, with safe removals/refactors completed or follow-up recommendations documented
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit recurring UI hygiene issues across active scenes: oversized translucent docks, runtime-built UI/dialogs, placeholder empty states, and panels relying on scroll/overflow to fit.
2. Refactor high-confidence runtime-built UI into .tscn-backed scenes for overlays/splashes/dialogs still created in code, starting with Earth base overlays, intro/mechanic overlays, and remaining debrief/preview shells.
3. Normalize active panel layouts across launchpad, control, satellite, menu, preview, and detail flows so side docks are bounded, center content remains visible, and empty states use proper scene/card composition.
4. Run targeted screenshot/test validation and fix-forward until the recurring issue class is removed or safely documented as intentionally dynamic.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Fixed the concrete launchpad regressions surfaced in this pass: selector/rocket clicks are now consumed correctly, shared nav no longer steals launchpad actions, and the mission tracker no longer competes with the launchpad setup UI.
- Continued the scene/script hygiene sweep by keeping more launchpad UI in scene-backed shells and stabilising layout bounds for the launchpad docks.
- Focused validation is green: launchpad flow, structure/layout, and narrative-path tests all pass.

## Remaining Blocker
- AC #1 is still blocked by the full Docker `make ux-tour` harness stalling in Phase 1 after loading `earth_base_1.tscn` under software OpenGL (`planet-hunters-ux-tour` container). The gameplay/UI fixes are in place, but the umbrella tour runner still does not fail fast or complete in that environment.

## Validation
- /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s tests/run_launchpad_ui_tests.gd
- /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s tests/run_structure_tests.gd
- /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s tests/run_narrative_paths_tests.gd
- `make ux-tour` still stalls in Docker during Phase 1

2026-04-14: Earth base now prioritizes active/armed mission context over build/next-mission cards; tutorial coach on Earth base reads active mission context instead of stale launchpad step copy. Verified run_earth_base_unlock_tests 3/3.
<!-- SECTION:NOTES:END -->

