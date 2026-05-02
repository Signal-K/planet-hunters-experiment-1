extends RefCounted
## ClassificationConsensus.gd
## Checks classification consensus for targets the player has classified,
## by querying the Supabase classifications table.
##
## Usage:
##   ClassificationConsensus.check_for_updates(get_tree(), callback)
##   ClassificationConsensus.get_stored(anomaly_id)   → Dictionary
##   ClassificationConsensus.get_new_notifications()   → Array[Dictionary]

const STATE_PATH := "user://classification_consensus.json"

const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const SupabaseClient = preload("res://Scripts/Systems/SupabaseClient.gd")

## Minimum votes from other users before consensus is considered formed.
const MIN_VOTES_FOR_CONSENSUS := 2

## Returns the stored consensus data for a single anomaly.
## Keys: player_verdict, consensus_verdict, planet_count, not_planet_count,
##       last_checked, notified
static func get_stored(anomaly_id: String) -> Dictionary:
	var all := _load()
	return all.get(anomaly_id, {}).duplicate(true)

## Returns all anomaly IDs the player has a stored consensus result for.
static func get_all_ids() -> Array:
	return _load().keys()

## Returns consensus entries where notified=false (new updates to show).
static func get_new_notifications() -> Array:
	var all := _load()
	var result: Array = []
	for id in all.keys():
		var entry: Dictionary = all[id]
		if not bool(entry.get("notified", false)) and entry.get("consensus_verdict", "") != "":
			result.append(entry.duplicate(true))
	return result

## Mark all pending notifications as shown.
static func mark_all_notified() -> void:
	var all := _load()
	for id in all.keys():
		all[id]["notified"] = true
	_save(all)

## Mark a single anomaly's notification as shown.
static func mark_notified(anomaly_id: String) -> void:
	var all := _load()
	if all.has(anomaly_id):
		all[anomaly_id]["notified"] = true
		_save(all)

## Fetch consensus from Supabase for all targets the player has classified.
## Calls back with Array of updated entries (empty if none or error).
static func check_for_updates(tree: SceneTree, callback: Callable = Callable()) -> void:
	# Collect all anomaly IDs the player has voted on
	var classifications: Dictionary = RocketsManager.get_all_tess_classifications()
	if classifications.is_empty():
		if callback.is_valid():
			callback.call([])
		return

	var supabase: Node = SupabaseClient.get_instance()
	if supabase == null:
		if callback.is_valid():
			callback.call([])
		return

	# Fetch one anomaly at a time (PostgREST doesn't easily support IN queries
	# without server-side RPC; keep it simple with sequential requests)
	var pending: Array = classifications.keys()
	var all_stored := _load()
	var updated: Array = []
	_process_next_consensus_fetch(supabase, pending, classifications, all_stored, updated, callback)

static func _process_next_consensus_fetch(
	supabase,
	pending: Array,
	classifications: Dictionary,
	all_stored: Dictionary,
	updated: Array,
	callback: Callable
) -> void:
	if pending.is_empty():
		if not updated.is_empty():
			_save(all_stored)
		if callback.is_valid():
			callback.call(updated)
		return

	var anomaly_id := str(pending.pop_front())
	var player_verdict := str(classifications.get(anomaly_id, ""))
	var query := "anomaly=eq.%s&limit=50" % anomaly_id

	supabase.fetch_table("classifications", query, func(rows: Array, error: String) -> void:
		if error == "" and not rows.is_empty():
			_apply_consensus_rows(anomaly_id, player_verdict, rows, all_stored, updated)
		_process_next_consensus_fetch(supabase, pending, classifications, all_stored, updated, callback)
	)

static func _apply_consensus_rows(
	anomaly_id: String,
	player_verdict: String,
	rows: Array,
	all_stored: Dictionary,
	updated: Array
) -> void:
	var planet_count := 0
	var not_planet_count := 0
	for row_any in rows:
		if typeof(row_any) != TYPE_DICTIONARY:
			continue
		var cfg = row_any.get("classificationConfiguration", {})
		if typeof(cfg) != TYPE_DICTIONARY:
			continue
		var verdict := str(cfg.get("verdict", ""))
		if verdict == "planet":
			planet_count += 1
		elif verdict == "not_planet":
			not_planet_count += 1

	var others: int = maxi(0, planet_count + not_planet_count - 1)
	var consensus_verdict := ""
	if others >= MIN_VOTES_FOR_CONSENSUS:
		consensus_verdict = "planet" if planet_count > not_planet_count else "not_planet"

	var prev: Dictionary = all_stored.get(anomaly_id, {})
	var prev_consensus := str(prev.get("consensus_verdict", ""))
	var was_notified := bool(prev.get("notified", false))

	var entry := {
		"anomaly_id": anomaly_id,
		"player_verdict": player_verdict,
		"consensus_verdict": consensus_verdict,
		"planet_count": planet_count,
		"not_planet_count": not_planet_count,
		"last_checked": int(Time.get_unix_time_from_system()),
		"notified": was_notified and consensus_verdict == prev_consensus,
	}
	all_stored[anomaly_id] = entry

	if consensus_verdict != "" and (consensus_verdict != prev_consensus or not was_notified):
		entry["notified"] = false
		updated.append(entry)

## Consensus label for display (e.g. "3 agree · 1 disagree").
static func consensus_label(anomaly_id: String) -> String:
	var entry := get_stored(anomaly_id)
	if entry.is_empty():
		return ""
	var p := int(entry.get("planet_count", 0))
	var n := int(entry.get("not_planet_count", 0))
	var total := p + n
	if total == 0:
		return ""
	var cv := str(entry.get("consensus_verdict", ""))
	if cv == "":
		return "%d classification(s) so far" % total
	var agree_label := "Planet" if cv == "planet" else "Not a Planet"
	var agree := p if cv == "planet" else n
	var disagree := total - agree
	return "%d agree: %s · %d disagree" % [agree, agree_label, disagree]

static func _load() -> Dictionary:
	if not FileAccess.file_exists(STATE_PATH):
		return {}
	var f := FileAccess.open(STATE_PATH, FileAccess.READ)
	if f == null:
		return {}
	var parsed = JSON.parse_string(f.get_as_text())
	f.close()
	return parsed if typeof(parsed) == TYPE_DICTIONARY else {}

static func _save(data: Dictionary) -> void:
	var f := FileAccess.open(STATE_PATH, FileAccess.WRITE)
	if f == null:
		return
	f.store_string(JSON.stringify(data))
	f.close()
