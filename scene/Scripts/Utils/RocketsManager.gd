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
    if not data.has("missions"):
        data["missions"] = []
    if not data.has("selected_target"):
        data["selected_target"] = ""
    if not data.has("detected_targets"):
        data["detected_targets"] = []
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

static func select_target(target_id: String) -> bool:
    var s = load_state()
    if typeof(target_id) != TYPE_STRING:
        return false
    s["selected_target"] = target_id
    return save_state(s)

static func get_selected_target() -> String:
    var s = load_state()
    return str(s.get("selected_target", ""))

static func clear_selected_target() -> bool:
    var s = load_state()
    s["selected_target"] = ""
    return save_state(s)

static func add_mission(rocket_id: String, target_id: String, launch_time_epoch: int, travel_seconds: int = 60) -> bool:
    var s = load_state()
    var missions = s.get("missions", [])
    var arrival = launch_time_epoch + travel_seconds
    var record = {"rocket_id": rocket_id, "target": target_id, "launch_time": launch_time_epoch, "arrival_time": arrival}
    missions.append(record)
    s["missions"] = missions
    return save_state(s)

static func get_missions() -> Array:
    var s = load_state()
    return s.get("missions", [])

static func set_detected_targets(targets: Array) -> bool:
    var s = load_state()
    # store simplified detected targets array (array of dictionaries)
    s["detected_targets"] = targets
    return save_state(s)

static func get_detected_targets() -> Array:
    var s = load_state()
    return s.get("detected_targets", [])

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
