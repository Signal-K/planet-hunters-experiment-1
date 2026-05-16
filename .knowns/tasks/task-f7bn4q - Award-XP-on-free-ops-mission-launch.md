---
id: f7bn4q
title: Award XP on free ops mission launch
status: done
priority: low
labels:
  - project-landnam
  - xp
  - progression
  - free-ops
createdAt: '2026-03-16T21:57:49.614Z'
updatedAt: '2026-03-16T22:06:44.409Z'
timeSpent: 31
assignee: '@me'
---
# Award XP on free ops mission launch

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AppController defines XP_AWARD_LAUNCH = 5 but it is never called for post-tutorial (free ops) mission launches. Level Progression doc lists mission launches as an XP source. Currently players only earn XP from debrief, making free ops progression feel slower than tutorial.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Launching a mission in free ops mode awards XP_AWARD_LAUNCH XP
- [x] #2 XP award fires at launch, not at debrief, so cancelled missions still reward exploration
- [x] #3 Tutorial missions (M1-M4) are unaffected (already award XP correctly)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Already implemented: LaunchpadLaunchButton._award_launch_experience() is called on every successful launch (line 224, after set_ok check). No condition gates it to tutorial-only. XP_AWARD_LAUNCH=5 applies to all launches including free ops.
<!-- SECTION:NOTES:END -->

