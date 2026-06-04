extends RefCounted
class_name PostHogNativeSurveyBridge

const UI_HOST := "https://us.posthog.com"
const STORE_PATH := "user://posthog_native_survey_gates.cfg"
const DISTINCT_SECTION := "identity"
const GATE_SECTION := "shown"

const SURVEY_IDS := {
	"first_mission": "019c9df8-db7f-0000-072f-73b3347a4d6c",
	"contractor":    "019ccaf8-4299-0000-b3ad-92a57ab75b95",
	"mining":        "019ccaf8-c4d8-0000-901b-aa850dfd43c5",
	"science":       "019ccaf9-0259-0000-d411-e11fdc643d97",
	"progression":   "019ccaf9-3453-0000-b6b9-0e41fcae8f1c",
	"launch":        "019e5a4e-46ab-0000-df9e-81f0e919a252",
	"pwa_install":   "019e5a4e-4c83-0000-1c17-7bd8754ad640",
	"m4_complete":   "019e5a4e-532f-0000-da2b-18527d4e3299",
	"return_visit":  "019e5a4e-5958-0000-e011-fc51b26ca89d",
	"level_up":      "019e5a4e-5f74-0000-2470-c06526c3e36d",
	"planet_found":  "019e5a4e-6528-0000-b69d-e5745079ffd5",
	"difficulty":    "019e5a4e-6b23-0000-dbb1-0bed0fad9910",
	"nav_test":      "019e5a8a-840d-0000-7d68-d43089c0fd61",
}

# Embedded question data for all surveys — mirrors the PostHog JSON definitions.
# type: "rating" | "multiple_choice" | "open"
# For rating: low_label, high_label
# For multiple_choice: choices Array[String]
const SURVEY_QUESTIONS := {
	"first_mission": {
		"name": "Landnám: Mission Complete",
		"questions": [
			{"type": "rating", "text": "How easy was it to complete your first mission?", "low": "Very hard", "high": "Very easy"},
			{"type": "multiple_choice", "text": "Where did you get stuck first?", "choices": ["Finding targets", "Building a rocket", "Launching a mission", "Mining resources", "Mission debrief / payout", "UI navigation", "I did not get stuck"]},
			{"type": "multiple_choice", "text": "What should we fix first before a wider release?", "choices": ["UI clarity", "Performance", "Mission pacing", "Reward balance", "Bug fixes"]},
			{"type": "open", "text": "What would help you understand how your in-game actions contribute to real science?"},
			{"type": "multiple_choice", "text": "Which science mission tracks would you most want to play next?", "choices": ["Exoplanet hunting", "Radio signal classification", "Star and nebula discovery", "Asteroid and comet missions", "Planet weather tracking", "Solar activity and sunspots"]},
			{"type": "multiple_choice", "text": "Which feature would make you come back this week?", "choices": ["Co-op or social play", "Clear progression map", "More mission types", "Deeper base-building", "Narrative events", "Leaderboards"]},
		]
	},
	"contractor": {
		"name": "Landnám: Contractor First Impression",
		"questions": [
			{"type": "multiple_choice", "text": "Why did you pick this contractor?", "choices": ["Their resource bonuses", "The company name", "First one listed", "Not sure"]},
			{"type": "rating", "text": "How clear was it what signing this contractor would give you?", "low": "Very unclear", "high": "Crystal clear"},
		]
	},
	"mining": {
		"name": "Landnám: Mining Loop Feel",
		"questions": [
			{"type": "rating", "text": "How fun was that mining run?", "low": "Tedious", "high": "Great fun"},
			{"type": "multiple_choice", "text": "What felt off about mining?", "choices": ["Too slow", "Unclear what to collect", "Hard to control", "Nothing — felt good"]},
		]
	},
	"science": {
		"name": "Landnám: Real Science Awareness",
		"questions": [
			{"type": "multiple_choice", "text": "Did you know the object you just scanned is a real astronomical object catalogued by scientists?", "choices": ["Yes — that is why I am playing", "Yes, I noticed", "No, I did not realise", "Wait, really?"]},
			{"type": "multiple_choice", "text": "How much does knowing this is real science data affect how you play?", "choices": ["A lot — it makes it meaningful", "Somewhat", "Not much", "I had forgotten about it", "I just want to mine"]},
		]
	},
	"progression": {
		"name": "Landnám: Mission Progression Clarity",
		"questions": [
			{"type": "rating", "text": "How clear was it what was new or different about this mission?", "low": "Totally unclear", "high": "Perfectly clear"},
			{"type": "multiple_choice", "text": "What would make you want to play the next mission?", "choices": ["Bigger rewards", "New mechanics to try", "Curiosity about the story", "Seeing my progress grow", "Nothing yet"]},
		]
	},
	"launch": {
		"name": "Landnám: First Launch Feel",
		"questions": [
			{"type": "rating", "text": "How did your first launch feel?", "low": "Anticlimactic", "high": "Thrilling"},
			{"type": "multiple_choice", "text": "What would have made the launch more exciting?", "choices": ["Better visual effects", "More build-up beforehand", "Sound or music", "It was already great", "Not sure"]},
		]
	},
	"m4_complete": {
		"name": "Landnám: End of Content",
		"questions": [
			{"type": "rating", "text": "Overall, how would you rate your Landnám experience?", "low": "Disappointing", "high": "Amazing"},
			{"type": "multiple_choice", "text": "What would keep you playing if there was more content?", "choices": ["More missions and story", "New mechanics or ships", "Competitive or co-op play", "Deeper planet science", "Better rewards and progression", "Nothing — I am done for now"]},
			{"type": "open", "text": "Anything else you want us to know?"},
		]
	},
	"planet_found": {
		"name": "Landnám: Planet Discovery Excitement",
		"questions": [
			{"type": "rating", "text": "How exciting was it to find your first planet candidate?", "low": "Not at all exciting", "high": "Mind-blowing"},
			{"type": "multiple_choice", "text": "Did you know this is a real unconfirmed exoplanet candidate from TESS data?", "choices": ["Yes — that is why I use the scanner", "Yes, I had read about it", "No — I had no idea!", "I suspected but was not sure"]},
		]
	},
	"difficulty": {
		"name": "Landnám: Mission Difficulty",
		"questions": [
			{"type": "multiple_choice", "text": "What part of the mission was most difficult?", "choices": ["Knowing where to go next", "Mining — too hard or too slow", "Managing my budget", "Understanding the scanner", "The contractor system", "Nothing was too hard"]},
			{"type": "rating", "text": "How frustrated did you feel?", "low": "Not at all", "high": "Ready to quit"},
		]
	},
	"nav_test": {
		"name": "Landnam Nav Test Survey",
		"questions": [
			{"type": "rating", "text": "How easy was it to find your way around?", "low": "Very hard", "high": "Very easy"},
			{"type": "open", "text": "Anything confusing about the navigation?"},
		]
	},
}

static var opened_urls: Array[String] = []
static var _config := ConfigFile.new()
static var _config_loaded := false

## Count a repeatable action and fire a survey once the threshold is reached.
## Unlike handle_event, this works on web too (no OS.has_feature guard), so it
## can be used to test the native survey overlay in the production web build.
static func count_and_fire(counter_key: String, threshold: int, gate_key: String,
		survey_id: String, survey_key: String, payload: Dictionary) -> void:
	var config := _load_config()
	if config.has_section_key(GATE_SECTION, gate_key):
		return
	const COUNT_SECTION := "counts"
	var count := int(config.get_value(COUNT_SECTION, counter_key, 0)) + 1
	config.set_value(COUNT_SECTION, counter_key, count)
	config.save(STORE_PATH)
	if count < threshold:
		return
	_open_once(gate_key, survey_id, survey_key, survey_key, payload)

static func handle_event(event_name: String, payload: Dictionary) -> void:
	if OS.has_feature("web"):
		return
	match event_name:
		"first_mission_completed", "mission_debrief_resolved":
			_open_once("first_mission", SURVEY_IDS.first_mission, "experiment1_first_mission", "first_mission", payload)
			_maybe_open_progression(payload)
		"contractor_signed":
			_open_once("contractor", SURVEY_IDS.contractor, "micro_contractor_first_impression", "contractor", payload)
		"mining_run_completed":
			_open_once("mining", SURVEY_IDS.mining, "micro_mining_loop_feel", "mining", payload)
		"scanner_scan_completed":
			_open_once("science", SURVEY_IDS.science, "micro_real_science_awareness", "science", payload)
			var is_planets := str(payload.get("scanner_mode", "")) == "planets"
			var detected := int(payload.get("detected_count", 0))
			if is_planets and detected > 0:
				_open_once("planet_found", SURVEY_IDS.planet_found, "micro_planet_discovery_excitement", "planet_found", payload)
		"mission_launch_started":
			_open_once("launch", SURVEY_IDS.launch, "micro_first_launch_feel", "launch", payload)
		"player_stuck_detected":
			_open_once("difficulty", SURVEY_IDS.difficulty, "micro_mission_difficulty_friction", "difficulty", payload)

static func _maybe_open_progression(payload: Dictionary) -> void:
	var stage := int(payload.get("mission_stage", 0))
	if stage >= 2 and stage <= 3:
		_open_once("progression%d" % stage, SURVEY_IDS.progression, "micro_mission_progression_clarity", "progression", payload)
	elif stage == 4:
		_open_once("m4_complete", SURVEY_IDS.m4_complete, "micro_m4_end_of_content", "m4_complete", payload)

# survey_context: used in the external URL (matches legacy test expectations).
# survey_key: key into SURVEY_QUESTIONS for the embedded native overlay.
static func _open_once(gate_key: String, survey_id: String, survey_context: String, survey_key: String, payload: Dictionary) -> void:
	if survey_id.strip_edges() == "":
		return
	var config := _load_config()
	if config.has_section_key(GATE_SECTION, gate_key):
		return
	var distinct_id := _get_distinct_id(config)
	var url := _build_url(survey_id, distinct_id, survey_context, payload)
	config.set_value(GATE_SECTION, gate_key, Time.get_datetime_string_from_system(true, true))
	config.save(STORE_PATH)
	# Always track in opened_urls so tests and debug logging can inspect firings.
	opened_urls.append(url)

	if OS.has_environment("LANDNAM_NATIVE_SURVEY_TEST"):
		print("[PostHogNativeSurveyBridge] would_open=%s" % url)
		return

	var survey_data: Dictionary = SURVEY_QUESTIONS.get(survey_key, {})
	if not survey_data.is_empty():
		_show_overlay(survey_key, survey_id, survey_data, distinct_id, payload)
	else:
		var result := OS.shell_open(url)
		if result != OK:
			push_warning("Could not open PostHog survey URL: %s" % url)

static func _show_overlay(survey_key: String, survey_id: String, survey_data: Dictionary, distinct_id: String, payload: Dictionary) -> void:
	var SurveyOverlay := load("res://Scenes/UI/SurveyOverlay.tscn")
	if SurveyOverlay == null:
		push_warning("[PostHogNativeSurveyBridge] SurveyOverlay.tscn not found — falling back to browser")
		var url := _build_url(survey_id, distinct_id, survey_key, payload)
		OS.shell_open(url)
		return
	var root: Node = Engine.get_main_loop().root
	if root.get_node_or_null("SurveyOverlay") != null:
		return
	var overlay: Node = SurveyOverlay.instantiate()
	overlay.name = "SurveyOverlay"
	overlay.set("_survey_key", survey_key)
	overlay.set("_survey_id", survey_id)
	overlay.set("_survey_name", str(survey_data.get("name", survey_key)))
	overlay.set("_questions", survey_data.get("questions", []))
	overlay.set("_distinct_id", distinct_id)
	overlay.set("_payload", payload)
	root.add_child(overlay)

static func _build_url(survey_id: String, distinct_id: String, context: String, payload: Dictionary) -> String:
	var params := {
		"distinct_id": distinct_id,
		"pocketbase_user_id": distinct_id,
		"survey_context": context,
		"mission_stage": str(payload.get("mission_stage", "")),
		"mission_count": str(payload.get("mission_count", payload.get("completed_mission_count", ""))),
		"target_id": str(payload.get("target_id", payload.get("selected_target_id", ""))),
		"target_type": str(payload.get("target_type", payload.get("preview_target_type", "")))
	}
	var parts: Array[String] = []
	for key in params.keys():
		var value := str(params[key])
		if value == "":
			continue
		parts.append("%s=%s" % [str(key).uri_encode(), value.uri_encode()])
	return "%s/external_surveys/%s?%s" % [UI_HOST, survey_id, "&".join(parts)]

static func _get_distinct_id(config: ConfigFile) -> String:
	var existing := str(config.get_value(DISTINCT_SECTION, "distinct_id", ""))
	if existing != "":
		return existing
	var generated := "godot-native-%d-%d" % [Time.get_unix_time_from_system(), randi()]
	config.set_value(DISTINCT_SECTION, "distinct_id", generated)
	return generated

static func _load_config() -> ConfigFile:
	if not _config_loaded:
		_config.load(STORE_PATH)
		_config_loaded = true
	return _config

static func reset_for_tests() -> void:
	opened_urls.clear()
	_config = ConfigFile.new()
	_config_loaded = false

## Clear just the nav_test cycle counter (keeps all other survey gates intact).
## Useful in development to re-test the survey trigger without a full reset.
static func reset_nav_test_counter() -> void:
	var config := _load_config()
	config.erase_section_key("counts", "launchpad_back_cycles")
	config.erase_section_key(GATE_SECTION, "nav_test")
	config.save(STORE_PATH)
