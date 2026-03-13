---
id: v7u2n9
title: Implement persistent mineral inventory and construction manager
status: todo
priority: high
labels:
  - gameplay
  - inventory
  - construction
createdAt: '2026-03-12T00:00:00.000Z'
updatedAt: '2026-03-12T00:00:00.000Z'
---

## Description
Based on the vision from the 20 Questions, the game needs a way to store collected minerals (Iron, Nickel, etc.) across runs and use them for construction projects (settlements, outposts, refineries).

## Sub-tasks
- [ ] Add `inventory` dictionary to `RocketsManager.gd` state (for minerals).
- [ ] Implement `ConstructionManager.gd` to handle project requirements (e.g. "Settlement 1 requires 500 Iron, 200 Nickel").
- [ ] Update `SidescrollMining.gd` to credit collected minerals to the persistent inventory upon successful return.
- [ ] Create a UI panel to view current inventory and active construction projects.
