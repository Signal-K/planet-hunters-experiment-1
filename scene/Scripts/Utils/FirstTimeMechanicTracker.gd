extends RefCounted
## FirstTimeMechanicTracker.gd
## Persistent tracker for which game mechanics the player has seen an
## introductory tutorial for. Integrates with MechanicIntroCatalog to
## retrieve content and with MechanicIntroOverlay to display it.
##
## Usage (call from any scene that introduces a new mechanic):
##   FirstTimeMechanicTracker.maybe_show("room_upgrades", get_tree())
##
## The overlay shows exactly once per mechanic key per save file.
## If no catalog entry exists for the key, nothing happens.

const STATE_PATH := "user://mechanic_intros_seen.json"

const MechanicIntroCatalog = preload("res://Scripts/Utils/MechanicIntroCatalog.gd")
const MechanicIntroOverlay = preload("res://Scripts/UI/MechanicIntroOverlay.gd")

## Check whether the player has already seen the intro for a mechanic.
static func has_seen(mechanic_key: String) -> bool:
	var data := _load()
	return bool(data.get("seen", {}).get(mechanic_key, false))

## Mark a mechanic intro as seen (idempotent).
static func mark_seen(mechanic_key: String) -> void:
	var data := _load()
	var seen: Dictionary = data.get("seen", {})
	seen[mechanic_key] = true
	data["seen"] = seen
	_save(data)

## Show the intro overlay for a mechanic exactly once.
## Silently does nothing if:
##   - the player has already seen it, OR
##   - no catalog entry exists for the key, OR
##   - tree is null or unavailable
static func maybe_show(mechanic_key: String, tree: SceneTree) -> void:
	if has_seen(mechanic_key):
		return
	if not MechanicIntroCatalog.has_entry(mechanic_key):
		return
	if tree == null or tree.root == null:
		return
	mark_seen(mechanic_key)
	var content := MechanicIntroCatalog.get_entry(mechanic_key)
	var overlay := MechanicIntroOverlay.new()
	tree.root.add_child(overlay)
	overlay.show_intro(content)

## Reset a single mechanic (useful in dev/testing).
static func reset(mechanic_key: String) -> void:
	var data := _load()
	var seen: Dictionary = data.get("seen", {})
	seen.erase(mechanic_key)
	data["seen"] = seen
	_save(data)

## Reset all seen state (dev/testing only).
static func reset_all() -> void:
	_save({"seen": {}})

## Return list of all mechanic keys the player has seen intros for.
static func get_seen_keys() -> Array:
	return _load().get("seen", {}).keys()

static func _load() -> Dictionary:
	if not FileAccess.file_exists(STATE_PATH):
		return {"seen": {}}
	var f := FileAccess.open(STATE_PATH, FileAccess.READ)
	if f == null:
		return {"seen": {}}
	var text := f.get_as_text()
	f.close()
	var parsed = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		return {"seen": {}}
	if not parsed.has("seen"):
		parsed["seen"] = {}
	return parsed

static func _save(data: Dictionary) -> void:
	var f := FileAccess.open(STATE_PATH, FileAccess.WRITE)
	if f == null:
		return
	f.store_string(JSON.stringify(data))
	f.close()
