extends RefCounted
class_name MiningInventory

const STATE_PATH := "user://mining_inventory.json"

static func _direct_load_state() -> Dictionary:
	if not FileAccess.file_exists(STATE_PATH):
		return {}
	var file = FileAccess.open(STATE_PATH, FileAccess.READ)
	if not file:
		return {}
	var contents = file.get_as_text()
	file.close()
	if typeof(contents) != TYPE_STRING or contents.strip_edges() == "":
		return {}
	var parsed = JSON.parse_string(contents)
	if typeof(parsed) == TYPE_DICTIONARY:
		return parsed
	return {}

static func _direct_save_state(data: Dictionary) -> bool:
	var file = FileAccess.open(STATE_PATH, FileAccess.WRITE)
	if not file:
		return false
	var json_string = JSON.stringify(data, "  ")
	file.store_string(json_string + "\n")
	file.close()
	print("MiningInventory: direct state write succeeded: ", STATE_PATH)
	return true

static func load_state() -> Dictionary:
	var json = preload("res://Scripts/Utils/JSONFileManager.gd")
	var data = json.load_json(STATE_PATH)
	if data.is_empty() and FileAccess.file_exists(STATE_PATH):
		data = _direct_load_state()
	if typeof(data) != TYPE_DICTIONARY:
		data = {}
	if not data.has("targets"):
		data["targets"] = {}
	return data

static func save_state(data: Dictionary) -> bool:
	var json = preload("res://Scripts/Utils/JSONFileManager.gd")
	var ok = json.save_json(STATE_PATH, data)
	if ok:
		return true
	return _direct_save_state(data)

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
	var state: Dictionary = targets.get(target_id, {})
	var stored_original = float(state.get("original_mass", 0.0))
	if stored_original <= 0.0 and original_mass > 0.0:
		state["original_mass"] = original_mass
		stored_original = original_mass
	var collected: Dictionary = state.get("collected", {})
	var total_collected := 0.0
	for v in collected.values():
		total_collected += float(v)
	var desired_remaining = max(stored_original - total_collected, 0.0)
	if abs(float(state.get("remaining_mass", desired_remaining)) - desired_remaining) > 0.5:
		state["remaining_mass"] = desired_remaining
		targets[target_id] = state
		data["targets"] = targets
		save_state(data)
	return state

static func apply_mining(target_id: String, original_mass: float, minerals: Dictionary) -> Dictionary:
	if original_mass <= 0.0:
		var inferred := 0.0
		for v in minerals.values():
			inferred += float(v)
		original_mass = inferred
	if original_mass <= 0.0:
		return {}
	var data = load_state()
	var targets: Dictionary = data.get("targets", {})
	var state: Dictionary = targets.get(target_id, {})
	if state.is_empty():
		state = {
			"original_mass": original_mass,
			"remaining_mass": original_mass,
			"collected": {}
		}
	var stored_original = float(state.get("original_mass", original_mass))
	if stored_original <= 0.0 and original_mass > 0.0:
		stored_original = original_mass
		state["original_mass"] = stored_original
	var collected: Dictionary = state.get("collected", {})
	var total_collected := 0.0
	for v in collected.values():
		total_collected += float(v)
	var remaining = max(stored_original - total_collected, 0.0)
	var chunk = original_mass * 0.10
	var mined = min(remaining, chunk)
	if mined <= 0.0:
		state["remaining_mass"] = remaining
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
