---
id: md41lh
title: Normalize runtime logging and remove debug noise
status: done
priority: high
labels:
  - project-landnam
  - refactor
  - logging
  - cleanup
createdAt: '2026-02-26T01:52:06.116Z'
updatedAt: '2026-02-26T02:01:20.392Z'
timeSpent: 401
assignee: '@me'
parent: blav3e
---
# Normalize runtime logging and remove debug noise

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace noisy print calls in runtime flows with Logger utility and guard verbose logs behind debug flags.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Core runtime scripts no longer emit excessive unguarded prints
- [x] #2 Logger utility is used in key systems with clear severity levels
- [x] #3 No gameplay behavior changes introduced by logging cleanup
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Replaced unguarded `print()` calls with `Logger` usage in core runtime/UI flows:
  - `AppController.gd`
  - `UIManager.gd`
  - `SatelliteStationPanel.gd`
  - `Launchpad.gd`
  - `LaunchpadLaunchButton.gd`
  - `LaunchpadSelectorPanel.gd`
  - `LaunchpadAnomalyFetcher.gd`
  - `LaunchpadRestorer.gd`
  - `RocketSpawner.gd`
  - `EarthSceneUIHelper.gd`
- Used `Logger.d` for verbose traces and `Logger.w` for recoverable issues.
- No gameplay logic changes; logging-only refactor.
<!-- SECTION:NOTES:END -->

