extends RefCounted
class_name AppControllerPersistence

const AppLogger = preload("res://Scripts/Utils/Logger.gd")
const FRANC_BALANCE_CONFIG_PATH := "user://franc_balance.cfg"
const PREFERENCES_CONFIG_PATH := "user://preferences.cfg"
const LEGACY_EXPERIENCE_CONFIG_PATH := "user://experience.cfg"
const TUTORIAL_STATE_CONFIG_PATH := "user://tutorial_v2.cfg"
const FRANC_BALANCE_SECTION := "currency"
const FRANC_BALANCE_KEY := "balance"
const LOAN_KEY := "loan_balance"
const LEGACY_FRANC_BALANCE_JSON_PATH := "user://franc_balance.json"
const PREFERENCES_SECTION := "preferences"
const CITIZEN_SCIENCE_DIALOGUE_KEY := "citizen_science_dialogue_enabled"

func save_franc_balance(value: int, loan: int = -1) -> void:
	var cfg = ConfigFile.new()
	cfg.load(FRANC_BALANCE_CONFIG_PATH)
	cfg.set_value(FRANC_BALANCE_SECTION, FRANC_BALANCE_KEY, value)
	if loan >= 0:
		cfg.set_value(FRANC_BALANCE_SECTION, LOAN_KEY, loan)
	var err = cfg.save(FRANC_BALANCE_CONFIG_PATH)
	if err != OK:
		push_error("[AppController] Failed to save franc balance: ", err)
	else:
		AppLogger.d("[AppController] Franc balance saved: " + str(value))

func load_franc_balance(default_value: int) -> Dictionary:
	var cfg = ConfigFile.new()
	var err = cfg.load(FRANC_BALANCE_CONFIG_PATH)
	if err == OK:
		if cfg.has_section_key(FRANC_BALANCE_SECTION, FRANC_BALANCE_KEY):
			var value = int(cfg.get_value(FRANC_BALANCE_SECTION, FRANC_BALANCE_KEY))
			var loan = int(cfg.get_value(FRANC_BALANCE_SECTION, LOAN_KEY, 0))
			AppLogger.d("[AppController] Loaded franc balance from disk: " + str(value))
			return {"loaded": true, "value": value, "loan": loan}
		AppLogger.d("[AppController] No franc balance key in config; using default: " + str(default_value))
		return {"loaded": false, "value": default_value, "loan": 0}
	var legacy = _load_legacy_franc_balance_json()
	if bool(legacy.get("loaded", false)):
		save_franc_balance(int(legacy.get("value", default_value)), int(legacy.get("loan", 0)))
		return legacy
	AppLogger.d("[AppController] No saved franc balance config (or failed to load): " + str(err))
	return {"loaded": false, "value": default_value, "loan": 0}

func _load_legacy_franc_balance_json() -> Dictionary:
	if not FileAccess.file_exists(LEGACY_FRANC_BALANCE_JSON_PATH):
		return {"loaded": false}
	var file := FileAccess.open(LEGACY_FRANC_BALANCE_JSON_PATH, FileAccess.READ)
	if file == null:
		return {"loaded": false}
	var parsed = JSON.parse_string(file.get_as_text())
	file.close()
	if typeof(parsed) != TYPE_DICTIONARY or not parsed.has(FRANC_BALANCE_KEY):
		return {"loaded": false}
	var value := int(parsed.get(FRANC_BALANCE_KEY, 0))
	var loan := int(parsed.get(LOAN_KEY, 0))
	AppLogger.d("[AppController] Loaded legacy franc balance JSON: " + str(value))
	return {"loaded": true, "value": value, "loan": loan}

func save_citizen_science_dialogue_enabled(enabled: bool) -> void:
	var cfg = ConfigFile.new()
	cfg.load(PREFERENCES_CONFIG_PATH)
	cfg.set_value(PREFERENCES_SECTION, CITIZEN_SCIENCE_DIALOGUE_KEY, enabled)
	var err = cfg.save(PREFERENCES_CONFIG_PATH)
	if err != OK:
		push_error("[AppController] Failed to save preferences: ", err)

func load_citizen_science_dialogue_enabled(default_value: bool = true) -> bool:
	var cfg = ConfigFile.new()
	# Migrate from legacy experience.cfg if preferences.cfg doesn't exist yet
	if not FileAccess.file_exists(PREFERENCES_CONFIG_PATH) and FileAccess.file_exists(LEGACY_EXPERIENCE_CONFIG_PATH):
		cfg.load(LEGACY_EXPERIENCE_CONFIG_PATH)
	else:
		cfg.load(PREFERENCES_CONFIG_PATH)
	if cfg.has_section_key(PREFERENCES_SECTION, CITIZEN_SCIENCE_DIALOGUE_KEY):
		return bool(cfg.get_value(PREFERENCES_SECTION, CITIZEN_SCIENCE_DIALOGUE_KEY))
	return default_value

func reset_all() -> void:
	DirAccess.remove_absolute(FRANC_BALANCE_CONFIG_PATH)
	DirAccess.remove_absolute(LEGACY_FRANC_BALANCE_JSON_PATH)
	DirAccess.remove_absolute(PREFERENCES_CONFIG_PATH)
	DirAccess.remove_absolute(LEGACY_EXPERIENCE_CONFIG_PATH)
	DirAccess.remove_absolute(TUTORIAL_STATE_CONFIG_PATH)
	DirAccess.remove_absolute("user://construction_state.json")
	DirAccess.remove_absolute("user://first_time_mechanics.json")
	DirAccess.remove_absolute("user://rockets_state.json")
	DirAccess.remove_absolute("user://mission_logs.json")
	DirAccess.remove_absolute("user://subcontractors.json")
