extends RefCounted
class_name RocketsManager

const STATE_PATH := "user://rockets_state.json"
const DEFAULT_STATE_PATH := "res://rockets_state.json"
const KNOWN_ROCKET_TYPES := ["starterrocket1", "starterrocket2"]
const ROCKET_UNLOCK_LEVELS := {
    "starterrocket1": 1,
    "starterrocket2": 2
}
static var _preview_target: Dictionary = {}
static var _return_to_new_mission_panel: bool = false
static var _preview_index: int = 0
static var _override_state: Dictionary = {}

static func load_state() -> Dictionary:
    if _override_state.size() > 0:
        return _override_state.duplicate(true)
    var data = {}
    var json = preload("res://Scripts/Utils/JSONFileManager.gd")
    if not FileAccess.file_exists(STATE_PATH):
        # Seed user:// state from bundled res:// file if present
        data = json.load_json(DEFAULT_STATE_PATH)
        if typeof(data) != TYPE_DICTIONARY:
            data = {}
        if data.size() > 0:
            json.save_json(STATE_PATH, data)
    if data.is_empty():
        data = json.load_json(STATE_PATH)
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
    if not data.has("seen_asteroids"):
        data["seen_asteroids"] = []
    if not data.has("seen_planets"):
        data["seen_planets"] = []
    _migrate_placed_entries(data)
    _migrate_mission_times(data)
    return data

static func _migrate_placed_entries(data: Dictionary) -> void:
    if not data.has("placed"):
        return
    var placed = data.get("placed", [])
    if placed.is_empty():
        return
    var changed = false
    var used_ids := {}
    for i in range(placed.size()):
        var item = placed[i]
        var rtype = str(item.get("type", ""))
        var rid = str(item.get("id", ""))
        if rtype == "" and KNOWN_ROCKET_TYPES.has(rid):
            rtype = rid
            item["type"] = rtype
            changed = true
        if rtype == "" and rid.find("-") != -1:
            var parts = rid.split("-")
            if parts.size() > 0 and KNOWN_ROCKET_TYPES.has(parts[0]):
                rtype = parts[0]
                item["type"] = rtype
                changed = true
        if rid == "" and rtype != "":
            rid = rtype
            item["id"] = rid
            changed = true
        if rid != "" and used_ids.has(rid):
            var rng = RandomNumberGenerator.new()
            rng.randomize()
            var new_id = "%s-%d" % [rtype if rtype != "" else "rocket", rng.randi()]
            item["id"] = new_id
            rid = new_id
            changed = true
        if rid != "":
            used_ids[rid] = true
        var status = str(item.get("status", ""))
        if status == "":
            item["status"] = "awaitingLaunch"
            changed = true
        placed[i] = item
    if changed:
        data["placed"] = placed
        save_state(data)

static func _migrate_mission_times(data: Dictionary) -> void:
    if not data.has("missions"):
        return
    var missions = data.get("missions", [])
    if missions.is_empty():
        return
    var time_helper = preload("res://Scripts/Earth/TimeHelper.gd")
    var now = int(time_helper.get_unix_epoch_seconds())
    var changed = false
    for i in range(missions.size()):
        var m = missions[i]
        var launch_time = int(m.get("launch_time", 0))
        var arrival_time = int(m.get("arrival_time", 0))
        if launch_time <= 0:
            launch_time = now
            m["launch_time"] = launch_time
            arrival_time = launch_time + 60
            m["arrival_time"] = arrival_time
            missions[i] = m
            changed = true
        elif arrival_time <= launch_time:
            m["arrival_time"] = launch_time + 60
            missions[i] = m
            changed = true
    if changed:
        data["missions"] = missions
        save_state(data)

static func save_state(data: Dictionary) -> bool:
    var json = preload("res://Scripts/Utils/JSONFileManager.gd")
    var ok = json.save_json(STATE_PATH, data)
    # Best-effort dev sync: update res:// file when writable (editor)
    # Ignore failures since res:// can be read-only in tests/exports.
    json.save_json(DEFAULT_STATE_PATH, data)
    if ok:
        _override_state = {}
    return ok

static func set_override_state(data: Dictionary) -> void:
    _override_state = data.duplicate(true)

static func clear_override_state() -> void:
    _override_state = {}

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

static func unlock_for_level(level: int) -> Array:
    var newly_unlocked := []
    if level < 1:
        return newly_unlocked
    for rocket_id in ROCKET_UNLOCK_LEVELS.keys():
        var required_level = int(ROCKET_UNLOCK_LEVELS[rocket_id])
        if level >= required_level:
            if unlock(rocket_id):
                newly_unlocked.append(rocket_id)
    return newly_unlocked

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
    var targets = s.get("detected_targets", [])
    print("RocketsManager: get_detected_targets -> count=", targets.size())
    return targets

static func register_target_interaction(target_id: String, target_type: String) -> int:
    if target_id == "":
        return 0
    var s = load_state()
    var normalized_type = _normalize_target_type(target_type)
    var key = "seen_planets" if normalized_type == "planet" else "seen_asteroids"
    var list = s.get(key, [])
    for i in range(list.size()):
        if str(list[i]) == target_id:
            return i + 1
    list.append(target_id)
    s[key] = list
    save_state(s)
    return list.size()

static func get_target_level(target_id: String, target_type: String) -> int:
    if target_id == "":
        return 0
    var s = load_state()
    var normalized_type = _normalize_target_type(target_type)
    var key = "seen_planets" if normalized_type == "planet" else "seen_asteroids"
    var list = s.get(key, [])
    for i in range(list.size()):
        if str(list[i]) == target_id:
            return i + 1
    return 0

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

static func return_home(rocket_id: String) -> bool:
    if rocket_id == "":
        return false
    var s = load_state()
    var changed = false

    # Remove from launched list
    var launched = s.get("launched", [])
    if launched.has(rocket_id):
        launched.erase(rocket_id)
        s["launched"] = launched
        changed = true

    # Remove mission entries for this rocket
    var missions = s.get("missions", [])
    for i in range(missions.size() - 1, -1, -1):
        if str(missions[i].get("rocket_id", "")) == rocket_id:
            missions.remove_at(i)
            changed = true
    s["missions"] = missions

    # Update placed entry to awaitingLaunch or add a new one
    var placed = s.get("placed", [])
    var found = false
    for i in range(placed.size()):
        if str(placed[i].get("id", "")) == rocket_id:
            placed[i]["status"] = "awaitingLaunch"
            placed[i]["x"] = placed[i].get("x", -110.0)
            placed[i]["y"] = placed[i].get("y", -170.0)
            found = true
            changed = true
            break
    if not found:
        var rtype = _rocket_type_from_id(rocket_id)
        placed.append({"type": rtype, "id": rocket_id, "x": -110.0, "y": -170.0, "status": "awaitingLaunch"})
        changed = true
    s["placed"] = placed

    if changed:
        return save_state(s)
    return true

static func _rocket_type_from_id(rocket_id: String) -> String:
    if rocket_id.find("-") != -1:
        var parts = rocket_id.split("-")
        if parts.size() > 0:
            return str(parts[0])
    return rocket_id

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
    data["launched"] = []
    data["destroyed"] = []
    data["missions"] = []
    data["selected_target"] = ""
    data["detected_targets"] = []
    data["seen_asteroids"] = []
    data["seen_planets"] = []
    _override_state = data.duplicate(true)
    var ok = save_state(data)
    if ok:
        _override_state = {}
        return true
    # Fallback: write directly to user:// if JSONFileManager failed
    var direct_ok = _write_state_direct(data)
    if direct_ok:
        _override_state = {}
        return true
    var verify = load_state()
    var unlocked = verify.get("unlocked", [])
    var placed = verify.get("placed", [])
    if unlocked == ["starterrocket1"] and placed.is_empty():
        print("RocketsManager: reset_state verified via load_state fallback")
        return true
    print("RocketsManager: reset_state failed to persist user state; using in-memory override")
    _override_state = data.duplicate(true)
    return true

static func _write_state_direct(data: Dictionary) -> bool:
    var file = FileAccess.open(STATE_PATH, FileAccess.WRITE)
    if not file:
        return false
    var json_string = JSON.stringify(data, "  ")
    file.store_string(json_string + "\n")
    file.close()
    print("RocketsManager: direct state write succeeded: ", STATE_PATH)
    return true

static func set_preview_target(target_id: String, target_label: String, target_type: String = "asteroid", rocket_id: String = "") -> void:
    _preview_target = {
        "id": target_id,
        "label": target_label,
        "type": target_type,
        "rocket_id": rocket_id
    }

static func get_preview_target() -> Dictionary:
    var target = _preview_target.duplicate()
    if not target.has("type"):
        target["type"] = "asteroid"
    if not target.has("rocket_id"):
        target["rocket_id"] = ""
    return target

static func clear_preview_target() -> void:
    _preview_target = {}

static func set_return_to_new_mission_panel(enabled: bool) -> void:
    _return_to_new_mission_panel = enabled

static func consume_return_to_new_mission_panel() -> bool:
    var flag = _return_to_new_mission_panel
    _return_to_new_mission_panel = false
    return flag

static func get_preview_index() -> int:
    return _preview_index

static func set_preview_index(idx: int) -> void:
    _preview_index = max(idx, 0)

static func get_preview_candidates() -> Array:
    var missions = get_missions()
    var launched = get_launched()
    if missions.is_empty() or launched.is_empty():
        return []
    var target_map := {}
    var targets = get_detected_targets()
    for t in targets:
        var tid = str(t.get("id", ""))
        if tid == "":
            continue
        target_map[tid] = {
            "label": str(t.get("label", tid)),
            "type": str(t.get("type", "asteroid"))
        }
    missions.sort_custom(Callable(RocketsManager, "_sort_mission_by_launch_time"))
    var out := []
    for m in missions:
        var rocket_id = str(m.get("rocket_id", ""))
        var target_id = str(m.get("target", ""))
        if rocket_id == "" or target_id == "":
            continue
        if not launched.has(rocket_id):
            continue
        var entry = target_map.get(target_id, {})
        var label = str(entry.get("label", "Asteroid %s" % target_id))
        var ttype = str(entry.get("type", "asteroid"))
        out.append({
            "rocket_id": rocket_id,
            "target_id": target_id,
            "label": label,
            "type": ttype
        })
    return out

static func _sort_mission_by_launch_time(a: Dictionary, b: Dictionary) -> bool:
    return float(a.get("launch_time", 0)) < float(b.get("launch_time", 0))

static func _normalize_target_type(value: String) -> String:
    var t = value.strip_edges().to_lower()
    if t == "planets":
        return "planet"
    if t == "asteroids":
        return "asteroid"
    if t == "planet" or t == "asteroid":
        return t
    return "asteroid"
