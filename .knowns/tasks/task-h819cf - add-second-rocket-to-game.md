---
id: h819cf
title: Add second rocket to game
status: done
priority: high
labels:
  - project-landnam
  - rockets
  - vehicles
  - levelling
  - missions
  - targets
  - starterrocket
createdAt: '2026-02-16T22:36:51.000Z'
updatedAt: '2026-02-16T14:57:34.128Z'
timeSpent: 879
assignee: '@me'
---
# Add second rocket to game

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
1. After the user finishes their first mission, there should be a popup that runs when they return to Earth explaining that they've unlocked a new rocket - it should show the icon as well as the title - "Starter Rocket 2". Relative path: scene/assets/Vehicles/Starter Rocket L2.png. It should say that it has a longer range and is faster - 2x increase to both (also, we need to add these stats to all vehicles showing the relative stats/parameters for all vehicles. It cost 1.3B francs. If a user builds a SR2, it should show the SR2 icon on the launchpad, but then default (for now) to the current second stage icon family/animation for when it's in space. Salvaging value remains at 20% of the original price. It also has a larger cargo, and a more powerful mining laser - so it can extract 50% more resources from targets.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Finish Starter Rocket 2 wiring (assets, launchpad/restore visuals, purchase price, salvage price source).
2. Implement SR2 gameplay deltas: 2x speed/range behavior and +50% mining extraction/cargo capacity effect.
3. Add first-mission return-to-Earth unlock popup for SR2 with icon + stats and show vehicle stat rows for all rockets in selection UI.
4. Update/extend tests for unlock flow and rocket-specific behavior.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Summary
- Wired Starter Rocket 2 icon/scene on launchpad and selector (`Starter Rocket L2`).
- Set SR2 purchase cost to 1.3B and retained 20% salvage valuation from original cost.
- Implemented SR2 gameplay multipliers: speed 2.0x, range 2.0x, cargo 1.5x, mining 1.5x.
- Added first-mission return-to-Earth one-time popup for SR2 unlock with icon + stat summary.
- Added comparative stat rows for all rockets in selector UI and updated refund/debrief cost lookups to shared specs.

## Validation
- `cd /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/scene && /Users/scroobz/godot-src/bin/godot.macos.editor.arm64 --headless --script res://tests/run_mining_tests.gd 2>&1`
- `cd /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/scene && /Users/scroobz/godot-src/bin/godot.macos.editor.arm64 --headless --script res://tests/run_experience_tests.gd 2>&1`
- `cd /Users/scroobz/Navigation/Native/planet-hunters-experiment-1/scene && /Users/scroobz/godot-src/bin/godot.macos.editor.arm64 --headless --script res://tests/run_mission_log_tests.gd 2>&1`
<!-- SECTION:NOTES:END -->

