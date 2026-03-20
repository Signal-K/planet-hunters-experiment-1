extends RefCounted
class_name SubcontractorManager

const MineralCatalog = preload("res://Scripts/Utils/MineralCatalog.gd")
const PushNotificationHelper = preload("res://Scripts/Utils/PushNotificationHelper.gd")

const STATE_PATH := "user://subcontractors.json"
const DEFAULT_STATE_PATH := "res://subcontractors.json"

const UNLOCK_TIERS := {
	1: 3,
	2: 4,
	3: 6,
	4: 8,
	5: 10
}

const ORBIT_SALE_MULTIPLIER := 0.8
const EARTH_SALE_MULTIPLIER := 1.0
const PURCHASE_MARKUP := 1.15

const SUBCONTRACTORS := [
	{
		"id": "spacex",
		"name": "SpaceX",
		"role": "Heavy lift launch — buys rare metals at premium",
		"min_level": 1,
		"bonus": {"Platinum": 1.18, "Cobalt": 1.08}
	},
	{
		"id": "rocketlab",
		"name": "Rocketlab",
		"role": "Small satellite launch — buys common ores at premium",
		"min_level": 1,
		"bonus": {"Nickel": 1.12, "Iron": 1.08}
	},
	{
		"id": "astroforge",
		"name": "Astroforge",
		"role": "In-space smelting — buys Cobalt and Silicates at premium",
		"min_level": 1,
		"bonus": {"Cobalt": 1.2, "Silicates": 1.1}
	},
	{
		"id": "swinburne_auto",
		"name": "Swinburne Automotive",
		"role": "Aerospace components — buys Iron feedstock at premium",
		"min_level": 2,
		"bonus": {"Iron": 1.12}
	},
	{
		"id": "karman_plus",
		"name": "Karman+",
		"role": "Deep-space mining hardware — buys Platinum at premium",
		"min_level": 2,
		"bonus": {"Platinum": 1.22}
	},
	{
		"id": "skybus",
		"name": "Skybus Transport",
		"role": "Bulk cargo logistics — buys Nickel and Silicates at premium",
		"min_level": 3,
		"bonus": {"Nickel": 1.15, "Silicates": 1.12}
	},
	{
		"id": "hidden_7",
		"name": "Classified Partner",
		"role": "Classified",
		"min_level": 3,
		"hidden": true,
		"bonus": {}
	},
	{
		"id": "hidden_8",
		"name": "Classified Partner",
		"role": "Classified",
		"min_level": 4,
		"hidden": true,
		"bonus": {}
	},
	{
		"id": "hidden_9",
		"name": "Classified Partner",
		"role": "Classified",
		"min_level": 4,
		"hidden": true,
		"bonus": {}
	},
	{
		"id": "hidden_10",
		"name": "Classified Partner",
		"role": "Classified",
		"min_level": 5,
		"hidden": true,
		"bonus": {}
	}
]

static func load_state() -> Dictionary:
	var json = preload("res://Scripts/Utils/JSONFileManager.gd")
	var data = {}
	if not FileAccess.file_exists(STATE_PATH):
		data = {
			"affinity": {},
			"reputation": {},
			"cooldowns": {},
			"consecutive_use": {},
			"last_mission_sub": ""
		}
		json.save_json(STATE_PATH, data)
	else:
		data = json.load_json(STATE_PATH)

	if typeof(data) != TYPE_DICTIONARY:
		data = {}
	if not data.has("affinity"):
		data["affinity"] = {}
	if not data.has("reputation"):
		data["reputation"] = {}
	if not data.has("cooldowns"):
		data["cooldowns"] = {}
	if not data.has("consecutive_use"):
		data["consecutive_use"] = {}
	if not data.has("last_mission_sub"):
		data["last_mission_sub"] = ""
	return data

static func save_state(data: Dictionary) -> bool:
	var json = preload("res://Scripts/Utils/JSONFileManager.gd")
	var ok = json.save_json(STATE_PATH, data)
	json.save_json(DEFAULT_STATE_PATH, data)
	return ok

static func get_all() -> Array:
	return SUBCONTRACTORS.duplicate(true)

static func get_available_count(level: int) -> int:
	var tiers = UNLOCK_TIERS.keys()
	tiers.sort()
	var count = 0
	for t in tiers:
		if level >= t:
			count = int(UNLOCK_TIERS[t])
	return clamp(count, 0, SUBCONTRACTORS.size())

static func get_unlock_level_for_index(idx: int) -> int:
	var tiers = UNLOCK_TIERS.keys()
	tiers.sort()
	for t in tiers:
		if idx < int(UNLOCK_TIERS[t]):
			return int(t)
	return int(tiers.back())

static func get_roster(level: int) -> Array:
	var roster := []
	var max_count = get_available_count(level)
	for i in range(SUBCONTRACTORS.size()):
		var entry = SUBCONTRACTORS[i].duplicate(true)
		entry["available"] = i < max_count
		entry["unlock_level"] = get_unlock_level_for_index(i)
		roster.append(entry)
	return roster

static func get_available_for_level(level: int) -> Array:
	var available := []
	var max_count = get_available_count(level)
	for i in range(SUBCONTRACTORS.size()):
		if i >= max_count:
			break
		available.append(SUBCONTRACTORS[i].duplicate(true))
	return available

static func get_affinity(sub_id: String) -> int:
	if sub_id == "":
		return 0
	var s = load_state()
	var affinity = s.get("affinity", {})
	return int(affinity.get(sub_id, 0))

static func add_affinity(sub_id: String, amount: int = 1) -> int:
	if sub_id == "":
		return 0
	var s = load_state()
	var affinity = s.get("affinity", {})
	var current = int(affinity.get(sub_id, 0))
	current = clamp(current + max(amount, 0), 0, 100)
	affinity[sub_id] = current
	s["affinity"] = affinity
	save_state(s)
	return current

## Reputation & Cooldown System
const REPUTATION_LEVELS := {
	1: {"xp": 0, "title": "New Partner", "bonus_mult": 1.0},
	2: {"xp": 500, "title": "Verified Asset", "bonus_mult": 1.05},
	3: {"xp": 1500, "title": "Trusted Contractor", "bonus_mult": 1.10},
	4: {"xp": 4000, "title": "Elite Provider", "bonus_mult": 1.15},
	5: {"xp": 10000, "title": "Strategic Ally", "bonus_mult": 1.25}
}

static func get_reputation(sub_id: String) -> int:
	if sub_id == "": return 0
	var s = load_state()
	return int(s.get("reputation", {}).get(sub_id, 0))

static func add_reputation(sub_id: String, amount: int) -> int:
	if sub_id == "": return 0
	var s = load_state()
	var rep = s.get("reputation", {})
	var current = int(rep.get(sub_id, 0))
	current += max(amount, 0)
	rep[sub_id] = current
	s["reputation"] = rep
	save_state(s)
	return current

static func get_level_data(xp: int) -> Dictionary:
	var current_lvl = 1
	var levels = REPUTATION_LEVELS.keys()
	levels.sort()
	for lvl in levels:
		if xp >= REPUTATION_LEVELS[lvl].xp:
			current_lvl = lvl
		else:
			break
	
	var next_lvl = current_lvl + 1 if REPUTATION_LEVELS.has(current_lvl + 1) else current_lvl
	var data = REPUTATION_LEVELS[current_lvl].duplicate()
	data["level"] = current_lvl
	data["next_xp"] = REPUTATION_LEVELS[next_lvl].xp
	data["is_max"] = current_lvl == next_lvl
	return data

static func set_cooldown(sub_id: String, duration_seconds: int) -> void:
	if sub_id == "": return
	var s = load_state()
	var cooldowns = s.get("cooldowns", {})
	cooldowns[sub_id] = int(Time.get_unix_time_from_system()) + duration_seconds
	s["cooldowns"] = cooldowns
	save_state(s)

static func get_cooldown_until(sub_id: String) -> int:
	if sub_id == "": return 0
	var s = load_state()
	return int(s.get("cooldowns", {}).get(sub_id, 0))

static func is_on_cooldown(sub_id: String) -> bool:
	var until = get_cooldown_until(sub_id)
	return until > Time.get_unix_time_from_system()

## Returns enriched bonus info for a contractor, adding mineral tier/rarity from the catalog.
## Result Array items: { mineral, multiplier, tier, rarity, tier_label }
static func get_bonus_details(sub_id: String) -> Array:
	var sub := get_subcontractor(sub_id)
	var bonus: Dictionary = sub.get("bonus", {})
	var result: Array = []
	for mineral in bonus.keys():
		var mult := float(bonus.get(mineral, 1.0))
		var tier := MineralCatalog.get_tier(str(mineral))
		result.append({
			"mineral": str(mineral),
			"multiplier": mult,
			"tier": tier,
			"rarity": MineralCatalog.get_rarity(str(mineral)),
			"tier_label": MineralCatalog.tier_label(tier),
			"tier_color": MineralCatalog.tier_color(tier),
		})
	result.sort_custom(func(a, b): return int(a["tier"]) < int(b["tier"]))
	return result

static func get_subcontractor(sub_id: String) -> Dictionary:
	for entry in SUBCONTRACTORS:
		if str(entry.get("id", "")) == sub_id:
			return entry.duplicate(true)
	return {}

static func pick_subcontractor(level: int) -> Dictionary:
	var available = get_available_for_level(level)
	if available.is_empty():
		return {}
	var rng = RandomNumberGenerator.new()
	rng.randomize()
	return available[rng.randi_range(0, available.size() - 1)]

## Record a completed mission with this contractor.
## Awards reputation XP, tracks consecutive use, and triggers a 30-min cooldown
## after 2 consecutive missions with the same contractor.
## Returns the new reputation XP total.
const REPUTATION_XP_PER_MISSION := 100
const CONSECUTIVE_COOLDOWN_THRESHOLD := 2
const COOLDOWN_DURATION_SECONDS := 30 * 60

static func record_mission_completion(sub_id: String) -> int:
	if sub_id == "":
		return 0
	var s = load_state()

	# Award reputation XP
	var rep = s.get("reputation", {})
	var current_rep = int(rep.get(sub_id, 0))
	current_rep += REPUTATION_XP_PER_MISSION
	rep[sub_id] = current_rep
	s["reputation"] = rep

	# Track consecutive use
	var consecutive = s.get("consecutive_use", {})
	var last_sub = str(s.get("last_mission_sub", ""))
	if last_sub == sub_id:
		consecutive[sub_id] = int(consecutive.get(sub_id, 1)) + 1
	else:
		# Reset the previous contractor's streak
		if last_sub != "":
			consecutive[last_sub] = 0
		consecutive[sub_id] = 1
	s["consecutive_use"] = consecutive
	s["last_mission_sub"] = sub_id

	# Trigger cooldown if threshold reached
	if int(consecutive.get(sub_id, 0)) >= CONSECUTIVE_COOLDOWN_THRESHOLD:
		var cooldowns = s.get("cooldowns", {})
		cooldowns[sub_id] = int(Time.get_unix_time_from_system()) + COOLDOWN_DURATION_SECONDS
		s["cooldowns"] = cooldowns
		consecutive[sub_id] = 0
		s["consecutive_use"] = consecutive
		PushNotificationHelper.schedule_contractor_cooldown_end(sub_id, float(COOLDOWN_DURATION_SECONDS))

	save_state(s)
	return current_rep

## Returns remaining cooldown in seconds (0 if not on cooldown).
static func get_cooldown_remaining(sub_id: String) -> int:
	var until = get_cooldown_until(sub_id)
	var now = int(Time.get_unix_time_from_system())
	return max(0, until - now)
