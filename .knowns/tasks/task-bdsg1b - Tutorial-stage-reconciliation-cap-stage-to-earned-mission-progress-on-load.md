---
project: Experiment 1/Landnam
id: bdsg1b
title: 'Tutorial stage reconciliation: cap stage to earned mission progress on load'
status: done
priority: high
labels:
  - project-landnam
  - tutorial
  - bug
  - progression
createdAt: '2026-05-02T12:55:19.251Z'
updatedAt: '2026-05-02T12:57:27.413Z'
timeSpent: 0
---

[← Back to Index](../INDEX.md)

# Tutorial stage reconciliation: cap stage to earned mission progress on load

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TutorialController._refresh_stage_from_progress() only advances the stage forward but never caps it down. A broken save (tutorial stage > mission_stage_from_completed) leaves the player on the wrong mission guidance. Fix: if current_stage > stage_from_progress, reset stage to stage_from_progress and step to 0 so the correct guidance resumes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tutorial stage never exceeds the stage unlocked by completed mission badges
- [ ] #2 Player with 1 badge + control station not built always sees M2 build-control-station guidance, not M3 open-launchpad guidance
- [ ] #3 Regression test covers stage-too-high scenario
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed in TutorialController._refresh_stage_from_progress(): added downward cap when current_stage > stage_from_progress, clearing per-stage action/step records for rolled-back stages so reconciler does not re-fast-forward. Also patched the user tutorial_v2.cfg directly (reset to stage=2, cleared stale stage-2 completion records).
<!-- SECTION:NOTES:END -->

