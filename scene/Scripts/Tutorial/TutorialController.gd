extends Node
class_name TutorialController

signal tutorial_state_updated(state: Dictionary)
signal tutorial_step_changed(step: Dictionary, state: Dictionary)
signal tutorial_action_recorded(action_key: String, advanced: bool)

const TutorialCatalogScript = preload("res://Scripts/Tutorial/TutorialCatalog.gd")
const TutorialPersistenceScript = preload("res://Scripts/Tutorial/TutorialPersistence.gd")
const MAX_STAGE := 5

var _catalog := TutorialCatalogScript.new()
var _persistence := TutorialPersistenceScript.new()

var _state := {
	"current_stage": 1,
	"current_step_index": 0,
	"stage_lock": 0,
	"skipped": false,
	"completed_actions": {},
	"completed_actions_by_stage": {},
	"completed_steps_by_stage": {}
}

func _ready() -> void:
	_state = _persistence.load_state(_state)
	_refresh_stage_from_progress()
	_reconcile_step_index()
	_emit_state()

func get_tutorial_state() -> Dictionary:
	var snapshot = _state.duplicate(true)
	snapshot["current_step"] = get_current_step()
	snapshot["total_steps"] = _catalog.get_total_steps(int(snapshot.get("current_stage", 1)))
	snapshot["progress_percent"] = _build_progress_percent()
	return snapshot

func get_current_step() -> Dictionary:
	var stage = int(_state.get("current_stage", 1))
	var index = int(_state.get("current_step_index", 0))
	return _catalog.get_step(stage, index)

func has_seen_tutorial_action(action_key: String) -> bool:
	if action_key == "":
		return true
	return bool(_state.get("completed_actions", {}).get(action_key, false))

func has_seen_tutorial_action_for_stage(action_key: String, stage: int) -> bool:
	if action_key == "":
		return true
	return bool(_state.get("completed_actions_by_stage", {}).get(str(stage), {}).get(action_key, false))

func record_action(action_key: String, metadata: Dictionary = {}) -> bool:
	if action_key == "":
		return false
	_refresh_stage_from_progress()
	var completed_actions: Dictionary = _state.get("completed_actions", {})
	completed_actions[action_key] = true
	_state["completed_actions"] = completed_actions
	# Snapshot the stage BEFORE advancing so we can record in the right bucket.
	# We only write to completed_actions_by_stage when the action actually
	# advances a step — this prevents duplicate calls (fired after a stage
	# transition) from contaminating the new stage's action dict.
	var stage_before := int(_state.get("current_stage", 1))
	var advanced = _advance_if_match(action_key, metadata)
	if advanced:
		var by_stage: Dictionary = _state.get("completed_actions_by_stage", {})
		var stage_actions: Dictionary = by_stage.get(str(stage_before), {})
		stage_actions[action_key] = true
		by_stage[str(stage_before)] = stage_actions
		_state["completed_actions_by_stage"] = by_stage
	_persist_and_emit(action_key, advanced)
	return advanced

func skip_all() -> void:
	_state["skipped"] = true
	_persist_and_emit()

func resume() -> void:
	_state["skipped"] = false
	_persist_and_emit()

func replay_full() -> void:
	_state = {
		"current_stage": 1,
		"current_step_index": 0,
		"stage_lock": 1,
		"skipped": false,
		"completed_actions": {},
		"completed_actions_by_stage": {},
		"completed_steps_by_stage": {}
	}
	_persist_and_emit()
	_emit_step_changed()

func replay_current_mission() -> void:
	_refresh_stage_from_progress()
	var stage = int(_state.get("current_stage", 1))
	_state["current_step_index"] = 0
	_state["stage_lock"] = stage
	_state["skipped"] = false
	var completed_steps: Dictionary = _state.get("completed_steps_by_stage", {})
	completed_steps[str(stage)] = []
	_state["completed_steps_by_stage"] = completed_steps
	# Also clear the per-stage completed actions so the reconciler and
	# stuck-step skip don't skip over steps the player replays.
	var by_stage: Dictionary = _state.get("completed_actions_by_stage", {})
	by_stage[str(stage)] = {}
	_state["completed_actions_by_stage"] = by_stage
	_persist_and_emit()
	_emit_step_changed()

func reset_all() -> void:
	replay_full()
	_persistence.reset()

func force_advance_current_step() -> bool:
	var step = get_current_step()
	if step.is_empty():
		return false
	var key = str(step.get("action_key", ""))
	if key != "":
		record_action(key)
		return true
	return false

func _advance_if_match(action_key: String, _metadata: Dictionary) -> bool:
	if bool(_state.get("skipped", false)):
		return false
	# If the reconciler already fast-forwarded us to the end of a stage (empty
	# step), don't treat this call as a trigger to chain into the next stage.
	if get_current_step().is_empty():
		return false
	var advanced := false
	var guard = 0
	while guard < 12:
		guard += 1
		var step = get_current_step()
		if step.is_empty():
			if _try_advance_stage():
				advanced = true
				continue
			break
		var expected_key = str(step.get("action_key", ""))
		if expected_key == "":
			_mark_step_complete(int(_state.get("current_stage", 1)), int(_state.get("current_step_index", 0)))
			_state["current_step_index"] = int(_state.get("current_step_index", 0)) + 1
			advanced = true
			continue
		if expected_key != action_key:
			# If the current step's action was already recorded in THIS stage
			# (out-of-order recording, e.g. auto-launch fired select_launch_target
			# before the player tapped the panel), skip past it so the tutorial
			# never gets permanently stuck.
			# We use per-stage actions to avoid cross-stage contamination: the
			# same action key (e.g. select_launch_target) appears in multiple
			# stages, and a recording in stage 1 must not cause stage 3's step
			# to be silently skipped.
			if _stage_action_completed(int(_state.get("current_stage", 1)), expected_key):
				_mark_step_complete(int(_state.get("current_stage", 1)), int(_state.get("current_step_index", 0)))
				_state["current_step_index"] = int(_state.get("current_step_index", 0)) + 1
				advanced = true
				continue
			break
		_mark_step_complete(int(_state.get("current_stage", 1)), int(_state.get("current_step_index", 0)))
		_state["current_step_index"] = int(_state.get("current_step_index", 0)) + 1
		advanced = true
		if get_current_step().is_empty():
			_try_advance_stage()
		break
	if advanced:
		_reconcile_step_index()
		_emit_step_changed()
	return advanced

# Returns true if action_key was recorded while the tutorial was at this stage.
# Falls back to global completed_actions only for saves that pre-date per-stage
# tracking (i.e. the top-level completed_actions_by_stage dict is absent / empty
# because no action has ever been recorded in this session).  An empty stage-
# specific sub-dict simply means no actions have been recorded in that stage yet.
func _stage_action_completed(stage: int, action_key: String) -> bool:
	var by_stage: Dictionary = _state.get("completed_actions_by_stage", {})
	if not by_stage.is_empty():
		# Per-stage tracking is active — use only this stage's actions.
		return bool(by_stage.get(str(stage), {}).get(action_key, false))
	# Fallback: old save that pre-dates per-stage tracking.
	return bool(_state.get("completed_actions", {}).get(action_key, false))

func _mark_step_complete(stage: int, step_index: int) -> void:
	var completed_steps: Dictionary = _state.get("completed_steps_by_stage", {})
	var stage_key = str(stage)
	var stage_values = completed_steps.get(stage_key, [])
	if typeof(stage_values) != TYPE_ARRAY:
		stage_values = []
	if not stage_values.has(step_index):
		stage_values.append(step_index)
	completed_steps[stage_key] = stage_values
	_state["completed_steps_by_stage"] = completed_steps

func _try_advance_stage() -> bool:
	var stage = int(_state.get("current_stage", 1))
	if stage >= MAX_STAGE:
		return false
	_state["current_stage"] = stage + 1
	if int(_state.get("stage_lock", 0)) > 0:
		_state["stage_lock"] = int(_state.get("current_stage", 1))
	_state["current_step_index"] = 0
	return true

func _refresh_stage_from_progress() -> void:
	if int(_state.get("stage_lock", 0)) > 0:
		return
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var stage_from_progress = clamp(int(rm.get_mission_stage()), 1, MAX_STAGE)
	var current_stage = int(_state.get("current_stage", 1))
	if stage_from_progress > current_stage:
		_state["current_stage"] = stage_from_progress
		_state["current_step_index"] = 0

func _reconcile_step_index() -> void:
	var stage = int(_state.get("current_stage", 1))
	var total = _catalog.get_total_steps(stage)
	if total <= 0:
		_state["current_step_index"] = 0
		return
	var idx = int(_state.get("current_step_index", 0))
	_state["current_step_index"] = clamp(idx, 0, total)
	# Fast-forward past any steps whose action_key was already recorded in THIS
	# stage (crash recovery, app restart mid-mission, etc.).
	# Using per-stage lookup avoids skipping steps just because the same action
	# key was recorded in a different stage.
	var guard := 0
	while guard < total:
		guard += 1
		var step = get_current_step()
		if step.is_empty():
			break
		var key = str(step.get("action_key", ""))
		if key == "" or not _stage_action_completed(stage, key):
			break
		_state["current_step_index"] = int(_state.get("current_step_index", 0)) + 1

func _build_progress_percent() -> int:
	var stage = int(_state.get("current_stage", 1))
	var total = _catalog.get_total_steps(stage)
	if total <= 0:
		return 100
	var idx = int(_state.get("current_step_index", 0))
	return int(round((float(idx) / float(total)) * 100.0))

func _persist_and_emit(action_key: String = "", advanced: bool = false) -> void:
	_persistence.save_state(_state)
	if action_key != "":
		tutorial_action_recorded.emit(action_key, advanced)
	_emit_state()

func _emit_state() -> void:
	tutorial_state_updated.emit(get_tutorial_state())

func _emit_step_changed() -> void:
	tutorial_step_changed.emit(get_current_step(), get_tutorial_state())
