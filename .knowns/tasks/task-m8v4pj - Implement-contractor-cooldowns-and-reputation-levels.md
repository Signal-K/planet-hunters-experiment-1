---
id: m8v4pj
title: Implement contractor cooldowns and reputation levels
status: todo
priority: medium
labels:
  - gameplay
  - contractors
createdAt: '2026-03-12T00:00:00.000Z'
updatedAt: '2026-03-12T00:00:00.000Z'
---

## Description
Expand the contractor system to include cooldowns (they're not always available) and reputation/leveling (more use = better bonuses).

## Sub-tasks
- [ ] Add `cooldown_until` timestamp and `reputation_xp` to subcontractor state in `SubcontractorManager.gd`.
- [ ] Implement a function to check if a contractor is available based on time.
- [ ] Update `RocketsManager.gd` to put the selected contractor on cooldown after a mission.
- [ ] Design reputation levels: Level 1 (Starter), Level 2 (Skilled), Level 3 (Partner) with scaling bonuses.
- [ ] Update UI to show contractor availability and reputation level.
