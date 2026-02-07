extends RefCounted
class_name RocketsStateStore

static func apply_migrations(data: Dictionary, save_fn: Callable) -> void:
	_migrate_placed_entries(data, save_fn)
	_migrate_mission_times(data, save_fn)
	_migrate_returning_started(data, save_fn)
	_migrate_return_completion(data, save_fn)

static func _migrate_placed_entries(data: Dictionary, save_fn: Callable) -> void:
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
		if rtype == "" and rid != "":
			var parts = rid.split("-")
			if parts.size() > 0:
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
		if save_fn.is_valid():
			save_fn.call(data)

static func _migrate_mission_times(data: Dictionary, save_fn: Callable) -> void:
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
		if save_fn.is_valid():
			save_fn.call(data)

static func _migrate_returning_started(data: Dictionary, save_fn: Callable) -> void:
	var now = int(Time.get_unix_time_from_system())
	var returning_started = data.get("returning_started", {})
	var ids: Array = []
	var placed = data.get("placed", [])
	for item in placed:
		if str(item.get("status", "")) == "returningHome":
			var rid = str(item.get("id", ""))
			if rid != "" and not ids.has(rid):
				ids.append(rid)
	var returning = data.get("returning", [])
	for entry in returning:
		var rid = str(entry.get("rocket_id", ""))
		if rid != "" and not ids.has(rid):
			ids.append(rid)
	var changed = false
	for rid in ids:
		var started_at = int(returning_started.get(rid, 0))
		if started_at <= 0:
			returning_started[rid] = now - 60 - 1
			changed = true
	if changed:
		data["returning_started"] = returning_started
		if save_fn.is_valid():
			save_fn.call(data)

static func _migrate_return_completion(data: Dictionary, save_fn: Callable) -> void:
	var now = int(Time.get_unix_time_from_system())
	var returning_started = data.get("returning_started", {})
	if returning_started.is_empty():
		return
	var placed = data.get("placed", [])
	var returning = data.get("returning", [])
	var arrived = data.get("arrived", {})
	var changed = false
	for rid in returning_started.keys():
		var started_at = int(returning_started.get(rid, 0))
		if started_at <= 0:
			continue
		if (now - started_at) < 60:
			continue
		for i in range(placed.size()):
			if str(placed[i].get("id", "")) == str(rid):
				if str(placed[i].get("status", "")) != "returned":
					placed[i]["status"] = "returned"
					changed = true
				break
		for i in range(returning.size() - 1, -1, -1):
			if str(returning[i].get("rocket_id", "")) == str(rid):
				returning.remove_at(i)
				changed = true
		if arrived.has(rid):
			arrived.erase(rid)
			changed = true
		returning_started.erase(rid)
		changed = true
	if changed:
		data["placed"] = placed
		data["returning"] = returning
		data["returning_started"] = returning_started
		data["arrived"] = arrived
		if save_fn.is_valid():
			save_fn.call(data)
