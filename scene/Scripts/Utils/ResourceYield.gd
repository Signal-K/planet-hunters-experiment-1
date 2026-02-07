extends RefCounted
class_name ResourceYield

const PLANET_CAPACITY := 10000
const ASTEROID_RATIO := 0.2
const MINERALS := ["Iron", "Nickel", "Cobalt", "Platinum", "Silicates"]
const LEVEL_SIZE := 5
const BASE_MINEABLE_PCT := 0.10
const MINEABLE_PCT_STEP := 0.05
const MAX_MINEABLE_PCT := 0.50

const MINERAL_RARITY := {
	"Iron": 0.0,
	"Silicates": 0.1,
	"Nickel": 0.3,
	"Cobalt": 0.6,
	"Platinum": 1.0
}

static func get_yield_for_target(target_id: String, target_type: String, level: int = 1) -> Dictionary:
	var normalized_type = _normalize_type(target_type)
	var base_capacity = PLANET_CAPACITY if normalized_type == "planet" else int(round(PLANET_CAPACITY * ASTEROID_RATIO))
	var mineable_pct = clamp(BASE_MINEABLE_PCT + MINEABLE_PCT_STEP * max(level - 1, 0), BASE_MINEABLE_PCT, MAX_MINEABLE_PCT)
	var capacity = int(round(base_capacity * mineable_pct))
	var hash_util = preload("res://Scripts/Utils/HashUtils.gd")
	var seed = hash_util.simple_hash("%s:%s" % [target_id, normalized_type])
	var rng = RandomNumberGenerator.new()
	rng.seed = seed

	var level_factor = clamp(float(max(level - 1, 0)) / 4.0, 0.0, 1.0)
	var weights := []
	var total_weight := 0.0
	for i in range(MINERALS.size()):
		var name = MINERALS[i]
		var rarity = float(MINERAL_RARITY.get(name, 0.0))
		var w = rng.randf_range(0.2, 1.0)
		var rare_boost = lerp(1.0, 1.0 + rarity * 1.8, level_factor)
		var common_fade = lerp(1.0, 0.85, level_factor * (1.0 - rarity))
		w *= rare_boost * common_fade
		weights.append(w)
		total_weight += w

	var minerals := {}
	var allocated := 0
	for i in range(MINERALS.size()):
		var amount = int(floor(capacity * (weights[i] / total_weight)))
		minerals[MINERALS[i]] = amount
		allocated += amount

	var remainder = capacity - allocated
	var idx = 0
	while remainder > 0:
		var name = MINERALS[idx % MINERALS.size()]
		minerals[name] = int(minerals.get(name, 0)) + 1
		remainder -= 1
		idx += 1

	return {
		"type": normalized_type,
		"level": level,
		"mineable_pct": mineable_pct,
		"capacity": capacity,
		"minerals": minerals
	}

static func _normalize_type(value: String) -> String:
	var t = value.strip_edges().to_lower()
	if t == "planets":
		return "planet"
	if t == "asteroids":
		return "asteroid"
	if t == "planet" or t == "asteroid":
		return t
	return "asteroid"
