---
id: j7lcdl
title: Redesign feedback popup to fit within mobile landscape viewport
status: done
priority: high
labels:
  - mobile
  - pwa
  - ux
createdAt: '2026-03-09T01:09:37.550Z'
updatedAt: '2026-03-09T01:49:36.598Z'
timeSpent: 74
assignee: '@me'
---
# Redesign feedback popup to fit within mobile landscape viewport

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The feedback popup is taller than the landscape viewport height on iPhone, making it impossible to dismiss. Needs a constrained max-height with internal scroll, or a compact redesign.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Popup fits entirely within landscape viewport (no overflow)
- [x] #2 Popup can always be dismissed
- [x] #3 Works on iPhone landscape and portrait
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Card now has maxHeight: calc(100svh - 40px) + flex column layout. Body content scrolls (overflow-y: auto, flex:1). Footer (Close + Submit) pinned at bottom always visible. Textarea rows reduced 5→3, 4→2 for compact landscape. Separator border added between body and footer.
<!-- SECTION:NOTES:END -->

