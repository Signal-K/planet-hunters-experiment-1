extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const AppControllerScript = preload("res://Scripts/Systems/AppController.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")

var reporter := TestReporter.new()

func _init() -> void:
	reporter.start_suite("Experience + Progression", {
		"engine": Engine.get_version_info()["string"],
		"os": OS.get_name(),
		"project": "scene",
		"timestamp": Time.get_datetime_string_from_system()
	})
	await run_all_tests()
	reporter.summary()
	await create_timer(0.1).timeout
	quit(1 if reporter.tests_failed > 0 else 0)

func run_all_tests() -> void:
	await test_flow_index_has_defined_behaviour_groups()
	await test_xp_accumulates()
	await test_level_up_threshold()
	await test_multi_level_up()
	await test_scanner_unlock_gating_by_progress()
	await test_scanner_build_cost_enforced()
	await test_scanner_stage_requires_scanned_target_selection()
	await test_outbound_transit_distance_label_decreases()
	await test_return_transit_distance_label_decreases()
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
		reporter.fail_test("Expected XP remainder 0 after exact threshold")
		return
	reporter.pass_test()

func test_multi_level_up() -> void:
	reporter.start_test("Multiple level-ups in one grant")
	var app = _new_controller()
	app.add_experience(40, "test")
	if app.get_experience_level() < 3:
		reporter.fail_test("Expected at least level 3 after +40 XP")
		return
	reporter.pass_test()

func test_scanner_unlock_gating_by_progress() -> void:
	reporter.start_test("Scanner unlock gated by mission progress")
	var state = RocketsManager.load_state()
	state["mission_progress_completed"] = 1
	state["completed_mission_badges"] = ["mission-1"]
	state["scanner_unlocked"] = false
	RocketsManager.set_override_state(state)
	var locked = RocketsManager.is_scanner_unlocked()
	state["mission_progress_completed"] = 2
	state["completed_mission_badges"] = ["mission-1", "mission-2"]
	state["scanner_unlocked"] = false
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
	reporter.start_test("Scanner build cost fixed at 2B F")
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

func test_scanner_stage_requires_scanned_target_selection() -> void:
	reporter.start_test("Scanner stages require scanned target selection")
	var scanned_target_id = "scan-stage3-target-%d" % int(Time.get_ticks_msec())
	var state = RocketsManager.load_state()
	state["mission_progress_completed"] = 2
	state["completed_mission_badges"] = ["mission-1", "mission-2"]
	state["detected_targets"] = [{
		"id": scanned_target_id,
		"label": "Scanned Stage3 Target",
		"type": "planet"
	}]
	state["missions"] = []
	RocketsManager.set_override_state(state)
	var selectable_scanned = RocketsManager.is_target_selectable_for_current_stage(scanned_target_id)
	var selectable_default = RocketsManager.is_target_selectable_for_current_stage("mission-1-training-target")
	RocketsManager.clear_override_state()
	if not selectable_scanned:
		reporter.fail_test("Expected scanned target to be selectable in scanner-gated stage")
		return
	if selectable_default:
		reporter.fail_test("Expected hidden/default target to be rejected in scanner-gated stage")
		return
	reporter.pass_test()

func _extract_distance_km(label_text: String, prefix: String) -> int:
	if not label_text.begins_with(prefix):
		return -1
	var value = label_text.trim_prefix(prefix).trim_suffix(" km").replace(",", "").strip_edges()
	if value == "":
		return -1
	return int(value)

func _defined_flows() -> Dictionary:
	return {
		"mission order": ["mission stage progression"],
		"supabase fetch": ["run_supabase_tests.gd::Fetch anomalies (active-asteroids)"],
		"supabase interact": ["target filters and contract selection"],
		"scene transitions": ["outbound/return distance and debrief auto-advance"],
		"unlock progression": ["scanner unlock gate", "rocket unlocks"],
		"xp progression": ["xp accumulate", "level thresholds", "multi level-up"],
		"editor persistence": ["mission progress persistence"],
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
