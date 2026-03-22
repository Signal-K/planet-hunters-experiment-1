# Restored Documentation & Archive

This document preserves the intent and key details from consolidated/removed files related to prompting and room generation.

## Legacy Task Context (Moved/Consolidated)

- **task-45wpy1 (Generate-advanced-RD-room-batch):** Focus on high-tier research and development rooms (e.g., Ion Drive, Spectral Analyzer). These are for the post-Mission 4 "Free Ops" and expansion phases.
- **task-ci4oe8 (Run-prompt-batches-L2-progression-sets):** Focus on mid-tier rooms for Missions 2 and 3 (Fusion Drive, Scanner Station, Large Tanks).
- **task-gtp86m (Define-contractor-visual-theming):** Established rules for how different contractors (e.g., TESS, private firms) should visually influence room generation (decals, accent colors, signage).
- **task-h9n4sh (Close-prompt-coverage-gaps):** Ensure all rooms listed in `RoomCatalog.gd` have corresponding prompt sets for generation.
- **task-j6tbdr (Run-prompt-batch-L1M1):** Baseline starter rocket rooms.
- **task-kgu42s (Generate-usage-state-variant-pack):** Implementation of the "wear and tear" system (0-100 usage states) for all room sprites.
- **task-lg84kl (Create-room-prompt-production-docs):** Master documentation for the production pipeline by ship level.
- **task-xx1lbc (Run-prompt-batches-L3):** Late-game rooms for Mission 4 and beyond (Drone Bay, Broadcast, Telescope).

## Room Generation Runbook Summary (Consolidated)

The generation pipeline relies on a component-first approach:
1. Shell generation (the room "box").
2. Component generation (interactable machinery).
3. State variant generation (idle, active, cooldown, etc.).
4. Wear/Usage overlay generation (clean to broken).

---

# New Vision Backlog (Based on 20 Questions)

The following areas are identified for immediate development to align with the core gameplay goals:

### 1. Construction & Settlement System
- **Task:** Implement persistent mineral inventory (Iron, Nickel, etc.) in `RocketsManager`.
- **Task:** Create `ConstructionManager.gd` to handle building requirements and state.
- **Task:** Design a "Settlement" scene or overlay for building outposts on discovered planets.

### 2. Advanced Contractor Loop
- **Task:** Implement Contractor Cooldowns (Subcontractors aren't always available).
- **Task:** Create Contractor Reputation/Leveling (Higher level = better bonuses/lower fees).
- **Task:** Expand `SubcontractorManager` to support "Multi-contractor" requirements for large projects.

### 3. Progression Beyond Mission 4
- **Task:** Define Mission 5: "First Settlement" (Build an outpost on Kepler-186f).
- **Task:** Implement "Reusable Rockets" research (reduced launch costs for frequent trips).
- **Task:** Design "Long-term Science Expedition" mission type (requires multiple runs to complete).

### 4. Gameplay Feel & UX
- **Task:** Split `SidescrollMining.gd` into `MiningController.gd` (logic) and `MiningView.gd` (visuals).
- **Task:** Refactor `RocketsManager.gd` into smaller, focused utilities (Inventory, Missions, State).
- **Task:** Improve Star Map to allow direct "Re-launch" to known targets without scanning.

---
*Last Updated: 2026-03-12*
