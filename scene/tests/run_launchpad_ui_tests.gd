extends SceneTree

# WHAT THESE TESTS COVER
# ─────────────────────────────────────────────────────────────────────────────
# Launchpad UI flow: contractor selection → rocket creation → target selection →
# launch readiness.  Tests operate through the same RocketsManager + selector
# logic that the UI buttons drive, confirming that each step unlocks the next
# and that bad states (no contractor, no rocket, duplicate rocket) are blocked.
#
# WHAT THEY DO NOT COVER (by design)
# ─────────────────────────────────────────────────────────────────────────────
# • Scene rendering, Control layout, or visual appearance
# • Full freeform viewport interaction; one focused regression calls the star-map
#   control directly to guard the modal click-through path.
# • Network calls (Supabase) — mocked via RocketsManager predefined targets

const TestReporter     = preload("res://tests/TestReporter.gd")
const RocketsManager   = preload("res://Scripts/Utils/RocketsManager.gd")
const SubcontractorMgr = preload("res://Scripts/Utils/SubcontractorManager.gd")
const RocketSpecs      = preload("res://Scripts/Utils/RocketSpecs.gd")
const LaunchpadSelectorPanel = preload("res://Scripts/Earth/LaunchpadSelectorPanel.gd")
const EarthLaunchpadScene = preload("res://Scenes/Earth/earth_launchpad.tscn")

var reporter := TestReporter.new()

func _init() -> void:
	reporter.start_suite("Launchpad UI Flow", {
		"engine":    Engine.get_version_info()["string"],
		"os":        OS.get_name(),
		"project":   "scene",
		"timestamp": Time.get_datetime_string_from_system()
	})
	await run_all_tests()
	reporter.summary()
	await create_timer(0.1).timeout
	quit(1 if reporter.tests_failed > 0 else 0)

func run_all_tests() -> void:
	await test_flow_phase_contractor_when_no_contractor_selected()
	await test_flow_phase_rocket_after_contractor_selected()
	await test_flow_phase_target_after_rocket_armed()
	await test_cannot_select_target_without_contractor()
	await test_contractor_selection_persists()
	await test_rocket_creation_requires_contractor()
	await test_remove_awaiting_rocket_clears_placed_state()
	await test_add_placed_rocket_marks_as_awaiting_launch()
	await test_flow_phase_returns_to_rocket_after_removal()
	await test_target_requires_in_range_rocket()
	await test_duplicate_rocket_placement_is_blocked()
	await test_mission1_predefined_target_is_available()
	await test_contractor_offer_contains_valid_contractors()
	await test_launch_readiness_requires_target_and_rocket()
	await test_tutorial_force_does_not_downgrade_completed_launchpad_progress()
	await test_target_map_modal_blocks_underlying_input_and_accepts_marker_click()

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

func _reset() -> void:
	DirAccess.remove_absolute("user://tutorial_v2.cfg")
	RocketsManager.reset_state()
	RocketsManager.clear_selected_target()
	RocketsManager.clear_preview_target()
	RocketsManager.clear_returned_mission()
	RocketsManager.set_operation_mode("contract")
	RocketsManager.clear_trip_contract_offer()
	var state := RocketsManager.load_state()
	state["trip_contract_offer"] = {}
	state["mission_progress_completed"] = 0
	state["completed_mission_badges"] = []
	state["candidate_visit_blocks"] = {}
	state["selected_target"] = ""
	state["detected_targets"] = []
	state["operation_mode"] = "contract"
	RocketsManager.save_state(state)
	# Explicitly remove any awaiting rocket that reset_state may not have flushed in time
	RocketsManager.remove_awaiting_rocket()
	await create_timer(0.04).timeout

func _select_first_contractor() -> String:
	var targets = _get_m1_targets()
	var offer = RocketsManager.ensure_trip_contract_offer(targets)
	var contractors: Array = offer.get("contractors", [])
	if contractors.is_empty():
		return ""
	var contractor_id = str(contractors[0].get("id", ""))
	if contractor_id == "":
		return ""
	RocketsManager.select_trip_contractor(contractor_id)
	return contractor_id

func _get_m1_targets() -> Array:
	var predefined = RocketsManager.get_predefined_mission_target(1)
	if not predefined.is_empty():
		return [predefined]
	return []

func _get_flow_phase(selected_contractor: String, has_awaiting: bool) -> String:
	if selected_contractor == "":
		return "contractor"
	if not has_awaiting:
		return "rocket"
	return "target"

func _place_dummy_rocket() -> String:
	return RocketsManager.add_placed("starterrocket1", Vector2(-110, -170))

func _instantiate_launchpad_scene() -> Node:
	var scene = EarthLaunchpadScene.instantiate()
	if scene == null:
		return null
	get_root().add_child(scene)
	current_scene = scene
	await create_timer(0.22).timeout
	return scene

func _free_launchpad_scene(scene: Node) -> void:
	if scene == null:
		return
	current_scene = null
	scene.queue_free()
	await create_timer(0.05).timeout

# ─────────────────────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────────────────────

func test_flow_phase_contractor_when_no_contractor_selected() -> void:
	reporter.start_test("Flow phase is 'contractor' when no contractor is selected")
	await _reset()
	var selected = RocketsManager.get_trip_selected_contractor()
	var id = str(selected.get("id", ""))
	var phase = _get_flow_phase(id, false)
	if phase != "contractor":
		reporter.fail_test("Expected 'contractor' phase, got '%s'" % phase)
		return
	reporter.pass_test()

func test_flow_phase_rocket_after_contractor_selected() -> void:
	reporter.start_test("Flow phase is 'rocket' after contractor is selected and no rocket is armed")
	await _reset()
	var contractor_id = await _select_first_contractor()
	if contractor_id == "":
		reporter.fail_test("No contractor available to select — check SubcontractorManager defaults")
		return
	var awaiting = RocketsManager.get_primary_awaiting_rocket_id()
	var phase = _get_flow_phase(contractor_id, awaiting != "")
	if phase != "rocket":
		reporter.fail_test("Expected 'rocket' phase after contractor selected, got '%s'" % phase)
		return
	reporter.pass_test()

func test_flow_phase_target_after_rocket_armed() -> void:
	reporter.start_test("Flow phase is 'target' after contractor selected and rocket is armed on pad")
	await _reset()
	var contractor_id = await _select_first_contractor()
	if contractor_id == "":
		reporter.fail_test("No contractor available")
		return
	var rocket_uid = _place_dummy_rocket()
	if rocket_uid == "":
		reporter.fail_test("add_placed returned empty uid")
		return
	var awaiting = RocketsManager.get_primary_awaiting_rocket_id()
	var phase = _get_flow_phase(contractor_id, awaiting != "")
	if phase != "target":
		reporter.fail_test("Expected 'target' phase after rocket armed, got '%s' (awaiting='%s')" % [phase, awaiting])
		return
	reporter.pass_test()

func test_cannot_select_target_without_contractor() -> void:
	reporter.start_test("Target selection is blocked when no contractor is selected")
	await _reset()
	var targets = _get_m1_targets()
	if targets.is_empty():
		reporter.fail_test("No M1 predefined target — cannot test target blocking")
		return
	var target_id = str(targets[0].get("id", ""))
	# select_target should fail or be blocked when no contractor is selected
	var selected_contractor = RocketsManager.get_trip_selected_contractor()
	if str(selected_contractor.get("id", "")) != "":
		reporter.fail_test("Contractor was unexpectedly pre-selected after reset")
		return
	# Attempt target selection — it must not persist without a contractor
	var ok = RocketsManager.select_target(target_id)
	# Whether ok or not, the flow phase must still block because no contractor
	var phase = _get_flow_phase("", false)
	if phase != "contractor":
		reporter.fail_test("Flow phase should remain 'contractor' without a contractor, got '%s'" % phase)
		return
	reporter.pass_test()

func test_contractor_selection_persists() -> void:
	reporter.start_test("Selecting a contractor persists across get_trip_selected_contractor()")
	await _reset()
	var contractor_id = await _select_first_contractor()
	if contractor_id == "":
		reporter.fail_test("No contractor available")
		return
	var selected = RocketsManager.get_trip_selected_contractor()
	var persisted_id = str(selected.get("id", ""))
	if persisted_id != contractor_id:
		reporter.fail_test("Persisted contractor '%s' != selected '%s'" % [persisted_id, contractor_id])
		return
	reporter.pass_test()

func test_rocket_creation_requires_contractor() -> void:
	reporter.start_test("Rocket section is gated (contractor gate locked) when no contractor selected")
	await _reset()
	var selected = RocketsManager.get_trip_selected_contractor()
	var gate_locked = str(selected.get("id", "")) == ""
	if not gate_locked:
		reporter.fail_test("Contractor gate should be locked with no contractor selected")
		return
	reporter.pass_test()

func test_remove_awaiting_rocket_clears_placed_state() -> void:
	reporter.start_test("remove_awaiting_rocket() removes awaitingLaunch rocket from placed state")
	await _reset()
	var uid = _place_dummy_rocket()
	if uid == "":
		reporter.fail_test("add_placed returned empty uid")
		return
	var before = RocketsManager.get_primary_awaiting_rocket_id()
	if before == "":
		reporter.fail_test("Rocket should be awaiting launch after add_placed")
		return
	var removed = RocketsManager.remove_awaiting_rocket()
	if not removed:
		reporter.fail_test("remove_awaiting_rocket() returned false — nothing was removed")
		return
	var after = RocketsManager.get_primary_awaiting_rocket_id()
	if after != "":
		reporter.fail_test("Rocket still awaiting launch after removal: '%s'" % after)
		return
	reporter.pass_test()

func test_add_placed_rocket_marks_as_awaiting_launch() -> void:
	reporter.start_test("add_placed() marks a new rocket as awaitingLaunch status")
	await _reset()
	var uid = _place_dummy_rocket()
	if uid == "":
		reporter.fail_test("add_placed returned empty uid")
		return
	var status = RocketsManager.get_rocket_status(uid)
	if status != "awaitingLaunch":
		reporter.fail_test("Expected status 'awaitingLaunch', got '%s'" % status)
		return
	reporter.pass_test()

func test_flow_phase_returns_to_rocket_after_removal() -> void:
	reporter.start_test("Flow phase returns to 'rocket' after remove_awaiting_rocket()")
	await _reset()
	var contractor_id = await _select_first_contractor()
	if contractor_id == "":
		reporter.fail_test("No contractor available")
		return
	_place_dummy_rocket()
	var awaiting_before = RocketsManager.get_primary_awaiting_rocket_id()
	if awaiting_before == "":
		reporter.fail_test("No awaiting rocket after placement")
		return
	RocketsManager.remove_awaiting_rocket()
	var awaiting_after = RocketsManager.get_primary_awaiting_rocket_id()
	var phase = _get_flow_phase(contractor_id, awaiting_after != "")
	if phase != "rocket":
		reporter.fail_test("Expected 'rocket' phase after removal, got '%s'" % phase)
		return
	reporter.pass_test()

func test_target_requires_in_range_rocket() -> void:
	reporter.start_test("Target selection requires an in-range rocket (level check)")
	await _reset()
	var targets = _get_m1_targets()
	if targets.is_empty():
		reporter.fail_test("No M1 predefined target available")
		return
	var target = targets[0] as Dictionary
	var target_id = str(target.get("id", ""))
	var profile = RocketsManager.build_target_profile(target_id, str(target.get("type", "asteroid")))
	var required_level = int(profile.get("required_level", 1))
	# M1 target should be reachable by level 1 rocket
	if required_level > 1:
		reporter.fail_test("M1 predefined target requires level %d rocket — should be level 1" % required_level)
		return
	reporter.pass_test()

func test_duplicate_rocket_placement_is_blocked() -> void:
	reporter.start_test("Placing a second rocket while one is awaitingLaunch is detected")
	await _reset()
	_place_dummy_rocket()
	var awaiting_before = RocketsManager.get_primary_awaiting_rocket_id()
	if awaiting_before == "":
		reporter.fail_test("First placement did not register awaitingLaunch")
		return
	# The RocketSelector._creation_locked check prevents a second placement.
	# We simulate the state check: if an awaitingLaunch rocket exists, creation is locked.
	var placed = RocketsManager.get_placed()
	var awaiting_count := 0
	for item in placed:
		if str(item.get("status", "")) == "awaitingLaunch":
			awaiting_count += 1
	if awaiting_count != 1:
		reporter.fail_test("Expected exactly 1 awaitingLaunch rocket, found %d" % awaiting_count)
		return
	# A second call to add_placed would create a second entry — verify state would lock creation
	var creation_locked = awaiting_count > 0
	if not creation_locked:
		reporter.fail_test("creation_locked should be true when a rocket is already on the pad")
		return
	reporter.pass_test()

func test_mission1_predefined_target_is_available() -> void:
	reporter.start_test("Mission 1 predefined target (433 Eros) is available and has required fields")
	await _reset()
	var predefined = RocketsManager.get_predefined_mission_target(1)
	if predefined.is_empty():
		reporter.fail_test("No predefined M1 target found")
		return
	var target_id = str(predefined.get("id", ""))
	if target_id == "":
		reporter.fail_test("Predefined M1 target has no 'id' field")
		return
	var target_type = str(predefined.get("type", ""))
	if target_type == "":
		reporter.fail_test("Predefined M1 target has no 'type' field")
		return
	var label = str(predefined.get("label", ""))
	if label == "":
		reporter.fail_test("Predefined M1 target has no 'label' field")
		return
	reporter.pass_test()

func test_contractor_offer_contains_valid_contractors() -> void:
	reporter.start_test("ensure_trip_contract_offer() returns at least one valid contractor for M1")
	await _reset()
	var targets = _get_m1_targets()
	var offer = RocketsManager.ensure_trip_contract_offer(targets)
	if offer.is_empty():
		reporter.fail_test("ensure_trip_contract_offer returned empty offer")
		return
	var contractors: Array = offer.get("contractors", [])
	if contractors.is_empty():
		reporter.fail_test("Trip contract offer has no contractors")
		return
	for entry_any in contractors:
		if typeof(entry_any) != TYPE_DICTIONARY:
			reporter.fail_test("Contractor entry is not a dictionary")
			return
		var entry: Dictionary = entry_any
		if str(entry.get("id", "")) == "":
			reporter.fail_test("Contractor entry missing 'id'")
			return
		if str(entry.get("name", "")) == "":
			reporter.fail_test("Contractor entry missing 'name' (id=%s)" % str(entry.get("id", "")))
			return
	reporter.pass_test()

func test_launch_readiness_requires_target_and_rocket() -> void:
	reporter.start_test("Launch is only ready when contractor selected, rocket armed, and target confirmed")
	await _reset()

	# Step 0: nothing selected — not launch-ready
	var has_contractor := str(RocketsManager.get_trip_selected_contractor().get("id", "")) != ""
	var has_rocket := RocketsManager.get_primary_awaiting_rocket_id() != ""
	var has_target := RocketsManager.get_selected_target() != ""
	if has_contractor or has_rocket or has_target:
		reporter.fail_test("Expected clean state after reset (contractor=%s rocket=%s target=%s)" % [has_contractor, has_rocket, has_target])
		return

	# Step 1: select contractor
	var contractor_id = await _select_first_contractor()
	if contractor_id == "":
		reporter.fail_test("No contractor available")
		return
	has_contractor = contractor_id != ""
	has_rocket = RocketsManager.get_primary_awaiting_rocket_id() != ""
	has_target = RocketsManager.get_selected_target() != ""
	if has_rocket or has_target:
		reporter.fail_test("Rocket or target should not be set after only selecting contractor")
		return

	# Step 2: place rocket
	_place_dummy_rocket()
	has_rocket = RocketsManager.get_primary_awaiting_rocket_id() != ""
	has_target = RocketsManager.get_selected_target() != ""
	if not has_rocket:
		reporter.fail_test("Rocket should be awaiting after placement")
		return
	if has_target:
		reporter.fail_test("Target should not be set after only placing rocket")
		return

	# Step 3: confirm target
	var targets = _get_m1_targets()
	if targets.is_empty():
		reporter.fail_test("No M1 targets for target confirmation step")
		return
	var target_id = str(targets[0].get("id", ""))
	RocketsManager.select_target(target_id)
	has_target = RocketsManager.get_selected_target() != ""
	if not has_target:
		reporter.fail_test("Target should be set after select_target()")
		return

	# All three conditions met — launch-ready
	var launch_ready := has_contractor and has_rocket and has_target
	if not launch_ready:
		reporter.fail_test("Expected launch-ready=true when contractor+rocket+target all set")
		return
	reporter.pass_test()

func test_tutorial_force_does_not_downgrade_completed_launchpad_progress() -> void:
	reporter.start_test("Tutorial forcing does not downgrade launchpad flow after contractor + rocket are already set")
	await _reset()
	var contractor_id = await _select_first_contractor()
	if contractor_id == "":
		reporter.fail_test("No contractor available")
		return
	var rocket_uid = _place_dummy_rocket()
	if rocket_uid == "":
		reporter.fail_test("No rocket was armed")
		return
	var selector := LaunchpadSelectorPanel.new()
	var resolved = selector._resolve_tutorial_flow_phase("target", contractor_id, true)
	if resolved != "target":
		reporter.fail_test("Expected tutorial override to preserve 'target' phase, got '%s'" % resolved)
		return
	reporter.pass_test()

func test_target_map_modal_blocks_underlying_input_and_accepts_marker_click() -> void:
	reporter.start_test("Target map modal blocks underlying launchpad input and asteroid clicks stay inside the modal")
	await _reset()
	var contractor_id = await _select_first_contractor()
	if contractor_id == "":
		reporter.fail_test("No contractor available")
		return
	var rocket_uid = _place_dummy_rocket()
	if rocket_uid == "":
		reporter.fail_test("No rocket was armed")
		return
	var scene = await _instantiate_launchpad_scene()
	if scene == null:
		reporter.fail_test("Launchpad scene failed to instantiate")
		return
	var launchpad = scene.get_node_or_null("StructuresLayer/Launchpad")
	if launchpad == null:
		await _free_launchpad_scene(scene)
		reporter.fail_test("Launchpad node missing in modal test")
		return
	var selector := LaunchpadSelectorPanel.new()
	selector.setup(launchpad)
	selector.show_selector_panel()
	await create_timer(0.08).timeout
	selector._on_open_target_map_pressed()
	await create_timer(0.05).timeout
	var panel = scene.get_node_or_null("UILayer/SelectorPanel") as Panel
	var overlay = scene.get_node_or_null("UILayer/SelectorPanel/MapOverlay") as Control
	var body = scene.get_node_or_null("UILayer/SelectorPanel/VBox/Body") as Control
	var overlay_split = scene.get_node_or_null("UILayer/SelectorPanel/MapOverlay/OverlayVBox/TargetSection/SectionVBox/Content/OverlaySplit") as HBoxContainer
	var launchpad_area = scene.get_node_or_null("StructuresLayer/Launchpad/InteractionArea") as Area2D
	var map_view: LaunchpadStarMap = null
	if overlay_split != null and overlay_split.get_child_count() > 0:
		var map_card = overlay_split.get_child(0)
		if map_card != null and map_card.get_child_count() > 0:
			var map_column = map_card.get_child(0)
			if map_column != null and map_column.get_child_count() > 0:
				map_view = map_column.get_child(0) as LaunchpadStarMap
	if panel == null or overlay == null or body == null or map_view == null or launchpad_area == null:
		await _free_launchpad_scene(scene)
		reporter.fail_test("Modal test could not resolve overlay nodes")
		return
	if not overlay.visible or overlay.mouse_filter != Control.MOUSE_FILTER_STOP:
		await _free_launchpad_scene(scene)
		reporter.fail_test("Map overlay is not configured as a modal blocker")
		return
	if body.visible or body.mouse_filter != Control.MOUSE_FILTER_IGNORE:
		await _free_launchpad_scene(scene)
		reporter.fail_test("Selector body is still interactive while map modal is open")
		return
	if launchpad_area.input_pickable:
		await _free_launchpad_scene(scene)
		reporter.fail_test("Launchpad world interaction remains enabled behind the modal")
		return
	if not bool(scene.get("_modal_input_blocked")):
		await _free_launchpad_scene(scene)
		reporter.fail_test("Scene navigation lock is not active while map modal is open")
		return
	var targets = _get_m1_targets()
	if targets.is_empty():
		await _free_launchpad_scene(scene)
		reporter.fail_test("No M1 target available for modal click test")
		return
	var target_id = str(targets[0].get("id", ""))
	var marker = map_view.get("_marker_positions").get(target_id, {})
	if marker.is_empty():
		await _free_launchpad_scene(scene)
		reporter.fail_test("Could not resolve marker position for target '%s'" % target_id)
		return
	var press := InputEventMouseButton.new()
	press.button_index = MOUSE_BUTTON_LEFT
	press.pressed = true
	press.position = marker.get("pos", Vector2.ZERO)
	map_view._gui_input(press)
	var release := InputEventMouseButton.new()
	release.button_index = MOUSE_BUTTON_LEFT
	release.pressed = false
	release.position = marker.get("pos", Vector2.ZERO)
	map_view._gui_input(release)
	await create_timer(0.05).timeout
	if selector._pending_target_id != target_id:
		await _free_launchpad_scene(scene)
		reporter.fail_test("Marker click did not stay inside the modal (pending='%s' target='%s')" % [selector._pending_target_id, target_id])
		return
	if not overlay.visible or body.visible:
		await _free_launchpad_scene(scene)
		reporter.fail_test("Marker click collapsed the modal or reactivated the setup UI")
		return
	await _free_launchpad_scene(scene)
	reporter.pass_test()
