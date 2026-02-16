extends RefCounted
class_name RocketSpecs

const DEFAULT_ROCKET_TYPE := "starterrocket1"
const BASE_MISSION_SECONDS := 60
const BASE_RETURN_SECONDS := 60

const SPECS := {
	"starterrocket1": {
		"display_name": "Starter Rocket 1",
		"icon_path": "res://assets/Vehicles/StarterRocket1.png",
		"cost": 1000000000,
		"salvage_refund_pct": 0.20,
		"speed_multiplier": 1.0,
		"range_multiplier": 1.0,
		"cargo_multiplier": 1.0,
		"mining_multiplier": 1.0
	},
	"starterrocket2": {
		"display_name": "Starter Rocket 2",
		"icon_path": "res://assets/Vehicles/Starter Rocket L2.png",
		"cost": 1300000000,
		"salvage_refund_pct": 0.20,
		"speed_multiplier": 2.0,
		"range_multiplier": 2.0,
		"cargo_multiplier": 1.5,
		"mining_multiplier": 1.5
	}
}

static func rocket_type_from_id(rocket_id: String) -> String:
	if rocket_id == "":
		return DEFAULT_ROCKET_TYPE
	if rocket_id.find("-") != -1:
		var parts = rocket_id.split("-")
		if parts.size() > 0 and str(parts[0]) != "":
			return str(parts[0])
	return rocket_id

static func get_spec(rocket_id_or_type: String) -> Dictionary:
	var rtype = rocket_type_from_id(rocket_id_or_type)
	if SPECS.has(rtype):
		return SPECS[rtype]
	return SPECS[DEFAULT_ROCKET_TYPE]

static func get_display_name(rocket_id_or_type: String) -> String:
	return str(get_spec(rocket_id_or_type).get("display_name", "Starter Rocket"))

static func get_cost(rocket_id_or_type: String) -> int:
	return int(get_spec(rocket_id_or_type).get("cost", int(SPECS[DEFAULT_ROCKET_TYPE]["cost"])))

static func get_salvage_refund_pct(rocket_id_or_type: String) -> float:
	return float(get_spec(rocket_id_or_type).get("salvage_refund_pct", 0.20))

static func get_speed_multiplier(rocket_id_or_type: String) -> float:
	return max(float(get_spec(rocket_id_or_type).get("speed_multiplier", 1.0)), 0.1)

static func get_range_multiplier(rocket_id_or_type: String) -> float:
	return max(float(get_spec(rocket_id_or_type).get("range_multiplier", 1.0)), 0.1)

static func get_cargo_multiplier(rocket_id_or_type: String) -> float:
	return max(float(get_spec(rocket_id_or_type).get("cargo_multiplier", 1.0)), 0.1)

static func get_mining_multiplier(rocket_id_or_type: String) -> float:
	return max(float(get_spec(rocket_id_or_type).get("mining_multiplier", 1.0)), 0.1)

static func get_mission_seconds(rocket_id_or_type: String, base_seconds: int = BASE_MISSION_SECONDS) -> int:
	return max(int(round(float(base_seconds) / get_speed_multiplier(rocket_id_or_type))), 1)

static func get_return_seconds(rocket_id_or_type: String, base_seconds: int = BASE_RETURN_SECONDS) -> int:
	return max(int(round(float(base_seconds) / get_speed_multiplier(rocket_id_or_type))), 1)

static func get_icon_texture(rocket_id_or_type: String) -> Texture2D:
	var path = str(get_spec(rocket_id_or_type).get("icon_path", ""))
	if path == "":
		return null
	return load(path)
