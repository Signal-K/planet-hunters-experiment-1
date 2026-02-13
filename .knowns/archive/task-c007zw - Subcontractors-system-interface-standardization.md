---
id: c007zw
title: Subcontractors system + interface standardization
status: done
priority: high
labels:
  - ui
  - systems
  - progression
createdAt: '2026-02-07T01:07:32.506Z'
updatedAt: '2026-02-07T01:58:00.412Z'
timeSpent: 2979
assignee: '@me'
---
# Subcontractors system + interface standardization

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add subcontractors scene, models, and update contractor behaviors to new standard.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Subcontractors scene lists 10 with unlock tiers
- [x] #2 Sale pricing uses orbit vs earth delta and purchase markup
- [x] #3 All contractor logic uses new subcontractor model
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add subcontractor model + persistence + affinity tracking
2. Create Market subcontractors UI scene and hook into UIManager
3. Replace contractor logic in MissionDebrief/OrbitSalePreview/Menu with subcontractor standard (unlock tiers, sale multipliers)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Added SubcontractorManager with 10-entry roster, unlock tiers, and affinity tracking.
- New Market UI: SubcontractorsPanel scene listing all 10 with lock states and affinity.
- Updated OrbitSalePreview, MissionDebrief, and MenuPanel to use subcontractor standard and orbit/earth sale multipliers.

## Files
- scene/Scripts/Utils/SubcontractorManager.gd
- scene/subcontractors.json
- scene/Scenes/UI/SubcontractorsPanel.tscn
- scene/Scripts/UI/SubcontractorsPanel.gd
- scene/Scripts/Earth/UIManager.gd
- scene/Scripts/Earth/OrbitSalePreview.gd
- scene/Scenes/Earth/orbit_sale_preview.tscn
- scene/Scripts/Earth/MissionDebrief.gd
- scene/Scripts/UI/MenuPanel.gd
<!-- SECTION:NOTES:END -->

