extends RefCounted
class_name MiningInventory

const STATE_PATH := "user://mining_inventory.json"

static func load_state() -> Dictionary:
	var json = preload("res://Scripts/Utils/JSONFileManager.gd")
	var data = json.load_json(STATE_PATH)
	if typeof(data) != TYPE_DICTIONARY:
		data = {}
	if not data.has("targets"):
		data["targets"] = {}
	return data

static func save_state(data: Dictionary) -> bool:
	var json = preload("res://Scripts/Utils/JSONFileManager.gd")
	return json.save_json(STATE_PATH, data)

static func get_target_state(target_id: String, original_mass: float) -> Dictionary:
	var data = load_state()
	var targets: Dictionary = data.get("targets", {})
	if not targets.has(target_id):
		targets[target_id] = {
			"original_mass": original_mass,
			"remaining_mass": original_mass,
			"collected": {}
		}
		data["targets"] = targets
		save_state(data)
	return targets[target_id]

static func apply_mining(target_id: String, original_mass: float, minerals: Dictionary) -> Dictionary:
	var data = load_state()
	var targets: Dictionary = data.get("targets", {})
	var state: Dictionary = targets.get(target_id, {})
	if state.is_empty():
		state = {
			"original_mass": original_mass,
			"remaining_mass": original_mass,
			"collected": {}
		}
	var remaining = float(state.get("remaining_mass", original_mass))
	var chunk = original_mass * 0.10
	var mined = min(remaining, chunk)
	if mined <= 0.0:
		state["remaining_mass"] = 0.0
		targets[target_id] = state
		data["targets"] = targets
		save_state(data)
		return state

	var total_capacity := 0.0
	for v in minerals.values():
		total_capacity += float(v)
	if total_capacity <= 0.0:
		total_capacity = 1.0
	var ratio = mined / total_capacity

	var collected: Dictionary = state.get("collected", {})
	for name in minerals.keys():
		var amount = float(minerals.get(name, 0))
		var add_kg = int(round(amount * ratio))
		collected[name] = int(collected.get(name, 0)) + add_kg
	state["collected"] = collected
	state["remaining_mass"] = max(remaining - chunk, 0.0)

	targets[target_id] = state
	data["targets"] = targets
	save_state(data)
	return state
