extends RefCounted
class_name EarthInventory

const JSONFileManager = preload("res://Scripts/Utils/JSONFileManager.gd")

const STATE_PATH := "user://earth_inventory.json"

static func load_state() -> Dictionary:
	var json = JSONFileManager
	var data = json.load_json(STATE_PATH)
	if typeof(data) != TYPE_DICTIONARY:
		data = {}
	if not data.has("materials"):
		data["materials"] = {}
	return data

static func save_state(data: Dictionary) -> bool:
	var json = JSONFileManager
	return json.save_json(STATE_PATH, data)

static func add_materials(materials: Dictionary) -> bool:
	var data = load_state()
	var store = data.get("materials", {})
	for key in materials.keys():
		var amount = int(materials.get(key, 0))
		store[key] = int(store.get(key, 0)) + amount
	data["materials"] = store
	return save_state(data)

static func get_materials() -> Dictionary:
	var data = load_state()
	return data.get("materials", {})