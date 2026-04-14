---
id: 6ji55g
title: Scanner station soft cooldown
status: done
priority: low
labels:
  - scanner
  - free-ops
  - pacing
createdAt: '2026-03-16T21:57:45.724Z'
updatedAt: '2026-03-16T22:06:08.327Z'
timeSpent: 73
assignee: '@me'
---
# Scanner station soft cooldown

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Scanner can be used infinitely — no cooldown exists. Free Ops spec (2026-03-10) decision lock specifies a soft cooldown (not hard lock). Players should feel pacing between scans. Suggested: 3-scan daily limit that resets, or a timer (e.g. 15 min between scans) shown in scanner UI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Scanner has a soft cooldown (e.g. max 3 scans per session or timed cooldown between scans)
- [x] #2 Scanner UI shows cooldown timer or remaining scan count
- [x] #3 Cooldown is soft: player sees a warning but can still scan after dismissing (per spec decision)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Scanner cooldown was already fully implemented (SCANNER_SOFT_COOLDOWN_SECONDS=120, _try_start_scan_with_cooldown, button countdown). Added soft bypass: 'Scan early' button appears when cooldown active, resets cooldown and triggers scan immediately.
<!-- SECTION:NOTES:END -->

