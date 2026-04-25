extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const AppController = preload("res://Scripts/Systems/AppController.gd")
const MissionObjectiveResolver = preload("res://Scripts/Utils/MissionObjectiveResolver.gd")
const MissionLogManager = preload("res://Scripts/Utils/MissionLogManager.gd")

var reporter := TestReporter.new()
var _app_instance: Node = null

func _init() -> void:
	reporter.start_suite("Debug Jump & Testing Shortcuts", {
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
	await test_debug_skip_to_mission_updates_stage_and_level()
	await test_instant_mining_sets_flag_and_changes_scene()
	await test_add_mission_persists_mining_objective()
	await test_debug_complete_active_mission_sets_debrief_payload()
	await test_debug_complete_non_mining_objective_has_no_fake_cargo()
	await test_cmd_e_skip_noops_without_active_mission()

func _setup_app() -> Node:
	var app = AppController.new()
	app.name = "AppController"
	get_root().add_child(app)
	await create_timer(0.05).timeout
	return app

func _teardown_app(app: Node) -> void:
	if is_instance_valid(app):
		app.queue_free()
	await create_timer(0.05).timeout

func _reset_state() -> void:
	RocketsManager.clear_override_state()
	RocketsManager.reset_state()
	var s = RocketsManager.load_state()
	s["mission_progress_completed"] = 0
	s["completed_mission_badges"] = []
	s["missions"] = []
	s["placed"] = []
	s["launched"] = []
	s["returned_mission"] = {}
	s["returning"] = []
	s["arrived"] = {}
	s["starter_contract_offer"] = {}
	s["trip_contract_offer"] = {}
	s["operation_mode"] = "contract"
	RocketsManager.save_state(s)
	RocketsManager.clear_returned_mission()
	MissionLogManager.reset_state()
	DirAccess.remove_absolute("user://tutorial_v2.cfg")
	DirAccess.remove_absolute("user://franc_balance.cfg")
	DirAccess.remove_absolute("user://experience.cfg")

func test_debug_skip_to_mission_updates_stage_and_level() -> void:
	reporter.start_test("debug_skip_to_mission correctly advances stage, level, and balance")
	_reset_state()
	var app = await _setup_app()
	
	# Initial state
	if RocketsManager.get_mission_stage() != 1:
		reporter.fail_test("Expected initial mission stage 1, got %d" % RocketsManager.get_mission_stage())
		await _teardown_app(app)
		return

	# Jump to Mission 3
	app.debug_skip_to_mission(3)
	await create_timer(0.05).timeout
	
	var stage = RocketsManager.get_mission_stage()
	if stage < 3:
		reporter.fail_test("Expected mission stage >= 3 after jump, got %d" % stage)
		await _teardown_app(app)
		return
		
	if app.experience_level < 3:
		reporter.fail_test("Expected experience level >= 3, got %d" % app.experience_level)
		await _teardown_app(app)
		return
		
	if app.franc_balance < 1000000000:
		reporter.fail_test("Expected franc balance >= 1B, got %d" % app.franc_balance)
		await _teardown_app(app)
		return

	reporter.pass_test()
	await _teardown_app(app)

func test_instant_mining_sets_flag_and_changes_scene() -> void:
	reporter.start_test("trigger_instant_mining sets auto-start flag and unpauses")
	_reset_state()
	var app = await _setup_app()
	
	app.set_game_paused(true)
	app.trigger_instant_mining()
	
	if app.get_game_paused():
		reporter.fail_test("Expected game to be unpaused after trigger_instant_mining")
		await _teardown_app(app)
		return
		
	if not app.check_auto_start_mining():
		reporter.fail_test("Expected auto_start_mining flag to be true")
		await _teardown_app(app)
		return

	reporter.pass_test()
	await _teardown_app(app)

func test_add_mission_persists_mining_objective() -> void:
	reporter.start_test("add_mission persists structured mining objective payload")
	_reset_state()
	var contractors = RocketsManager.get_starter_contractors()
	if contractors.is_empty():
		reporter.fail_test("Expected starter contractors")
		return
	var contractor_id = str(contractors[0].get("id", ""))
	RocketsManager.ensure_starter_contract_offer()
	RocketsManager.select_starter_contractor(contractor_id)
	var rocket_id = RocketsManager.add_placed("starterrocket1", Vector2.ZERO)
	var target_id = "mission-1-training-target"
	RocketsManager.add_mission(rocket_id, target_id, int(Time.get_unix_time_from_system()), 1)
	var mission = RocketsManager.get_mission_for_rocket(rocket_id)
	var objective = mission.get("objective", {})
	if typeof(objective) != TYPE_DICTIONARY or objective.is_empty():
		reporter.fail_test("Expected objective dictionary on active mission")
		return
	if str(objective.get("type", "")) != MissionObjectiveResolver.TYPE_MINING_ORDER:
		reporter.fail_test("Expected mining_order objective, got %s" % str(objective.get("type", "")))
		return
	var required = objective.get("requirements", {}).get("minerals", {})
	if typeof(required) != TYPE_DICTIONARY or required.is_empty():
		reporter.fail_test("Expected required minerals on mining objective")
		return
	reporter.pass_test()

func test_debug_complete_active_mission_sets_debrief_payload() -> void:
	reporter.start_test("debug complete active mission creates completed debrief payload")
	_reset_state()
	var contractors = RocketsManager.get_starter_contractors()
	if contractors.is_empty():
		reporter.fail_test("Expected starter contractors")
		return
	var contractor_id = str(contractors[0].get("id", ""))
	RocketsManager.ensure_starter_contract_offer()
	RocketsManager.select_starter_contractor(contractor_id)
	var rocket_id = RocketsManager.add_placed("starterrocket1", Vector2.ZERO)
	var target_id = "mission-1-training-target"
	RocketsManager.add_mission(rocket_id, target_id, int(Time.get_unix_time_from_system()), 1)
	var result = RocketsManager.debug_complete_active_mission_to_debrief()
	if not bool(result.get("ok", false)):
		reporter.fail_test("Expected debug completion ok, got %s" % str(result))
		return
	var returned = RocketsManager.get_returned_mission()
	var objective = returned.get("mission_objective", {})
	var requested = objective.get("requirements", {}).get("minerals", {})
	var collected = returned.get("mining_run_collected", {})
	if typeof(requested) != TYPE_DICTIONARY or requested.is_empty():
		reporter.fail_test("Expected returned objective requirements")
		return
	if typeof(collected) != TYPE_DICTIONARY:
		reporter.fail_test("Expected returned collected minerals dictionary")
		return
	for mineral in requested.keys():
		if int(collected.get(mineral, 0)) < int(requested.get(mineral, 0)):
			reporter.fail_test("Expected collected %s to satisfy requested amount" % str(mineral))
			return
	if not RocketsManager.get_missions().is_empty():
		reporter.fail_test("Expected active missions to be cleared")
		return
	reporter.pass_test()

func test_debug_complete_non_mining_objective_has_no_fake_cargo() -> void:
	reporter.start_test("debug complete non-mining objective does not synthesize cargo")
	_reset_state()
	var rocket_id = RocketsManager.add_placed("starterrocket1", Vector2.ZERO)
	var target_id = "mission-3-tess-debug"
	RocketsManager.add_mission(rocket_id, target_id, int(Time.get_unix_time_from_system()), 1)
	var s = RocketsManager.load_state()
	var missions = s.get("missions", [])
	if missions.is_empty():
		reporter.fail_test("Expected test mission")
		return
	var objective = MissionObjectiveResolver.build_objective({
		"objective_type": MissionObjectiveResolver.TYPE_NO_CARGO,
		"stage": 3,
		"target_id": target_id,
		"target_label": "TESS Debug Candidate",
		"target_type": "tess",
		"operation_mode": "contract"
	})
	missions[0]["objective"] = objective
	s["missions"] = missions
	RocketsManager.save_state(s)
	var result = RocketsManager.debug_complete_active_mission_to_debrief()
	if not bool(result.get("ok", false)):
		reporter.fail_test("Expected non-mining debug completion ok")
		return
	var returned = RocketsManager.get_returned_mission()
	var collected = returned.get("mining_run_collected", {})
	if typeof(collected) != TYPE_DICTIONARY:
		reporter.fail_test("Expected collected cargo dictionary")
		return
	if not collected.is_empty():
		reporter.fail_test("Expected no fake cargo for no_cargo objective, got %s" % str(collected))
		return
	if str(returned.get("mission_objective", {}).get("type", "")) != MissionObjectiveResolver.TYPE_NO_CARGO:
		reporter.fail_test("Expected no_cargo objective in returned mission")
		return
	reporter.pass_test()

func test_cmd_e_skip_noops_without_active_mission() -> void:
	reporter.start_test("Cmd+E debug skip no-ops without active mission")
	_reset_state()
	var app = await _setup_app()
	var skipped = app.debug_skip_active_mission_to_debrief()
	if skipped:
		reporter.fail_test("Expected debug skip to return false with no active mission")
		await _teardown_app(app)
		return
	if not RocketsManager.get_returned_mission().is_empty():
		reporter.fail_test("Expected no returned mission with no active mission")
		await _teardown_app(app)
		return
	reporter.pass_test()
	await _teardown_app(app)
