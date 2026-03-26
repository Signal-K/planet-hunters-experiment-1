---
id: 5ierg4
title: Fix ux-tour failures and perform scene/script hygiene sweep
status: in-progress
priority: high
labels:
  - godot
  - cleanup
  - ux-tour
  - tech-debt
createdAt: '2026-03-28T04:40:26.281Z'
updatedAt: '2026-03-28T04:42:47.758Z'
timeSpent: 0
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
- [ ] #2 High-confidence runtime-created UI/button nodes are moved to scene files or documented as intentionally dynamic
- [ ] #3 Oversized/duplicate/dead scene or script candidates are identified, with safe removals/refactors completed or follow-up recommendations documented
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce and triage make ux-tour failures/warnings, starting with the missing ziva_agent Linux GDExtension and the Launchpad/Tutorial first-load issues.
2. Fix the ux-tour blockers in code/config so the tour runs cleanly in Docker without missing-extension errors and with expected first-visit guidance visible.
3. Refactor high-confidence runtime-created UI/button elements into existing .tscn scenes, prioritising TutorialCoachOverlay and any launchpad HUD structure currently instanced from .gd.
4. Audit oversized scripts and low-reference scenes/templates, perform safe cleanup or scene splits where low-risk, and document the remaining follow-up candidates.
5. Re-run make ux-tour and targeted validation, then update task notes/checkoffs with residual non-blocking findings.
<!-- SECTION:PLAN:END -->

