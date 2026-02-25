---
id: i2n8pv
title: Separate surface vs subsurface mineral deposits
status: done
priority: high
labels:
  - mining
  - drones
  - gameplay
createdAt: '2026-02-25T02:40:38.434Z'
updatedAt: '2026-02-25T02:42:36.488Z'
timeSpent: 0
---
# Separate surface vs subsurface mineral deposits

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Some minerals should be on surface (mineable with laser), others below crust (require drones). Drones only for subsurface deposits.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Surface deposits mineable with laser
- [x] #2 Subsurface deposits require drones
- [x] #3 Visual distinction between deposit types
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added is_surface flag to minerals. Surface deposits (50%) are bright and mineable with laser. Subsurface deposits (50%) are darker and require drones. Laser skips subsurface, drones skip surface.
<!-- SECTION:NOTES:END -->

