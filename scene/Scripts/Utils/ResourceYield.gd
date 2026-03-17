extends RefCounted
class_name ResourceYield

const PLANET_CAPACITY := 10000
const ASTEROID_RATIO := 0.2
const MINERALS := ["Iron", "Nickel", "Cobalt", "Platinum", "Silicates"]
const LEVEL_SIZE := 5
const BASE_MINEABLE_PCT := 0.10
const MINEABLE_PCT_STEP := 0.05
const MAX_MINEABLE_PCT := 0.50
const TARGET_CAPACITY_MULTIPLIER := {
	"mission-1-training-target": 0.615,  # Calibrated so full-mine+scrap ≈ 120% of SR1 cost
	"mission-2-upgrade-target": 1.0,
	"mission-4-exoplanet-target": 0.133
}

const MINERAL_RARITY := {
	"Iron": 0.0,
	"Silicates": 0.1,
	"Nickel": 0.3,
	"Cobalt": 0.6,
	"Platinum": 1.0
}

static func get_yield_for_target(target_id: String, target_type: String, level: int = 1, cargo_multiplier: float = 1.0) -> Dictionary:
	var normalized_type = _normalize_type(target_type)
	var base_capacity = PLANET_CAPACITY if normalized_type == "planet" else int(round(PLANET_CAPACITY * ASTEROID_RATIO))
	var effective_cargo_multiplier = max(cargo_multiplier, 0.1)
	var target_multiplier = _target_capacity_multiplier(target_id)
	var hash_util = preload("res://Scripts/Utils/HashUtils.gd")
	var seed = hash_util.simple_hash("%s:%s" % [target_id, normalized_type])
	var rng = RandomNumberGenerator.new()
	rng.seed = seed
	var signature = _build_generation_signature(target_id, normalized_type, level, seed)
	var mineable_pct = float(signature.get("mineable_pct", BASE_MINEABLE_PCT))
	var capacity = int(round(base_capacity * mineable_pct * effective_cargo_multiplier * target_multiplier))

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
		"cargo_multiplier": effective_cargo_multiplier,
		"capacity": capacity,
		"minerals": minerals,
		"generation_signature": signature
	}

static func _build_generation_signature(target_id: String, target_type: String, level: int, seed: int) -> Dictionary:
	var rng = RandomNumberGenerator.new()
	rng.seed = seed
	var base_pct = clamp(
		BASE_MINEABLE_PCT + MINEABLE_PCT_STEP * max(level - 1, 0),
		BASE_MINEABLE_PCT,
		MAX_MINEABLE_PCT
	)
	# Deterministic per-target offset keeps same-level targets from feeling identical.
	var pct_jitter = rng.randf_range(-0.08, 0.08)
	var mineable_pct = clamp(base_pct + pct_jitter, BASE_MINEABLE_PCT, MAX_MINEABLE_PCT)
	return {
		"seed": seed,
		"target_id": target_id,
		"target_type": target_type,
		"mineable_pct": mineable_pct,
		"terrain": {
			"roughness": rng.randf_range(0.82, 1.24),
			"peak_chance_boost": rng.randf_range(-0.03, 0.05),
			"valley_chance_boost": rng.randf_range(-0.02, 0.04),
			"height_bias": rng.randf_range(-28.0, 34.0),
			"landmark_cluster_bias": rng.randf_range(0.2, 0.85),
			"landmark_cluster_count": rng.randi_range(2, 5)
		}
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

static func _target_capacity_multiplier(target_id: String) -> float:
	if target_id == "":
		return 1.0
	return max(float(TARGET_CAPACITY_MULTIPLIER.get(target_id, 1.0)), 0.01)
