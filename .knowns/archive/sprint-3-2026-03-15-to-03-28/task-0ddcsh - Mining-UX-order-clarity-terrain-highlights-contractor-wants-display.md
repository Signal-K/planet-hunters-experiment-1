---
id: 0ddcsh
title: 'Mining UX: order clarity — terrain highlights + contractor wants display'
status: done
priority: high
labels:
  - ux
  - mining
  - contractors
createdAt: '2026-03-19T03:15:15.108Z'
updatedAt: '2026-03-19T03:18:20.366Z'
timeSpent: 177
---
# Mining UX: order clarity — terrain highlights + contractor wants display

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Players don't know which surface minerals fulfil their active order, and the subcontractor panel doesn't show what a contractor actually wants. Two fixes: (1) highlight order-target minerals on the terrain with a golden glow, (2) show 'Wants: Mineral +X%' in the SubcontractorsPanel so players know what to mine before launching.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Surface mineral patches that match the active contractor order are visually highlighted (golden tint) and distinguishable from non-order minerals
- [x] #2 Collected vs required counts are shown in the contract order panel from mission start (not just on first collection)
- [x] #3 SubcontractorsPanel shows a 'Wants: Mineral +X%' line for each available contractor
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Golden modulate (1.5, 1.25, 0.4) on surface order-target polys via is_order_target flag in region dict.
VisualSync updated to accept is_order_target from region dict — no signature changes needed.
_tag_order_target_minerals() called after terrain gen + contract resolution.
SubcontractorsPanel: Wants label inserted at role_lbl index+1 in VBox, gold colour.
<!-- SECTION:NOTES:END -->

