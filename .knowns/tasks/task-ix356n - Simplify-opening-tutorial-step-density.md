---
id: ix356n
title: Simplify opening tutorial step density
status: done
priority: high
labels:
  - project-landnam
  - tutorial
  - ux
  - onboarding
createdAt: '2026-03-05T12:54:39.586Z'
updatedAt: '2026-03-06T03:54:50.361Z'
timeSpent: 1
assignee: '@me'
---
# Simplify opening tutorial step density

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reduce first-tutorial cognitive load by shortening early copy, reducing simultaneous guidance cues, and making Mission 1 opening sequence easier to parse based on latest playtest feedback screenshot.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mission 1 opening guidance uses concise text with one clear action at a time
- [x] #2 Visual guidance intensity is reduced during the earliest onboarding steps
- [x] #3 Tutorial progression/tests remain passing for existing step action keys
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep existing action keys/order intact, but rewrite Mission 1 opening copy (first 3-4 steps) to be shorter and directive.
2. Reduce early-step visual intensity in TutorialCoachOverlay (disable line/arrow/click-label for first onboarding steps; keep target highlight only).
3. Make action label cleaner (remove repetitive prefix) so panel reads as one command.
4. Run tutorial test suite and adjust any expectations only if they rely on copy, not behavior.
5. Record notes, check AC, and prepare summary for review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Shortened Mission 1 opening copy to single-action instructions (tour open/close, sign contractor, create rocket, select target).
- Reduced early-step guidance intensity in TutorialCoachOverlay for opening actions: keep highlight box, hide guide line/arrow/click label, disable target flash.
- Simplified action label text to direct navigation hints (removed repetitive "Next click:" prefix).
- Verified behavior with headless tutorial tests.

## Validation
- Command: HOME=/tmp /Users/scroobz/godot-src/bin/godot.macos.editor.arm64 --headless --path scene -s tests/run_tutorial_tests.gd
- Result: 7/7 passed.
<!-- SECTION:NOTES:END -->

