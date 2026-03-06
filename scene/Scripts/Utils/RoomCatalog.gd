extends RefCounted
class_name RoomCatalog

# Rooms are tied to each consumable rocket hull loadout, not a persistent Earth base.
const UTILITY_CATEGORIES := {
	"fuel": true,
	"storage": true,
	"navigation": true,
	"science": true,
	"communication": true,
	"power": true,
	"life_support": true
}

const ROOM_DEFINITIONS := {
	"basic_thruster_t1": {
		"name": "Basic Thruster",
		"category": "propulsion",
		"tier": 1,
		"footprint": 1,
		"min_bay_tier": 1,
		"sprite": "basic_thruster_t1"
	},
	"fusion_drive_t2": {
		"name": "Fusion Drive",
		"category": "propulsion",
		"tier": 2,
		"footprint": 2,
		"min_bay_tier": 1,
		"sprite": "fusion_drive_t2"
	},
	"ion_drive_t3": {
		"name": "Ion Drive",
		"category": "propulsion",
		"tier": 3,
		"footprint": 2,
		"min_bay_tier": 2,
		"sprite": "ion_drive_t3"
	},
	"small_reactor_t1": {
		"name": "Small Reactor",
		"category": "power",
		"tier": 1,
		"footprint": 1,
		"min_bay_tier": 1,
		"sprite": "small_reactor_t1"
	},
	"fusion_reactor_t2": {
		"name": "Fusion Reactor",
		"category": "power",
		"tier": 2,
		"footprint": 2,
		"min_bay_tier": 2,
		"sprite": "fusion_reactor_t2"
	},
	"power_capacitor_t2": {
		"name": "Power Capacitor",
		"category": "power",
		"tier": 2,
		"footprint": 1,
		"min_bay_tier": 1,
		"sprite": "power_capacitor_t2"
	},
	"small_tank_t1": {
		"name": "Small Tank",
		"category": "fuel",
		"tier": 1,
		"footprint": 1,
		"min_bay_tier": 1,
		"sprite": "small_tank_t1"
	},
	"large_tank_t2": {
		"name": "Large Tank",
		"category": "fuel",
		"tier": 2,
		"footprint": 2,
		"min_bay_tier": 2,
		"sprite": "large_tank_t2"
	},
	"cargo_bay_t1": {
		"name": "Cargo Bay",
		"category": "storage",
		"tier": 1,
		"footprint": 1,
		"min_bay_tier": 1,
		"sprite": "cargo_bay_t1"
	},
	"resource_vault_t2": {
		"name": "Resource Vault",
		"category": "storage",
		"tier": 2,
		"footprint": 2,
		"min_bay_tier": 2,
		"sprite": "resource_vault_t2"
	},
	"mining_drill_t1": {
		"name": "Mining Drill",
		"category": "mining",
		"tier": 1,
		"footprint": 1,
		"min_bay_tier": 1,
		"sprite": "mining_drill_t1"
	},
	"subsurface_probe_t2": {
		"name": "Subsurface Probe",
		"category": "mining",
		"tier": 2,
		"footprint": 2,
		"min_bay_tier": 2,
		"sprite": "subsurface_probe_t2"
	},
	"drone_bay_t2": {
		"name": "Drone Bay",
		"category": "mining",
		"tier": 2,
		"footprint": 2,
		"min_bay_tier": 2,
		"sprite": "drone_bay_t2"
	},
	"basic_nav_t1": {
		"name": "Basic Nav",
		"category": "navigation",
		"tier": 1,
		"footprint": 1,
		"min_bay_tier": 1,
		"sprite": "basic_nav_t1"
	},
	"scanner_array_t2": {
		"name": "Scanner Array",
		"category": "navigation",
		"tier": 2,
		"footprint": 2,
		"min_bay_tier": 2,
		"sprite": "scanner_array_t2"
	},
	"spectral_analyser_t3": {
		"name": "Spectral Analyser",
		"category": "navigation",
		"tier": 3,
		"footprint": 2,
		"min_bay_tier": 2,
		"sprite": "spectral_analyser_t3"
	},
	"basic_hull_t1": {
		"name": "Basic Hull",
		"category": "hull",
		"tier": 1,
		"footprint": 1,
		"min_bay_tier": 1,
		"sprite": "basic_hull_t1"
	},
	"reinforced_hull_t2": {
		"name": "Reinforced Hull",
		"category": "hull",
		"tier": 2,
		"footprint": 2,
		"min_bay_tier": 2,
		"sprite": "reinforced_hull_t2"
	},
	"sample_lab_t2": {
		"name": "Sample Lab",
		"category": "science",
		"tier": 2,
		"footprint": 1,
		"min_bay_tier": 1,
		"sprite": "sample_lab_t2"
	},
	"telescope_t2": {
		"name": "Telescope",
		"category": "science",
		"tier": 2,
		"footprint": 1,
		"min_bay_tier": 1,
		"sprite": "telescope_t2"
	},
	"comms_relay_t1": {
		"name": "Comms Relay",
		"category": "communication",
		"tier": 1,
		"footprint": 1,
		"min_bay_tier": 1,
		"sprite": "comms_relay_t1"
	},
	"broadcast_array_t2": {
		"name": "Broadcast Array",
		"category": "communication",
		"tier": 2,
		"footprint": 1,
		"min_bay_tier": 1,
		"sprite": "broadcast_array_t2"
	},
	"life_support_t3": {
		"name": "Life Support",
		"category": "life_support",
		"tier": 3,
		"footprint": 1,
		"min_bay_tier": 2,
		"sprite": "life_support_t3"
	},
	"crew_quarters_t3": {
		"name": "Crew Quarters",
		"category": "life_support",
		"tier": 3,
		"footprint": 1,
		"min_bay_tier": 2,
		"sprite": "crew_quarters_t3"
	}
}

const STARTER_LOADOUT := [
	"basic_thruster_t1",
	"small_reactor_t1",
	"small_tank_t1",
	"cargo_bay_t1",
	"mining_drill_t1",
	"basic_nav_t1",
	"basic_hull_t1"
]

const BAY_DEFAULTS := {
	"core_engine": {"tier": 1, "capacity": 2, "utility_only": false},
	"core_mid": {"tier": 1, "capacity": 2, "utility_only": false},
	"core_aft": {"tier": 1, "capacity": 2, "utility_only": false},
	"expansion_t2": {"tier": 2, "capacity": 2, "utility_only": true}
}

const PARACHUTE_SLOT := {
	"item": "parachute",
	"count": 1,
	"consumable": true
}

const STARTER_INSTALL_ORDER := ["core_engine", "core_mid", "core_aft"]

static func create_starter_layout() -> Dictionary:
	var bays := BAY_DEFAULTS.duplicate(true)
	for bay_id in bays.keys():
		bays[bay_id]["rooms"] = []
	var cursor := 0
	for room_id in STARTER_LOADOUT:
		var bay_id = STARTER_INSTALL_ORDER[cursor % STARTER_INSTALL_ORDER.size()]
		bays[bay_id]["rooms"].append(_make_room_instance(room_id, bay_id))
		cursor += 1
	return {
		"bays": bays,
		"consumables": PARACHUTE_SLOT.duplicate(true)
	}

static func create_layout_for_rocket_type(rocket_type: String) -> Dictionary:
	var normalized = rocket_type.strip_edges().to_lower()
	var layout = create_starter_layout()
	if normalized == "starterrocket1" or normalized == "":
		return layout
	if normalized == "starterrocket2":
		layout = _install_if_possible(layout, "core_engine", "fusion_drive_t2")
		layout = _install_if_possible(layout, "core_mid", "large_tank_t2")
		layout = _install_if_possible(layout, "expansion_t2", "sample_lab_t2")
		layout = _install_if_possible(layout, "expansion_t2", "comms_relay_t1")
		return layout
	if normalized == "starterrocket3":
		layout = _install_if_possible(layout, "core_engine", "fusion_drive_t2")
		layout = _install_if_possible(layout, "core_mid", "large_tank_t2")
		layout = _install_if_possible(layout, "expansion_t2", "sample_lab_t2")
		layout = _install_if_possible(layout, "expansion_t2", "comms_relay_t1")
		layout = _install_if_possible(layout, "core_mid", "scanner_array_t2")
		layout = _install_if_possible(layout, "core_aft", "drone_bay_t2")
		layout = _install_if_possible(layout, "expansion_t2", "telescope_t2")
		layout = _install_if_possible(layout, "expansion_t2", "broadcast_array_t2")
		var upgrade_result = begin_upgrade(layout, "core_aft", 0, 2)
		if bool(upgrade_result.get("ok", false)):
			layout = upgrade_result.get("layout", layout)
		return layout
	return layout

static func get_room(room_id: String) -> Dictionary:
	if ROOM_DEFINITIONS.has(room_id):
		return ROOM_DEFINITIONS[room_id]
	return {}

static func can_install_room(layout: Dictionary, bay_id: String, room_id: String) -> Dictionary:
	var bays = layout.get("bays", {})
	if not bays.has(bay_id):
		return {"ok": false, "reason": "bay_not_found"}
	var room = get_room(room_id)
	if room.is_empty():
		return {"ok": false, "reason": "room_not_found"}
	var bay: Dictionary = bays[bay_id]
	var min_bay_tier = int(room.get("min_bay_tier", 1))
	if int(bay.get("tier", 1)) < min_bay_tier:
		return {"ok": false, "reason": "upgrade_bay_first"}
	if bool(bay.get("utility_only", false)):
		var category = str(room.get("category", ""))
		if not bool(UTILITY_CATEGORIES.get(category, false)):
			return {"ok": false, "reason": "utility_only_bay"}
	var used = 0
	for installed in bay.get("rooms", []):
		var installed_def = get_room(str(installed.get("room_id", "")))
		used += int(installed_def.get("footprint", 1))
	var next_total = used + int(room.get("footprint", 1))
	if next_total > int(bay.get("capacity", 0)):
		return {"ok": false, "reason": "insufficient_capacity"}
	return {"ok": true}

static func install_room(layout: Dictionary, bay_id: String, room_id: String) -> Dictionary:
	var result = can_install_room(layout, bay_id, room_id)
	if not bool(result.get("ok", false)):
		return result
	var next_layout = layout.duplicate(true)
	var bays: Dictionary = next_layout.get("bays", {})
	bays[bay_id]["rooms"].append(_make_room_instance(room_id, bay_id))
	return {"ok": true, "layout": next_layout}

static func begin_upgrade(layout: Dictionary, bay_id: String, slot_index: int, target_tier: int) -> Dictionary:
	var next_layout = layout.duplicate(true)
	var bays: Dictionary = next_layout.get("bays", {})
	if not bays.has(bay_id):
		return {"ok": false, "reason": "bay_not_found"}
	var rooms: Array = bays[bay_id].get("rooms", [])
	if slot_index < 0 or slot_index >= rooms.size():
		return {"ok": false, "reason": "slot_not_found"}
	var instance: Dictionary = rooms[slot_index]
	instance["offline"] = true
	instance["upgrade_target_tier"] = max(target_tier, int(instance.get("tier", 1)))
	rooms[slot_index] = instance
	bays[bay_id]["rooms"] = rooms
	return {"ok": true, "layout": next_layout}

static func consume_parachute(layout: Dictionary) -> Dictionary:
	var next_layout = layout.duplicate(true)
	var consumables: Dictionary = next_layout.get("consumables", {})
	consumables["count"] = max(int(consumables.get("count", 0)) - 1, 0)
	next_layout["consumables"] = consumables
	return next_layout

static func has_parachute(layout: Dictionary) -> bool:
	var consumables: Dictionary = layout.get("consumables", {})
	return int(consumables.get("count", 0)) > 0

static func derive_rocket_level(layout: Dictionary) -> int:
	var bays: Dictionary = layout.get("bays", {})
	var sum_tiers := 0
	var room_count := 0
	for bay_id in bays.keys():
		for instance in bays[bay_id].get("rooms", []):
			sum_tiers += int(instance.get("tier", 1))
			room_count += 1
	if room_count == 0:
		return 1
	return max(int(round(float(sum_tiers) / float(room_count))), 1)

static func science_multipliers(layout: Dictionary) -> Dictionary:
	var payout := 1.0
	var xp := 1.0
	var bays: Dictionary = layout.get("bays", {})
	for bay_id in bays.keys():
		for instance in bays[bay_id].get("rooms", []):
			if bool(instance.get("offline", false)):
				continue
			var room_def = get_room(str(instance.get("room_id", "")))
			if room_def.is_empty():
				continue
			var category = str(room_def.get("category", ""))
			if category == "science":
				payout += 0.10
				xp += 0.08
	return {
		"payout_multiplier": payout,
		"xp_multiplier": xp
	}

static func get_installed_rooms(layout: Dictionary) -> Array:
	var rows: Array = []
	var bays: Dictionary = layout.get("bays", {})
	for bay_id in bays.keys():
		for instance in bays[bay_id].get("rooms", []):
			var row = {
				"bay_id": bay_id,
				"room_id": instance.get("room_id", ""),
				"tier": instance.get("tier", 1),
				"offline": bool(instance.get("offline", false))
			}
			rows.append(row)
	return rows

static func _make_room_instance(room_id: String, bay_id: String) -> Dictionary:
	var room_def = get_room(room_id)
	return {
		"room_id": room_id,
		"bay_id": bay_id,
		"tier": int(room_def.get("tier", 1)),
		"offline": false
	}

static func _install_if_possible(layout: Dictionary, bay_id: String, room_id: String) -> Dictionary:
	var result = install_room(layout, bay_id, room_id)
	if bool(result.get("ok", false)):
		return result.get("layout", layout)
	return layout
