---
id: 2frro7
title: Create starter currency unit
status: done
priority: high
labels:
  - Currency
  - UI
  - Economy
  - Data
createdAt: '2026-01-21T01:06:03.799Z'
updatedAt: '2026-01-21T13:46:07.193Z'
timeSpent: 2762
---
# Create starter currency unit

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Should be displayed in the UI - for now, I'll do this via the bottom panel.

Users start with $10B

Debug button - click on your balance to open a popup to add/subtract $1B.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Now that that's done, we have currency being saved and displayed in both UI sections.

Next step (for this sectin) is to get rocketry purchases done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added `scene/franc_balance.json` and root `franc_balance.json` with starting balance 10,000,000,000 (10B).
- Created Godot UI scene: [scene/Scenes/UI/FrancBalance.tscn](scene/Scenes/UI/FrancBalance.tscn) with script [scene/Scripts/UI/FrancBalance.gd](scene/Scripts/UI/FrancBalance.gd) that reads/writes `res://franc_balance.json` and supports a debug popup to add/subtract 1B.
- Created simple Franc icon scene [scene/Scenes/UI/FrancIcon.tscn](scene/Scenes/UI/FrancIcon.tscn).
- Hooked the FrancBalance scene into the Earth UI by instancing it from `UIManager.gd` so it appears on all Earth scenes (launchpad, earth_base, etc.).
- Added Expo component `components/FrancBalance.tsx` and included it in `App.tsx` (Game screen) to display the balance in the top-right within the React Native app by importing `franc_balance.json`.
- Notes: Godot writes to `res://franc_balance.json` (scene folder). The Expo app reads the root `franc_balance.json` bundled with the JS app. Keep these files in sync if you want runtime sync between Godot and Expo (current implementation writes the Godot copy; syncing to root file is a manual or CI step).
<!-- SECTION:NOTES:END -->

