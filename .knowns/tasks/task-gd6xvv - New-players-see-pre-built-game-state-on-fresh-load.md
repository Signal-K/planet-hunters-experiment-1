---
id: gd6xvv
title: New players see pre-built game state on fresh load — committed dev save files in repo
status: todo
priority: high
labels:
  - critical,bug,save-state,godot,vercel
createdAt: '2026-05-03T11:40:49.782Z'
updatedAt: '2026-05-03T11:40:49.782Z'
timeSpent: 0
assignee: '@Liam'
---
# New players see pre-built game state on fresh load — committed dev save files in repo

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CRITICAL BUG: When a brand-new user visits the live URL, they see the game with the command station already built and missions already completed. Root cause: The Godot editor dev-sync feature writes live play state back to the res:// seed JSON files (scene/rockets_state.json, scene/franc_balance.json, scene/mission_logs.json, scene/subcontractors.json). These seed files are committed to git and bundled into the exported .pck. When a new user's browser has no IndexedDB save (user://), Godot seeds from the bundled res:// file — giving them the dev's play state. Fix applied: All four seed JSON files and their .bak counterparts reset to clean defaults. The root franc_balance.json also reset. IMPORTANT: A new Godot export + Vercel redeploy is REQUIRED for the fix to take effect in the live .pck.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 scene/rockets_state.json reset to blank default (no missions, no control station, 0 francs)
- [ ] #2 scene/franc_balance.json reset to balance: 0
- [ ] #3 scene/mission_logs.json reset to empty missions array
- [ ] #4 scene/subcontractors.json reset to blank defaults
- [ ] #5 Root franc_balance.json reset to balance: 0
- [ ] #6 Godot game exported with clean seed files and redeployed to Vercel
- [ ] #7 Verified: new incognito browser session starts with empty game state
<!-- AC:END -->

