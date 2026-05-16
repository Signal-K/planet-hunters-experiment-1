extends SceneTree
## Unified Sync Bridge Tests

const TestReporter = preload("res://tests/TestReporter.gd")
const AppControllerScript = preload("res://Scripts/Systems/AppController.gd")
const SyncBridgeScript = preload("res://Scripts/Systems/SyncBridge.gd")
const AppControllerPersistenceScript = preload("res://Scripts/Systems/AppControllerPersistence.gd")
const MissionLogManager = preload("res://Scripts/Utils/MissionLogManager.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const FirstTimeMechanicTracker = preload("res://Scripts/Utils/FirstTimeMechanicTracker.gd")
const JSONFileManager = preload("res://Scripts/Utils/JSONFileManager.gd")

var reporter := TestReporter.new()

func _init():
	reporter.start_suite("Unified Sync Bridge", {
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
	await test_get_state_returns_all_keys()
	await test_set_value_updates_state()
	await test_set_value_updates_app_controller()
	await test_app_controller_changes_update_sync_bridge()
	await test_init_from_react_sets_all_values()
	await test_no_feedback_loop()
	await test_legacy_json_balance_fallback_migrates_into_app_controller()
	await test_app_controller_reconciles_level_from_progression_state()
	await test_app_controller_clamps_onboarding_level_to_mission_stage()
	await test_sync_bridge_exposes_canonical_player_snapshot()
	await test_reset_all_restores_fresh_player_defaults()

func _clear_persisted_state() -> void:
	var persistence = AppControllerPersistenceScript.new()
	persistence.reset_all()
	MissionLogManager.reset_state()
	SubcontractorManager.reset_state()
	RocketsManager.reset_state()
	FirstTimeMechanicTracker.reset_all()
	DirAccess.remove_absolute("user://rocket_unlock_popups.cfg")
	DirAccess.remove_absolute("user://landnam_intro_v1.cfg")

func _setup(clear_state: bool = true) -> Dictionary:
	if clear_state:
		_clear_persisted_state()
	var app = AppControllerScript.new()
	app.name = "AppController"
	get_root().add_child(app)

	var sync = SyncBridgeScript.new()
	sync.name = "SyncBridge"
	get_root().add_child(sync)

	await create_timer(0.1).timeout
	return {"app": app, "sync": sync}

func _teardown(app: Node, sync: Node) -> void:
	if is_instance_valid(sync):
		sync.queue_free()
	if is_instance_valid(app):
		app.queue_free()
	await create_timer(0.05).timeout
	_clear_persisted_state()

func test_get_state_returns_all_keys() -> void:
	reporter.start_test("get_state returns all expected keys")
	var ctx = await _setup()
	var sync = ctx["sync"]

	var state = sync.get_state()
	var expected_keys = [
		"counter", "francBalance", "experienceXp", "experienceLevel",
		"playerStateVersion", "missionStage", "completedMissions",
		"controlStationBuilt", "scannerStationBuilt", "scannerUnlocked",
		"operationMode", "freeOperationsUnlocked", "activeMissionsCount",
		"hasReturnedMission", "pendingMissionGuidanceId", "unlockedRockets"
	]

	for key in expected_keys:
		if not state.has(key):
			reporter.fail_test("Missing key in state: " + key)
			await _teardown(ctx["app"], sync)
			return

	reporter.pass_test()
	await _teardown(ctx["app"], sync)

func test_set_value_updates_state() -> void:
	reporter.start_test("set_value updates internal state")
	var ctx = await _setup()
	var sync = ctx["sync"]

	sync.set_value("counter", 42)
	var state = sync.get_state()

	if state.get("counter") != 42:
		reporter.fail_test("Expected counter=42, got " + str(state.get("counter")))
		await _teardown(ctx["app"], sync)
		return

	reporter.pass_test()
	await _teardown(ctx["app"], sync)

func test_set_value_updates_app_controller() -> void:
	reporter.start_test("set_value updates AppController")
	var ctx: Dictionary = await _setup()
	var app: Node = ctx["app"]
	var sync: Node = ctx["sync"]

	sync.set_value("counter", 99)
	if app.get_counter() != 99:
		reporter.fail_test("AppController counter should be 99, got " + str(app.get_counter()))
		await _teardown(app, sync)
		return

	sync.set_value("francBalance", 5000)
	if app.get_franc_balance() != 5000:
		reporter.fail_test("AppController francBalance should be 5000")
		await _teardown(app, sync)
		return

	reporter.pass_test()
	await _teardown(app, sync)

func test_app_controller_changes_update_sync_bridge() -> void:
	reporter.start_test("AppController changes update SyncBridge")
	var ctx = await _setup()
	var app = ctx["app"]
	var sync = ctx["sync"]

	app.set_franc_balance_from_react(12345)
	await create_timer(0.05).timeout

	var state = sync.get_state()
	if state.get("francBalance") != 12345:
		reporter.fail_test("SyncBridge should have francBalance=12345, got " + str(state.get("francBalance")))
		await _teardown(app, sync)
		return

	reporter.pass_test()
	await _teardown(app, sync)

func test_init_from_react_sets_all_values() -> void:
	reporter.start_test("init_from_react sets all values")
	var ctx = await _setup()
	var app = ctx["app"]
	var sync = ctx["sync"]

	var initial_state = {
		"counter": 10,
		"francBalance": 50000,
		"experienceXp": 100,
		"experienceLevel": 3
	}

	sync.init_from_react(initial_state)
	var state = sync.get_state()

	if state.get("counter") != 10:
		reporter.fail_test("counter should be 10")
		await _teardown(app, sync)
		return
	if state.get("francBalance") != 50000:
		reporter.fail_test("francBalance should be 50000")
		await _teardown(app, sync)
		return
	if app.get_counter() != 10:
		reporter.fail_test("AppController counter should be 10")
		await _teardown(app, sync)
		return

	reporter.pass_test()
	await _teardown(app, sync)

func test_no_feedback_loop() -> void:
	reporter.start_test("No feedback loop when setting from React")
	var ctx = await _setup()
	var app = ctx["app"]
	var sync = ctx["sync"]

	var signals_received: Array = []
	sync.state_changed.connect(func(key, value, source): signals_received.append({"key": key, "value": value, "source": source}))

	sync.set_value("counter", 77)
	await create_timer(0.1).timeout

	var react_signals = signals_received.filter(func(s): return s.key == "counter" and s.source == "react")
	if react_signals.size() != 1:
		reporter.fail_test("Expected 1 react signal for counter, got " + str(react_signals.size()) + ". All signals: " + str(signals_received))
		await _teardown(app, sync)
		return

	if react_signals[0].source != "react":
		reporter.fail_test("Signal should have source 'react', got " + str(react_signals[0].source))
		await _teardown(app, sync)
		return

	reporter.pass_test()
	await _teardown(app, sync)

func test_legacy_json_balance_fallback_migrates_into_app_controller() -> void:
	reporter.start_test("AppController loads legacy franc_balance.json when cfg is missing")
	_clear_persisted_state()
	JSONFileManager.save_json("user://franc_balance.json", {"balance": 321})
	var ctx = await _setup(false)
	var app = ctx["app"]
	var sync = ctx["sync"]
	if app.get_franc_balance() != 321:
		reporter.fail_test("Expected legacy JSON balance 321, got %s" % app.get_franc_balance())
		await _teardown(app, sync)
		return
	if not FileAccess.file_exists("user://franc_balance.cfg"):
		reporter.fail_test("Expected franc_balance.cfg migration file to be created")
		await _teardown(app, sync)
		return
	var state = sync.get_state()
	if state.get("francBalance") != 321:
		reporter.fail_test("SyncBridge should reflect migrated JSON balance, got %s" % str(state.get("francBalance")))
		await _teardown(app, sync)
		return
	reporter.pass_test()
	await _teardown(app, sync)

func test_app_controller_reconciles_level_from_progression_state() -> void:
	reporter.start_test("AppController raises level floor to match reconciled mission progression")
	_clear_persisted_state()
	var state = RocketsManager.load_state()
	state["mission_progress_completed"] = 0
	state["completed_mission_badges"] = []
	state["control_station_built"] = true
	state["scanner_station_built"] = true
	state["scanner_unlocked"] = false
	RocketsManager.save_state(state)
	var ctx = await _setup(false)
	var app = ctx["app"]
	var sync = ctx["sync"]
	if RocketsManager.get_mission_stage() < 3:
		reporter.fail_test("Expected reconciled mission stage >= 3, got %s" % RocketsManager.get_mission_stage())
		await _teardown(app, sync)
		return
	if app.get_experience_level() < 3:
		reporter.fail_test("Expected AppController level floor >= 3 after reconciliation, got %s" % app.get_experience_level())
		await _teardown(app, sync)
		return
	var bridge_state = sync.get_state()
	if bridge_state.get("experienceLevel") < 3:
		reporter.fail_test("Expected SyncBridge level floor >= 3 after reconciliation, got %s" % str(bridge_state.get("experienceLevel")))
		await _teardown(app, sync)
		return
	reporter.pass_test()
	await _teardown(app, sync)

func test_app_controller_clamps_onboarding_level_to_mission_stage() -> void:
	reporter.start_test("AppController clamps stale onboarding levels back to mission-stage bounds")
	_clear_persisted_state()
	var state = RocketsManager.load_state()
	state["mission_progress_completed"] = 1
	state["completed_mission_badges"] = ["mission-1"]
	RocketsManager.save_state(state)
	var persistence = AppControllerPersistenceScript.new()
	persistence.save_experience(999, 9)
	var ctx = await _setup(false)
	var app = ctx["app"]
	var sync = ctx["sync"]
	var mission_stage = RocketsManager.get_mission_stage()
	if mission_stage < 2 or mission_stage > 3:
		reporter.fail_test("Expected onboarding mission stage to stay within authored early-game bounds, got %s" % mission_stage)
		await _teardown(app, sync)
		return
	if app.get_experience_level() != mission_stage:
		reporter.fail_test("Expected onboarding level clamp to current mission stage %s, got %s" % [mission_stage, app.get_experience_level()])
		await _teardown(app, sync)
		return
	if sync.get_state().get("experienceLevel") != mission_stage:
		reporter.fail_test("Expected SyncBridge onboarding level clamp to %s, got %s" % [mission_stage, str(sync.get_state().get("experienceLevel"))])
		await _teardown(app, sync)
		return
	reporter.pass_test()
	await _teardown(app, sync)

func test_sync_bridge_exposes_canonical_player_snapshot() -> void:
	reporter.start_test("SyncBridge mirrors canonical player snapshot fields from AppController")
	_clear_persisted_state()
	var state = RocketsManager.load_state()
	state["mission_progress_completed"] = 3
	state["completed_mission_badges"] = ["mission-1", "mission-2", "mission-3"]
	state["control_station_built"] = true
	state["scanner_station_built"] = true
	state["scanner_unlocked"] = true
	state["operation_mode"] = "survey"
	state["missions"] = [{"rocket_id": "rocket-a", "target": "target-a", "operation_mode": "survey"}]
	state["returned_mission"] = {"rocket_id": "rocket-b", "target_id": "target-b", "operation_mode": "contract"}
	RocketsManager.save_state(state)
	var ctx = await _setup(false)
	var app = ctx["app"]
	var sync = ctx["sync"]
	var snapshot = app.get_player_state_snapshot("test")
	var bridge_state = sync.get_state()
	if int(bridge_state.get("playerStateVersion", 0)) != int(snapshot.get("schema_version", 0)):
		reporter.fail_test("Expected snapshot schema version in SyncBridge, got %s vs %s" % [str(bridge_state.get("playerStateVersion")), str(snapshot.get("schema_version"))])
		await _teardown(app, sync)
		return
	if int(bridge_state.get("missionStage", 0)) != int(snapshot.get("mission_stage", 0)):
		reporter.fail_test("Expected missionStage from canonical snapshot, got %s vs %s" % [str(bridge_state.get("missionStage")), str(snapshot.get("mission_stage"))])
		await _teardown(app, sync)
		return
	if bool(bridge_state.get("scannerUnlocked", false)) != bool(snapshot.get("scanner_unlocked", false)):
		reporter.fail_test("Expected scannerUnlocked from canonical snapshot, got %s vs %s" % [str(bridge_state.get("scannerUnlocked")), str(snapshot.get("scanner_unlocked"))])
		await _teardown(app, sync)
		return
	if str(bridge_state.get("operationMode", "")) != str(snapshot.get("operation_mode", "")):
		reporter.fail_test("Expected operationMode from canonical snapshot, got %s vs %s" % [str(bridge_state.get("operationMode")), str(snapshot.get("operation_mode"))])
		await _teardown(app, sync)
		return
	if int(bridge_state.get("activeMissionsCount", -1)) != 1 or not bool(bridge_state.get("hasReturnedMission", false)):
		reporter.fail_test("Expected active/returned mission snapshot fields, got %s" % str(bridge_state))
		await _teardown(app, sync)
		return
	reporter.pass_test()
	await _teardown(app, sync)

func test_reset_all_restores_fresh_player_defaults() -> void:
	reporter.start_test("reset_all restores fresh player defaults")
	var ctx = await _setup()
	var app = ctx["app"]
	var sync = ctx["sync"]

	app.set_franc_balance_from_react(12345)
	app.set_experience_from_react(40, 3)
	MissionLogManager.add_mission({"badge": "test", "target_id": "target-a", "action": "sale"})
	SubcontractorManager.add_affinity("rocketlab", 3)
	SubcontractorManager.add_reputation("rocketlab", 200)

	app._on_reset_all()
	await create_timer(0.1).timeout

	if app.get_franc_balance() != AppControllerScript.DEFAULT_FRANC_BALANCE:
		reporter.fail_test("Fresh balance mismatch: expected %s, got %s" % [AppControllerScript.DEFAULT_FRANC_BALANCE, app.get_franc_balance()])
		await _teardown(app, sync)
		return
	if app.get_experience_xp() != 0 or app.get_experience_level() != 1:
		reporter.fail_test("Fresh experience mismatch: xp=%s level=%s" % [app.get_experience_xp(), app.get_experience_level()])
		await _teardown(app, sync)
		return
	if not MissionLogManager.get_missions().is_empty():
		reporter.fail_test("Mission log should be empty after reset")
		await _teardown(app, sync)
		return
	if SubcontractorManager.get_affinity("rocketlab") != 0 or SubcontractorManager.get_reputation("rocketlab") != 0:
		reporter.fail_test("Subcontractor state should be reset to zero")
		await _teardown(app, sync)
		return
	if RocketsManager.is_control_station_built():
		reporter.fail_test("Control Station should not be built after reset")
		await _teardown(app, sync)
		return
	var state = sync.get_state()
	if state.get("francBalance") != AppControllerScript.DEFAULT_FRANC_BALANCE:
		reporter.fail_test("SyncBridge did not receive fresh balance default")
		await _teardown(app, sync)
		return

	reporter.pass_test()
	await _teardown(app, sync)
