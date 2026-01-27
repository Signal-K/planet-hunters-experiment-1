extends RefCounted
class_name RocketsManager

const STATE_PATH := "res://rockets_state.json"

static func load_state() -> Dictionary:
    var data = {}
    data = preload("res://Scripts/Utils/JSONFileManager.gd").load_json(STATE_PATH)
    if typeof(data) != TYPE_DICTIONARY:
        data = {}
    if not data.has("unlocked"):
        data["unlocked"] = ["starterrocket1"]
    if not data.has("placed"):
        data["placed"] = []
    if not data.has("launched"):
        data["launched"] = []
    if not data.has("destroyed"):
        data["destroyed"] = []
    return data

static func save_state(data: Dictionary) -> bool:
    return preload("res://Scripts/Utils/JSONFileManager.gd").save_json(STATE_PATH, data)

static func get_unlocked() -> Array:
    var s = load_state()
    return s.get("unlocked", [])

static func is_unlocked(rocket_id: String) -> bool:
    return get_unlocked().has(rocket_id)

static func unlock(rocket_id: String) -> bool:
    var s = load_state()
    var arr = s.get("unlocked", [])
    if not arr.has(rocket_id):
        arr.append(rocket_id)
        s["unlocked"] = arr
        return save_state(s)
    return true

static func get_placed() -> Array:
    var s = load_state()
    return s.get("placed", [])

static func get_launched() -> Array:
    var s = load_state()
    return s.get("launched", [])

static func get_destroyed() -> Array:
    var s = load_state()
    return s.get("destroyed", [])

static func is_launched(rocket_id: String) -> bool:
    return get_launched().has(rocket_id)

static func set_launched(rocket_id: String) -> bool:
    var s = load_state()
    var arr = s.get("launched", [])
    var changed = false
    if not arr.has(rocket_id):
        arr.append(rocket_id)
        s["launched"] = arr
        changed = true
    # mark matching placed entries with status = "launched" so restore logic can skip them
    var placed = s.get("placed", [])
    for i in range(placed.size() - 1, -1, -1):
        if placed[i].get("id", "") == rocket_id:
            placed[i]["status"] = "launched"
            changed = true
    s["placed"] = placed
    if changed:
        return save_state(s)
    return true

static func set_destroyed(rocket_id: String) -> bool:
    var s = load_state()
    var changed = false
    # Ensure rocket_id is recorded in destroyed list
    var d = s.get("destroyed", [])
    if not d.has(rocket_id):
        d.append(rocket_id)
        s["destroyed"] = d
        changed = true
    # Remove from launched list if present
    var l = s.get("launched", [])
    if l.has(rocket_id):
        l.erase(rocket_id)
        s["launched"] = l
        changed = true
    # Mark matching placed entries with status = "Destroyed"
    var placed = s.get("placed", [])
    for i in range(placed.size() - 1, -1, -1):
        if placed[i].get("id", "") == rocket_id:
            placed[i]["status"] = "Destroyed"
            changed = true
    s["placed"] = placed
    if changed:
        return save_state(s)
    return true

static func add_placed(rocket_type: String, position: Vector2) -> String:
    var s = load_state()
    var arr = s.get("placed", [])
    # Generate a unique id for this placed rocket
    # Generate a reasonably-unique id using a random number generator to avoid engine-specific time APIs
    var rng = RandomNumberGenerator.new()
    rng.randomize()
    var uid = "%s-%d" % [rocket_type, rng.randi()]
    arr.append({"type": rocket_type, "id": uid, "x": position.x, "y": position.y, "status": "awaitingLaunch"})
    s["placed"] = arr
    save_state(s)
    return uid

static func reset_state() -> bool:
    # Reset rockets state to defaults: only starter rocket unlocked, no placed rockets
    var data = {}
    data["unlocked"] = ["starterrocket1"]
    data["placed"] = []
    return save_state(data)
