---
id: i150kw
title: >-
  Tutorial controller may be null during first-frame action recordings due to
  deferred add_child
status: done
priority: medium
labels:
  - tutorial
  - bug
  - initialization
  - timing
createdAt: '2026-02-28T04:27:52.944Z'
updatedAt: '2026-02-28T07:06:49.006Z'
timeSpent: 0
---
# Tutorial controller may be null during first-frame action recordings due to deferred add_child

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AppController._ensure_tutorial_runtime() adds the TutorialController node via call_deferred('add_child', ...), meaning _tutorial_controller may still be null when record_tutorial_action is first called (e.g. open_launchpad fires on the same frame as scene load). AppController.record_tutorial_action silently returns false when _tutorial_controller is null. These missed actions are never replayed, leaving the tutorial stuck. Also, the signal connection on line 66-67 attempts to connect before the node is added to the tree, so the connection may fail. Fix: either use await or a ready signal pattern to ensure the tutorial controller is initialized before accepting actions, or queue missed actions for replay once the controller is ready.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tutorial action recordings that fire before TutorialController is added to the tree are queued and replayed once it is ready
- [x] #2 open_launchpad tutorial action is reliably recorded on the first interaction even in the first scene load frame
- [x] #3 Signal connection to tutorial_state_updated succeeds reliably
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AppController now queues actions in _pending_tutorial_actions when controller not yet in tree, and drains via controller.ready signal (CONNECT_ONE_SHOT). record_tutorial_action checks is_inside_tree() before forwarding.
<!-- SECTION:NOTES:END -->

