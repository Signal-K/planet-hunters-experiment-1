---
id: gikw9m
title: 'Mission history: minimal settings / history panel'
status: done
priority: medium
labels:
  - ui
  - history
  - settings
createdAt: '2026-05-02T12:55:22.411Z'
updatedAt: '2026-05-08T10:31:01.233Z'
timeSpent: 0
---
# Mission history: minimal settings / history panel

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Players should be able to see a log of their completed missions (target, date, payout) in a lightweight settings or history area accessible from the Earth base nav. Should not require a new scene — a panel/overlay is sufficient.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Earth base has an accessible entry point (menu or dedicated button) to view mission history
- [x] #2 History panel lists completed missions: target name, date, payout earned
- [x] #3 Works on mobile viewport (no horizontal scroll required)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✓ Logbook already accessible via Menu → Logbook button from Earth base nav. Updated _populate_logbook_entries to show target label (name), date, and payout earned. Contractor shown if present. KeyValueRow uses autowrap so no horizontal scroll on mobile.
<!-- SECTION:NOTES:END -->

