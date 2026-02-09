---
id: lewk9z
title: Fix legacy split logbook entries + enforce ordered tutorial progression
status: done
priority: high
labels:
  - bug
  - logbook
  - tutorial
  - progression
createdAt: '2026-02-08T08:25:55.347Z'
updatedAt: '2026-02-08T08:29:38.322Z'
timeSpent: 0
assignee: '@me'
---
# Fix legacy split logbook entries + enforce ordered tutorial progression

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
1) Collapse existing sell/scrap split entries from same mission into one record and keep future writes merged. 2) Replace free-form tutorial hint triggering with ordered step progression (scan -> build -> mine -> return...) so hints do not fire out of sequence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Legacy split sell/scrap mission entries with same badge are merged into one visible mission record
- [x] #2 Future debrief actions for one mission remain one record
- [x] #3 Tutorial hints only trigger in configured sequence order
- [x] #4 Tutorial hints no longer fire at unrelated times after progression state advances
<!-- AC:END -->

