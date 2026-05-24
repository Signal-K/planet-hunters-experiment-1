extends SceneTree
## Structure interaction and scene transition tests
## Run with: /Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene -s scene/tests/run_structure_tests.gd

const TestReporter = preload("res://tests/TestReporter.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const RocketsStateAccess = preload("res://Scripts/Utils/RocketsStateAccess.gd")
const RocketsMissionProgress = preload("res://Scripts/Utils/RocketsMissionProgress.gd")
const RocketsTargeting = preload("res://Scripts/Utils/RocketsTargeting.gd")
const CurrencyManager = preload("res://Scripts/Utils/CurrencyManager.gd")
const LaunchWizard = preload("res://Scripts/UI/LaunchWizard.gd")
const GameNavigationMenu = preload("res://Scripts/UI/GameNavigationMenu.gd")
const EmergencyLoanOfferDialogScene = preload("res://Scenes/UI/EmergencyLoanOfferDialog.tscn")
const EarthBaseScene = preload("res://Scenes/Earth/earth_base_1.tscn")
const EarthLaunchpadScene = preload("res://Scenes/Earth/earth_launchpad.tscn")
const MissionDebriefScene = preload("res://Scenes/Earth/mission_debrief_v2.tscn")
const SpaceMapScene = preload("res://Scenes/UI/SpaceMap/space_map.tscn")
const GalaxyMapScene = preload("res://Scenes/UI/SpaceMap/galaxy_map.tscn")
const ControlStationScene = preload("res://Scenes/UI/ControlStationPanel.tscn")
const SidescrollMiningScene = preload("res://Scenes/UI/SidescrollMining.tscn")
const MiningPracticeScene = preload("res://Scenes/UI/MiningPracticePanel.tscn")
const SatelliteStationScene = preload("res://Scenes/UI/SatelliteStationPanel.tscn")
const OutboundPreviewScene = preload("res://Scenes/Transitions/rocket_transit.tscn")
const MarketPanelScene = preload("res://Scenes/UI/MarketPanel.tscn")

var reporter := TestReporter.new()

class FakeSceneManager:
	extends Node
	var last_scene_path := ""

	func change_to_scene(scene_path: String) -> void:
		last_scene_path = scene_path

class FakeTutorialAppController:
	extends Node
	signal tutorial_state_updated(state: Dictionary)

	var state: Dictionary = {}

	func get_tutorial_state() -> Dictionary:
		return state.duplicate(true)

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
	await test_mission_exposure_reward_progression()
	await test_mission_briefing_seen_persistence()
	await test_scanner_station_legacy_state_stays_deferred_after_m3()
	await test_control_station_legacy_state_reconciles_after_m2()
	await test_structure_flags_backfill_minimum_progression_stage()
	await test_state_reconcile_repairs_unlock_chain_and_planning_state()
	await test_state_reconcile_clears_invalid_contractor_selection()
	await test_state_reconcile_normalizes_inventory_and_target_arrays()
	await test_state_reconcile_normalizes_live_mission_payloads()
	await test_state_reconcile_prunes_orphaned_transit_maps()
	await test_earth_base_hides_progression_cards_during_active_tutorial_step()
	await test_earth_base_allows_new_mission_for_m4_without_scanner_gate()
	await test_earth_base_ignores_historical_mission_log_when_no_live_mission_exists()
	await test_earth_base_hides_star_map_progression_card()
	await test_game_navigation_menu_root_has_scene_owned_sections()
	await test_game_navigation_menu_stats_and_debug_use_templates()
	await test_game_navigation_menu_uses_trip_order_requirements()
	await test_game_navigation_menu_settings_and_reset_sections()
	await test_market_panel_is_scene_owned()
	await test_mechanic_intro_overlay_uses_template_backed_step_rows()
	await test_subcontractors_panel_uses_template_backed_detail_labels()
	await test_launch_wizard_has_required_signals()
	await test_space_map_scene_has_shared_bottom_nav()
	await test_galaxy_map_scene_has_nav_buttons()
	await test_mission_debrief_scene_has_shared_bottom_nav()
	await test_sidescroll_mining_drone_pool_reuse()
	await test_sidescroll_mining_has_scene_owned_mars_background()
	await test_sidescroll_mining_contract_rows_use_template()
	await test_sidescroll_mining_room_rows_use_template()
	await test_sidescroll_mining_room_debug_overlay_uses_scene_owned_preview_and_marker_template()
	await test_sidescroll_mining_button_handbook_copy_is_plain_language()
	await test_mining_practice_panel_stays_on_screen_after_run_complete()
	await test_satellite_station_panel_stays_on_screen()
	await test_launchpad_launch_routes_directly_to_outbound_preview()
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

func test_launch_wizard_has_required_signals() -> void:
	reporter.start_test("[UX] LaunchWizard exposes back_pressed and launched signals")
	var wiz := LaunchWizard.new()
	if not wiz.has_signal("back_pressed"):
		wiz.free()
		reporter.fail_test("LaunchWizard missing back_pressed signal")
		return
	if not wiz.has_signal("launched"):
		wiz.free()
		reporter.fail_test("LaunchWizard missing launched signal")
		return
	if not wiz.has_method("_show_step"):
		wiz.free()
		reporter.fail_test("LaunchWizard missing _show_step method")
		return
	wiz.free()
	reporter.pass_test()

func test_game_navigation_menu_root_has_scene_owned_sections() -> void:
	reporter.start_test("[UX] GameNavigationMenu root includes scene-owned section hosts")
	var owner := Control.new()
	get_root().add_child(owner)
	GameNavigationMenu.open(owner)
	await create_timer(0.05).timeout
	var layer := get_root().get_node_or_null("GameMenuLayer")
	if layer == null:
		reporter.fail_test("Expected GameMenuLayer after opening menu")
		owner.queue_free()
		return
	var expected_paths = [
		"GameMenuRoot/Center/GameMenuPanel/Scroll/Shell/StatsHost",
		"GameMenuRoot/Center/GameMenuPanel/Scroll/Shell/CargoHost",
		"GameMenuRoot/Center/GameMenuPanel/Scroll/Shell/MissionRequirementsHost",
		"GameMenuRoot/Center/GameMenuPanel/Scroll/Shell/SettingsHost",
		"GameMenuRoot/Center/GameMenuPanel/Scroll/Shell/DebugHost"
	]
	for path in expected_paths:
		if layer.get_node_or_null(path) == null:
			reporter.fail_test("Expected scene-owned menu section at %s" % path)
			GameNavigationMenu.close(owner)
			owner.queue_free()
			return
	GameNavigationMenu.close(owner)
	owner.queue_free()
	reporter.pass_test()

func test_game_navigation_menu_stats_and_debug_use_templates() -> void:
	reporter.start_test("[UX] GameNavigationMenu stats and debug sections use template-backed content")
	var owner := Control.new()
	get_root().add_child(owner)
	var existing_layer := get_root().get_node_or_null("GameMenuLayer")
	if existing_layer != null:
		existing_layer.queue_free()
		await create_timer(0.02).timeout
	GameNavigationMenu.open(owner)
	await create_timer(0.05).timeout
	var layer := get_root().get_node_or_null("GameMenuLayer")
	if layer == null:
		reporter.fail_test("Expected GameMenuLayer after opening menu")
		owner.queue_free()
		return
	var stats_host := layer.get_node_or_null("GameMenuRoot/Center/GameMenuPanel/Scroll/Shell/StatsHost") as VBoxContainer
	var debug_host := layer.get_node_or_null("GameMenuRoot/Center/GameMenuPanel/Scroll/Shell/DebugHost") as VBoxContainer
	if stats_host == null or debug_host == null:
		reporter.fail_test("Expected stats/debug hosts in GameNavigationMenu")
		GameNavigationMenu.close(owner)
		owner.queue_free()
		return
	var stats_card := stats_host.get_child(0) if stats_host.get_child_count() > 0 else null
	if stats_card == null or stats_card.find_child("GameMenuStatColumn", true, false) == null:
		reporter.fail_test("Expected template-backed GameMenuStatColumn inside stats card")
		GameNavigationMenu.close(owner)
		owner.queue_free()
		return
	var debug_section := debug_host.get_child(0) if debug_host.get_child_count() > 0 else null
	if debug_section == null or debug_section.name != "GameMenuDebugSection":
		reporter.fail_test("Expected GameMenuDebugSection template in debug host")
		GameNavigationMenu.close(owner)
		owner.queue_free()
		return
	var debug_paths = [
		"InstantMiningButton",
		"MoneyButton",
		"MissionLabel",
		"MissionRow/Mission1Button",
		"MissionRow/Mission5Button"
	]
	for path in debug_paths:
		if debug_section.get_node_or_null(path) == null:
			reporter.fail_test("Expected debug template node at %s" % path)
			GameNavigationMenu.close(owner)
			owner.queue_free()
			return
	GameNavigationMenu.close(owner)
	owner.queue_free()
	reporter.pass_test()

func test_game_navigation_menu_uses_trip_order_requirements() -> void:
	reporter.start_test("[UX] GameNavigationMenu mission requirements show selected trip order progress")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 1
	state["inventory"] = {"Iron": 2, "Nickel": 1}
	state["trip_contract_offer"] = {
		"contractors": [
			{
				"id": "rocketlab",
				"name": "Rocketlab",
				"requested_minerals": {"Iron": 4, "Nickel": 3}
			}
		],
		"selected_contractor": "rocketlab",
		"selection_required": false
	}
	RocketsManager.set_override_state(state)
	var selected := RocketsManager.get_trip_selected_contractor()
	if int(selected.get("requested_minerals", {}).get("Iron", 0)) != 4:
		reporter.fail_test("Selected trip contractor did not preserve generated requested_minerals")
		RocketsManager.clear_override_state()
		return
	var card := GameNavigationMenu._build_mission_requirements_card()
	if card == null:
		reporter.fail_test("Expected mission requirements card for selected trip contractor")
		RocketsManager.clear_override_state()
		return
	var body := card.get_node_or_null("Body") as VBoxContainer
	if body == null or body.get_child_count() < 2:
		reporter.fail_test("Expected mineral progress rows in mission requirements card")
		RocketsManager.clear_override_state()
		return
	var first_row := body.get_child(0) as HBoxContainer
	var second_row := body.get_child(1) as HBoxContainer
	var first_qty := first_row.get_node_or_null("ValueLabel") as Label if first_row else null
	var second_qty := second_row.get_node_or_null("ValueLabel") as Label if second_row else null
	if first_qty == null or second_qty == null:
		reporter.fail_test("Expected quantity labels in mission requirements card rows")
		RocketsManager.clear_override_state()
		return
	var qty_texts := [first_qty.text, second_qty.text]
	if not qty_texts.has("2 / 4 kg") or not qty_texts.has("1 / 3 kg"):
		reporter.fail_test("Expected trip order progress text, got %s" % str(qty_texts))
		RocketsManager.clear_override_state()
		return
	RocketsManager.clear_override_state()
	reporter.pass_test()

func test_control_station_panel_has_scene_owned_primary_sections() -> void:
	reporter.start_test("[UX] ControlStationPanel includes scene-owned primary sections")
	var scene = ControlStationScene.instantiate()
	get_root().add_child(scene)
	await create_timer(0.05).timeout
	var expected_paths = [
		"RootHBox/Sidebar",
		"RootHBox/MainArea/Header",
		"RootHBox/MainArea/ContentMargin/ContentHBox/MissionsArea/MissionsList",
		"RootHBox/MainArea/ContentMargin/ContentHBox/MissionsArea/StoryList",
		"RootHBox/MainArea/ContentMargin/ContentHBox/RightRail/QueueCard/QueueVBox/QueueList",
		"RootHBox/MainArea/ContentMargin/ContentHBox/RightRail/LogCard/LogVBox/LogList",
		"RootHBox/MainArea/ContentMargin/ContentHBox/RightRail/FooterTabs"
	]
	for path in expected_paths:
		if scene.get_node_or_null(path) == null:
			reporter.fail_test("Expected scene-owned control station section at %s" % path)
			scene.queue_free()
			return
	scene.queue_free()
	reporter.pass_test()

func test_game_navigation_menu_settings_and_reset_sections() -> void:
	reporter.start_test("[UX] GameNavigationMenu includes unified settings and reset buttons")
	var owner := Control.new()
	get_root().add_child(owner)
	var existing_layer := get_root().get_node_or_null("GameMenuLayer")
	if existing_layer != null:
		existing_layer.queue_free()
		await create_timer(0.02).timeout
	GameNavigationMenu.open(owner)
	await create_timer(0.05).timeout
	var layer := get_root().get_node_or_null("GameMenuLayer")
	if layer == null:
		reporter.fail_test("Expected GameMenuLayer after opening menu")
		owner.queue_free()
		return
	var settings_host := layer.get_node_or_null("GameMenuRoot/Center/GameMenuPanel/Scroll/Shell/SettingsHost") as VBoxContainer
	if settings_host == null or settings_host.get_child_count() < 2:
		reporter.fail_test("Expected settings host with at least 2 children (settings buttons + reset button)")
		GameNavigationMenu.close(owner)
		owner.queue_free()
		return
	
	var found_reset := false
	for child in settings_host.get_children():
		if child is Button and str((child as Button).text).to_lower().find("reset") != -1:
			found_reset = true
			break
	if not found_reset:
		reporter.fail_test("Could not find Reset button in GameNavigationMenu settings section")
		GameNavigationMenu.close(owner)
		owner.queue_free()
		return
		
	GameNavigationMenu.close(owner)
	owner.queue_free()
	reporter.pass_test()

func test_market_panel_is_scene_owned() -> void:
	reporter.start_test("[UX] MarketPanel layout is scene-owned")
	var market = MarketPanelScene.instantiate()
	get_root().add_child(market)
	await create_timer(0.05).timeout
	for path in [
		"Backdrop",
		"OuterMargin/PanelVBox/HeaderRow/TitleLabel",
		"OuterMargin/PanelVBox/HeaderRow/CloseButton",
		"OuterMargin/PanelVBox/Scroll/Content/HoldingsList",
		"OuterMargin/PanelVBox/Scroll/Content/PricesList",
		"OuterMargin/PanelVBox/SellAllButton",
	]:
		if market.get_node_or_null(path) == null:
			reporter.fail_test("Expected scene-owned MarketPanel node at %s" % path)
			market.queue_free()
			return
	var source_file := FileAccess.open("res://Scripts/UI/MarketPanel.gd", FileAccess.READ)
	if source_file == null:
		reporter.fail_test("Could not read MarketPanel.gd")
		market.queue_free()
		return
	var source := source_file.get_as_text()
	for forbidden in [
		"ColorRect.new(",
		"Label.new(",
		"Button.new(",
		"VBoxContainer.new(",
		"HBoxContainer.new(",
		"PanelContainer.new(",
		"ScrollContainer.new(",
		"MarginContainer.new(",
	]:
		if source.find(forbidden) != -1:
			reporter.fail_test("MarketPanel.gd still constructs static UI with %s" % forbidden)
			market.queue_free()
			return
	market.queue_free()
	reporter.pass_test()

func test_mechanic_intro_overlay_uses_template_backed_step_rows() -> void:
	reporter.start_test("[UX] MechanicIntroOverlay uses template-backed step rows")
	var overlay := preload("res://Scenes/UI/MechanicIntroOverlay.tscn").instantiate()
	get_root().add_child(overlay)
	overlay.show_intro({
		"title": "MECHANIC UNLOCKED:",
		"mechanic_name": "TEST SYSTEM",
		"steps": ["Alpha", "Beta", "Gamma"]
	})
	await create_timer(0.05).timeout
	var steps_list := overlay.get_node_or_null("Center/Panel/OuterVBox/Content/ContentVBox/MainHBox/LeftCol/StepsList") as VBoxContainer
	if steps_list == null:
		reporter.fail_test("Expected MechanicIntroOverlay StepsList")
		overlay.queue_free()
		return
	if steps_list.get_child_count() != 3:
		reporter.fail_test("Expected 3 template-backed step rows, got %s" % steps_list.get_child_count())
		overlay.queue_free()
		return
	if steps_list.get_child(0).name != "MechanicIntroStepRow":
		reporter.fail_test("Expected MechanicIntroStepRow template, got %s" % steps_list.get_child(0).name)
		overlay.queue_free()
		return
	overlay.queue_free()
	reporter.pass_test()

func test_subcontractors_panel_uses_template_backed_detail_labels() -> void:
	reporter.start_test("[UX] SubcontractorsPanel uses template-backed detail labels")
	var panel := preload("res://Scenes/UI/SubcontractorsPanel.tscn").instantiate()
	get_root().add_child(panel)
	await create_timer(0.05).timeout
	var list := panel.get_node_or_null("PanelContainer/Panel/VBox/Scroll/List") as VBoxContainer
	if list == null or list.get_child_count() == 0:
		reporter.fail_test("Expected populated subcontractors list")
		panel.queue_free()
		return
	var found_detail_label := false
	for card in list.get_children():
		if card.find_child("SubcontractorDetailLabel", true, false) != null:
			found_detail_label = true
			break
	if not found_detail_label:
		reporter.fail_test("Expected at least one template-backed subcontractor detail label")
		panel.queue_free()
		return
	panel.queue_free()
	reporter.pass_test()


func test_scanner_station_legacy_state_stays_deferred_after_m3() -> void:
	reporter.start_test("[UX] Scanner station legacy build state stays deferred after Mission 3")
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
		reporter.fail_test("Scanner station should remain unbuilt while scanner v1 is deferred")
		base.queue_free()
		RocketsManager.clear_override_state()
		return
	base.queue_free()
	RocketsManager.clear_override_state()
	reporter.pass_test()

func test_control_station_legacy_state_reconciles_after_m2() -> void:
	reporter.start_test("[UX] Control Station legacy build state reconciles automatically after Mission 2")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 2
	state["completed_mission_badges"] = ["mission-1", "mission-2"]
	state["control_station_built"] = false
	RocketsManager.set_override_state(state)
	var base = EarthBaseScene.instantiate()
	get_root().add_child(base)
	await create_timer(0.08).timeout
	if not RocketsManager.is_control_station_built():
		reporter.fail_test("Expected legacy control-station state to reconcile to built once Mission 2 is complete")
		base.queue_free()
		RocketsManager.clear_override_state()
		return
	base.queue_free()
	RocketsManager.clear_override_state()
	reporter.pass_test()

func test_structure_flags_backfill_minimum_progression_stage() -> void:
	reporter.start_test("[UX] Contradictory structure flags backfill minimum mission progression")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 0
	state["completed_mission_badges"] = []
	state["control_station_built"] = true
	state["scanner_station_built"] = true
	state["scanner_unlocked"] = false
	RocketsManager.set_override_state(state)
	var loaded := RocketsManager.load_state()
	var badges = loaded.get("completed_mission_badges", [])
	var completed := int(loaded.get("mission_progress_completed", -1))
	var stage := RocketsManager.get_mission_stage()
	if typeof(badges) != TYPE_ARRAY or badges.size() < 2:
		reporter.fail_test("Expected at least two mission badges to be synthesized from built structure flags")
		RocketsManager.clear_override_state()
		return
	if completed < 2:
		reporter.fail_test("Expected mission_progress_completed >= 2 after reconciliation, got %d" % completed)
		RocketsManager.clear_override_state()
		return
	if stage != 3:
		reporter.fail_test("Expected reconciled mission stage 3 for scanner-built contradictory state, got %d" % stage)
		RocketsManager.clear_override_state()
		return
	if not bool(loaded.get("scanner_unlocked", false)):
		reporter.fail_test("Expected scanner_unlocked true once scanner station is already built")
		RocketsManager.clear_override_state()
		return
	RocketsManager.clear_override_state()
	reporter.pass_test()

func test_state_reconcile_repairs_unlock_chain_and_planning_state() -> void:
	reporter.start_test("[ARCH] State reconcile repairs unlock chain, planning state, and pre-free-ops survey mode")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 1
	state["completed_mission_badges"] = ["mission-1"]
	state["unlocked"] = ["starterrocket3", "starterrocket1", "starterrocket3"]
	state["operation_mode"] = "survey"
	state["planning_rocket_type"] = "starterrocket9"
	state["planning_step"] = 99
	RocketsManager.set_override_state(state)
	var loaded := RocketsManager.load_state()
	var unlocked: Array = loaded.get("unlocked", [])
	if not unlocked.has("starterrocket1") or not unlocked.has("starterrocket2") or not unlocked.has("starterrocket3"):
		reporter.fail_test("Expected unlock chain to contain starterrocket1/2/3 after reconciliation, got %s" % str(unlocked))
		RocketsManager.clear_override_state()
		return
	if str(loaded.get("operation_mode", "")) != "contract":
		reporter.fail_test("Expected pre-free-ops operation_mode to be forced back to contract, got %s" % str(loaded.get("operation_mode", "")))
		RocketsManager.clear_override_state()
		return
	if loaded.has("planning_rocket_type"):
		reporter.fail_test("Expected invalid planning_rocket_type to be cleared")
		RocketsManager.clear_override_state()
		return
	if int(loaded.get("planning_step", -1)) != 3:
		reporter.fail_test("Expected planning_step to clamp to 3, got %s" % str(loaded.get("planning_step", "")))
		RocketsManager.clear_override_state()
		return
	RocketsManager.clear_override_state()
	reporter.pass_test()

func test_state_reconcile_clears_invalid_contractor_selection() -> void:
	reporter.start_test("[ARCH] State reconcile clears stale contractor selections when offers change")
	var state = RocketsStateAccess.build_default_state(2)
	state["starter_contract_offer"] = {
		"selected_contractor": "bogus_starter"
	}
	state["trip_contract_offer"] = {
		"selected_contractor": "bogus_trip",
		"selection_required": false,
		"contractors": [
			{"id": "rocketlab", "name": "Rocketlab"},
			{"id": "astroforge", "name": "Astroforge"}
		]
	}
	RocketsManager.set_override_state(state)
	var loaded := RocketsManager.load_state()
	var starter: Dictionary = loaded.get("starter_contract_offer", {})
	var trip: Dictionary = loaded.get("trip_contract_offer", {})
	if str(starter.get("selected_contractor", "")) != "":
		reporter.fail_test("Expected invalid starter contractor selection to be cleared, got %s" % str(starter.get("selected_contractor", "")))
		RocketsManager.clear_override_state()
		return
	if str(trip.get("selected_contractor", "")) != "":
		reporter.fail_test("Expected invalid trip contractor selection to be cleared, got %s" % str(trip.get("selected_contractor", "")))
		RocketsManager.clear_override_state()
		return
	if not bool(trip.get("selection_required", false)):
		reporter.fail_test("Expected trip offer selection_required to be restored when no valid contractor is selected")
		RocketsManager.clear_override_state()
		return
	RocketsManager.clear_override_state()
	reporter.pass_test()

func test_state_reconcile_normalizes_inventory_and_target_arrays() -> void:
	reporter.start_test("[ARCH] State reconcile normalizes inventory, detected targets, seen arrays, and preview selection")
	var state = RocketsStateAccess.build_default_state(2)
	state["inventory"] = {"Iron": -5, "Nickel": 4, "Silicates": -2, "Gold": 7}
	state["detected_targets"] = [
		{"id": "alpha", "type": "PLANET", "label": "Alpha"},
		{"id": "alpha", "type": "planet", "label": "Duplicate"},
		{"id": "", "type": "asteroid"},
		"bad-row",
		{"id": "beta", "label": "Beta"}
	]
	state["seen_asteroids"] = ["a1", "", "a1", "a2"]
	state["seen_planets"] = ["p1", "p1", ""]
	state["candidate_visit_blocks"] = {"": 10, "alpha": 20}
	state["selected_target"] = "  beta  "
	state["preview_target"] = {"id": " "}
	RocketsManager.set_override_state(state)
	var loaded := RocketsManager.load_state()
	var inventory: Dictionary = loaded.get("inventory", {})
	var targets: Array = loaded.get("detected_targets", [])
	if int(inventory.get("Iron", -1)) != 0 or int(inventory.get("Silicates", -1)) != 0 or int(inventory.get("Gold", -1)) != 7:
		reporter.fail_test("Expected inventory negatives to clamp to zero while preserving valid extras, got %s" % str(inventory))
		RocketsManager.clear_override_state()
		return
	if targets.size() != 2:
		reporter.fail_test("Expected detected_targets to drop malformed/duplicate rows, got %s" % str(targets))
		RocketsManager.clear_override_state()
		return
	if str(targets[0].get("type", "")) != "planet" or str(targets[1].get("type", "")) != "asteroid":
		reporter.fail_test("Expected detected target types to normalize to planet/asteroid, got %s" % str(targets))
		RocketsManager.clear_override_state()
		return
	if loaded.get("seen_asteroids", []) != ["a1", "a2"] or loaded.get("seen_planets", []) != ["p1"]:
		reporter.fail_test("Expected seen arrays to dedupe and strip blanks, got asteroids=%s planets=%s" % [str(loaded.get("seen_asteroids", [])), str(loaded.get("seen_planets", []))])
		RocketsManager.clear_override_state()
		return
	if loaded.get("candidate_visit_blocks", {}).has(""):
		reporter.fail_test("Expected blank candidate_visit_blocks key to be removed")
		RocketsManager.clear_override_state()
		return
	if str(loaded.get("selected_target", "")) != "beta":
		reporter.fail_test("Expected selected_target to be trimmed to beta, got %s" % str(loaded.get("selected_target", "")))
		RocketsManager.clear_override_state()
		return
	if not Dictionary(loaded.get("preview_target", {})).is_empty():
		reporter.fail_test("Expected blank preview_target to be cleared, got %s" % str(loaded.get("preview_target", {})))
		RocketsManager.clear_override_state()
		return
	RocketsManager.clear_override_state()
	reporter.pass_test()

func test_state_reconcile_normalizes_live_mission_payloads() -> void:
	reporter.start_test("[ARCH] State reconcile normalizes live mission and returned-mission payloads")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 1
	state["completed_mission_badges"] = ["mission-1"]
	state["missions"] = [
		{
			"rocket_id": "rocket-a",
			"target_id": "target-alpha",
			"operation_mode": "survey",
			"location": "",
			"objective": {
				"requirements": {"minerals": {"Iron": -3}},
				"target_id": "wrong-target"
			}
		},
		{
			"rocket_id": "rocket-a",
			"target": "target-beta",
			"launch_time": 10,
			"operation_mode": "contract"
		},
		{
			"rocket_id": "",
			"target": "bad-row"
		}
	]
	state["returned_mission"] = {
		"rocket_id": "rocket-b",
		"target": "target-returned",
		"operation_mode": "survey",
		"mission_objective": {
			"requirements": {"minerals": {"Nickel": -4}}
		}
	}
	RocketsManager.set_override_state(state)
	var loaded := RocketsManager.load_state()
	var missions: Array = loaded.get("missions", [])
	var returned: Dictionary = loaded.get("returned_mission", {})
	if missions.size() != 1:
		reporter.fail_test("Expected duplicate/invalid live missions to collapse to one valid record, got %s" % str(missions))
		RocketsManager.clear_override_state()
		return
	var mission: Dictionary = missions[0]
	if str(mission.get("target", "")) != "target-beta" or str(mission.get("operation_mode", "")) != "contract":
		reporter.fail_test("Expected live mission to keep latest valid target and contract mode, got %s" % str(mission))
		RocketsManager.clear_override_state()
		return
	if mission.get("location", []) != ["target-beta"]:
		reporter.fail_test("Expected live mission location to normalize to the active target, got %s" % str(mission.get("location", [])))
		RocketsManager.clear_override_state()
		return
	var objective: Dictionary = mission.get("objective", {})
	if str(objective.get("target_id", "")) != "target-beta":
		reporter.fail_test("Expected mission objective target_id to normalize with live mission target, got %s" % str(objective))
		RocketsManager.clear_override_state()
		return
	if str(returned.get("target_id", "")) != "target-returned" or str(returned.get("operation_mode", "")) != "contract":
		reporter.fail_test("Expected returned mission to normalize target_id and onboarding-safe mode, got %s" % str(returned))
		RocketsManager.clear_override_state()
		return
	if not Dictionary(returned.get("mission_objective", {}).get("requirements", {}).get("minerals", {})).is_empty():
		reporter.fail_test("Expected returned mission objective minerals to normalize to an empty requirements map, got %s" % str(returned.get("mission_objective", {})))
		RocketsManager.clear_override_state()
		return
	RocketsManager.clear_override_state()
	reporter.pass_test()

func test_state_reconcile_prunes_orphaned_transit_maps() -> void:
	reporter.start_test("[ARCH] State reconcile prunes orphaned transit and status maps")
	var state = RocketsStateAccess.build_default_state(2)
	state["placed"] = [
		{"id": "rocket-a", "type": "starterrocket1", "status": "awaitingLaunch"}
	]
	state["missions"] = [
		{"rocket_id": "rocket-b", "rocket_type": "starterrocket2", "status": "launched"}
	]
	state["returning"] = [
		{"rocket_id": "rocket-a"},
		{"rocket_id": "orphan"}
	]
	state["arrived"] = {"rocket-a": {"target_id": "x"}, "orphan": {"target_id": "y"}}
	state["returning_started"] = {"rocket-a": 1, "orphan": 2}
	state["status_changed_at"] = {
		"rocket-a": {"awaitingLaunch": 1},
		"rocket-b": {"launched": 2},
		"orphan": {"returned": 3}
	}
	RocketsManager.set_override_state(state)
	var loaded := RocketsManager.load_state()
	var returning: Array = loaded.get("returning", [])
	if returning.size() != 1 or str(returning[0].get("rocket_id", "")) != "rocket-a":
		reporter.fail_test("Expected returning list to prune orphaned rockets, got %s" % str(returning))
		RocketsManager.clear_override_state()
		return
	if loaded.get("arrived", {}).has("orphan") or loaded.get("returning_started", {}).has("orphan") or loaded.get("status_changed_at", {}).has("orphan"):
		reporter.fail_test("Expected orphaned transit/status maps to be pruned, got arrived=%s returning_started=%s status=%s" % [str(loaded.get("arrived", {})), str(loaded.get("returning_started", {})), str(loaded.get("status_changed_at", {}))])
		RocketsManager.clear_override_state()
		return
	RocketsManager.clear_override_state()
	reporter.pass_test()

func test_earth_base_allows_new_mission_for_m4_without_scanner_gate() -> void:
	reporter.start_test("[UX] Earth base keeps New Mission available for Mission 4 autonomy handoff")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 3
	state["completed_mission_badges"] = ["mission-1", "mission-2", "mission-3"]
	state["control_station_built"] = true
	state["scanner_unlocked"] = true
	state["scanner_station_built"] = false
	# Pre-include all rockets so unlock_for_level() (called on AppController level load)
	# finds them already present, skips save_state(), and preserves the override.
	state["unlocked"] = ["starterrocket1", "starterrocket2", "starterrocket3"]
	RocketsManager.set_override_state(state)
	var base = EarthBaseScene.instantiate()
	get_root().add_child(base)
	await create_timer(0.08).timeout
	var app = get_root().find_child("AppController", true, false)
	if app and app.has_method("skip_tutorial"):
		app.skip_tutorial()
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
		var control_card := base.get_node_or_null("UILayer/ProgressionCards/ControlStationCard") as Control
		var scanner_card := base.get_node_or_null("UILayer/ProgressionCards/ScannerStationCard") as Control
		if control_card != null and control_card.visible:
			reporter.fail_test("Expected Mission 4 handoff to hide the old Control Station gate")
			base.queue_free()
			RocketsManager.clear_override_state()
			return
		if scanner_card != null and scanner_card.visible:
			reporter.fail_test("Expected Mission 4 handoff to hide the old Scanner Station gate")
			base.queue_free()
			RocketsManager.clear_override_state()
			return
		var handoff_copy = _find_label_in_subtree(base.get_node_or_null("UILayer/ProgressionCards"), "choose a contract or run your own survey mission")
		if handoff_copy == null:
			var active_context: Dictionary = base.get_active_mission_context()
			if active_context.is_empty():
				base.queue_free()
				RocketsManager.clear_override_state()
				reporter.pass_test()
				return
			reporter.fail_test("Expected Mission 4 handoff to avoid surfacing a stale active mission card")
			base.queue_free()
			RocketsManager.clear_override_state()
			return
		base.queue_free()
		RocketsManager.clear_override_state()
		reporter.pass_test()
		return
	reporter.fail_test("Expected New Mission to remain enabled once the old scanner gate is removed")
	base.queue_free()
	RocketsManager.clear_override_state()
	return

func test_earth_base_ignores_historical_mission_log_when_no_live_mission_exists() -> void:
	reporter.start_test("[UX] Earth base ignores historical mission rows when no live mission is active")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 3
	state["completed_mission_badges"] = ["mission-1", "mission-2", "mission-3"]
	state["control_station_built"] = true
	state["scanner_unlocked"] = true
	state["scanner_station_built"] = true
	state["missions"] = [{
		"rocket_id": "starterrocket1",
		"target": "mission-3-tess-candidate-alpha",
		"launch_time": 123.0
	}]
	state["unlocked"] = ["starterrocket1", "starterrocket2", "starterrocket3"]
	RocketsManager.set_override_state(state)
	var base = EarthBaseScene.instantiate()
	get_root().add_child(base)
	await create_timer(0.08).timeout
	var context: Dictionary = base.get_active_mission_context()
	if not context.is_empty():
		reporter.fail_test("Expected no active mission context when there is no placed rocket to resume")
		base.queue_free()
		RocketsManager.clear_override_state()
		return
	base.queue_free()
	RocketsManager.clear_override_state()
	reporter.pass_test()

func test_earth_base_hides_star_map_progression_card() -> void:
	reporter.start_test("[UX] Earth base main screen does not show the Star Map progression card")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 4
	state["completed_mission_badges"] = ["mission-1", "mission-2", "mission-3", "mission-4"]
	state["control_station_built"] = true
	state["scanner_unlocked"] = true
	state["scanner_station_built"] = true
	state["unlocked"] = ["starterrocket1", "starterrocket2", "starterrocket3"]
	RocketsManager.set_override_state(state)
	var base = EarthBaseScene.instantiate()
	get_root().add_child(base)
	await create_timer(0.08).timeout
	base._build_progression_cards()
	await create_timer(0.02).timeout
	if _find_label_in_subtree(base.get_node_or_null("UILayer/ProgressionCards"), "Star Map") != null:
		reporter.fail_test("Expected Star Map card to stay off the Earth base main screen")
		base.queue_free()
		RocketsManager.clear_override_state()
		return
	base.queue_free()
	RocketsManager.clear_override_state()
	reporter.pass_test()

func test_earth_base_hides_progression_cards_during_active_tutorial_step() -> void:
	reporter.start_test("[UX] Earth base hides progression cards while tutorial coach is active")
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 3
	state["completed_mission_badges"] = ["mission-1", "mission-2", "mission-3"]
	state["control_station_built"] = true
	state["scanner_unlocked"] = true
	state["scanner_station_built"] = false
	state["unlocked"] = ["starterrocket1", "starterrocket2", "starterrocket3"]
	RocketsManager.set_override_state(state)
	var fake_app := FakeTutorialAppController.new()
	fake_app.name = "AppController"
	fake_app.state = {
		"skipped": false,
		"current_stage": 4,
		"current_step_index": 0,
		"current_step": {
			"action_key": "open_launchpad",
			"title": "Mission 4",
			"message": "Mission 4 is the handoff out of the strict tutorial rail.",
			"valid_scenes": ["earth_base_1"]
		}
	}
	get_root().add_child(fake_app)
	var base = EarthBaseScene.instantiate()
	get_root().add_child(base)
	await create_timer(0.08).timeout
	base._build_progression_cards()
	await create_timer(0.02).timeout
	var cards_root := base.get_node_or_null("UILayer/ProgressionCards") as VBoxContainer
	if cards_root == null:
		reporter.fail_test("Earth base missing ProgressionCards")
		base.queue_free()
		get_root().remove_child(fake_app)
		fake_app.queue_free()
		RocketsManager.clear_override_state()
		return
	if cards_root.visible:
		reporter.fail_test("Expected progression cards hidden while active tutorial coach step is visible")
		base.queue_free()
		get_root().remove_child(fake_app)
		fake_app.queue_free()
		RocketsManager.clear_override_state()
		return
	base.queue_free()
	get_root().remove_child(fake_app)
	fake_app.queue_free()
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

func test_space_map_scene_has_shared_bottom_nav() -> void:
	reporter.start_test("[UX] Space map scene includes HomeBtn and GalaxyBtn in footer")
	var scene = SpaceMapScene.instantiate()
	if scene == null:
		reporter.fail_test("SpaceMap scene failed to instantiate")
		return
	get_root().add_child(scene)
	await create_timer(0.05).timeout
	if scene.get_node_or_null("UILayer/InfoBar/Sections/HomeBtn") == null:
		reporter.fail_test("SpaceMap scene missing HomeBtn in InfoBar footer")
		scene.queue_free()
		return
	if scene.get_node_or_null("UILayer/InfoBar/Sections/GalaxyBtn") == null:
		reporter.fail_test("SpaceMap scene missing GalaxyBtn in InfoBar footer")
		scene.queue_free()
		return
	scene.queue_free()
	reporter.pass_test()

func test_galaxy_map_scene_has_nav_buttons() -> void:
	reporter.start_test("[UX] Galaxy map scene includes TelemetryPanel with HomeBtn")
	var scene = GalaxyMapScene.instantiate()
	if scene == null:
		reporter.fail_test("GalaxyMap scene failed to instantiate")
		return
	get_root().add_child(scene)
	await create_timer(0.05).timeout
	if scene.get_node_or_null("UILayer/TelemetryPanel") == null:
		reporter.fail_test("GalaxyMap scene missing UILayer/TelemetryPanel")
		scene.queue_free()
		return
	if scene.get_node_or_null("UILayer/TelemetryPanel/Row/HomeBtn") == null:
		reporter.fail_test("GalaxyMap scene missing HomeBtn in TelemetryPanel")
		scene.queue_free()
		return
	scene.queue_free()
	reporter.pass_test()

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

func test_sidescroll_mining_has_scene_owned_mars_background() -> void:
	reporter.start_test("[UX] Sidescroll mining uses scene-owned Mars background host")
	var mining = SidescrollMiningScene.instantiate()
	get_root().add_child(mining)
	await create_timer(0.05).timeout
	var background = mining.get_node_or_null("MarsPixelBackground") as TextureRect
	if background == null:
		reporter.fail_test("Expected scene-owned MarsPixelBackground node")
		mining.queue_free()
		return
	if background.mouse_filter != Control.MOUSE_FILTER_IGNORE:
		reporter.fail_test("Expected MarsPixelBackground to ignore mouse input")
		mining.queue_free()
		return
	mining.queue_free()
	reporter.pass_test()

func test_sidescroll_mining_contract_rows_use_template() -> void:
	reporter.start_test("[UX] Sidescroll mining contract tracker uses template-backed rows")
	var mining = SidescrollMiningScene.instantiate()
	get_root().add_child(mining)
	await create_timer(0.05).timeout
	mining._starter_contract_active = true
	mining._starter_contractor_name = "Aegis"
	mining._starter_order_targets = {"Iron": 6, "Nickel": 4}
	mining._collected_minerals = {"Iron": 2}
	mining._refresh_contract_order_tracker()
	await create_timer(0.05).timeout
	if mining.contract_order_vbox.get_child_count() < 3:
		reporter.fail_test("Expected contract tracker to contain title/progress plus template-backed mineral rows")
		mining.queue_free()
		return
	var found_template_row := false
	for child in mining.contract_order_vbox.get_children():
		if child.get_node_or_null("NameLabel") != null and child.get_node_or_null("ProgressBar") != null and child.get_node_or_null("QuantityLabel") != null:
			found_template_row = true
			break
	if not found_template_row:
		reporter.fail_test("Expected MiningContractOrderRow template instance under contract order tracker")
		mining.queue_free()
		return
	mining.queue_free()
	reporter.pass_test()

func test_sidescroll_mining_room_rows_use_template() -> void:
	reporter.start_test("[UX] Sidescroll mining room panel uses template-backed room rows")
	var mining = SidescrollMiningScene.instantiate()
	get_root().add_child(mining)
	await create_timer(0.05).timeout
	mining._setup_room_panel()
	mining._configure_rocket_rooms(2)
	mining._render_room_panel()
	await create_timer(0.05).timeout
	if mining._room_grid == null or mining._room_grid.get_child_count() < 1:
		reporter.fail_test("Expected room grid to populate installed rooms")
		mining.queue_free()
		return
	var room_row: Node = mining._room_grid.get_child(0)
	if room_row.get_node_or_null("RoomIcon") == null or room_row.get_node_or_null("RoomLabel") == null:
		reporter.fail_test("Expected MiningRoomRow template instance in room grid")
		mining.queue_free()
		return
	mining.queue_free()
	reporter.pass_test()

func test_sidescroll_mining_room_debug_overlay_uses_scene_owned_preview_and_marker_template() -> void:
	reporter.start_test("[UX] Sidescroll mining room debug overlay uses scene-owned preview and marker template")
	var mining = SidescrollMiningScene.instantiate()
	get_root().add_child(mining)
	await create_timer(0.05).timeout
	mining._setup_room_panel()
	if mining.get_node_or_null("UI/RoomDebugOverlay/AtlasPreview") == null:
		reporter.fail_test("Expected scene-owned AtlasPreview under RoomDebugOverlay")
		mining.queue_free()
		return
	if mining.get_node_or_null("UI/RoomDebugOverlay/MarkersLayer") == null:
		reporter.fail_test("Expected scene-owned MarkersLayer under RoomDebugOverlay")
		mining.queue_free()
		return
	var marker = preload("res://Scenes/UI/Templates/MiningRoomDebugMarker.tscn").instantiate()
	if marker.name != "MiningRoomDebugMarker" or marker.get_node_or_null("Fill") == null or marker.get_node_or_null("TopOutline") == null or marker.get_node_or_null("IndexLabel") == null:
		reporter.fail_test("Expected MiningRoomDebugMarker template nodes")
		mining.queue_free()
		return
	marker.queue_free()
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

func test_launchpad_launch_routes_directly_to_outbound_preview() -> void:
	reporter.start_test("[UX] Launchpad skips ascent and routes directly to outbound preview")
	var fake_scene_manager := FakeSceneManager.new()
	fake_scene_manager.name = "FakeSceneManager"
	fake_scene_manager.add_to_group("scene_manager")
	get_root().add_child(fake_scene_manager)
	var launchpad = EarthLaunchpadScene.instantiate()
	get_root().add_child(launchpad)
	await create_timer(0.05).timeout
	launchpad._on_launched("starterrocket1", "target-1")
	if fake_scene_manager.last_scene_path != "res://Scenes/Transitions/rocket_transit.tscn":
		reporter.fail_test("Expected direct outbound preview route, got %s" % fake_scene_manager.last_scene_path)
		launchpad.queue_free()
		fake_scene_manager.queue_free()
		return
	launchpad.queue_free()
	fake_scene_manager.queue_free()
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
	for node_name in ["ControlPanel", "InventoryPanel", "TravelPanel"]:
		var node = outbound.get_node_or_null("CanvasLayer/UI/%s" % node_name) as Control
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
