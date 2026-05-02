extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const EarthBaseScene = preload("res://Scenes/Earth/earth_base_1.tscn")
const TutorialOverlayScene = preload("res://Scenes/UI/TutorialCoachOverlay.tscn")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const RocketsStateAccess = preload("res://Scripts/Utils/RocketsStateAccess.gd")

var reporter := TestReporter.new()

func _init() -> void:
	reporter.start_suite("Earth Base Unlock UI", {
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
	await test_earth_base_progression_cards_are_scene_owned()
	await test_earth_base_progression_cards_root_uses_scene_owned_controller()
	await test_sr2_unlock_overlay_matches_layout_and_copy()
	await test_free_ops_unlock_overlay_uses_scene_owned_dashboard_nodes()
	await test_earth_base_active_mission_card_overrides_build_prompt()
	await test_tutorial_overlay_suppresses_progression_cards_on_earth_base()
	await test_tutorial_overlay_suppresses_progression_cards_when_it_appears_after_initial_build()
	await test_build_flow_blocks_structures_before_mission_2()
	await test_mission_2_build_flow_places_control_station_after_earth_base_selection()
	await test_tutorial_control_station_cta_opens_guided_build_flow()

func _reset_rockets_state() -> void:
	RocketsManager.clear_override_state()
	RocketsManager.reset_state()

func _find_descendant_by_name(root: Node, target_name: String) -> Node:
	if root == null:
		return null
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var node = stack.pop_back()
		if str(node.name) == target_name:
			return node
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

func _find_visible_label_containing(root: Node, snippet: String) -> Label:
	if root == null:
		return null
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var node = stack.pop_back()
		if node is Label and (node as Label).is_visible_in_tree() and str((node as Label).text).find(snippet) != -1:
			return node as Label
		for child in node.get_children():
			stack.append(child)
	return null

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

func _find_button_named(root: Node, target_name: String) -> Button:
	if root == null:
		return null
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var node = stack.pop_back()
		if node is Button and str(node.name) == target_name:
			return node as Button
		for child in node.get_children():
			stack.append(child)
	return null

func test_earth_base_progression_cards_are_scene_owned() -> void:
	reporter.start_test("Earth base progression cards exist as scene-owned nodes")
	_reset_rockets_state()
	var scene = EarthBaseScene.instantiate()
	get_root().add_child(scene)
	await create_timer(0.10).timeout

	var cards_root = scene.get_node_or_null("UILayer/ProgressionCards")
	var expected_paths = [
		"UILayer/ProgressionCards/ActiveMissionCard",
		"UILayer/ProgressionCards/ControlStationCard",
		"UILayer/ProgressionCards/ScannerStationCard",
		"UILayer/ProgressionCards/NextMissionCard"
	]
	if cards_root == null:
		reporter.fail_test("Expected ProgressionCards root on Earth base scene")
		scene.queue_free()
		return
	for path in expected_paths:
		if scene.get_node_or_null(path) == null:
			reporter.fail_test("Expected scene-owned progression card at %s" % path)
			scene.queue_free()
			return

	scene.queue_free()
	await create_timer(0.05).timeout
	reporter.pass_test()

func test_earth_base_progression_cards_root_uses_scene_owned_controller() -> void:
	reporter.start_test("Earth base progression cards root uses scene-owned controller script")
	_reset_rockets_state()
	var scene = EarthBaseScene.instantiate()
	get_root().add_child(scene)
	await create_timer(0.10).timeout

	var cards_root = scene.get_node_or_null("UILayer/ProgressionCards")
	if cards_root == null:
		reporter.fail_test("Expected ProgressionCards root on Earth base scene")
		scene.queue_free()
		return
	if not cards_root.has_method("show_active_mission") or not cards_root.has_method("show_next_mission"):
		reporter.fail_test("Expected ProgressionCards root to own scene-backed card presentation methods")
		scene.queue_free()
		return

	scene.queue_free()
	await create_timer(0.05).timeout
	reporter.pass_test()

func test_sr2_unlock_overlay_matches_layout_and_copy() -> void:
	reporter.start_test("SR2 unlock overlay shows the mission-complete beat, range upgrade, and mission CTA")
	_reset_rockets_state()
	var scene = EarthBaseScene.instantiate()
	get_root().add_child(scene)
	await create_timer(0.10).timeout

	scene._show_starterrocket2_unlock_popup()
	await create_timer(0.05).timeout

	var overlay = scene.get_node_or_null("StarterRocket2UnlockOverlay")
	if overlay == null:
		reporter.fail_test("Expected StarterRocket2UnlockOverlay")
		scene.queue_free()
		return

	var intro = _find_descendant_by_name(overlay, "StarterRocket2UnlockIntro") as Label
	if intro == null or intro.text.find("flight-ready") == -1:
		reporter.fail_test("Expected unlock intro copy")
		scene.queue_free()
		return

	var title = _find_descendant_by_name(overlay, "StarterRocket2UnlockTitle") as Label
	if title == null or title.text != "Starter Rocket 2":
		reporter.fail_test("Expected SR2 title in unlock card")
		scene.queue_free()
		return

	var summary = _find_descendant_by_name(overlay, "StarterRocket2UnlockSummary") as Label
	if summary == null or summary.text.find("24 AU") == -1:
		reporter.fail_test("Expected summary copy describing the upgrade")
		scene.queue_free()
		return

	var flavour = _find_descendant_by_name(overlay, "StarterRocket2UnlockFlavour") as Label
	if flavour == null or flavour.text.find("Mission 2") == -1:
		reporter.fail_test("Expected flavour copy tying the unlock to the next route")
		scene.queue_free()
		return

	var stats = _find_descendant_by_name(overlay, "StarterRocket2UnlockStats") as Label
	if stats == null or stats.text.find("2x range") == -1:
		reporter.fail_test("Expected secondary SR2 stats line")
		scene.queue_free()
		return

	var cta = _find_descendant_by_name(overlay, "StarterRocket2UnlockCTA") as Button
	if cta == null or cta.text != "Plan Mission 2 with SR2":
		reporter.fail_test("Expected mission CTA on SR2 unlock card")
		scene.queue_free()
		return

	var highlights = _find_descendant_by_name(overlay, "StarterRocket2UnlockHighlights") as VBoxContainer
	if highlights == null or highlights.get_child_count() != 3:
		reporter.fail_test("Expected three SR2 highlight rows")
		scene.queue_free()
		return
	if highlights.get_child(0).name != "StarterRocket2HighlightChip":
		reporter.fail_test("Expected SR2 highlight rows to use StarterRocket2HighlightChip template")
		scene.queue_free()
		return

	scene.queue_free()
	await create_timer(0.05).timeout
	reporter.pass_test()

func test_free_ops_unlock_overlay_uses_scene_owned_dashboard_nodes() -> void:
	reporter.start_test("Free ops unlock overlay uses the dashboard scene without stale card-node lookups")
	_reset_rockets_state()
	var scene = EarthBaseScene.instantiate()
	get_root().add_child(scene)
	await create_timer(0.10).timeout

	scene._show_free_ops_unlock_overlay()
	await create_timer(0.05).timeout

	var overlay = scene.get_node_or_null("FreeOpsUnlockOverlay")
	if overlay == null:
		reporter.fail_test("Expected FreeOpsUnlockOverlay to be added to earth base")
		scene.queue_free()
		return

	var title = overlay.get_node_or_null("RootVBox/ContentMargin/ContentVBox/TitleRow/TitleLabel") as Label
	var desc = overlay.get_node_or_null("RootVBox/ContentMargin/ContentVBox/TitleRow/TitleDesc") as Label
	var cta = overlay.get_node_or_null("RootVBox/BottomBar/BottomRow/StartRunButton") as Button
	if title == null or desc == null or cta == null:
		reporter.fail_test("Expected free ops overlay to use the current scene-owned dashboard nodes")
		scene.queue_free()
		return
	if title.text != "FREE OPERATIONS":
		reporter.fail_test("Expected free ops overlay title to be applied on the dashboard scene")
		scene.queue_free()
		return
	if desc.text.find("belt is now open") == -1:
		reporter.fail_test("Expected free ops overlay description to describe unlocked free operations")
		scene.queue_free()
		return
	if cta.text != "Open Launchpad":
		reporter.fail_test("Expected free ops CTA to route into the launchpad")
		scene.queue_free()
		return

	scene.queue_free()
	await create_timer(0.05).timeout
	reporter.pass_test()

func test_earth_base_active_mission_card_overrides_build_prompt() -> void:
	reporter.start_test("Earth base shows active mission card instead of build prompt when a mission is already armed")
	_reset_rockets_state()
	RocketsManager.reset_state()
	var stale_overlay := get_root().get_node_or_null("TutorialCoachOverlay")
	if stale_overlay:
		stale_overlay.queue_free()
		await create_timer(0.02).timeout
	RocketsManager.mark_mission_completed("mission-1-active-card-test")
	var rocket_id := RocketsManager.add_placed("starterrocket1", Vector2(-110.0, -170.0))
	var contractors := RocketsManager.get_trip_contractors()
	if not contractors.is_empty():
		var first_contractor: Dictionary = contractors[0]
		var contractor_id := str(first_contractor.get("id", ""))
		if contractor_id != "":
			RocketsManager.select_trip_contractor(contractor_id)
	RocketsManager.ensure_selected_target_for_launch(rocket_id)
	var scene = EarthBaseScene.instantiate()
	get_root().add_child(scene)
	current_scene = scene
	await create_timer(0.10).timeout
	scene._build_progression_cards()
	await create_timer(0.03).timeout

	var cards_root = scene.get_node_or_null("UILayer/ProgressionCards")
	if cards_root == null:
		reporter.fail_test("Expected ProgressionCards root on earth base")
		scene.queue_free()
		RocketsManager.reset_state()
		return
	if _find_visible_label_containing(cards_root, "Build Control Station") != null:
		reporter.fail_test("Build Control Station card should be suppressed while an active mission is already armed")
		scene.queue_free()
		RocketsManager.reset_state()
		return
	var active_card := scene.get_node_or_null("UILayer/ProgressionCards/ActiveMissionCard") as Control
	if active_card == null or not active_card.visible:
		reporter.fail_test("Expected the scene-owned active mission card to replace the build prompt")
		scene.queue_free()
		RocketsManager.reset_state()
		return
	if _find_button_by_text(cards_root, "Open Launchpad") == null:
		reporter.fail_test("Expected active mission card to route back into the launchpad flow")
		scene.queue_free()
		RocketsManager.reset_state()
		return
	scene.queue_free()
	current_scene = null
	RocketsManager.reset_state()
	await create_timer(0.05).timeout
	reporter.pass_test()

func test_tutorial_overlay_suppresses_progression_cards_on_earth_base() -> void:
	reporter.start_test("Tutorial coach suppresses Earth base progression cards while it owns mission CTA guidance")
	_reset_rockets_state()
	RocketsManager.reset_state()
	RocketsManager.set_returned_mission(
		"starterrocket1",
		"mission-1-training-target",
		"433 Eros",
		"asteroid",
		"contract",
		{
			"trip_contractor_id": "rocketlab",
			"trip_contractor_name": "Rocketlab",
			"trip_requested_minerals": {"Iron": 10},
			"mining_run_collected": {"Iron": 10}
		}
	)
	var scene = EarthBaseScene.instantiate()
	get_root().add_child(scene)
	current_scene = scene
	var overlay = TutorialOverlayScene.instantiate()
	get_root().add_child(overlay)
	await create_timer(0.10).timeout

	overlay._current_step = {
		"title": "Pick Contractor",
		"action_key": "accept_contractor_offer",
		"valid_scenes": ["earth_launchpad"]
	}
	overlay._off_course = true
	overlay.visible = true
	overlay._apply_off_course_display()
	scene._build_progression_cards()
	await create_timer(0.03).timeout

	if not overlay.visible:
		reporter.fail_test("Expected tutorial overlay to remain visible for the mission CTA guidance")
		overlay.queue_free()
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	var cards_root := scene.get_node_or_null("UILayer/ProgressionCards") as Control
	if cards_root == null:
		reporter.fail_test("Expected Earth base progression cards root")
		overlay.queue_free()
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	if cards_root.visible:
		reporter.fail_test("Expected Earth base progression cards to hide while tutorial overlay is active")
		overlay.queue_free()
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	if overlay.title_label.text.find("Mission Debrief Ready") == -1:
		reporter.fail_test("Expected tutorial overlay to show the debrief-ready title")
		overlay.queue_free()
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	if overlay.message_label.text.find("Resolve the debrief") == -1:
		reporter.fail_test("Expected tutorial overlay to describe the debrief requirement")
		overlay.queue_free()
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	if _find_button_by_text(overlay, "Open Debrief") == null:
		reporter.fail_test("Expected tutorial overlay to own the Open Debrief CTA")
		overlay.queue_free()
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	if overlay.go_to_debrief_button == null or not overlay.go_to_debrief_button.visible:
		reporter.fail_test("Expected tutorial overlay to surface the debrief CTA button")
		overlay.queue_free()
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	overlay.queue_free()
	scene.queue_free()
	current_scene = null
	RocketsManager.reset_state()
	await create_timer(0.05).timeout
	reporter.pass_test()

func test_tutorial_overlay_suppresses_progression_cards_when_it_appears_after_initial_build() -> void:
	reporter.start_test("Earth base rebuilds CTA ownership when tutorial overlay appears after initial build")
	_reset_rockets_state()
	RocketsManager.reset_state()
	RocketsManager.set_returned_mission(
		"starterrocket1",
		"mission-1-training-target",
		"433 Eros",
		"asteroid",
		"contract",
		{
			"trip_contractor_id": "rocketlab",
			"trip_contractor_name": "Rocketlab",
			"trip_requested_minerals": {"Iron": 10},
			"mining_run_collected": {"Iron": 10}
		}
	)
	var scene = EarthBaseScene.instantiate()
	get_root().add_child(scene)
	current_scene = scene
	await create_timer(0.10).timeout
	var existing_overlay := get_root().find_child("TutorialCoachOverlay", true, false)
	if existing_overlay:
		existing_overlay.queue_free()
		await create_timer(0.05).timeout
		existing_overlay = null
	scene._build_progression_cards()
	await create_timer(0.03).timeout

	var cards_root := scene.get_node_or_null("UILayer/ProgressionCards") as Control
	if cards_root == null:
		reporter.fail_test("Expected Earth base progression cards root")
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	cards_root.visible = true

	var overlay := existing_overlay
	if overlay == null:
		overlay = TutorialOverlayScene.instantiate()
		get_root().add_child(overlay)
		await create_timer(0.05).timeout
	var state := {
		"skipped": false,
		"current_stage": 1,
		"current_step_index": 0,
		"total_steps": 1,
		"current_step": {
			"title": "Mission Debrief Ready",
			"message": "Resolve the debrief before continuing.",
			"action_key": "resolve_mission_debrief",
			"valid_scenes": ["mission_debrief_v2"]
		}
	}
	scene._on_tutorial_state_updated(state)
	overlay._current_step = state["current_step"]
	overlay._off_course = true
	overlay.visible = true
	overlay._apply_off_course_display()
	scene._on_tutorial_overlay_visibility_changed()
	await create_timer(0.08).timeout

	if cards_root.visible:
		reporter.fail_test("Expected progression cards to hide after tutorial overlay appears")
		overlay.queue_free()
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return

	overlay.queue_free()
	scene.queue_free()
	current_scene = null
	RocketsManager.reset_state()
	await create_timer(0.05).timeout
	reporter.pass_test()

func test_build_flow_blocks_structures_before_mission_2() -> void:
	reporter.start_test("Build flow shows Earth Base first and blocks structures before Mission 2")
	_reset_rockets_state()
	RocketsManager.set_override_state(RocketsStateAccess.build_default_state(2))
	var scene = EarthBaseScene.instantiate()
	get_root().add_child(scene)
	current_scene = scene
	await create_timer(0.10).timeout

	scene._on_build_button_pressed()
	await create_timer(0.05).timeout
	var overlay = scene.get_node_or_null("UILayer/BuildOverlay")
	if overlay == null:
		reporter.fail_test("Expected BuildOverlay after pressing Build")
		scene.queue_free()
		current_scene = null
		return
	var title = overlay.get_node_or_null("Center/Panel/Margin/VBox/TitleLabel") as Label
	if title == null or title.text != "Select build location":
		reporter.fail_test("Expected build flow to start on the location step")
		scene.queue_free()
		current_scene = null
		return
	overlay.location_selected.emit("earth_base")
	await create_timer(0.05).timeout
	await create_timer(0.05).timeout
	var structure_title = overlay.get_node_or_null("Center/Panel/Margin/VBox/TitleLabel") as Label
	var message = overlay.get_node_or_null("Center/Panel/Margin/VBox/MessageLabel") as Label
	var place_button = _find_button_by_text(overlay, "Place structure")
	if structure_title == null or structure_title.text != "Select structure":
		reporter.fail_test("Expected build flow to advance to the structure step after selecting Earth Base")
		scene.queue_free()
		current_scene = null
		return
	if message == null or message.text.find("No new structures are available") == -1:
		reporter.fail_test("Expected build flow to explain that no structures are unlocked yet")
		scene.queue_free()
		current_scene = null
		return
	if place_button != null:
		reporter.fail_test("Expected no structure placement CTA before Mission 2")
		scene.queue_free()
		current_scene = null
		return

	scene.queue_free()
	current_scene = null
	RocketsManager.clear_override_state()
	await create_timer(0.05).timeout
	reporter.pass_test()

func test_mission_2_build_flow_places_control_station_after_earth_base_selection() -> void:
	reporter.start_test("Mission 2 build flow requires Earth Base selection before placing Control Station")
	_reset_rockets_state()
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 1
	state["completed_mission_badges"] = ["mission-1"]
	RocketsManager.set_override_state(state)
	var scene = EarthBaseScene.instantiate()
	get_root().add_child(scene)
	current_scene = scene
	await create_timer(0.10).timeout

	scene._on_build_button_pressed()
	await create_timer(0.05).timeout
	var overlay = scene.get_node_or_null("UILayer/BuildOverlay")
	if overlay == null:
		reporter.fail_test("Expected BuildOverlay after pressing Build")
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	var place_button_pre = _find_button_by_text(overlay, "Place structure")
	if place_button_pre != null:
		reporter.fail_test("Structure CTA should not appear before selecting Earth Base")
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	overlay.location_selected.emit("earth_base")
	await create_timer(0.05).timeout
	var control_label = _find_label_containing(overlay, "Control Station")
	var place_button = _find_button_by_text(overlay, "Place structure")
	if control_label == null or place_button == null:
		reporter.fail_test("Expected Control Station option after selecting Earth Base")
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	place_button.pressed.emit()
	await create_timer(0.05).timeout
	if not RocketsManager.is_control_station_built():
		reporter.fail_test("Expected Control Station to be built through the guided flow")
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	if scene.get_node_or_null("UILayer/BuildOverlay") != null:
		reporter.fail_test("Expected BuildOverlay to close after successful Control Station placement")
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return

	scene.queue_free()
	current_scene = null
	RocketsManager.reset_state()
	await create_timer(0.05).timeout
	reporter.pass_test()

func test_tutorial_control_station_cta_opens_guided_build_flow() -> void:
	reporter.start_test("Tutorial control-station CTA opens the guided build flow instead of building directly")
	_reset_rockets_state()
	var state = RocketsStateAccess.build_default_state(2)
	state["mission_progress_completed"] = 1
	state["completed_mission_badges"] = ["mission-1"]
	RocketsManager.set_override_state(state)
	var scene = EarthBaseScene.instantiate()
	get_root().add_child(scene)
	current_scene = scene
	var overlay = TutorialOverlayScene.instantiate()
	get_root().add_child(overlay)
	await create_timer(0.10).timeout

	overlay._current_step = {
		"title": "Control Station",
		"action_key": "build_control_station",
		"valid_scenes": ["earth_base_1"]
	}
	overlay._build_control_station_from_current_scene()
	await create_timer(0.05).timeout
	var build_overlay = scene.get_node_or_null("UILayer/BuildOverlay")
	if build_overlay == null:
		reporter.fail_test("Expected tutorial CTA to open BuildOverlay")
		overlay.queue_free()
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	if RocketsManager.is_control_station_built():
		reporter.fail_test("Tutorial CTA should not build the Control Station before the placement step completes")
		overlay.queue_free()
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	var title = build_overlay.get_node_or_null("Center/Panel/Margin/VBox/TitleLabel") as Label
	if title == null or title.text != "Select build location":
		reporter.fail_test("Expected tutorial CTA to enter the build flow at the location step")
		overlay.queue_free()
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return

	overlay.queue_free()
	scene.queue_free()
	current_scene = null
	RocketsManager.clear_override_state()
	await create_timer(0.05).timeout
	reporter.pass_test()
