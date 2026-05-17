---
id: ogipov
title: 'Show ''Free Operations unlocked'' messaging when M4 completes'
status: done
priority: medium
labels:
  - project-landnam
  - gameplay
  - ux
  - progression
createdAt: '2026-03-16T17:52:06.585Z'
updatedAt: '2026-04-11T03:59:56.395Z'
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
## FreeOpsUnlockOverlay redesign (branch: claude/redesign-control-panel-siBXM)
Full-screen overlay redesigned to match Google Stitch prototype:
- TopBar (dark green): telemetry readouts
- Header: "SYSTEM STATE: UNRESTRICTED_ACCESS" + "FREE OPERATIONS" big title
- 2×3 grid of cards:
  Row 1: SectorsCard (LOCAL_SECTORS, 3 sectors), QueuesCard (CONSTRUCTION_QUEUES), AssetCard (X-97 CERES)
  Row 2: GaugeCard (dark green, 99.8% INTEGRITY), PartnersCard (CORPORATE_PARTNERS), TelemetryCard (FLEET_TELEMETRY with progress bars)
- BottomBar: ● OPTIMAL FLIGHT PATH: CALCULATED | LOGS | START RUN 🚀
Screenshot: user://ux_screenshots/panel_redesign/05_05_free_operations.png
<!-- SECTION:NOTES:END -->

