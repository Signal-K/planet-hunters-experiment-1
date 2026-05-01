extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const MissionDebriefScene = preload("res://Scenes/Earth/mission_debrief_v2.tscn")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const ResearchManager = preload("res://Scripts/Utils/ResearchManager.gd")
const NumberFormat = preload("res://Scripts/Utils/NumberFormat.gd")
const MissionLogManager = preload("res://Scripts/Utils/MissionLogManager.gd")

const TEST_LOG_PATH := "res://tests/mission_debrief_v2_test_logs.json"

var reporter := TestReporter.new()

class MockAppController:
	extends Node
	var _franc_balance := 0
	var _xp := 0

	func add_franc_balance(amount: int, _source: String = "") -> void:
		_franc_balance += amount

	func add_experience(amount: int, _source: String = "") -> void:
		_xp += amount

	func get_franc_balance() -> int:
		return _franc_balance

	func has_outstanding_loan() -> bool:
		return false

	func repay_loan_from_payout(amount: int) -> int:
		return amount

func _init() -> void:
	MissionLogManager.set_path_overrides(TEST_LOG_PATH, TEST_LOG_PATH)
	reporter.start_suite("Mission Debrief V2", {
		"engine": Engine.get_version_info()["string"],
		"os": OS.get_name(),
		"project": "scene",
		"timestamp": Time.get_datetime_string_from_system()
	})
	await run_all_tests()
	reporter.summary()
	MissionLogManager.clear_path_overrides()
	await create_timer(0.1).timeout
	quit(1 if reporter.tests_failed > 0 else 0)

func run_all_tests() -> void:
	await test_debrief_primary_sections_are_scene_owned()
	await test_reward_phase_promotes_to_handoff_card()
	await test_salvage_action_marks_rocket_destroyed_and_refunds()
	await test_button_guide_copy_matches_reward_and_handoff_actions()
	await test_mission1_handoff_routes_back_to_base_build_step()
	await test_mission3_handoff_routes_into_m4_autonomy_step()

func test_debrief_primary_sections_are_scene_owned() -> void:
	reporter.start_test("MissionDebriefV2 primary sections exist as scene-owned nodes")
	var ctx = await _setup_scene()
	var scene = ctx.get("scene")
	var expected_paths = [
		"Center/Panel/Margin/ContentVBox/HeaderSection",
		"Center/Panel/Margin/ContentVBox/GuideCard",
		"Center/Panel/Margin/ContentVBox/MainRow/LeftColumn/SuccessBanner",
		"Center/Panel/Margin/ContentVBox/MainRow/LeftColumn/SummaryGrid/ManifestCard",
		"Center/Panel/Margin/ContentVBox/MainRow/BodyGrid",
		"Center/Panel/Margin/ContentVBox/MainRow/BodyGrid/RecoveryColumn/PayoutCard",
		"Center/Panel/Margin/ContentVBox/MainRow/BodyGrid/RecoveryColumn/CombinedCargoCard",
		"Center/Panel/Margin/ContentVBox/MainRow/BodyGrid/ProgressColumn/FindingsCard",
		"Center/Panel/Margin/ContentVBox/MainRow/BodyGrid/ProgressColumn/PhaseCard",
		"Center/Panel/Margin/ContentVBox/ActionsCard"
	]
	for path in expected_paths:
		if scene.get_node_or_null(path) == null:
			reporter.fail_test("Expected scene-owned debrief section at %s" % path)
			await _teardown_scene(ctx)
			return
	await _teardown_scene(ctx)
	reporter.pass_test()

func _setup_scene(completed_missions: int = 0, returned_override: Dictionary = {}) -> Dictionary:
	RocketsManager.clear_override_state()
	RocketsManager.reset_state()
	var s = RocketsManager.load_state()
	s["mission_progress_completed"] = 0
	s["completed_mission_badges"] = []
	s["missions"] = []
	s["placed"] = []
	s["launched"] = []
	s["destroyed"] = []
	s["returned_mission"] = {}
	s["returning"] = []
	s["arrived"] = {}
	s["control_station_built"] = false
	s["scanner_station_built"] = false
	s["scanner_unlocked"] = false
	s["starter_contract_offer"] = {}
	s["trip_contract_offer"] = {}
	s["operation_mode"] = "contract"
	RocketsManager.save_state(s)
	RocketsManager.clear_returned_mission()
	for mission_idx in range(completed_missions):
		RocketsManager.mark_mission_completed("mission-%d-debrief-setup" % (mission_idx + 1))
	var rocket_id := str(returned_override.get("rocket_id", "starterrocket1-debrief-test"))
	var target_id := str(returned_override.get("target_id", "mission-1-training-target"))
	var target_label := str(returned_override.get("target_label", "433 Eros"))
	var target_type := str(returned_override.get("target_type", "asteroid"))
	var operation_mode := str(returned_override.get("operation_mode", "contract"))
	var extra := {
		"trip_contractor_id": "rocketlab",
		"trip_contractor_name": "Rocketlab",
		"trip_requested_minerals": {"Iron": 10},
		"mining_run_collected": {"Iron": 10}
	} as Dictionary
	for key in returned_override.keys():
		if ["rocket_id", "target_id", "target_label", "target_type", "operation_mode"].has(str(key)):
			continue
		extra[key] = returned_override[key]
	RocketsManager.set_returned_mission(
		rocket_id,
		target_id,
		target_label,
		target_type,
		operation_mode,
		extra
	)
	var existing = get_root().get_node_or_null("AppController")
	if existing:
		existing.queue_free()
		await create_timer(0.02).timeout
	var app = MockAppController.new()
	app.name = "AppController"
	get_root().add_child(app)
	var scene = MissionDebriefScene.instantiate()
	get_root().add_child(scene)
	await create_timer(0.05).timeout
	return {"scene": scene, "app": app}

func _teardown_scene(ctx: Dictionary) -> void:
	var scene = ctx.get("scene")
	var app = ctx.get("app")
	if scene and is_instance_valid(scene):
		scene.queue_free()
	if app and is_instance_valid(app):
		app.queue_free()
	RocketsManager.clear_returned_mission()
	await create_timer(0.02).timeout

func _find_button_by_text(root: Node, text: String) -> Button:
	if root == null:
		return null
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var node = stack.pop_back()
		if node is Button and str((node as Button).text) == text:
			return node as Button
		for child in node.get_children():
			stack.append(child)
	return null

func _find_button_containing(root: Node, snippet: String) -> Button:
	if root == null:
		return null
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var node = stack.pop_back()
		if node is Button and str((node as Button).text).find(snippet) != -1:
			return node as Button
		for child in node.get_children():
			stack.append(child)
	return null

func _find_label_containing(root: Node, snippet: String) -> Label:
	if root == null:
		return null
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var node = stack.pop_back()
		if node is Label and str((node as Label).text).find(snippet) != -1:
			return node as Label
		for child in node.get_children():
			stack.append(child)
	return null

func test_reward_phase_promotes_to_handoff_card() -> void:
	reporter.start_test("Debrief V2 promotes reward phase into next-mission handoff")
	var ctx = await _setup_scene()
	var scene = ctx.get("scene")
	var sell_btn = _find_button_containing(scene, "Sell Cargo")
	if sell_btn == null:
		reporter.fail_test("Expected sell button in reward phase")
		await _teardown_scene(ctx)
		return
	scene._on_sell_pressed(sell_btn)
	var continue_btn = _find_button_by_text(scene, "Next Mission →")
	if continue_btn == null or continue_btn.disabled:
		reporter.fail_test("Expected enabled handoff button after reward resolution")
		await _teardown_scene(ctx)
		return
	scene._on_complete_pressed()
	if scene._phase != "handoff":
		reporter.fail_test("Expected debrief to enter handoff phase")
		await _teardown_scene(ctx)
		return
	if _find_label_containing(scene, "NEXT MISSION") == null:
		reporter.fail_test("Expected next mission handoff card heading")
		await _teardown_scene(ctx)
		return
	if _find_button_by_text(scene, "Build Control Station →") == null:
		reporter.fail_test("Expected Mission 2 handoff CTA to send the player back to the base build step")
		await _teardown_scene(ctx)
		return
	await _teardown_scene(ctx)
	reporter.pass_test()

func test_salvage_action_marks_rocket_destroyed_and_refunds() -> void:
	reporter.start_test("Debrief V2 salvage applies refund and destroys returned rocket")
	var ctx = await _setup_scene()
	var scene = ctx.get("scene")
	var app = ctx.get("app")
	scene._on_sell_pressed(Button.new())
	scene._on_complete_pressed()
	var rocket_id = "starterrocket1-debrief-test"
	var expected_refund = int(round(float(RocketSpecs.get_cost(rocket_id)) * ResearchManager.get_salvage_refund_multiplier()))
	var before_balance = app.get_franc_balance()
	var salvage_btn = _find_button_by_text(scene, "Scrap / Salvage Ship  (+%s F)" % NumberFormat.commas(str(expected_refund)))
	if salvage_btn == null:
		reporter.fail_test("Expected salvage button in handoff phase")
		await _teardown_scene(ctx)
		return
	scene._on_salvage_pressed(salvage_btn)
	if not RocketsManager.get_destroyed().has(rocket_id):
		reporter.fail_test("Expected rocket to be marked destroyed after salvage")
		await _teardown_scene(ctx)
		return
	if app.get_franc_balance() != before_balance + expected_refund:
		reporter.fail_test("Expected salvage refund to be added to app balance")
		await _teardown_scene(ctx)
		return
	await _teardown_scene(ctx)
	reporter.pass_test()

func test_button_guide_copy_matches_reward_and_handoff_actions() -> void:
	reporter.start_test("Debrief V2 button guide explains reward and handoff actions in plain language")
	var ctx = await _setup_scene()
	var scene = ctx.get("scene")
	scene._toggle_button_guide()
	if _find_label_containing(scene, "Sell Cargo: Convert this run's cargo into francs and lock in the payout.") == null:
		reporter.fail_test("Expected reward-phase guide copy for Sell Cargo")
		await _teardown_scene(ctx)
		return
	if _find_label_containing(scene, "Next Mission: Move from reward resolution into the next-mission briefing.") == null:
		reporter.fail_test("Expected reward-phase guide copy for Next Mission")
		await _teardown_scene(ctx)
		return
	scene._on_sell_pressed(Button.new())
	scene._on_complete_pressed()
	if _find_label_containing(scene, "Build Control Station: Return to Earth base and construct the Control Station before reopening the Launchpad.") == null:
		reporter.fail_test("Expected build-step guide copy for Mission 2 handoff")
		await _teardown_scene(ctx)
		return
	if _find_label_containing(scene, "Scrap / Salvage Ship: Retire this ship now and receive the listed salvage refund.") == null:
		reporter.fail_test("Expected handoff guide copy for salvage action")
		await _teardown_scene(ctx)
		return
	if _find_label_containing(scene, "Return to Base: Leave debrief and go back to Earth base without opening launchpad.") != null:
		reporter.fail_test("Return to Base copy should be hidden when the primary CTA already routes back to Earth base")
		await _teardown_scene(ctx)
		return
	await _teardown_scene(ctx)
	reporter.pass_test()

func test_mission1_handoff_routes_back_to_base_build_step() -> void:
	reporter.start_test("Debrief V2 routes Mission 1 completion back to Control Station build step")
	var ctx = await _setup_scene()
	var scene = ctx.get("scene")
	scene._on_sell_pressed(Button.new())
	scene._next_mission_brief = {
		"primary_cta": "Open Launchpad →",
		"requires_base_setup": false,
		"base_setup_key": ""
	}
	scene._on_complete_pressed()
	if _find_label_containing(scene, "Mission 2 starts at the Control Station") == null:
		reporter.fail_test("Expected Mission 2 handoff card title to explain the Control Station requirement")
		await _teardown_scene(ctx)
		return
	if _find_label_containing(scene, "Build the Control Station first; it unlocks mission planning for Starter Rocket 2.") == null:
		reporter.fail_test("Expected Mission 2 note to keep the player on the Control Station step")
		await _teardown_scene(ctx)
		return
	if _find_button_by_text(scene, "Build Control Station →") == null:
		reporter.fail_test("Expected stale launchpad handoff to be recomputed as Control Station build CTA")
		await _teardown_scene(ctx)
		return
	await _teardown_scene(ctx)
	reporter.pass_test()

func test_mission3_handoff_routes_into_m4_autonomy_step() -> void:
	reporter.start_test("Debrief V2 routes Mission 3 completion into Mission 4 autonomy handoff")
	var ctx = await _setup_scene(2, {
		"rocket_id": "starterrocket2-debrief-test",
		"target_id": "mission-3-tess-candidate-alpha",
		"target_label": "TOI-700 d",
		"target_type": "planet"
	})
	var scene = ctx.get("scene")
	scene._on_sell_pressed(Button.new())
	scene._on_complete_pressed()
	if _find_button_by_text(scene, "Return to Base →") == null:
		reporter.fail_test("Expected Mission 4 handoff CTA to return the player to base for the self-directed setup")
		await _teardown_scene(ctx)
		return
	if _find_label_containing(scene, "Mission 4 opens into your first self-directed run") == null:
		reporter.fail_test("Expected Mission 4 handoff title to explain the autonomy transition")
		await _teardown_scene(ctx)
		return
	if _find_label_containing(scene, "Mission 4 is the transition into autonomy: take a contract for structure or launch a survey run on your own.") == null:
		reporter.fail_test("Expected Mission 4 note to explain the new autonomy handoff")
		await _teardown_scene(ctx)
		return
	await _teardown_scene(ctx)
	reporter.pass_test()
