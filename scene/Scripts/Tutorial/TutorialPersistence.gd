extends RefCounted
class_name TutorialPersistence

const TUTORIAL_STATE_PATH := "user://tutorial_v2.cfg"
const STATE_SECTION := "state"

func save_state(state: Dictionary) -> void:
	var cfg = ConfigFile.new()
	cfg.set_value(STATE_SECTION, "current_stage", int(state.get("current_stage", 1)))
	cfg.set_value(STATE_SECTION, "current_step_index", int(state.get("current_step_index", 0)))
	cfg.set_value(STATE_SECTION, "stage_lock", int(state.get("stage_lock", 0)))
	cfg.set_value(STATE_SECTION, "skipped", bool(state.get("skipped", false)))
	cfg.set_value(STATE_SECTION, "completed_actions", state.get("completed_actions", {}).duplicate(true))
	cfg.set_value(STATE_SECTION, "completed_actions_by_stage", state.get("completed_actions_by_stage", {}).duplicate(true))
	cfg.set_value(STATE_SECTION, "completed_steps_by_stage", state.get("completed_steps_by_stage", {}).duplicate(true))
	var err = cfg.save(TUTORIAL_STATE_PATH)
	if err != OK:
		print("[TutorialPersistence] Failed to save tutorial state: ", err)

func load_state(default_state: Dictionary) -> Dictionary:
	var out = default_state.duplicate(true)
	var cfg = ConfigFile.new()
	var err = cfg.load(TUTORIAL_STATE_PATH)
	if err != OK:
		return out
	out["current_stage"] = int(cfg.get_value(STATE_SECTION, "current_stage", out.get("current_stage", 1)))
	out["current_step_index"] = int(cfg.get_value(STATE_SECTION, "current_step_index", out.get("current_step_index", 0)))
	out["stage_lock"] = int(cfg.get_value(STATE_SECTION, "stage_lock", out.get("stage_lock", 0)))
	out["skipped"] = bool(cfg.get_value(STATE_SECTION, "skipped", out.get("skipped", false)))
	var completed_actions = cfg.get_value(STATE_SECTION, "completed_actions", out.get("completed_actions", {}))
	out["completed_actions"] = completed_actions if typeof(completed_actions) == TYPE_DICTIONARY else {}
	var completed_actions_by_stage = cfg.get_value(STATE_SECTION, "completed_actions_by_stage", out.get("completed_actions_by_stage", {}))
	out["completed_actions_by_stage"] = completed_actions_by_stage if typeof(completed_actions_by_stage) == TYPE_DICTIONARY else {}
	var completed_steps = cfg.get_value(STATE_SECTION, "completed_steps_by_stage", out.get("completed_steps_by_stage", {}))
	out["completed_steps_by_stage"] = completed_steps if typeof(completed_steps) == TYPE_DICTIONARY else {}
	return out

func reset() -> void:
	DirAccess.remove_absolute(TUTORIAL_STATE_PATH)
