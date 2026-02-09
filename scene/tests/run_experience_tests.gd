extends SceneTree
## Experience/Unlock tests for AppController + RocketsManager
## Run with: godot --headless --path scene -s scene/tests/run_experience_tests.gd

const TestReporter = preload("res://tests/TestReporter.gd")
const AppControllerScript = preload("res://Scripts/Systems/AppController.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const NewMissionPreviewRouting = preload("res://Scripts/UI/NewMissionPreviewRouting.gd")

var reporter := TestReporter.new()

func _init():
	reporter.start_suite("Experience + Unlocks", {
		"engine": Engine.get_version_info()["string"],
		"os": OS.get_name(),
		"project": "scene",
		"timestamp": Time.get_datetime_string_from_system()
	})
	await run_all_tests()
	reporter.summary()
	await create_timer(0.1).timeout
	if reporter.tests_failed > 0:
		quit(1)
	else:
		quit(0)

func run_all_tests() -> void:
	await test_xp_accumulates()
	await test_level_up_threshold()
	await test_multi_level_up()
	await test_unlocks_at_level_two()
	await test_award_helpers()
	await test_outbound_progress_from_mission_times()
	await test_return_progress_from_returning_started()
	await test_status_change_timestamps_recorded()
	await test_preview_rocket_resolution_from_target()
	await test_outbound_progress_fallback_to_status_timestamp()
	await test_return_home_persists_return_start_time()
	await test_preview_routing_for_return_states()

func _new_controller() -> Node:
	var app = AppControllerScript.new()
	app.experience_xp = 0
	app.experience_level = 1
	return app

func test_xp_accumulates() -> void:
	reporter.start_test("XP accumulates without leveling")
	var app = _new_controller()
	app.add_experience(5, "test")
	if app.get_experience_level() != 1:
		reporter.fail_test("Expected level 1 after +5 XP")
		return
	if app.get_experience_xp() != 5:
		reporter.fail_test("Expected XP=5 after +5 XP")
		return
	reporter.pass_test()

func test_level_up_threshold() -> void:
	reporter.start_test("Level up at 10 + level XP")
	var app = _new_controller()
	app.add_experience(11, "test")
	if app.get_experience_level() != 2:
		reporter.fail_test("Expected level 2 after +11 XP from level 1")
		return
	if app.get_experience_xp() != 0:
		reporter.fail_test("Expected XP rollover to 0 after level-up")
		return
	reporter.pass_test()

func test_multi_level_up() -> void:
	reporter.start_test("Multiple level-ups roll over correctly")
	var app = _new_controller()
	app.add_experience(23, "test")
	if app.get_experience_level() != 3:
		reporter.fail_test("Expected level 3 after +23 XP from level 1")
		return
	if app.get_experience_xp() != 0:
		reporter.fail_test("Expected XP rollover to 0 after multi level-up")
		return
	reporter.pass_test()

func test_unlocks_at_level_two() -> void:
	reporter.start_test("Unlocks starterrocket2 at level 2")
	var clean_state = {
		"unlocked": ["starterrocket1"],
		"placed": [],
		"launched": [],
		"destroyed": [],
		"missions": [],
		"selected_target": "",
		"detected_targets": [],
		"seen_asteroids": [],
		"seen_planets": [],
		"status_changed_at": {}
	}
	RocketsManager.set_override_state(clean_state)
	var unlocked_after_reset = RocketsManager.get_unlocked()
	var placed_after_reset = RocketsManager.get_placed()
	if unlocked_after_reset != ["starterrocket1"] or not placed_after_reset.is_empty():
		reporter.fail_test("Reset state verification failed (unlocked=%s, placed=%s)" % [str(unlocked_after_reset), str(placed_after_reset)])
		RocketsManager.clear_override_state()
		return
	var app = _new_controller()
	app.set_experience_from_react(0, 2)
	var unlocked = RocketsManager.get_unlocked()
	if not unlocked.has("starterrocket2"):
		reporter.fail_test("starterrocket2 not unlocked at level 2")
		RocketsManager.clear_override_state()
		return
	RocketsManager.clear_override_state()
	reporter.pass_test()

func test_award_helpers() -> void:
	reporter.start_test("Award helpers add XP")
	var app = _new_controller()
	app.award_launch_experience()
	if app.get_experience_xp() <= 0:
		reporter.fail_test("award_launch_experience did not add XP")
		return
	var after_launch = app.get_experience_xp()
	app.award_scan_experience()
	if app.get_experience_xp() <= after_launch:
		reporter.fail_test("award_scan_experience did not add XP")
		return
	reporter.pass_test()

func test_outbound_progress_from_mission_times() -> void:
	reporter.start_test("Outbound progress is derived from mission launch/arrival")
	var now = int(Time.get_unix_time_from_system())
	var state = {
		"unlocked": ["starterrocket1"],
		"placed": [],
		"launched": ["starterrocket1-1"],
		"destroyed": [],
		"missions": [{"rocket_id": "starterrocket1-1", "target": "123", "launch_time": now - 30, "arrival_time": now + 30}],
		"selected_target": "",
		"detected_targets": [],
		"seen_asteroids": [],
		"seen_planets": [],
		"returning": [],
		"arrived": {},
		"returned_mission": {},
		"returning_started": {},
		"status_changed_at": {}
	}
	RocketsManager.set_override_state(state)
	var progress = float(RocketsManager.get_outbound_progress("starterrocket1-1"))
	RocketsManager.clear_override_state()
	if progress < 0.45 or progress > 0.55:
		reporter.fail_test("Expected outbound progress around 0.5, got %s" % str(progress))
		return
	reporter.pass_test()

func test_return_progress_from_returning_started() -> void:
	reporter.start_test("Return progress is derived from returning_started")
	var now = int(Time.get_unix_time_from_system())
	var state = {
		"unlocked": ["starterrocket1"],
		"placed": [{"type": "starterrocket1", "id": "starterrocket1-2", "x": 0, "y": 0, "status": "returningHome"}],
		"launched": [],
		"destroyed": [],
		"missions": [],
		"selected_target": "",
		"detected_targets": [],
		"seen_asteroids": [],
		"seen_planets": [],
		"returning": [{"rocket_id": "starterrocket1-2"}],
		"arrived": {},
		"returned_mission": {},
		"returning_started": {"starterrocket1-2": now - 30},
		"status_changed_at": {}
	}
	RocketsManager.set_override_state(state)
	var progress = float(RocketsManager.get_return_progress("starterrocket1-2"))
	RocketsManager.clear_override_state()
	if progress < 0.45 or progress > 0.55:
		reporter.fail_test("Expected return progress around 0.5, got %s" % str(progress))
		return
	reporter.pass_test()

func test_status_change_timestamps_recorded() -> void:
	reporter.start_test("Status change timestamps recorded for launch and return")
	var now = int(Time.get_unix_time_from_system())
	var state = {
		"unlocked": ["starterrocket1"],
		"placed": [{"type": "starterrocket1", "id": "starterrocket1-3", "x": 0, "y": 0, "status": "awaitingLaunch"}],
		"launched": [],
		"destroyed": [],
		"missions": [],
		"selected_target": "",
		"detected_targets": [],
		"seen_asteroids": [],
		"seen_planets": [],
		"returning": [],
		"arrived": {},
		"returned_mission": {},
		"returning_started": {},
		"status_changed_at": {}
	}
	RocketsManager.set_override_state(state)
	var mission_ok = RocketsManager.add_mission("starterrocket1-3", "123", now - 10, 60)
	var launch_ok = RocketsManager.set_launched("starterrocket1-3")
	var return_ok = RocketsManager.return_home("starterrocket1-3")
	var launched_at = RocketsManager.get_status_changed_at("starterrocket1-3", "launched")
	var returning_at = RocketsManager.get_status_changed_at("starterrocket1-3", "returningHome")
	RocketsManager.clear_override_state()
	if not mission_ok or not launch_ok or not return_ok:
		reporter.fail_test("Expected mission/launch/return operations to succeed")
		return
	if launched_at <= 0:
		reporter.fail_test("Expected launched timestamp to be recorded")
		return
	if returning_at <= 0:
		reporter.fail_test("Expected returningHome timestamp to be recorded")
		return
	reporter.pass_test()

func test_preview_rocket_resolution_from_target() -> void:
	reporter.start_test("Preview rocket resolution falls back from target mission")
	var now = int(Time.get_unix_time_from_system())
	var state = {
		"unlocked": ["starterrocket1"],
		"placed": [{"type": "starterrocket1", "id": "starterrocket1-4", "x": 0, "y": 0, "status": "launched"}],
		"launched": ["starterrocket1-4"],
		"destroyed": [],
		"missions": [{"rocket_id": "starterrocket1-4", "target": "999", "launch_time": now - 30, "arrival_time": now + 30}],
		"selected_target": "",
		"preview_target": {"id": "999", "label": "Asteroid 999", "type": "asteroid", "rocket_id": ""},
		"detected_targets": [],
		"seen_asteroids": [],
		"seen_planets": [],
		"returning": [],
		"arrived": {},
		"returned_mission": {},
		"returning_started": {},
		"status_changed_at": {}
	}
	RocketsManager.set_override_state(state)
	var resolved = RocketsManager.resolve_preview_rocket_id("999")
	RocketsManager.clear_override_state()
	if resolved != "starterrocket1-4":
		reporter.fail_test("Expected resolved rocket_id starterrocket1-4, got %s" % resolved)
		return
	reporter.pass_test()

func test_outbound_progress_fallback_to_status_timestamp() -> void:
	reporter.start_test("Outbound progress falls back to launched status timestamp")
	var now = int(Time.get_unix_time_from_system())
	var state = {
		"unlocked": ["starterrocket1"],
		"placed": [{"type": "starterrocket1", "id": "starterrocket1-5", "x": 0, "y": 0, "status": "launched"}],
		"launched": ["starterrocket1-5"],
		"destroyed": [],
		"missions": [],
		"selected_target": "",
		"preview_target": {"id": "777", "label": "Asteroid 777", "type": "asteroid", "rocket_id": "starterrocket1-5"},
		"detected_targets": [],
		"seen_asteroids": [],
		"seen_planets": [],
		"returning": [],
		"arrived": {},
		"returned_mission": {},
		"returning_started": {},
		"status_changed_at": {"starterrocket1-5": {"launched": now - 30}}
	}
	RocketsManager.set_override_state(state)
	var progress = float(RocketsManager.get_outbound_progress("starterrocket1-5"))
	RocketsManager.clear_override_state()
	if progress < 0.45 or progress > 0.55:
		reporter.fail_test("Expected outbound fallback progress around 0.5, got %s" % str(progress))
		return
	reporter.pass_test()

func test_return_home_persists_return_start_time() -> void:
	reporter.start_test("return_home stamps and persists returning_started")
	var state = {
		"unlocked": ["starterrocket1"],
		"placed": [{"type": "starterrocket1", "id": "starterrocket1-6", "x": 0, "y": 0, "status": "launched"}],
		"launched": ["starterrocket1-6"],
		"destroyed": [],
		"missions": [{"rocket_id": "starterrocket1-6", "target": "123", "launch_time": int(Time.get_unix_time_from_system()) - 5, "arrival_time": int(Time.get_unix_time_from_system()) + 55}],
		"selected_target": "",
		"preview_target": {},
		"detected_targets": [],
		"seen_asteroids": [],
		"seen_planets": [],
		"returning": [],
		"arrived": {},
		"returned_mission": {},
		"returning_started": {},
		"status_changed_at": {}
	}
	RocketsManager.set_override_state(state)
	var ok = RocketsManager.return_home("starterrocket1-6")
	var started = int(RocketsManager.get_return_started_at("starterrocket1-6"))
	RocketsManager.clear_override_state()
	if not ok:
		reporter.fail_test("return_home returned false")
		return
	if started <= 0:
		reporter.fail_test("Expected returning_started timestamp to be persisted")
		return
	reporter.pass_test()

func test_preview_routing_for_return_states() -> void:
	reporter.start_test("Preview routing maps returning/returned/arrived/launched states correctly")
	var returning_scene = NewMissionPreviewRouting.resolve_scene_path("returningHome", false)
	var returned_scene = NewMissionPreviewRouting.resolve_scene_path("returned", false)
	var arrived_scene = NewMissionPreviewRouting.resolve_scene_path("launched", true)
	var outbound_scene = NewMissionPreviewRouting.resolve_scene_path("launched", false)
	if returning_scene != "res://Scenes/Transitions/rocket_return.tscn":
		reporter.fail_test("Expected returningHome to route to return preview")
		return
	if returned_scene != "res://Scenes/Earth/mission_debrief.tscn":
		reporter.fail_test("Expected returned to route directly to mission debrief")
		return
	if arrived_scene != "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn":
		reporter.fail_test("Expected arrived route to asteroid preview")
		return
	if outbound_scene != "res://Scenes/Transitions/rocket_transit.tscn":
		reporter.fail_test("Expected launched/in-flight route to transit preview")
		return
	reporter.pass_test()
