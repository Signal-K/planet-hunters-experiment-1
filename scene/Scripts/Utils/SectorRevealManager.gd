extends RefCounted
class_name SectorRevealManager
## SectorRevealManager.gd
## Manages the fog-of-war sector reveal system for the star map.
##
## Sectors are numbered 0–7 (8 sectors total).
## Solar system targets (asteroids) are always revealed.
## TESS/planet targets are assigned to sectors by hash of their target_id.
## Visiting a target reveals its sector + adjacent sectors.

const SECTOR_COUNT := 8

## Adjacency map: sector_id → adjacent sector ids
const SECTOR_ADJACENCY := {
	0: [1, 4],
	1: [0, 2, 5],
	2: [1, 3, 6],
	3: [2, 7],
	4: [0, 5],
	5: [1, 4, 6],
	6: [2, 5, 7],
	7: [3, 6],
}

## Sector names for display
const SECTOR_NAMES := {
	0: "Nearby Stars",
	1: "Cygnus Arm",
	2: "Orion Spur",
	3: "Sagittarius Arm",
	4: "Perseus Arm",
	5: "Inner Core",
	6: "Centaurus Arm",
	7: "Deep Field",
}

## Layout positions (2×4 grid, row-major) as fractional (x, y) in [0,1]^2
const SECTOR_POSITIONS := {
	0: Vector2(0.125, 0.25),
	1: Vector2(0.375, 0.25),
	2: Vector2(0.625, 0.25),
	3: Vector2(0.875, 0.25),
	4: Vector2(0.125, 0.75),
	5: Vector2(0.375, 0.75),
	6: Vector2(0.625, 0.75),
	7: Vector2(0.875, 0.75),
}

## Assign a target to a sector (0–7) deterministically.
static func get_sector_for_target(target_id: String) -> int:
	var h = 0
	for c in target_id.to_utf8_buffer():
		h = (h * 31 + int(c)) & 0x7FFFFFFF
	return abs(h) % SECTOR_COUNT

## Load revealed sectors from rockets_state.
static func get_revealed_sectors() -> Array:
	var rm = load("res://Scripts/Utils/RocketsManager.gd")
	if rm == null:
		return [0]
	var s = rm.load_state()
	var sectors = s.get("revealed_sectors", [0])
	if typeof(sectors) != TYPE_ARRAY:
		return [0]
	return sectors

## Persist revealed sectors.
static func save_revealed_sectors(sectors: Array) -> void:
	var rm = load("res://Scripts/Utils/RocketsManager.gd")
	if rm == null:
		return
	var s = rm.load_state()
	s["revealed_sectors"] = sectors
	rm.save_state(s)

## Reveal the sector containing target_id, plus its neighbours.
## Returns true if state changed.
static func reveal_for_target(target_id: String) -> bool:
	var type_lower = ""
	# If we can determine it's an asteroid, no sector tracking needed
	var rm = load("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		for t in rm.get_detected_targets():
			if str(t.get("id", "")) == target_id:
				type_lower = str(t.get("type", "")).to_lower()
				break
	if type_lower == "asteroid":
		return false  # Asteroids don't have sectors

	var sector = get_sector_for_target(target_id)
	var current: Array = get_revealed_sectors()
	var changed := false

	var to_reveal := [sector]
	var neighbours: Array = SECTOR_ADJACENCY.get(sector, [])
	for n in neighbours:
		to_reveal.append(n)

	for s_id in to_reveal:
		if s_id not in current:
			current.append(s_id)
			changed = true

	if changed:
		save_revealed_sectors(current)
	return changed

## Returns true if a TESS target is visible (its sector is revealed).
static func is_target_revealed(target_id: String, target_type: String) -> bool:
	if target_type.to_lower() == "asteroid":
		return true  # Asteroids always visible in solar system view
	var sector := get_sector_for_target(target_id)
	var revealed := get_revealed_sectors()
	return sector in revealed
