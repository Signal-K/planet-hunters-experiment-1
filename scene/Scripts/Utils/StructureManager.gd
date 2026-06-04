extends RefCounted
class_name StructureManager
## StructureManager — tracks which Earth Base structures have been placed.
## Structures are placed by the player in Build Mode, not auto-granted.

const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")

# ── Structure catalogue ───────────────────────────────────────────────────
const CATALOGUE := {
	"launchpad": {
		"name": "Launchpad",
		"description": "Required to launch missions.",
		"cost": 0,
		"slot": "center",
		"unlock_missions": 0,
	},
	"control_station": {
		"name": "Control Station",
		"description": "Unlocks the contractor job board.",
		"cost": 500_000_000,
		"slot": "right",
		"unlock_missions": 1,
	},
	"scanning_station": {
		"name": "Scanning Station",
		"description": "Unlocks scan operations in Free Operations.",
		"cost": 2_000_000_000,
		"slot": "left",
		"unlock_missions": 3,
	},
}

# ── State access ──────────────────────────────────────────────────────────
static func is_built(type: String) -> bool:
	var s := RocketsManager.load_state()
	var structures: Dictionary = s.get("structures", {})
	if not structures.is_empty():
		return bool(structures.get(type, false))
	# Migrate from legacy keys
	match type:
		"control_station": return bool(s.get("control_station_built", false))
		"scanning_station": return bool(s.get("scanner_station_built", false))
		_: return false

static func build(type: String) -> void:
	if not CATALOGUE.has(type):
		return
	var s := RocketsManager.load_state()
	var structures: Dictionary = s.get("structures", {}).duplicate(true)
	structures[type] = true
	s["structures"] = structures
	# Keep legacy keys in sync so old code doesn't break
	if type == "control_station":
		s["control_station_built"] = true
	elif type == "scanning_station":
		s["scanner_station_built"] = true
		s["scanner_unlocked"] = true
	RocketsManager.save_state(s)

static func get_cost(type: String) -> int:
	return int(CATALOGUE.get(type, {}).get("cost", 0))

static func can_afford(type: String, balance: int) -> bool:
	return balance >= get_cost(type)

static func is_unlocked(type: String) -> bool:
	var required: int = int(CATALOGUE.get(type, {}).get("unlock_missions", 0))
	return RocketsManager.get_completed_mission_count() >= required

static func get_display_name(type: String) -> String:
	return str(CATALOGUE.get(type, {}).get("name", type))

static func get_description(type: String) -> String:
	return str(CATALOGUE.get(type, {}).get("description", ""))

static func get_slot(type: String) -> String:
	return str(CATALOGUE.get(type, {}).get("slot", ""))
