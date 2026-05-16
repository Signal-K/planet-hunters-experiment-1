---
id: 12x898
title: Classification consensus notifications
status: done
priority: medium
labels:
  - project-landnam
  - citizen-science
  - social
  - notifications
createdAt: '2026-03-17T06:48:09.102Z'
updatedAt: '2026-04-11T03:59:42.330Z'
timeSpent: 680
assignee: '@me'
---
# Classification consensus notifications

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Near-term MVP of social layer: notify players when their TESS classification is backed up or challenged by another user.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Notification triggered when own classification is confirmed by another user
- [x] #2 Notification triggered when own classification is challenged by another user
- [x] #3 Notification shows: target ID, other user's classification, current consensus level
- [x] #4 Consensus level visible on classified targets in scanner and star map
- [x] #5 In-app notification (push if notifications MVP is live)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
SupabaseClient.fetch_table(table, query_qs, callback): generic GET added for both native + web.
RocketsManager.get_all_tess_classifications(): returns full {anomaly_id: verdict} dict.
ClassificationConsensus.gd: queries classifications table per anomaly the player voted on; detects when consensus forms or changes vs player verdict; persists to classification_consensus.json; consensus_label() for display.
earth_base_1.gd: _check_classification_consensus() runs on load; shows dismissable panel with confirm/challenge status for each updated target.
SatelliteStationPanelList: shows consensus label in subtitle for any target the player has classified.
## ClassificationConsensusNotification redesign (branch: claude/redesign-control-panel-siBXM)
Dark sci-fi modal fully redesigned with scene-first approach:
- StatusBar strip: BUFFER_STATE · SYNCHRONIZING... · PROTOCOL_V_9.2 ●
- CLASSIFICATION RESULTS title + × close button  
- "— BATCH UPDATE: N TARGET(S) PROCESSED" batch label
- TargetClassificationCard template (dark glass, chart placeholder, CONSENSUS / Agreement/Disagreement label, ActiveMissionBadge)
- EXP_GAINED / RANK_STATUS panel + ACKNOWLEDGE_RESULTS CTA
Screenshot: user://ux_screenshots/panel_redesign/01_01_classification_results.png

Dual-instance test verified (run_consensus_dual_test.sh):
- PILOT_ALPHA: TIC-4501, planet consensus, +840 EXP
- PILOT_BETA: TIC-4501, planet consensus, +720 EXP  
Both instances run simultaneously on separate Xvfb displays, exit 0.
Screenshots: user://ux_screenshots/consensus_dual/pilot_alpha/ and pilot_beta/
<!-- SECTION:NOTES:END -->

