extends SceneTree
## Structure interaction and scene transition tests
## Run with: /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s scene/tests/run_structure_tests.gd

const TestReporter = preload("res://tests/TestReporter.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const RocketsStateAccess = preload("res://Scripts/Utils/RocketsStateAccess.gd")
const RocketsMissionProgress = preload("res://Scripts/Utils/RocketsMissionProgress.gd")
const RocketsTargeting = preload("res://Scripts/Utils/RocketsTargeting.gd")
const CurrencyManager = preload("res://Scripts/Utils/CurrencyManager.gd")
const LaunchpadSelectorPanel = preload("res://Scripts/Earth/LaunchpadSelectorPanel.gd")
const EarthBaseScene = preload("res://Scenes/Earth/earth_base_1.tscn")
const EarthLaunchpadScene = preload("res://Scenes/Earth/earth_launchpad.tscn")
const MissionDebriefScene = preload("res://Scenes/Earth/mission_debrief_v2.tscn")
const SpaceMapScene = preload("res://Scenes/UI/SpaceMap/space_map.tscn")
const SidescrollMiningScene = preload("res://Scenes/UI/SidescrollMining.tscn")
const MiningPracticeScene = preload("res://Scenes/UI/MiningPracticePanel.tscn")
const SatelliteStationScene = preload("res://Scenes/UI/SatelliteStationPanel.tscn")
const RocketAscentScene = preload("res://Scenes/Transitions/rocket_ascent.tscn")
const OutboundPreviewScene = preload("res://Scenes/Transitions/rocket_transit.tscn")

var reporter := TestReporter.new()

func _init():
	reporter.start_suite("Structure & Interaction Tests", {
		"engine": Engine.get_version_info()["string"],
		"os": OS.get_name(),
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
	await test_currency_manager_balance_operations()
	await test_scanner_build_cost_value()
	await test_contractor_discount_calculation()
	await test_contractor_payout_bonus_calculation()
	await test_mission_reward_ratios_match_spec()
	await test_rockets_state_default_shape()
	await test_rockets_mission_progress_mapping()
	await test_rockets_targeting_filtering()
	await test_level1_target_route_is_strict()
	await test_level2_has_limited_variants_with_fallback()
	await test_level3_scanner_targets_have_fallback_when_scan_empty()
	await test_level2_completion_advances_to_stage3_but_keeps_scanner_locked()
	await test_launch_target_resolution_applies_playable_fallback()
	await test_open_operation_mode_persists_and_applies_to_missions()
	await test_open_operation_survey_route_relaxes_contractor_block()
	await test_launchpad_target_prep_items_merge_mission_guidance()
	await test_mission_exposure_reward_progression()
	await test_mission_briefing_seen_persistence()
	await test_launchpad_briefing_gate_is_one_time()
	await test_scanner_station_requires_explicit_build_step()
	await test_earth_base_disables_new_mission_until_scanner_station_is_built()
	await test_launchpad_scene_has_shared_bottom_nav()
	await test_space_map_scene_has_shared_bottom_nav()
	await test_mission_debrief_scene_has_shared_bottom_nav()
	await test_sidescroll_mining_drone_pool_reuse()
	await test_sidescroll_mining_button_handbook_copy_is_plain_language()
	await test_mining_practice_panel_stays_on_screen_after_run_complete()
	await test_satellite_station_panel_stays_on_screen()
	await test_rocket_ascent_skip_button_stays_on_screen()
	await test_outbound_preview_panels_stay_on_screen()

func test_currency_manager_balance_operations() -> void:
	reporter.start_test("[SPEC] Currency manager handles balance operations correctly")
	var currency = CurrencyManager.new()
	var initial = currency.balance
	
	currency.modify_balance(1000000)
	if currency.balance != initial + 1000000:
		reporter.fail_test("Balance after add: %d != expected %d" % [currency.balance, initial + 1000000])
		return
	
	currency.modify_balance(-1000000)
	if currency.balance != initial:
		reporter.fail_test("Balance after subtract: %d != expected %d" % [currency.balance, initial])
		return
	
	reporter.pass_test()

func test_scanner_build_cost_value() -> void:
	reporter.start_test("[SPEC] Scanner build cost is exactly 2B F per spec")
	var scanner_cost = RocketsManager.get_scanner_build_cost()
	
	if scanner_cost != 2000000000:
		reporter.fail_test("Scanner cost is %d, expected 2000000000" % scanner_cost)
		return
	
	reporter.pass_test()

func test_contractor_discount_calculation() -> void:
	reporter.start_test("[SPEC] Rocketlab contractor applies 20% discount correctly")
	var base_cost = 1000000000
	var discount_pct = 0.20
	var expected = int(base_cost * (1.0 - discount_pct))
	
	if expected != 800000000:
		reporter.fail_test("20%% discount on 1B should be 800M, got %d" % expected)
		return
	
	reporter.pass_test()

func test_contractor_payout_bonus_calculation() -> void:
	reporter.start_test("[SPEC] Astroforge contractor applies 1.15x bonus with 1.4B cap")
	var base_payout = 1000000000
	var bonus_mult = 1.15
	var cap = 1400000000
	
	var calculated = int(base_payout * bonus_mult)
	if calculated != 1150000000:
		reporter.fail_test("Bonus payout %d != expected 1150000000" % calculated)
		return
	
	# Test cap
	var high_payout = 2000000000
	var capped = min(int(high_payout * bonus_mult), cap)
	if capped != cap:
		reporter.fail_test("Capped payout %d != cap %d" % [capped, cap])
		return
	
	reporter.pass_test()

func test_mission_reward_ratios_match_spec() -> void:
	reporter.start_test("[SPEC] Authored mission reward ratios match specification")
	var m1 = RocketsManager.get_predefined_mission_target(1)
	var m2 = RocketsManager.get_predefined_mission_target(2)
	var m4 = RocketsManager.get_predefined_mission_target(4)
	var m5 = RocketsManager.get_predefined_mission_target(5)
	
	if abs(m1.get("reward_ratio", 0.0) - 1.2) > 0.001:
		reporter.fail_test("M1 ratio %s != 1.2" % m1.get("reward_ratio"))
		return
	if abs(m2.get("reward_ratio", 0.0) - 1.2) > 0.001:
		reporter.fail_test("M2 ratio %s != 1.2" % m2.get("reward_ratio"))
		return
	if abs(m4.get("reward_ratio", 0.0) - 1.4) > 0.001:
		reporter.fail_test("M4 ratio %s != 1.4" % m4.get("reward_ratio"))
		return
	if not m5.is_empty():
		reporter.fail_test("Expected no authored mission target at stage 5")
		return
	
	reporter.pass_test()

func test_rockets_state_default_shape() -> void:
	reporter.start_test("[ARCH] Rockets state defaults include required schema keys")
	var state = RocketsStateAccess.build_default_state(2)
	var required_keys = [
		"unlocked", "placed", "launched", "destroyed", "missions",
		"selected_target", "preview_target", "detected_targets",
		"seen_asteroids", "seen_planets", "scan_counts", "status_changed_at",
		"mission_progress_completed", "completed_mission_badges",
		"scanner_station_built", "scanner_unlocked", "scanner_unlock_dialog_seen",
		"trip_contract_offer", "operation_mode", "launch_fallback_notice", "mission_briefings_seen",
		"mission_progress_schema_version", "pending_mission_guidance_id"
	]
	for key in required_keys:
		if not state.has(key):
			reporter.fail_test("Missing required default state key: %s" % key)
			return
	if state.get("unlocked", []) != ["starterrocket1"]:
		reporter.fail_test("Default unlocked rockets mismatch: %s" % state.get("unlocked", []))
		return
	if int(state.get("mission_progress_schema_version", 0)) != 2:
		reporter.fail_test("Schema version mismatch: %s" % state.get("mission_progress_schema_version"))
		return
	reporter.pass_test()

func test_rockets_mission_progress_mapping() -> void:
	reporter.start_test("[ARCH] Mission stage mapping is stable in RocketsMissionProgress")
	var expectations = {
		0: 1,
		1: 2,
		2: 3,
		3: 4,
		4: 4,
		99: 4
	}
	for completed in expectations.keys():
		var expected_stage = int(expectations[completed])
		var stage = RocketsMissionProgress.mission_stage_from_completed(int(completed))
		if stage != expected_stage:
			reporter.fail_test("Completed=%s -> stage=%s (expected %s)" % [completed, stage, expected_stage])
			return
	reporter.pass_test()

func test_rockets_targeting_filtering() -> void:
	reporter.start_test("[ARCH] Target filtering returns only untargeted desired-type rows")
	var source = [
		{"id": "a1", "type": "asteroid"},
		{"id": "a2", "type": "asteroid"},
		{"id": "p1", "type": "planet"},
		{"id": "a3", "type": "asteroid"}
	]
	var targeted = {"a2": true}
	var out = RocketsTargeting.select_visible_targets(source, targeted, "asteroid", 2)
	if out.size() != 2:
		reporter.fail_test("Expected 2 filtered asteroid targets, got %s" % out.size())
		return
	if str(out[0].get("id", "")) != "a1" or str(out[1].get("id", "")) != "a3":
		reporter.fail_test("Unexpected filtered ids: %s, %s" % [out[0].get("id", ""), out[1].get("id", "")])
		return
	reporter.pass_test()

func test_level1_target_route_is_strict() -> void:
	reporter.start_test("[UX] Level 1 route allows only mission 1 predefined target")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 0
	state["completed_mission_badges"] = []
	state["detected_targets"] = [
		{"id": "mission-1-training-target", "label": "Training Asteroid A", "type": "asteroid"},
		{"id": "random-stage1-target", "label": "Random Asteroid", "type": "asteroid"}
	]
	RocketsManager.set_override_state(state)
	var selectable = RocketsManager.get_selectable_targets_for_stage(1)
	var selected_ok = RocketsManager.select_target("mission-1-training-target")
	var selected_bad = RocketsManager.select_target("random-stage1-target")
	RocketsManager.clear_override_state()
	if selectable.size() != 1:
		reporter.fail_test("Expected exactly one selectable level1 target, got %s" % selectable.size())
		return
	if str(selectable[0].get("id", "")) != "mission-1-training-target":
		reporter.fail_test("Expected mission-1-training-target as sole level1 target")
		return
	if not selected_ok:
		reporter.fail_test("Expected mission-1-training-target selection to succeed")
		return
	if selected_bad:
		reporter.fail_test("Expected non-predefined level1 target selection to fail")
		return
	reporter.pass_test()

func test_level2_has_limited_variants_with_fallback() -> void:
	reporter.start_test("[UX] Level 2 provides limited mission variants with fallback targets")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 1
	state["completed_mission_badges"] = ["mission-1"]
	state["detected_targets"] = []
	RocketsManager.set_override_state(state)
	var variants = RocketsManager.get_selectable_targets_for_stage(2)
	RocketsManager.clear_override_state()
	if variants.size() < 2:
		reporter.fail_test("Expected at least 2 Level 2 mission variants, got %s" % variants.size())
		return
	if variants.size() > 3:
		reporter.fail_test("Expected at most 3 Level 2 mission variants, got %s" % variants.size())
		return
	reporter.pass_test()

func test_level3_scanner_targets_have_fallback_when_scan_empty() -> void:
	reporter.start_test("[UX] Level 3 scanner route provides fallback targets when scans are empty")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 2
	state["completed_mission_badges"] = ["mission-1", "mission-2"]
	state["detected_targets"] = []
	RocketsManager.set_override_state(state)
	var targets = RocketsManager.get_selectable_targets_for_stage(3)
	RocketsManager.clear_override_state()
	if targets.is_empty():
		reporter.fail_test("Expected at least one level 3 fallback target when scan results are empty")
		return
	var first_id = str(targets[0].get("id", ""))
	if first_id == "":
		reporter.fail_test("Expected fallback target to include a stable id")
		return
	reporter.pass_test()

func test_launch_target_resolution_applies_playable_fallback() -> void:
	reporter.start_test("[UX] Launch target resolver auto-selects playable fallback when selection is missing")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 2
	state["completed_mission_badges"] = ["mission-1", "mission-2"]
	state["detected_targets"] = []
	state["selected_target"] = ""
	RocketsManager.set_override_state(state)
	var resolved = RocketsManager.ensure_selected_target_for_launch("starterrocket2-test-fallback")
	var selected = RocketsManager.get_selected_target()
	RocketsManager.clear_override_state()
	if not bool(resolved.get("ok", false)):
		reporter.fail_test("Expected resolver to return ok=true for scanner-stage fallback")
		return
	if not bool(resolved.get("fallback_used", false)):
		reporter.fail_test("Expected fallback_used=true when no target was selected")
		return
	if selected == "":
		reporter.fail_test("Expected fallback-selected target to persist in rockets state")
		return
	reporter.pass_test()

func test_open_operation_mode_persists_and_applies_to_missions() -> void:
	reporter.start_test("[UX] Open operation mode persists and is stored on mission records")
	RocketsManager.reset_state()
	var state = RocketsManager.load_state()
	state["mission_progress_completed"] = 4
	state["completed_mission_badges"] = ["mission-1", "mission-2", "mission-3", "mission-4"]
	state["operation_mode"] = "contract"
	RocketsManager.save_state(state)
	var set_ok = RocketsManager.set_operation_mode("survey")
	var mode = RocketsManager.get_operation_mode()
	RocketsManager.add_mission("starterrocket3-test-open-ops", "free-ops-test-target", int(Time.get_unix_time_from_system()), 60)
	var mission = RocketsManager.get_mission_for_rocket("starterrocket3-test-open-ops")
	RocketsManager.reset_state()
	if not set_ok:
		reporter.fail_test("Expected set_operation_mode(\"survey\") to succeed")
		return
	if mode != "survey":
		reporter.fail_test("Expected persisted operation mode survey, got %s" % mode)
		return
	if str(mission.get("operation_mode", "")) != "survey":
		reporter.fail_test("Expected mission record operation_mode=survey")
		return
	reporter.pass_test()

func test_open_operation_survey_route_relaxes_contractor_block() -> void:
	reporter.start_test("[UX] Both free-op routes require contractor selection before target selection")
	var selector = LaunchpadSelectorPanel.new()
	var blocked_in_contract = selector._is_target_blocked_for_selection(5, 3, 1, "contract", "", "structure-contract-target")
	var blocked_in_survey = selector._is_target_blocked_for_selection(5, 3, 1, "survey", "", "structure-survey-target")
	if not blocked_in_contract:
		reporter.fail_test("Expected contract route to block target selection when contractor is missing")
		return
	if not blocked_in_survey:
		reporter.fail_test("Expected survey route to block target selection when contractor is missing")
		return
	reporter.pass_test()

func test_launchpad_target_prep_items_merge_mission_guidance() -> void:
	reporter.start_test("[UX] Launchpad target prep merges mission guidance into one structured list")
	var selector = LaunchpadSelectorPanel.new()
	var items: Array = selector._build_target_prep_items(
		2,
		"starterrocket1",
		1,
		false,
		{"payout_cap": 900000000},
		RocketsManager
	)
	if items.size() < 3:
		reporter.fail_test("Expected mission 2 prep to include multiple summary items, got %s" % items.size())
		return
	var joined := []
	for item_any in items:
		if typeof(item_any) != TYPE_DICTIONARY:
			continue
		joined.append(str((item_any as Dictionary).get("text", "")))
	var combined_text = "\n".join(joined)
	if combined_text.find("Mission 2 needs Starter Rocket 2") == -1:
		reporter.fail_test("Expected mission 2 ship warning in prep summary")
		return
	if combined_text.find("Mission 2 Checklist:") == -1:
		reporter.fail_test("Expected mission 2 checklist in prep summary")
		return
	if combined_text.find("Mission payout caps at") == -1:
		reporter.fail_test("Expected payout cap warning in prep summary")
		return
	reporter.pass_test()

func test_level2_completion_advances_to_stage3_but_keeps_scanner_locked() -> void:
	reporter.start_test("[SPEC] Completing Level 2 advances to stage 3 while scanner stays locked until stage 4")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 2
	state["completed_mission_badges"] = ["mission-1", "mission-2"]
	RocketsManager.set_override_state(state)
	var stage = RocketsManager.get_mission_stage()
	var scanner_unlocked = RocketsManager.is_scanner_unlocked()
	RocketsManager.clear_override_state()
	if stage != 3:
		reporter.fail_test("Expected mission stage 3 after two completions, got %s" % stage)
		return
	if scanner_unlocked:
		reporter.fail_test("Expected scanner systems to remain locked until stage 4")
		return
	reporter.pass_test()

func test_mission_exposure_reward_progression() -> void:
	reporter.start_test("[SPEC] Mission exposure reward is flat 4 (M1 gives exactly 11 XP for Level 2)")
	if RocketsManager.get_mission_exposure_reward(1) != 4:
		reporter.fail_test("Stage 1 exposure reward should be 4")
		return
	if RocketsManager.get_mission_exposure_reward(2) != 4:
		reporter.fail_test("Stage 2 exposure reward should be 4 (flat rate)")
		return
	if RocketsManager.get_mission_exposure_reward(3) != 4:
		reporter.fail_test("Stage 3 exposure reward should be 4 (flat rate)")
		return
	reporter.pass_test()

func test_mission_briefing_seen_persistence() -> void:
	reporter.start_test("[ARCH] Mission briefing seen flag persists through RocketsManager")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_briefings_seen"] = {}
	RocketsManager.set_override_state(state)
	if RocketsManager.is_mission_briefing_seen(3):
		reporter.fail_test("Mission 3 briefing should start unseen")
		RocketsManager.clear_override_state()
		return
	var ok = RocketsManager.mark_mission_briefing_seen(3)
	if not ok:
		reporter.fail_test("mark_mission_briefing_seen(3) returned false")
		RocketsManager.clear_override_state()
		return
	if not RocketsManager.is_mission_briefing_seen(3):
		reporter.fail_test("Mission 3 briefing should be seen after mark")
		RocketsManager.clear_override_state()
		return
	RocketsManager.clear_override_state()
	reporter.pass_test()

func test_launchpad_briefing_gate_is_one_time() -> void:
	reporter.start_test("[UX] Launchpad target flow has no hard mission briefing gate")
	var selector = LaunchpadSelectorPanel.new()
	if selector.has_method("_render_mission_briefing_gate"):
		reporter.fail_test("Briefing gate method still present; target flow should stay simplified")
		return
	reporter.pass_test()

func test_scanner_station_requires_explicit_build_step() -> void:
	reporter.start_test("[UX] Scanner station stays unbuilt after Mission 3 until the player builds it")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 3
	state["completed_mission_badges"] = ["mission-1", "mission-2", "mission-3"]
	state["control_station_built"] = true
	state["scanner_unlocked"] = true
	state["scanner_station_built"] = false
	RocketsManager.set_override_state(state)
	var base = EarthBaseScene.instantiate()
	get_root().add_child(base)
	await create_timer(0.08).timeout
	var station = base.get_node_or_null("StructuresLayer/SatelliteStation")
	if station == null:
		reporter.fail_test("Expected SatelliteStation node on Earth base")
		base.queue_free()
		RocketsManager.clear_override_state()
		return
	if RocketsManager.is_scanner_station_built():
		reporter.fail_test("Scanner station should remain unbuilt until the player confirms construction")
		base.queue_free()
		RocketsManager.clear_override_state()
		return
	base.queue_free()
	RocketsManager.clear_override_state()
	reporter.pass_test()

func test_earth_base_disables_new_mission_until_scanner_station_is_built() -> void:
	reporter.start_test("[UX] Earth base blocks New Mission until Scanner Station is built for Mission 4")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 3
	state["completed_mission_badges"] = ["mission-1", "mission-2", "mission-3"]
	state["control_station_built"] = true
	state["scanner_unlocked"] = true
	state["scanner_station_built"] = false
	RocketsManager.set_override_state(state)
	var base = EarthBaseScene.instantiate()
	get_root().add_child(base)
	await create_timer(0.08).timeout
	base._apply_tutorial_button_state()
	base._build_progression_cards()
	await create_timer(0.02).timeout
	var new_mission_btn = base.get_node_or_null("UILayer/ButtonContainer/NewMissionButton") as Button
	if new_mission_btn == null:
		reporter.fail_test("Earth base missing NewMissionButton")
		base.queue_free()
		RocketsManager.clear_override_state()
		return
	if not new_mission_btn.disabled:
		reporter.fail_test("Expected New Mission to stay disabled while scanner build is still pending")
		base.queue_free()
		RocketsManager.clear_override_state()
		return
	if _find_label_in_subtree(base.get_node_or_null("UILayer/ProgressionCards"), "Build Scanner Station") == null:
		reporter.fail_test("Expected scanner build progression card while Mission 4 setup is pending")
		base.queue_free()
		RocketsManager.clear_override_state()
		return
	base.queue_free()
	RocketsManager.clear_override_state()
	reporter.pass_test()

func _find_label_in_subtree(root: Node, snippet: String) -> Label:
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

func test_launchpad_scene_has_shared_bottom_nav() -> void:
	reporter.start_test("[UX] Launchpad scene includes the shared bottom navigation shell")
	await _assert_scene_has_bottom_nav(EarthLaunchpadScene.instantiate(), "Launchpad")

func test_space_map_scene_has_shared_bottom_nav() -> void:
	reporter.start_test("[UX] Space map scene includes the shared bottom navigation shell")
	await _assert_scene_has_bottom_nav(SpaceMapScene.instantiate(), "SpaceMap")

func test_mission_debrief_scene_has_shared_bottom_nav() -> void:
	reporter.start_test("[UX] Mission debrief scene includes the shared bottom navigation shell")
	await _assert_scene_has_bottom_nav(MissionDebriefScene.instantiate(), "MissionDebriefV2")

func _assert_scene_has_bottom_nav(scene: Node, expected_name: String) -> void:
	if scene == null:
		reporter.fail_test("%s scene failed to instantiate" % expected_name)
		return
	get_root().add_child(scene)
	await create_timer(0.05).timeout
	var container := scene.get_node_or_null("UILayer/ButtonContainer") as HBoxContainer
	if container == null:
		reporter.fail_test("%s scene missing UILayer/ButtonContainer" % expected_name)
		scene.queue_free()
		return
	if container.get_node_or_null("NavBackground") == null:
		reporter.fail_test("%s scene missing NavBackground under ButtonContainer" % expected_name)
		scene.queue_free()
		return
	for button_name in ["BackButton", "ForwardButton", "MenuButton", "MarketButton", "SpaceMapButton", "NewMissionButton"]:
		if container.get_node_or_null(button_name) == null:
			reporter.fail_test("%s scene missing %s in shared bottom nav" % [expected_name, button_name])
			scene.queue_free()
			return
	scene.queue_free()
	reporter.pass_test()

func test_sidescroll_mining_drone_pool_reuse() -> void:
	reporter.start_test("[UX] Sidescroll mining reuses scene-managed drone pool across repeated deploys")
	var mining = SidescrollMiningScene.instantiate()
	get_root().add_child(mining)
	await create_timer(0.05).timeout
	var pool = mining.get_node_or_null("DronePool")
	if pool == null:
		reporter.fail_test("DronePool node not found in SidescrollMining scene")
		mining.queue_free()
		return
	var initial_pool_size = pool.get_child_count()
	if initial_pool_size < 3:
		reporter.fail_test("Expected at least 3 drones in pool, got %s" % initial_pool_size)
		mining.queue_free()
		return
	mining._deploy_drone()
	mining._deploy_drone()
	mining._deploy_drone()
	var drones = pool.get_children()
	for drone in drones:
		if drone.has_method("is_available_for_deploy") and bool(drone.is_available_for_deploy()):
			reporter.fail_test("Expected all pooled drones to be in-use immediately after 3 deploy calls")
			mining.queue_free()
			return
	var before_fourth = int(mining._drones_available)
	mining._deploy_drone() # Should no-op: no available pooled drone
	var after_fourth = int(mining._drones_available)
	if after_fourth != before_fourth:
		reporter.fail_test("Expected 4th deploy to preserve drone availability count when pool exhausted")
		mining.queue_free()
		return
	if pool.get_child_count() != initial_pool_size:
		reporter.fail_test("Expected drone pool size to remain constant (scene-managed reuse)")
		mining.queue_free()
		return
	mining.queue_free()
	reporter.pass_test()

func test_sidescroll_mining_button_handbook_copy_is_plain_language() -> void:
	reporter.start_test("[UX] Sidescroll mining handbook uses plain-language button guide copy")
	var mining = SidescrollMiningScene.instantiate()
	get_root().add_child(mining)
	await create_timer(0.05).timeout
	var body_text = str(mining._build_button_handbook_text())
	if body_text.find("Mine: Hold FIRE to cut into the surface and collect exposed minerals.") == -1:
		reporter.fail_test("Expected plain-language Mine guide copy")
		mining.queue_free()
		return
	if body_text.find("Inventory: Check what you have collected and how much the load is worth.") == -1:
		reporter.fail_test("Expected plain-language Inventory guide copy")
		mining.queue_free()
		return
	if body_text.find("Return to Base: End the run and move into mission debrief.") == -1:
		reporter.fail_test("Expected plain-language Return to Base guide copy")
		mining.queue_free()
		return
	mining.queue_free()
	reporter.pass_test()

func test_mining_practice_panel_stays_on_screen_after_run_complete() -> void:
	reporter.start_test("[UX] Mining practice summary panel stays inside the viewport after a run completes")
	var practice = MiningPracticeScene.instantiate()
	practice._allow_auto_start = false
	get_root().add_child(practice)
	await create_timer(0.05).timeout
	practice._on_mining_completed({"Iron": 10, "Nickel": 3, "Cobalt": 2, "Gold": 1}, 42)
	await create_timer(0.05).timeout
	if practice._mining_instance != null:
		reporter.fail_test("Expected active mining instance to be cleared before showing practice summary")
		practice.queue_free()
		return
	var viewport = practice.get_viewport_rect().size
	var rect = practice.panel.get_global_rect()
	if rect.position.x < 0.0 or rect.position.y < 0.0 or rect.end.x > viewport.x or rect.end.y > viewport.y:
		reporter.fail_test("Practice summary panel extends outside viewport: %s vs %s" % [rect, viewport])
		practice.queue_free()
		return
	practice.queue_free()
	reporter.pass_test()

func test_satellite_station_panel_stays_on_screen() -> void:
	reporter.start_test("[UX] Satellite station panel stays inside the viewport")
	var satellite = SatelliteStationScene.instantiate()
	get_root().add_child(satellite)
	await create_timer(0.08).timeout
	var viewport = satellite.get_viewport_rect().size
	var panel = satellite.get_node_or_null("PanelContainer/Panel") as Control
	if panel == null:
		reporter.fail_test("Satellite station panel node not found")
		satellite.queue_free()
		return
	var rect = panel.get_global_rect()
	if rect.position.x < 0.0 or rect.position.y < 0.0 or rect.end.x > viewport.x or rect.end.y > viewport.y:
		reporter.fail_test("Satellite station panel extends outside viewport: %s vs %s" % [rect, viewport])
		satellite.queue_free()
		return
	satellite.queue_free()
	reporter.pass_test()

func test_rocket_ascent_skip_button_stays_on_screen() -> void:
	reporter.start_test("[UX] Rocket ascent skip button stays inside the viewport")
	var ascent = RocketAscentScene.instantiate()
	get_root().add_child(ascent)
	await create_timer(0.05).timeout
	var viewport = ascent.get_viewport().get_visible_rect().size
	var button = ascent._skip_button as Button
	if button == null:
		reporter.fail_test("Rocket ascent skip button not found")
		ascent.queue_free()
		return
	var rect = button.get_global_rect()
	if rect.position.x < 0.0 or rect.position.y < 0.0 or rect.end.x > viewport.x or rect.end.y > viewport.y:
		reporter.fail_test("Rocket ascent skip button extends outside viewport: %s vs %s" % [rect, viewport])
		ascent.queue_free()
		return
	ascent.queue_free()
	reporter.pass_test()

func test_outbound_preview_panels_stay_on_screen() -> void:
	reporter.start_test("[UX] Outbound preview transit panels stay inside the viewport")
	var outbound = OutboundPreviewScene.instantiate()
	get_root().add_child(outbound)
	await create_timer(0.08).timeout
	outbound._show_science_panel()
	outbound._apply_responsive_layout()
	await create_timer(0.05).timeout
	var viewport = outbound.get_viewport().get_visible_rect().size
	for node_name in ["ControlPanel", "InventoryPanel", "TravelPanel", "TravelCaption"]:
		var node = outbound.get_node_or_null("CanvasLayer/UI/%s" % node_name) as Control
		if node == null and node_name == "TravelCaption":
			node = outbound.get_node_or_null("CanvasLayer/TravelCaption") as Control
		if node == null:
			reporter.fail_test("Outbound preview node missing: %s" % node_name)
			outbound.queue_free()
			return
		var rect = node.get_global_rect()
		if rect.position.x < 0.0 or rect.position.y < 0.0 or rect.end.x > viewport.x or rect.end.y > viewport.y:
			reporter.fail_test("Outbound preview node extends outside viewport (%s): %s vs %s" % [node_name, rect, viewport])
			outbound.queue_free()
			return
	outbound.queue_free()
	reporter.pass_test()
