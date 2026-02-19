extends SceneTree
## Experience/Unlock tests for AppController + RocketsManager
## Run with: godot --headless --path scene -s scene/tests/run_experience_tests.gd

const TestReporter = preload("res://tests/TestReporter.gd")
const AppControllerScript = preload("res://Scripts/Systems/AppController.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const NewMissionPreviewRouting = preload("res://Scripts/UI/NewMissionPreviewRouting.gd")
const RocketSelectorScript = preload("res://Scripts/Earth/RocketSelector.gd")
const LaunchpadSelectorPanelScript = preload("res://Scripts/Earth/LaunchpadSelectorPanel.gd")
const LaunchpadLaunchButtonScript = preload("res://Scripts/Earth/LaunchpadLaunchButton.gd")
const ControlStationPanelScript = preload("res://Scripts/UI/ControlStationPanel.gd")
const MissionLogManager = preload("res://Scripts/Utils/MissionLogManager.gd")
const JSONFileManager = preload("res://Scripts/Utils/JSONFileManager.gd")

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
	await test_flow_index_has_defined_behaviour_groups()
	await test_xp_accumulates()
	await test_level_up_threshold()
	await test_multi_level_up()
	await test_unlocks_at_level_two()
	await test_unlocks_at_level_three()
	await test_award_helpers()
	await test_outbound_progress_from_mission_times()
	await test_sr2_outbound_progress_uses_faster_duration()
	await test_return_progress_from_returning_started()
	await test_sr2_return_progress_uses_faster_duration()
	await test_status_change_timestamps_recorded()
	await test_preview_rocket_resolution_from_target()
	await test_outbound_progress_fallback_to_status_timestamp()
	await test_return_home_persists_return_start_time()
	await test_preview_routing_for_return_states()
	await test_mark_mission_completed_unlocks_rocket2()
	await test_mark_mission_completed_unlocks_rocket3()
	await test_debug_skip_mission_advances_progression()
	await test_starting_mission_does_not_increment_completed_progression()
	await test_rocket_selector_ui_has_no_scroll_container()
	await test_launchpad_selector_panel_fullscreen_without_awaiting()
	await test_launchpad_selector_hides_rocket_selector_and_limits_targets()
	await test_early_mission_return_home_locked_until_fully_mined()
	await test_asteroid_preview_readout_panels_are_buttons()
	await test_launch_hud_resolution_prefers_node_with_button()
	await test_control_station_roadmap_gating_states()
	await test_control_station_next_mission_highlight_updates()
	await test_pending_mission_guidance_roundtrip()
	await test_scanner_unlock_gating_by_progress()
	await test_scanner_build_cost_enforced()
	await test_tutorial_sequence_places_scanner_after_mission_two()
	await test_launchpad_uses_predefined_targets_for_first_two_missions()
	await test_predefined_mission_reward_ratios()
	await test_mission3_targets_filter_and_single_sr2_reachable()
	await test_mission4_targets_filter_and_single_sr3_reachable()
	await test_mission5_contract_offer_and_selection()
	await test_mission5_contract_purchase_and_payout_rules()
	await test_mission_progression_stage_order()
	await test_editor_progress_persists_across_reload()
	await test_editor_active_mission_state_persists_across_reload()
	await test_outbound_transit_distance_label_decreases()
	await test_return_transit_distance_label_decreases()
	await test_tutorial_panel_hidden_in_transit_scene()
	await test_tutorial_panel_reappears_on_destination_arrival()
	await test_return_preview_auto_advances_to_debrief()

func _new_controller() -> Node:
	var app = AppControllerScript.new()
	app.experience_xp = 0
	app.experience_level = 1
	return app

func test_flow_index_has_defined_behaviour_groups() -> void:
	reporter.start_test("Flow index covers defined behaviour groups")
	var flows = _defined_flows()
	var required = [
		"mission order",
		"mission tutorials",
		"supabase fetch",
		"supabase interact",
		"scene transitions",
		"unlock progression",
		"xp progression",
		"editor persistence",
		"bundle smoke"
	]
	for label in required:
		if not flows.has(label):
			reporter.fail_test("Missing flow label: %s" % label)
			return
	reporter.pass_test()

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

func test_unlocks_at_level_three() -> void:
	reporter.start_test("Unlocks starterrocket3 at level 3")
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
	var app = _new_controller()
	app.set_experience_from_react(0, 3)
	var unlocked = RocketsManager.get_unlocked()
	if not unlocked.has("starterrocket3"):
		reporter.fail_test("starterrocket3 not unlocked at level 3")
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

func test_sr2_outbound_progress_uses_faster_duration() -> void:
	reporter.start_test("SR2 outbound progress uses faster mission duration")
	var now = int(Time.get_unix_time_from_system())
	var state = {
		"unlocked": ["starterrocket1", "starterrocket2"],
		"placed": [{"type": "starterrocket2", "id": "starterrocket2-1", "x": 0, "y": 0, "status": "launched"}],
		"launched": ["starterrocket2-1"],
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
		"status_changed_at": {"starterrocket2-1": {"launched": now - 30}}
	}
	RocketsManager.set_override_state(state)
	var progress = float(RocketsManager.get_outbound_progress("starterrocket2-1"))
	RocketsManager.clear_override_state()
	if progress < 0.95:
		reporter.fail_test("Expected SR2 outbound progress near completion after 30s, got %s" % str(progress))
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

func test_sr2_return_progress_uses_faster_duration() -> void:
	reporter.start_test("SR2 return progress uses faster return duration")
	var now = int(Time.get_unix_time_from_system())
	var state = {
		"unlocked": ["starterrocket1", "starterrocket2"],
		"placed": [{"type": "starterrocket2", "id": "starterrocket2-2", "x": 0, "y": 0, "status": "returningHome"}],
		"launched": [],
		"destroyed": [],
		"missions": [],
		"selected_target": "",
		"detected_targets": [],
		"seen_asteroids": [],
		"seen_planets": [],
		"returning": [{"rocket_id": "starterrocket2-2"}],
		"arrived": {},
		"returned_mission": {},
		"returning_started": {"starterrocket2-2": now - 30},
		"status_changed_at": {}
	}
	RocketsManager.set_override_state(state)
	var progress = float(RocketsManager.get_return_progress("starterrocket2-2"))
	RocketsManager.clear_override_state()
	if progress < 0.95:
		reporter.fail_test("Expected SR2 return progress near completion after 30s, got %s" % str(progress))
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

func test_mark_mission_completed_unlocks_rocket2() -> void:
	reporter.start_test("Mission completion unlocks starterrocket2 on first completion")
	var state = {
		"unlocked": ["starterrocket1"],
		"placed": [],
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
		"status_changed_at": {},
		"scan_counts": {},
		"mission_progress_completed": 0,
		"completed_mission_badges": [],
		"mission_progress_schema_version": 2
	}
	RocketsManager.set_override_state(state)
	var ok = RocketsManager.mark_mission_completed("mission-1")
	var unlocked = RocketsManager.get_unlocked()
	var completed = RocketsManager.get_completed_mission_count()
	RocketsManager.clear_override_state()
	if not ok:
		reporter.fail_test("Expected mark_mission_completed to return true")
		return
	if not unlocked.has("starterrocket2"):
		reporter.fail_test("Expected starterrocket2 unlocked after first completion")
		return
	if completed != 1:
		reporter.fail_test("Expected completed mission count 1 after first completion, got %s" % str(completed))
		return
	reporter.pass_test()

func test_mark_mission_completed_unlocks_rocket3() -> void:
	reporter.start_test("Mission progression unlocks starterrocket3 after third completion")
	var state = {
		"unlocked": ["starterrocket1", "starterrocket2"],
		"placed": [],
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
		"status_changed_at": {},
		"scan_counts": {},
		"mission_progress_completed": 2,
		"completed_mission_badges": ["mission-1", "mission-2"],
		"mission_progress_schema_version": 2
	}
	RocketsManager.set_override_state(state)
	var ok = RocketsManager.mark_mission_completed("mission-3")
	var unlocked = RocketsManager.get_unlocked()
	var completed = RocketsManager.get_completed_mission_count()
	RocketsManager.clear_override_state()
	if not ok:
		reporter.fail_test("Expected mark_mission_completed to return true for mission-3")
		return
	if not unlocked.has("starterrocket3"):
		reporter.fail_test("Expected starterrocket3 unlocked after third completion")
		return
	if completed != 3:
		reporter.fail_test("Expected completed mission count 3 after third completion, got %s" % str(completed))
		return
	reporter.pass_test()

func test_debug_skip_mission_advances_progression() -> void:
	reporter.start_test("Debug skip mission advances mission stage and unlocks L2")
	MissionLogManager.set_path_overrides("user://mission_logs_test_debug_skip.json", "user://mission_logs_test_debug_skip.json")
	DirAccess.remove_absolute("user://mission_logs_test_debug_skip.json")
	var state = {
		"unlocked": ["starterrocket1"],
		"placed": [],
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
		"status_changed_at": {},
		"scan_counts": {}
	}
	RocketsManager.set_override_state(state)
	var start_stage = int(RocketsManager.get_mission_stage())
	var ok = RocketsManager.debug_complete_mission_for_progression()
	var after_stage = int(RocketsManager.get_mission_stage())
	var unlocked = RocketsManager.get_unlocked()
	var last_target = RocketsManager.get_last_completed_target_id()
	RocketsManager.clear_override_state()
	MissionLogManager.clear_path_overrides()
	DirAccess.remove_absolute("user://mission_logs_test_debug_skip.json")
	if not ok:
		reporter.fail_test("debug_complete_mission_for_progression returned false")
		return
	if start_stage != 1 or after_stage != 2:
		reporter.fail_test("Expected stage 1 -> 2 after debug skip, got %s -> %s" % [str(start_stage), str(after_stage)])
		return
	if not unlocked.has("starterrocket2"):
		reporter.fail_test("Expected starterrocket2 unlocked after first debug skip")
		return
	if last_target == "":
		reporter.fail_test("Expected last completed target to be set after debug skip")
		return
	reporter.pass_test()

func test_starting_mission_does_not_increment_completed_progression() -> void:
	reporter.start_test("Starting a mission does not increment completed progression")
	var state = {
		"unlocked": ["starterrocket1"],
		"placed": [{"type": "starterrocket1", "id": "starterrocket1-99", "x": 0, "y": 0, "status": "awaitingLaunch"}],
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
		"status_changed_at": {},
		"scan_counts": {},
		"mission_progress_completed": 0,
		"completed_mission_badges": []
	}
	RocketsManager.set_override_state(state)
	var before = int(RocketsManager.get_completed_mission_count())
	var now = int(Time.get_unix_time_from_system())
	var mission_ok = RocketsManager.add_mission("starterrocket1-99", "abc123", now, 60)
	var launch_ok = RocketsManager.set_launched("starterrocket1-99")
	var after = int(RocketsManager.get_completed_mission_count())
	RocketsManager.clear_override_state()
	if not mission_ok or not launch_ok:
		reporter.fail_test("Expected mission start operations to succeed")
		return
	if before != 0 or after != 0:
		reporter.fail_test("Expected completed progression to remain 0 on mission start, got before=%s after=%s" % [str(before), str(after)])
		return
	reporter.pass_test()

func test_rocket_selector_ui_has_no_scroll_container() -> void:
	reporter.start_test("Rocket selector uses fixed no-scroll card layout")
	var state = {
		"unlocked": ["starterrocket1", "starterrocket2"],
		"placed": [],
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
		"status_changed_at": {},
		"scan_counts": {}
	}
	RocketsManager.set_override_state(state)
	var holder = HBoxContainer.new()
	holder.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	holder.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(holder)
	var selector = RocketSelectorScript.new()
	holder.add_child(selector)
	await create_timer(0.05).timeout
	var found_scroll := false
	var cards_count := 0
	var stack := [selector]
	while stack.size() > 0:
		var node = stack.pop_back()
		if node is ScrollContainer:
			found_scroll = true
		if node.name == "Cards":
			cards_count = node.get_child_count()
		for child in node.get_children():
			stack.append(child)
	holder.queue_free()
	RocketsManager.clear_override_state()
	if found_scroll:
		reporter.fail_test("Rocket selector should not include ScrollContainer in rebuilt layout")
		return
	if cards_count != 2:
		reporter.fail_test("Expected 2 rocket cards, got %s" % str(cards_count))
		return
	reporter.pass_test()

func test_launchpad_selector_panel_fullscreen_without_awaiting() -> void:
	reporter.start_test("Launchpad selector expands full-screen when no awaiting rocket")
	var state = {
		"unlocked": ["starterrocket1"],
		"placed": [],
		"launched": [],
		"destroyed": [],
		"missions": [],
		"selected_target": "",
		"detected_targets": [{"id": "4201", "label": "Asteroid 4201", "type": "asteroid"}],
		"seen_asteroids": [],
		"seen_planets": [],
		"returning": [],
		"arrived": {},
		"returned_mission": {},
		"returning_started": {},
		"status_changed_at": {},
		"scan_counts": {}
	}
	RocketsManager.set_override_state(state)
	var scene_pack = load("res://Scenes/Earth/earth_launchpad.tscn")
	if scene_pack == null:
		RocketsManager.clear_override_state()
		reporter.fail_test("Could not load earth_launchpad.tscn for selector layout test")
		return
	var err = change_scene_to_packed(scene_pack)
	if err != OK:
		RocketsManager.clear_override_state()
		reporter.fail_test("Could not change to earth_launchpad.tscn (err=%s)" % str(err))
		return
	await create_timer(0.05).timeout
	var scene = current_scene
	if scene == null:
		RocketsManager.clear_override_state()
		reporter.fail_test("No current scene for selector layout test")
		return
	var lp = scene.get_node_or_null("StructuresLayer/Launchpad")
	if lp == null:
		RocketsManager.clear_override_state()
		reporter.fail_test("Launchpad node missing in earth_launchpad scene")
		return
	var selector_panel = LaunchpadSelectorPanelScript.new()
	selector_panel.setup(lp)
	selector_panel.show_selector_panel()
	var selector_node = scene.get_node_or_null("UILayer/SelectorPanel")
	if selector_node == null:
		RocketsManager.clear_override_state()
		reporter.fail_test("SelectorPanel missing in selector layout test")
		return
	var is_full = is_equal_approx(selector_node.offset_left, 16.0) \
		and is_equal_approx(selector_node.offset_top, 16.0) \
		and is_equal_approx(selector_node.offset_right, -16.0) \
		and is_equal_approx(selector_node.offset_bottom, -16.0)
	RocketsManager.clear_override_state()
	if not is_full:
		reporter.fail_test("Expected full-screen selector offsets (16,16,-16,-16), got (%s,%s,%s,%s)" % [
			str(selector_node.offset_left),
			str(selector_node.offset_top),
			str(selector_node.offset_right),
			str(selector_node.offset_bottom)
		])
		return
	reporter.pass_test()

func test_launchpad_selector_hides_rocket_selector_and_limits_targets() -> void:
	reporter.start_test("Launchpad selector hides rocket picker and limits target cards once rocket exists")
	var state = {
		"unlocked": ["starterrocket1"],
		"placed": [{
			"type": "starterrocket1",
			"id": "starterrocket1-awaiting-1",
			"x": -110.0,
			"y": -178.0,
			"status": "awaitingLaunch"
		}],
		"launched": [],
		"destroyed": [],
		"missions": [],
		"selected_target": "",
		"detected_targets": [
			{"id": "101445733", "label": "101445733", "type": "asteroid"},
			{"id": "63768316", "label": "63768316", "type": "asteroid"},
			{"id": "68115570", "label": "68115570", "type": "asteroid"},
			{"id": "63768664", "label": "63768664", "type": "asteroid"},
			{"id": "63769326", "label": "63769326", "type": "asteroid"}
		],
		"seen_asteroids": [],
		"seen_planets": [],
		"returning": [],
		"arrived": {},
		"returned_mission": {},
		"returning_started": {},
		"status_changed_at": {},
		"scan_counts": {},
		"mission_progress_completed": 0,
		"completed_mission_badges": [],
		"mission_progress_schema_version": 2
	}
	RocketsManager.set_override_state(state)
	var scene_pack = load("res://Scenes/Earth/earth_launchpad.tscn")
	if scene_pack == null:
		RocketsManager.clear_override_state()
		reporter.fail_test("Could not load earth_launchpad.tscn for target limit test")
		return
	var err = change_scene_to_packed(scene_pack)
	if err != OK:
		RocketsManager.clear_override_state()
		reporter.fail_test("Could not change to earth_launchpad.tscn (err=%s) for target limit test" % str(err))
		return
	await create_timer(0.05).timeout
	var scene = current_scene
	if scene == null:
		RocketsManager.clear_override_state()
		reporter.fail_test("No current scene for target limit test")
		return
	var lp = scene.get_node_or_null("StructuresLayer/Launchpad")
	if lp == null:
		RocketsManager.clear_override_state()
		reporter.fail_test("Launchpad node missing for target limit test")
		return
	var selector_panel = LaunchpadSelectorPanelScript.new()
	selector_panel.setup(lp)
	selector_panel.show_selector_panel()
	await create_timer(0.02).timeout
	var rocket_selector = scene.get_node_or_null("UILayer/SelectorPanel/VBox/RocketSelector")
	var targets_section = scene.get_node_or_null("UILayer/SelectorPanel/VBox/TargetsSection")
	var target_card_count := 0
	if targets_section:
		for child in targets_section.get_children():
			if child is PanelContainer:
				target_card_count += 1
	RocketsManager.clear_override_state()
	if rocket_selector == null:
		reporter.fail_test("RocketSelector node missing in target limit test")
		return
	if rocket_selector.visible:
		reporter.fail_test("Expected RocketSelector hidden once awaiting-launch rocket exists")
		return
	if target_card_count > 3:
		reporter.fail_test("Expected at most 3 visible target cards, got %s" % str(target_card_count))
		return
	reporter.pass_test()

func test_asteroid_preview_readout_panels_are_buttons() -> void:
	reporter.start_test("Asteroid preview readout panels are button toggles")
	var state = {
		"unlocked": ["starterrocket1"],
		"placed": [],
		"launched": [],
		"destroyed": [],
		"missions": [],
		"selected_target": "",
		"preview_target": {
			"id": "4201",
			"label": "Asteroid 4201",
			"type": "asteroid",
			"rocket_id": "starterrocket1"
		},
		"detected_targets": [{"id": "4201", "label": "Asteroid 4201", "type": "asteroid"}],
		"seen_asteroids": [],
		"seen_planets": [],
		"returning": [],
		"arrived": {},
		"returned_mission": {},
		"returning_started": {},
		"status_changed_at": {},
		"scan_counts": {},
		"mission_progress_completed": 0,
		"completed_mission_badges": [],
		"mission_progress_schema_version": 2
	}
	RocketsManager.set_override_state(state)
	var scene_pack = load("res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn")
	if scene_pack == null:
		RocketsManager.clear_override_state()
		reporter.fail_test("Could not load asteroid_preview.tscn for readout button test")
		return
	var err = change_scene_to_packed(scene_pack)
	if err != OK:
		RocketsManager.clear_override_state()
		reporter.fail_test("Could not change to asteroid_preview.tscn (err=%s)" % str(err))
		return
	await create_timer(0.05).timeout
	var scene = current_scene
	if scene == null:
		RocketsManager.clear_override_state()
		reporter.fail_test("No current scene for asteroid preview readout button test")
		return
	var minerals_panel = scene.get_node_or_null("CanvasLayer/UI/Margin/VBox/MineralsPanel")
	var minerals_summary = scene.get_node_or_null("CanvasLayer/UI/Margin/VBox/MineralsPanel/MineralsMargin/MineralsContent/MineralsSummary")
	var inventory_panel = scene.get_node_or_null("CanvasLayer/UI/InventoryPanel")
	var inventory_summary = scene.get_node_or_null("CanvasLayer/UI/InventoryPanel/InventoryMargin/InventoryContent/InventorySummary")
	if not (minerals_panel is Button) or not (inventory_panel is Button):
		RocketsManager.clear_override_state()
		reporter.fail_test("Expected MineralsPanel and InventoryPanel to be Button nodes")
		return
	if minerals_summary == null or inventory_summary == null:
		RocketsManager.clear_override_state()
		reporter.fail_test("Expected readout summary labels to exist")
		return
	var minerals_before = bool(minerals_summary.visible)
	var inventory_before = bool(inventory_summary.visible)
	(minerals_panel as Button).emit_signal("pressed")
	(inventory_panel as Button).emit_signal("pressed")
	await create_timer(0.01).timeout
	var minerals_after = bool(minerals_summary.visible)
	var inventory_after = bool(inventory_summary.visible)
	RocketsManager.clear_override_state()
	if minerals_before == minerals_after:
		reporter.fail_test("Expected MineralsPanel press to toggle summary visibility")
		return
	if inventory_before == inventory_after:
		reporter.fail_test("Expected InventoryPanel press to toggle summary visibility")
		return
	reporter.pass_test()

func test_early_mission_return_home_locked_until_fully_mined() -> void:
	reporter.start_test("Early mission keeps Return Home disabled until target is fully mined")
	DirAccess.remove_absolute("user://mining_inventory.json")
	var state = {
		"unlocked": ["starterrocket1"],
		"placed": [],
		"launched": [],
		"destroyed": [],
		"missions": [],
		"selected_target": "",
		"preview_target": {
			"id": "4201",
			"label": "Asteroid 4201",
			"type": "asteroid",
			"rocket_id": "starterrocket1"
		},
		"detected_targets": [{"id": "4201", "label": "Asteroid 4201", "type": "asteroid"}],
		"seen_asteroids": [],
		"seen_planets": [],
		"returning": [],
		"arrived": {},
		"returned_mission": {},
		"returning_started": {},
		"status_changed_at": {},
		"scan_counts": {},
		"mission_progress_completed": 0,
		"completed_mission_badges": [],
		"mission_progress_schema_version": 2
	}
	RocketsManager.set_override_state(state)
	var scene_pack = load("res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn")
	if scene_pack == null:
		RocketsManager.clear_override_state()
		reporter.fail_test("Could not load asteroid_preview.tscn for return-home lock test")
		return
	var err = change_scene_to_packed(scene_pack)
	if err != OK:
		RocketsManager.clear_override_state()
		reporter.fail_test("Could not change to asteroid_preview.tscn (err=%s)" % str(err))
		return
	await create_timer(0.05).timeout
	var scene = current_scene
	if scene == null:
		RocketsManager.clear_override_state()
		reporter.fail_test("No current scene for return-home lock test")
		return
	var return_button = scene.get_node_or_null("CanvasLayer/UI/ControlPanel/ControlPanelMargin/ControlPanelButtons/ReturnHomeButton")
	if return_button == null or not (return_button is Button):
		RocketsManager.clear_override_state()
		reporter.fail_test("Could not find ReturnHomeButton in asteroid preview")
		return
	var locked_initially = bool((return_button as Button).disabled)
	for i in range(260):
		scene._apply_mining_yield()
		if not bool((return_button as Button).disabled):
			break
	RocketsManager.clear_override_state()
	if not locked_initially:
		reporter.fail_test("Expected Return Home to start disabled in early mission")
		return
	if bool((return_button as Button).disabled):
		reporter.fail_test("Expected Return Home to unlock after full mining")
		return
	reporter.pass_test()

func test_launch_hud_resolution_prefers_node_with_button() -> void:
	reporter.start_test("LaunchHUD resolution prefers HUD with launch button")
	var resolver = LaunchpadLaunchButtonScript.new()
	var root_node = Node.new()
	root.add_child(root_node)
	var empty_hud = Node.new()
	empty_hud.name = "LaunchHUDInstance"
	root_node.add_child(empty_hud)
	var real_hud = Node.new()
	real_hud.name = "LaunchHUD"
	var launch_btn = Button.new()
	launch_btn.name = "LaunchHUD#LaunchButton"
	real_hud.add_child(launch_btn)
	root_node.add_child(real_hud)
	var resolved = resolver._find_launch_hud(root_node)
	root_node.queue_free()
	if resolved == null:
		reporter.fail_test("Expected LaunchHUD resolver to find a HUD node")
		return
	if str(resolved.name) != "LaunchHUD":
		reporter.fail_test("Expected resolver to prefer LaunchHUD with button, got %s" % str(resolved.name))
		return
	reporter.pass_test()

func test_control_station_roadmap_gating_states() -> void:
	reporter.start_test("Control Station roadmap shows completed/current/upcoming states")
	var state = RocketsManager.load_state()
	state["mission_progress_completed"] = 0
	state["completed_mission_badges"] = []
	RocketsManager.set_override_state(state)
	var panel = ControlStationPanelScript.new()
	var base = panel.build_mission_roadmap()
	if base.size() < 3:
		RocketsManager.clear_override_state()
		reporter.fail_test("Expected at least 3 roadmap entries, got %s" % str(base.size()))
		return
	if str(base[0].get("status", "")) != "current":
		RocketsManager.clear_override_state()
		reporter.fail_test("Expected Mission 1 current when no completions")
		return
	if str(base[1].get("status", "")) != "upcoming":
		RocketsManager.clear_override_state()
		reporter.fail_test("Expected Mission 2 upcoming when no completions")
		return

	state["mission_progress_completed"] = 1
	state["completed_mission_badges"] = ["mission-1"]
	RocketsManager.set_override_state(state)
	var after_one = panel.build_mission_roadmap()
	RocketsManager.clear_override_state()
	if str(after_one[0].get("status", "")) != "completed":
		reporter.fail_test("Expected Mission 1 completed after one mission log entry")
		return
	if str(after_one[1].get("status", "")) != "current":
		reporter.fail_test("Expected Mission 2 current after one mission log entry")
		return
	if str(after_one[2].get("status", "")) != "upcoming":
		reporter.fail_test("Expected Mission 3 upcoming after one mission log entry")
		return
	reporter.pass_test()

func test_control_station_next_mission_highlight_updates() -> void:
	reporter.start_test("Control Station next mission highlight follows progression")
	var state = RocketsManager.load_state()
	state["mission_progress_completed"] = 0
	state["completed_mission_badges"] = []
	RocketsManager.set_override_state(state)
	var panel = ControlStationPanelScript.new()
	var start = panel.build_next_mission_highlight_data()
	if str(start.get("title", "")) != "Mission 1":
		RocketsManager.clear_override_state()
		reporter.fail_test("Expected next mission Mission 1 at start")
		return
	state["mission_progress_completed"] = 1
	state["completed_mission_badges"] = ["mission-1"]
	RocketsManager.set_override_state(state)
	var after_one = panel.build_next_mission_highlight_data()
	RocketsManager.clear_override_state()
	if str(after_one.get("title", "")) != "Mission 2":
		reporter.fail_test("Expected next mission Mission 2 after one completion")
		return
	reporter.pass_test()

func test_pending_mission_guidance_roundtrip() -> void:
	reporter.start_test("Pending mission guidance id roundtrip works")
	var state = RocketsManager.load_state()
	state["pending_mission_guidance_id"] = 0
	RocketsManager.set_override_state(state)
	var set_ok = RocketsManager.set_pending_mission_guidance_id(2)
	var current = RocketsManager.get_pending_mission_guidance_id()
	var consumed = RocketsManager.consume_pending_mission_guidance_id()
	var after = RocketsManager.get_pending_mission_guidance_id()
	RocketsManager.clear_override_state()
	if not set_ok:
		reporter.fail_test("Expected set_pending_mission_guidance_id to succeed")
		return
	if current != 2 or consumed != 2 or after != 0:
		reporter.fail_test("Expected guidance id current=2 consumed=2 after=0, got current=%s consumed=%s after=%s" % [str(current), str(consumed), str(after)])
		return
	reporter.pass_test()

func test_scanner_unlock_gating_by_progress() -> void:
	reporter.start_test("Scanner unlock is gated until mission stage 3")
	var state = RocketsManager.load_state()
	state["mission_progress_completed"] = 0
	state["completed_mission_badges"] = []
	RocketsManager.set_override_state(state)
	var locked = RocketsManager.is_scanner_unlocked()
	state["mission_progress_completed"] = 2
	state["completed_mission_badges"] = ["mission-1", "mission-2"]
	RocketsManager.set_override_state(state)
	var unlocked = RocketsManager.is_scanner_unlocked()
	RocketsManager.clear_override_state()
	if locked:
		reporter.fail_test("Scanner should be locked before mission stage 3")
		return
	if not unlocked:
		reporter.fail_test("Scanner should unlock at mission stage 3")
		return
	reporter.pass_test()

func test_scanner_build_cost_enforced() -> void:
	reporter.start_test("Scanner build cost is exactly 2B and enforced by affordability check")
	var cost = RocketsManager.get_scanner_build_cost()
	if cost != 2000000000:
		reporter.fail_test("Expected scanner build cost 2,000,000,000, got %s" % str(cost))
		return
	if RocketsManager.can_afford_scanner_build(cost - 1):
		reporter.fail_test("Expected affordability false for cost-1 balance")
		return
	if not RocketsManager.can_afford_scanner_build(cost):
		reporter.fail_test("Expected affordability true for exact-cost balance")
		return
	reporter.pass_test()

func test_tutorial_sequence_places_scanner_after_mission_two() -> void:
	reporter.start_test("Tutorial sequence introduces scanner only after early missions")
	var app = _new_controller()
	var steps = app.get_tutorial_steps()
	var idx_debrief = steps.find("resolve_mission_debrief")
	var idx_build = steps.find("build_scanner_station")
	var idx_scan = steps.find("scan_targets")
	if idx_debrief == -1 or idx_build == -1 or idx_scan == -1:
		reporter.fail_test("Expected tutorial sequence to include debrief/build_scanner/scan actions")
		return
	if not (idx_debrief < idx_build and idx_build < idx_scan):
		reporter.fail_test("Expected order debrief -> build_scanner_station -> scan_targets, got %s" % str(steps))
		return
	reporter.pass_test()

func test_launchpad_uses_predefined_targets_for_first_two_missions() -> void:
	reporter.start_test("Launchpad uses predefined targets for missions 1 and 2")
	var mission1 = RocketsManager.get_predefined_mission_target(1)
	var mission2 = RocketsManager.get_predefined_mission_target(2)
	if mission1.is_empty() or mission2.is_empty():
		reporter.fail_test("Expected predefined mission targets for stage 1 and 2")
		return
	var profile1 = RocketsManager.build_target_profile(str(mission1.get("id", "")), str(mission1.get("type", "asteroid")))
	var profile2 = RocketsManager.build_target_profile(str(mission2.get("id", "")), str(mission2.get("type", "asteroid")))
	if int(profile1.get("required_level", 0)) != 1:
		reporter.fail_test("Expected mission 1 predefined target to require L1")
		return
	if int(profile2.get("required_level", 0)) != 2:
		reporter.fail_test("Expected mission 2 predefined target to require L2")
		return
	reporter.pass_test()

func test_predefined_mission_reward_ratios() -> void:
	reporter.start_test("Predefined mission reward ratios are configured for M1/M2/M4")
	var mission1 = RocketsManager.get_predefined_mission_target(1)
	var mission2 = RocketsManager.get_predefined_mission_target(2)
	var mission4 = RocketsManager.get_predefined_mission_target(4)
	var ratio1 = RocketsManager.get_target_reward_ratio(str(mission1.get("id", "")))
	var ratio2 = RocketsManager.get_target_reward_ratio(str(mission2.get("id", "")))
	var ratio4 = RocketsManager.get_target_reward_ratio(str(mission4.get("id", "")))
	if abs(ratio1 - 1.2) > 0.001:
		reporter.fail_test("Expected mission 1 reward ratio 1.2, got %s" % str(ratio1))
		return
	if abs(ratio2 - 1.3) > 0.001:
		reporter.fail_test("Expected mission 2 reward ratio 1.3, got %s" % str(ratio2))
		return
	if abs(ratio4 - 1.4) > 0.001:
		reporter.fail_test("Expected mission 4 reward ratio 1.4, got %s" % str(ratio4))
		return
	reporter.pass_test()

func test_mission3_targets_filter_and_single_sr2_reachable() -> void:
	reporter.start_test("Mission 3 targets exclude already-targeted asteroids and keep one SR2-reachable")
	var mission_log_path = "user://mission_logs_test_mission3_targets.json"
	DirAccess.remove_absolute(mission_log_path)
	MissionLogManager.set_path_overrides(mission_log_path, mission_log_path)
	MissionLogManager.save_state({
		"missions": [
			{"target_id": "m3-1", "badge": "mission3-test-badge-1", "action": "scrap", "timestamp": "2026-01-01T00:00:00"}
		]
	})
	var state = RocketsManager.load_state()
	state["mission_progress_completed"] = 2
	state["completed_mission_badges"] = ["mission-1", "mission-2"]
	state["detected_targets"] = [
		{"id": "m3-1", "label": "Target 1", "type": "asteroid"},
		{"id": "m3-2", "label": "Target 2", "type": "asteroid"},
		{"id": "m3-3", "label": "Target 3", "type": "asteroid"},
		{"id": "m3-4", "label": "Target 4", "type": "asteroid"},
		{"id": "m3-5", "label": "Target 5", "type": "asteroid"},
		{"id": "m3-6", "label": "Target 6", "type": "asteroid"}
	]
	RocketsManager.set_override_state(state)
	var targets = RocketsManager.get_mission3_targets()
	var reachable_count := 0
	for target in targets:
		var profile = RocketsManager.build_target_profile(str(target.get("id", "")), str(target.get("type", "asteroid")))
		if int(profile.get("required_level", 99)) <= 2:
			reachable_count += 1
	RocketsManager.clear_override_state()
	MissionLogManager.clear_path_overrides()
	DirAccess.remove_absolute(mission_log_path)
	if targets.size() != 5:
		reporter.fail_test("Expected exactly 5 mission 3 targets, got %s" % str(targets.size()))
		return
	for target in targets:
		if str(target.get("id", "")) == "m3-1":
			reporter.fail_test("Expected targeted asteroid m3-1 to be filtered out")
			return
	if reachable_count != 1:
		reporter.fail_test("Expected exactly one mission 3 target reachable by SR2, got %s" % str(reachable_count))
		return
	reporter.pass_test()

func test_mission4_targets_filter_and_single_sr3_reachable() -> void:
	reporter.start_test("Mission 4 targets exclude already-targeted planets and keep one SR3-reachable")
	var mission_log_path = "user://mission_logs_test_mission4_targets.json"
	DirAccess.remove_absolute(mission_log_path)
	MissionLogManager.set_path_overrides(mission_log_path, mission_log_path)
	MissionLogManager.save_state({
		"missions": [
			{"target_id": "m4-1", "badge": "mission4-test-badge-1", "action": "scrap", "timestamp": "2026-01-01T00:00:00"}
		]
	})
	var state = RocketsManager.load_state()
	state["mission_progress_completed"] = 3
	state["completed_mission_badges"] = ["mission-1", "mission-2", "mission-3"]
	state["detected_targets"] = [
		{"id": "m4-1", "label": "Planet 1", "type": "planet"},
		{"id": "m4-2", "label": "Planet 2", "type": "planet"},
		{"id": "m4-3", "label": "Planet 3", "type": "planet"},
		{"id": "m4-4", "label": "Planet 4", "type": "planet"},
		{"id": "m4-5", "label": "Planet 5", "type": "planet"},
		{"id": "m4-6", "label": "Planet 6", "type": "planet"}
	]
	RocketsManager.set_override_state(state)
	var targets = RocketsManager.get_mission4_targets()
	var reachable_count := 0
	for target in targets:
		var profile = RocketsManager.build_target_profile(str(target.get("id", "")), str(target.get("type", "planet")))
		if int(profile.get("required_level", 99)) <= 3:
			reachable_count += 1
	RocketsManager.clear_override_state()
	MissionLogManager.clear_path_overrides()
	DirAccess.remove_absolute(mission_log_path)
	if targets.size() != 5:
		reporter.fail_test("Expected exactly 5 mission 4 targets, got %s" % str(targets.size()))
		return
	for target in targets:
		if str(target.get("id", "")) == "m4-1":
			reporter.fail_test("Expected targeted planet m4-1 to be filtered out")
			return
	if reachable_count != 1:
		reporter.fail_test("Expected exactly one mission 4 target reachable by SR3, got %s" % str(reachable_count))
		return
	reporter.pass_test()

func test_mission5_contract_offer_and_selection() -> void:
	reporter.start_test("Mission 5 contract offer is asteroid-focused and selectable")
	var state = RocketsManager.load_state()
	state["mission_progress_completed"] = 4
	state["completed_mission_badges"] = ["mission-1", "mission-2", "mission-3", "mission-4"]
	state["mission5_contract_offer"] = {}
	state["detected_targets"] = [
		{"id": "m5-a1", "label": "M5 Asteroid 1", "type": "asteroid"},
		{"id": "m5-a2", "label": "M5 Asteroid 2", "type": "asteroid"},
		{"id": "m5-p1", "label": "M5 Planet 1", "type": "planet"}
	]
	RocketsManager.set_override_state(state)
	var offer = RocketsManager.ensure_mission5_contract_offer()
	var targets = RocketsManager.get_mission5_targets()
	var recommended_id = str(offer.get("recommended_target_id", ""))
	var select_ok = RocketsManager.select_mission5_contractor("rocketlab")
	var selected = RocketsManager.get_mission5_selected_contractor()
	RocketsManager.clear_override_state()
	if offer.is_empty():
		reporter.fail_test("Expected mission 5 contract offer to be created")
		return
	if recommended_id == "":
		reporter.fail_test("Expected mission 5 contract offer to include recommended target")
		return
	if targets.is_empty():
		reporter.fail_test("Expected mission 5 target list to be non-empty")
		return
	for target in targets:
		if str(target.get("type", "")) != "asteroid":
			reporter.fail_test("Expected mission 5 targets to be asteroids only")
			return
	if not select_ok:
		reporter.fail_test("Expected selecting mission 5 contractor to succeed")
		return
	if str(selected.get("id", "")) != "rocketlab":
		reporter.fail_test("Expected selected mission 5 contractor to be rocketlab")
		return
	reporter.pass_test()

func test_mission5_contract_purchase_and_payout_rules() -> void:
	reporter.start_test("Mission 5 contract applies discount/bonus with payout cap")
	var state = RocketsManager.load_state()
	state["mission_progress_completed"] = 4
	state["completed_mission_badges"] = ["mission-1", "mission-2", "mission-3", "mission-4"]
	state["mission5_contract_offer"] = {
		"contractors": RocketsManager.get_mission5_contractors(),
		"selected_contractor": "rocketlab",
		"recommended_target_id": "m5-a1",
		"recommended_target_label": "M5 Asteroid 1",
		"recommended_rocket": "starterrocket1",
		"payout_cap": RocketsManager.get_mission5_payout_cap(),
		"requested_minerals": {"Iron": 100, "Nickel": 80}
	}
	RocketsManager.set_override_state(state)
	var discounted_cost = RocketsManager.get_mission5_purchase_cost("starterrocket2")
	var capped_plain = RocketsManager.apply_mission5_payout_terms(1600000000, "rocketlab")
	var capped_bonus = RocketsManager.apply_mission5_payout_terms(1300000000, "astroforge")
	RocketsManager.clear_override_state()
	if discounted_cost != 1040000000:
		reporter.fail_test("Expected SR2 discounted cost 1.04B, got %s" % str(discounted_cost))
		return
	if capped_plain != 1400000000:
		reporter.fail_test("Expected payout cap 1.4B for plain contractor, got %s" % str(capped_plain))
		return
	if capped_bonus != 1400000000:
		reporter.fail_test("Expected payout bonus then cap to 1.4B, got %s" % str(capped_bonus))
		return
	reporter.pass_test()

func test_mission_progression_stage_order() -> void:
	reporter.start_test("Mission stage follows ordered mission completion")
	var backup = _snapshot_user_rockets_state()
	var baseline = {
		"unlocked": ["starterrocket1"],
		"placed": [],
		"launched": [],
		"destroyed": [],
		"missions": [],
		"selected_target": "",
		"detected_targets": [],
		"seen_asteroids": [],
		"seen_planets": [],
		"scan_counts": {},
		"returning": [],
		"arrived": {},
		"returned_mission": {},
		"returning_started": {},
		"preview_target": {},
		"status_changed_at": {},
		"mission_progress_completed": 0,
		"completed_mission_badges": [],
		"mission_progress_schema_version": 2,
		"pending_mission_guidance_id": 0,
		"scanner_station_built": false,
		"scanner_unlock_dialog_seen": false
	}
	RocketsManager.clear_override_state()
	RocketsManager.save_state(baseline)
	var before_stage = RocketsManager.get_mission_stage()
	RocketsManager.mark_mission_completed("mission-1")
	var after_one = RocketsManager.get_mission_stage()
	RocketsManager.mark_mission_completed("mission-2")
	var after_two = RocketsManager.get_mission_stage()
	RocketsManager.mark_mission_completed("mission-3")
	var after_three = RocketsManager.get_mission_stage()
	_restore_user_rockets_state(backup)
	if before_stage != 1:
		reporter.fail_test("Expected starting stage 1, got %s" % str(before_stage))
		return
	if after_one != 2:
		reporter.fail_test("Expected stage 2 after mission 1 completion, got %s" % str(after_one))
		return
	if after_two != 3:
		reporter.fail_test("Expected stage 3 after mission 2 completion, got %s" % str(after_two))
		return
	if after_three != 4:
		reporter.fail_test("Expected stage 4 after mission 3 completion, got %s" % str(after_three))
		return
	reporter.pass_test()

func test_editor_progress_persists_across_reload() -> void:
	reporter.start_test("Editor mission progress persists across reload")
	var backup = _snapshot_user_rockets_state()
	var baseline = {
		"unlocked": ["starterrocket1"],
		"placed": [],
		"launched": [],
		"destroyed": [],
		"missions": [],
		"selected_target": "",
		"detected_targets": [],
		"seen_asteroids": [],
		"seen_planets": [],
		"scan_counts": {},
		"returning": [],
		"arrived": {},
		"returned_mission": {},
		"returning_started": {},
		"preview_target": {},
		"status_changed_at": {},
		"mission_progress_completed": 0,
		"completed_mission_badges": [],
		"mission_progress_schema_version": 2,
		"pending_mission_guidance_id": 0,
		"scanner_station_built": false,
		"scanner_unlock_dialog_seen": false
	}
	RocketsManager.clear_override_state()
	RocketsManager.save_state(baseline)
	RocketsManager.mark_mission_completed("mission-1")
	var loaded = RocketsManager.load_state()
	_restore_user_rockets_state(backup)
	var completed = int(loaded.get("mission_progress_completed", 0))
	var badges = loaded.get("completed_mission_badges", [])
	if completed != 1:
		reporter.fail_test("Expected mission_progress_completed=1 after reload, got %s" % str(completed))
		return
	if typeof(badges) != TYPE_ARRAY or not badges.has("mission-1"):
		reporter.fail_test("Expected completed_mission_badges to include mission-1 after reload")
		return
	reporter.pass_test()

func test_editor_active_mission_state_persists_across_reload() -> void:
	reporter.start_test("Editor mission launch state persists across reload")
	var backup = _snapshot_user_rockets_state()
	var baseline = {
		"unlocked": ["starterrocket1"],
		"placed": [],
		"launched": [],
		"destroyed": [],
		"missions": [],
		"selected_target": "",
		"detected_targets": [],
		"seen_asteroids": [],
		"seen_planets": [],
		"scan_counts": {},
		"returning": [],
		"arrived": {},
		"returned_mission": {},
		"returning_started": {},
		"preview_target": {},
		"status_changed_at": {},
		"mission_progress_completed": 0,
		"completed_mission_badges": [],
		"mission_progress_schema_version": 2,
		"pending_mission_guidance_id": 0,
		"scanner_station_built": false,
		"scanner_unlock_dialog_seen": false
	}
	RocketsManager.clear_override_state()
	RocketsManager.save_state(baseline)
	RocketsManager.select_target("persist-target-1")
	var mission_ok = RocketsManager.add_mission("starterrocket1-persist-1", "persist-target-1", int(Time.get_unix_time_from_system()), 60)
	var loaded = RocketsManager.load_state()
	_restore_user_rockets_state(backup)
	var selected = str(loaded.get("selected_target", ""))
	var missions = loaded.get("missions", [])
	if not mission_ok:
		reporter.fail_test("Expected add_mission to succeed for persistence check")
		return
	if selected != "persist-target-1":
		reporter.fail_test("Expected selected_target to persist, got %s" % selected)
		return
	if typeof(missions) != TYPE_ARRAY or missions.is_empty():
		reporter.fail_test("Expected persisted missions array to contain launched mission")
		return
	reporter.pass_test()

func _extract_distance_km(label_text: String, prefix: String) -> int:
	if not label_text.begins_with(prefix):
		return -1
	var value = label_text.trim_prefix(prefix).trim_suffix(" km").replace(",", "").strip_edges()
	if value == "":
		return -1
	return int(value)

func _reset_tutorial_completion_for_test() -> void:
	DirAccess.remove_absolute("user://tutorial.cfg")
	var app = root.get_node_or_null("AppController")
	if app and app.has_method("set_tutorial_completed_from_react"):
		app.set_tutorial_completed_from_react(false)

func _snapshot_user_rockets_state() -> Dictionary:
	if not FileAccess.file_exists("user://rockets_state.json"):
		return {"exists": false, "data": {}}
	return {
		"exists": true,
		"data": JSONFileManager.load_json("user://rockets_state.json")
	}

func _restore_user_rockets_state(snapshot: Dictionary) -> void:
	var existed = bool(snapshot.get("exists", false))
	if not existed:
		DirAccess.remove_absolute("user://rockets_state.json")
		RocketsManager.clear_override_state()
		return
	var data = snapshot.get("data", {})
	if typeof(data) != TYPE_DICTIONARY:
		data = {}
	JSONFileManager.save_json("user://rockets_state.json", data)
	RocketsManager.clear_override_state()

func _defined_flows() -> Dictionary:
	return {
		"mission order": ["test_mission_progression_stage_order", "test_launchpad_uses_predefined_targets_for_first_two_missions"],
		"mission tutorials": ["test_tutorial_sequence_places_scanner_after_mission_two", "test_tutorial_panel_hidden_in_transit_scene"],
		"supabase fetch": ["run_supabase_tests.gd::Fetch anomalies (active-asteroids)"],
		"supabase interact": ["test_mission3_targets_filter_and_single_sr2_reachable", "test_mission4_targets_filter_and_single_sr3_reachable", "test_mission5_contract_offer_and_selection"],
		"scene transitions": ["test_outbound_transit_distance_label_decreases", "test_return_preview_auto_advances_to_debrief"],
		"unlock progression": ["test_mark_mission_completed_unlocks_rocket2", "test_mark_mission_completed_unlocks_rocket3", "test_scanner_unlock_gating_by_progress"],
		"xp progression": ["test_xp_accumulates", "test_level_up_threshold", "test_multi_level_up"],
		"editor persistence": ["test_editor_progress_persists_across_reload", "test_editor_active_mission_state_persists_across_reload"],
		"bundle smoke": ["__tests__/bundle_flows.test.js"]
	}

func test_outbound_transit_distance_label_decreases() -> void:
	reporter.start_test("Outbound transit shows decreasing distance to destination")
	var scene_pack = load("res://Scenes/Transitions/rocket_transit.tscn")
	if scene_pack == null:
		reporter.fail_test("Could not load rocket_transit.tscn")
		return
	var err = change_scene_to_packed(scene_pack)
	if err != OK:
		reporter.fail_test("Could not change to rocket_transit.tscn (err=%s)" % str(err))
		return
	await create_timer(0.05).timeout
	var scene = current_scene
	if scene == null:
		reporter.fail_test("No current scene after loading rocket_transit.tscn")
		return
	scene._start_travel()
	scene._phase_time = 5.0
	scene._update_travel()
	var first_text = str(scene.travel_speed.text)
	var first_value = _extract_distance_km(first_text, "Distance to destination: ")
	scene._phase_time = 15.0
	scene._update_travel()
	var second_text = str(scene.travel_speed.text)
	var second_value = _extract_distance_km(second_text, "Distance to destination: ")
	if first_value < 0 or second_value < 0:
		reporter.fail_test("Unexpected outbound distance labels: first=%s second=%s" % [first_text, second_text])
		return
	if second_value >= first_value:
		reporter.fail_test("Expected outbound distance to decrease, got first=%s second=%s" % [str(first_value), str(second_value)])
		return
	reporter.pass_test()

func test_return_transit_distance_label_decreases() -> void:
	reporter.start_test("Return transit shows decreasing distance to Earth")
	var scene_pack = load("res://Scenes/Transitions/rocket_return.tscn")
	if scene_pack == null:
		reporter.fail_test("Could not load rocket_return.tscn")
		return
	var err = change_scene_to_packed(scene_pack)
	if err != OK:
		reporter.fail_test("Could not change to rocket_return.tscn (err=%s)" % str(err))
		return
	await create_timer(0.05).timeout
	var scene = current_scene
	if scene == null:
		reporter.fail_test("No current scene after loading rocket_return.tscn")
		return
	scene._start_travel()
	scene._phase_time = 5.0
	scene._update_travel()
	var first_text = str(scene.travel_speed.text)
	var first_value = _extract_distance_km(first_text, "Distance to Earth: ")
	scene._phase_time = 15.0
	scene._update_travel()
	var second_text = str(scene.travel_speed.text)
	var second_value = _extract_distance_km(second_text, "Distance to Earth: ")
	if first_value < 0 or second_value < 0:
		reporter.fail_test("Unexpected return distance labels: first=%s second=%s" % [first_text, second_text])
		return
	if second_value >= first_value:
		reporter.fail_test("Expected return distance to decrease, got first=%s second=%s" % [str(first_value), str(second_value)])
		return
	reporter.pass_test()

func test_tutorial_panel_hidden_in_transit_scene() -> void:
	reporter.start_test("Tutorial panel is hidden during transit scenes")
	_reset_tutorial_completion_for_test()
	var scene_pack = load("res://Scenes/Transitions/rocket_transit.tscn")
	if scene_pack == null:
		reporter.fail_test("Could not load rocket_transit.tscn for tutorial visibility test")
		return
	var err = change_scene_to_packed(scene_pack)
	if err != OK:
		reporter.fail_test("Could not change to rocket_transit.tscn (err=%s)" % str(err))
		return
	await create_timer(0.05).timeout
	var scene = current_scene
	if scene == null:
		reporter.fail_test("No current scene after loading transit scene")
		return
	var tutorial_panel = scene.get_node_or_null("TutorialPanel")
	if tutorial_panel == null:
		reporter.fail_test("TutorialPanel node missing in transit scene")
		return
	if tutorial_panel.visible:
		reporter.fail_test("Expected TutorialPanel to be hidden in transit scene")
		return
	reporter.pass_test()

func test_tutorial_panel_reappears_on_destination_arrival() -> void:
	reporter.start_test("Tutorial panel reappears when transit scene reaches destination orbit")
	_reset_tutorial_completion_for_test()
	var scene_pack = load("res://Scenes/Transitions/rocket_transit.tscn")
	if scene_pack == null:
		reporter.fail_test("Could not load rocket_transit.tscn for tutorial arrival test")
		return
	var err = change_scene_to_packed(scene_pack)
	if err != OK:
		reporter.fail_test("Could not change to rocket_transit.tscn (err=%s)" % str(err))
		return
	await create_timer(0.05).timeout
	var scene = current_scene
	if scene == null:
		reporter.fail_test("No current scene after loading transit scene")
		return
	scene._start_target_orbit()
	await create_timer(0.05).timeout
	var tutorial_panel = scene.get_node_or_null("TutorialPanel")
	if tutorial_panel == null:
		reporter.fail_test("TutorialPanel node missing in transit scene")
		return
	if not tutorial_panel.visible:
		reporter.fail_test("Expected TutorialPanel to be visible once destination orbit is reached")
		return
	reporter.pass_test()

func test_return_preview_auto_advances_to_debrief() -> void:
	reporter.start_test("Return preview auto-advances to mission debrief without Continue")
	var scene_pack = load("res://Scenes/Transitions/rocket_return.tscn")
	if scene_pack == null:
		reporter.fail_test("Could not load rocket_return.tscn for auto-advance test")
		return
	var err = change_scene_to_packed(scene_pack)
	if err != OK:
		reporter.fail_test("Could not change to rocket_return.tscn (err=%s)" % str(err))
		return
	await create_timer(0.05).timeout
	var scene = current_scene
	if scene == null:
		reporter.fail_test("No current scene after loading rocket_return.tscn")
		return
	scene._start_earth_orbit()
	await create_timer(1.5).timeout
	if current_scene == null:
		reporter.fail_test("Current scene missing after auto-advance window")
		return
	var loaded_path = str(current_scene.scene_file_path)
	if loaded_path != "res://Scenes/Earth/mission_debrief.tscn":
		reporter.fail_test("Expected auto-advance to mission_debrief.tscn, got %s" % loaded_path)
		return
	reporter.pass_test()
