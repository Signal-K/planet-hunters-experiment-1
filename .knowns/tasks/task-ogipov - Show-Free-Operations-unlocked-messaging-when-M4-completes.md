---
id: ogipov
title: Show 'Free Operations unlocked' messaging when M4 completes
status: done
priority: medium
labels:
  - gameplay
  - ux
  - progression
createdAt: '2026-03-16T17:52:06.585Z'
updatedAt: '2026-03-16T21:23:37.146Z'
timeSpent: 0
assignee: '@me'
---
# Show 'Free Operations unlocked' messaging when M4 completes

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Post-M4 spec (2026-03-10) explicitly states: 'Free Operations unlock should be shown explicitly in UI messaging.' When mission stage crosses into Free Ops (post-M4), show clear messaging that free operations are now available with brief explanation of the two routes (contract, survey).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When M4 completes, player sees a clear 'Free Operations unlocked' moment (overlay, banner, or debrief callout)
- [x] #2 Messaging explains the two routes: contract (work for a contractor) and survey (scan and discover)
- [x] #3 Shown only once; persisted so it does not re-trigger on subsequent sessions
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
earth_base_1.gd: _maybe_show_free_ops_unlock() called deferred from _ready. Triggers when completed_mission_count >= 4. Shows animated overlay with route cards (Contract/Survey) and CTA to launchpad. Persisted in rocket_unlock_popups.cfg under free_ops_unlock_seen key. Shows once only.
<!-- SECTION:NOTES:END -->

