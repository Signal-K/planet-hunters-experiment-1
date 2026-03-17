extends RefCounted
class_name AppControllerPersistence

const FRANC_BALANCE_CONFIG_PATH := "user://franc_balance.cfg"
const EXPERIENCE_CONFIG_PATH := "user://experience.cfg"
const FRANC_BALANCE_SECTION := "currency"
const FRANC_BALANCE_KEY := "balance"
const LOAN_KEY := "loan_balance"
const EXPERIENCE_SECTION := "experience"
const EXPERIENCE_XP_KEY := "xp"
const EXPERIENCE_LEVEL_KEY := "level"
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
		print("[AppController] Failed to save franc balance: ", err)
	else:
		print("[AppController] Franc balance saved: ", value)

func load_franc_balance(default_value: int) -> Dictionary:
	var cfg = ConfigFile.new()
	var err = cfg.load(FRANC_BALANCE_CONFIG_PATH)
	if err == OK:
		if cfg.has_section_key(FRANC_BALANCE_SECTION, FRANC_BALANCE_KEY):
			var value = int(cfg.get_value(FRANC_BALANCE_SECTION, FRANC_BALANCE_KEY))
			var loan = int(cfg.get_value(FRANC_BALANCE_SECTION, LOAN_KEY, 0))
			print("[AppController] Loaded franc balance from disk: ", value)
			return {"loaded": true, "value": value, "loan": loan}
		print("[AppController] No franc balance key in config; using default: ", default_value)
		return {"loaded": false, "value": default_value, "loan": 0}
	print("[AppController] No saved franc balance config (or failed to load): ", err)
	return {"loaded": false, "value": default_value, "loan": 0}

func save_experience(xp: int, level: int) -> void:
	var cfg = ConfigFile.new()
	cfg.set_value(EXPERIENCE_SECTION, EXPERIENCE_XP_KEY, xp)
	cfg.set_value(EXPERIENCE_SECTION, EXPERIENCE_LEVEL_KEY, level)
	var err = cfg.save(EXPERIENCE_CONFIG_PATH)
	if err != OK:
		print("[AppController] Failed to save experience: ", err)
	else:
		print("[AppController] Experience saved: xp=", xp, " level=", level)

func load_experience(default_xp: int, default_level: int) -> Dictionary:
	var cfg = ConfigFile.new()
	var err = cfg.load(EXPERIENCE_CONFIG_PATH)
	if err == OK:
		if cfg.has_section_key(EXPERIENCE_SECTION, EXPERIENCE_XP_KEY) and cfg.has_section_key(EXPERIENCE_SECTION, EXPERIENCE_LEVEL_KEY):
			var xp = int(cfg.get_value(EXPERIENCE_SECTION, EXPERIENCE_XP_KEY))
			var level = int(cfg.get_value(EXPERIENCE_SECTION, EXPERIENCE_LEVEL_KEY))
			print("[AppController] Loaded experience from disk: xp=", xp, " level=", level)
			return {"loaded": true, "xp": xp, "level": level}
		print("[AppController] No experience keys in config; using defaults")
		return {"loaded": false, "xp": default_xp, "level": default_level}
	print("[AppController] No saved experience config (or failed to load): ", err)
	return {"loaded": false, "xp": default_xp, "level": default_level}

func save_citizen_science_dialogue_enabled(enabled: bool) -> void:
	var cfg = ConfigFile.new()
	var err = cfg.load(EXPERIENCE_CONFIG_PATH)
	if err != OK and err != ERR_FILE_NOT_FOUND:
		print("[AppController] Failed to load preferences config for write: ", err)
	cfg.set_value(PREFERENCES_SECTION, CITIZEN_SCIENCE_DIALOGUE_KEY, enabled)
	var save_err = cfg.save(EXPERIENCE_CONFIG_PATH)
	if save_err != OK:
		print("[AppController] Failed to save citizen science dialogue preference: ", save_err)
	else:
		print("[AppController] Citizen science dialogue preference saved: ", enabled)

func load_citizen_science_dialogue_enabled(default_value: bool = true) -> bool:
	var cfg = ConfigFile.new()
	var err = cfg.load(EXPERIENCE_CONFIG_PATH)
	if err == OK:
		if cfg.has_section_key(PREFERENCES_SECTION, CITIZEN_SCIENCE_DIALOGUE_KEY):
			return bool(cfg.get_value(PREFERENCES_SECTION, CITIZEN_SCIENCE_DIALOGUE_KEY))
		return default_value
	print("[AppController] No saved preferences config (or failed to load): ", err)
	return default_value
