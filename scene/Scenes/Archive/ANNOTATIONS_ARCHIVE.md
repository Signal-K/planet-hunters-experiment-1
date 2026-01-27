Location: scene/Scenes/Archive/AsteroidDetail and scene/Scripts/Archive/AsteroidDetail

What I archived:
- `asteroid_detail_view.tscn` (archived scene)
- `AsteroidDetailView.gd` and `DrawingCanvas.gd` (archived scripts copied to `scene/Scripts/Archive/AsteroidDetail`)

What I changed:
- Main UI panels now use `res://Scenes/UI/SimpleDetail/simple_detail_view.tscn` (no annotation UI).
- `SatelliteStationPanel.gd` and `NewMissionPanel.gd` updated to instantiate the simple viewer.

How to restore quickly:
1. Revert `SatelliteStationPanel.gd` and `NewMissionPanel.gd` to preload `res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn`.
2. Move or copy archived files back to their original paths (`res://Scenes/UI/AsteroidDetail/` and `res://Scripts/UI/AsteroidDetail/`).
3. Restore any thumbnail/annotations checks if desired.

Notes:
- The archived copies preserve annotation functionality; nothing was deleted.
- The simple viewer shows "Telescope is being tuned..." for 1.2s then loads the image.
