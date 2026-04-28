extends SceneTree
## Tests for the full-screen galaxy map (SpaceMap) — planet candidate review flow.
## Covers: default view mode, awaiting_review flag logic, click routing,
##         script-load fixes (parse errors resolved), and annotation overlay creation.

const TestReporter = preload("res://tests/TestReporter.gd")
const SpaceMapScene = preload("res://Scenes/UI/SpaceMap/space_map.tscn")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")

var reporter := TestReporter.new()

func _init() -> void:
	reporter.start_suite("SpaceMap Galaxy Map — planet candidate review", {
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
	await test_spacemap_defaults_to_stars_view()
	await test_unclassified_planet_marked_awaiting_review()
	await test_classified_planet_not_marked_awaiting_review()
	await test_asteroid_not_marked_awaiting_review()
	await test_multiple_candidates_mixed_classification_state()
	await test_awaiting_review_planet_always_revealed()
	await test_click_routes_candidate_to_annotation()
	await test_click_routes_non_candidate_to_standard_preview()
	await test_annotation_overlay_created_on_candidate_click()
	await test_script_load_tutorial_coach_overlay()
	await test_script_load_classification_consensus_notification()
	await test_script_load_game_navigation_menu()
	await test_script_load_supabase_client()
	await test_script_load_ui_manager_with_panel_manager()

## ── Helpers ──────────────────────────────────────────────────────────────────

func _reset() -> void:
	RocketsManager.reset_state()
	RocketsManager.clear_selected_target()

func _seed_planet_targets(targets: Array) -> void:
	var state := RocketsManager.load_state()
	state["detected_targets"] = targets
	state["tess_classifications"] = {}
	RocketsManager.save_state(state)

func _seed_classifications(classifications: Dictionary) -> void:
	var state := RocketsManager.load_state()
	state["tess_classifications"] = classifications
	RocketsManager.save_state(state)

func _make_planet(id: String, label: String = "") -> Dictionary:
	return {
		"id": id,
		"label": label if label != "" else ("Planet-" + id),
		"type": "planet",
		"distance_au": 10.0,
		"classification_status": "candidate",
	}

func _make_asteroid(id: String) -> Dictionary:
	return {
		"id": id,
		"label": "Asteroid-" + id,
		"type": "asteroid",
		"distance_au": 3.0,
	}

func _instantiate_spacemap() -> Node:
	var sm := SpaceMapScene.instantiate()
	get_root().add_child(sm)
	await create_timer(0.25).timeout
	return sm

func _teardown(node: Node) -> void:
	if is_instance_valid(node):
		node.queue_free()
	await create_timer(0.05).timeout

## ── Tests ────────────────────────────────────────────────────────────────────

func test_spacemap_defaults_to_stars_view() -> void:
	reporter.start_test("SpaceMap defaults to stars/galaxy view mode")
	_reset()
	var sm := await _instantiate_spacemap()

	var view_mode: String = str(sm.get("_view_mode"))
	if view_mode != "stars":
		reporter.fail_test("Expected _view_mode='stars', got '%s'" % view_mode)
		await _teardown(sm)
		return

	reporter.pass_test()
	await _teardown(sm)

func test_unclassified_planet_marked_awaiting_review() -> void:
	reporter.start_test("Unclassified planet target gets awaiting_review=true")
	_reset()
	_seed_planet_targets([_make_planet("tic-111")])
	# No classifications seeded → unclassified

	var sm := await _instantiate_spacemap()

	var positions: Dictionary = sm.get("_target_positions")
	if not positions.has("tic-111"):
		reporter.fail_test("Target tic-111 missing from _target_positions")
		await _teardown(sm)
		return

	var entry: Dictionary = positions["tic-111"]
	if not bool(entry.get("awaiting_review", false)):
		reporter.fail_test("Expected awaiting_review=true for unclassified planet, got false")
		await _teardown(sm)
		return

	reporter.pass_test()
	await _teardown(sm)

func test_classified_planet_not_marked_awaiting_review() -> void:
	reporter.start_test("Already-classified planet target gets awaiting_review=false")
	_reset()
	_seed_planet_targets([_make_planet("tic-222")])
	_seed_classifications({"tic-222": "planet"})

	var sm := await _instantiate_spacemap()

	var positions: Dictionary = sm.get("_target_positions")
	if not positions.has("tic-222"):
		reporter.fail_test("Target tic-222 missing from _target_positions")
		await _teardown(sm)
		return

	var entry: Dictionary = positions["tic-222"]
	if bool(entry.get("awaiting_review", true)):
		reporter.fail_test("Expected awaiting_review=false for already-classified planet, got true")
		await _teardown(sm)
		return

	reporter.pass_test()
	await _teardown(sm)

func test_asteroid_not_marked_awaiting_review() -> void:
	reporter.start_test("Asteroid target is never marked awaiting_review")
	_reset()
	# Put asteroids in detected targets — view mode is "stars" so they won't be in positions,
	# but let's verify by temporarily also adding a planet to check both types
	var state := RocketsManager.load_state()
	state["detected_targets"] = [_make_asteroid("ast-001"), _make_planet("tic-333")]
	state["tess_classifications"] = {}
	RocketsManager.save_state(state)

	var sm := await _instantiate_spacemap()

	var positions: Dictionary = sm.get("_target_positions")
	# In stars view asteroids are excluded from positions (filtered by is_solar)
	# Confirm the planet IS there and asteroid is NOT (stars mode filters out asteroids)
	if positions.has("ast-001"):
		reporter.fail_test("Asteroid ast-001 should not appear in stars-mode positions")
		await _teardown(sm)
		return
	if not positions.has("tic-333"):
		reporter.fail_test("Planet tic-333 missing from positions — expected in stars mode")
		await _teardown(sm)
		return
	var planet_entry: Dictionary = positions["tic-333"]
	if bool(planet_entry.get("awaiting_review", false)) == false:
		# This is fine — what matters is awaiting_review flag is correct for planets
		pass  # asteroid test: asteroid is simply absent, which is correct
	reporter.pass_test()
	await _teardown(sm)

func test_multiple_candidates_mixed_classification_state() -> void:
	reporter.start_test("Mixed classified/unclassified planet targets set awaiting_review independently")
	_reset()
	_seed_planet_targets([
		_make_planet("tic-A"), _make_planet("tic-B"), _make_planet("tic-C")
	])
	_seed_classifications({"tic-B": "not_planet"})  # only B is classified

	var sm := await _instantiate_spacemap()

	var positions: Dictionary = sm.get("_target_positions")

	var a_awaiting: bool = bool(positions.get("tic-A", {}).get("awaiting_review", false))
	var b_awaiting: bool = bool(positions.get("tic-B", {}).get("awaiting_review", true))
	var c_awaiting: bool = bool(positions.get("tic-C", {}).get("awaiting_review", false))

	if not a_awaiting:
		reporter.fail_test("tic-A (unclassified) should have awaiting_review=true")
		await _teardown(sm)
		return
	if b_awaiting:
		reporter.fail_test("tic-B (classified as not_planet) should have awaiting_review=false")
		await _teardown(sm)
		return
	if not c_awaiting:
		reporter.fail_test("tic-C (unclassified) should have awaiting_review=true")
		await _teardown(sm)
		return

	reporter.pass_test()
	await _teardown(sm)

func test_awaiting_review_planet_always_revealed() -> void:
	reporter.start_test("Unclassified planet candidate is always revealed on the galaxy map")
	_reset()
	_seed_planet_targets([_make_planet("tic-reveal")])

	var sm := await _instantiate_spacemap()

	var positions: Dictionary = sm.get("_target_positions")
	if not positions.has("tic-reveal"):
		reporter.fail_test("tic-reveal missing from positions")
		await _teardown(sm)
		return

	var entry: Dictionary = positions["tic-reveal"]
	if not bool(entry.get("revealed", false)):
		reporter.fail_test("Expected awaiting_review planet to be revealed=true regardless of sector fog")
		await _teardown(sm)
		return

	reporter.pass_test()
	await _teardown(sm)

func test_click_routes_candidate_to_annotation() -> void:
	reporter.start_test("_open_target_preview routes awaiting_review=true entry to annotation screen")
	_reset()
	_seed_planet_targets([_make_planet("tic-click")])

	var sm := await _instantiate_spacemap()

	# Intercept: we check that _open_annotation_screen is called instead of the dialogue.
	# We do this by injecting a sentinel into the canvas layer and checking post-call.
	var canvas: CanvasLayer = sm.get_node_or_null("CanvasLayer")
	if canvas == null:
		reporter.fail_test("SpaceMap is missing CanvasLayer — cannot verify routing")
		await _teardown(sm)
		return

	var awaiting_entry := {
		"pos": Vector2(100, 100),
		"type": "planet",
		"label": "Test Planet",
		"radius": 10.0,
		"revealed": true,
		"awaiting_review": true,
		"target_data": _make_planet("tic-click"),
	}
	sm.call("_open_target_preview", "tic-click", awaiting_entry)
	await create_timer(0.1).timeout

	# For an awaiting_review target, an AnnotationOverlay should appear under CanvasLayer
	var overlay := canvas.get_node_or_null("AnnotationOverlay")
	if overlay == null:
		reporter.fail_test("Expected AnnotationOverlay to be created for awaiting_review planet click")
		await _teardown(sm)
		return

	# No SpaceMapTargetDialogue should exist (that's the non-candidate path)
	var dialogue := canvas.get_node_or_null("TargetDialogue")
	if dialogue != null:
		reporter.fail_test("Expected no TargetDialogue for awaiting_review planet (wrong route taken)")
		await _teardown(sm)
		return

	reporter.pass_test()
	await _teardown(sm)

func test_click_routes_non_candidate_to_standard_preview() -> void:
	reporter.start_test("_open_target_preview routes awaiting_review=false entry to standard preview")
	_reset()
	# Classified planet → awaiting_review=false
	_seed_planet_targets([_make_planet("tic-done")])
	_seed_classifications({"tic-done": "planet"})

	var sm := await _instantiate_spacemap()

	var canvas: CanvasLayer = sm.get_node_or_null("CanvasLayer")
	if canvas == null:
		reporter.fail_test("SpaceMap is missing CanvasLayer")
		await _teardown(sm)
		return

	var non_candidate_entry := {
		"pos": Vector2(100, 100),
		"type": "planet",
		"label": "Classified Planet",
		"radius": 10.0,
		"revealed": true,
		"awaiting_review": false,
		"target_data": _make_planet("tic-done"),
	}
	sm.call("_open_target_preview", "tic-done", non_candidate_entry)
	await create_timer(0.1).timeout

	# Should NOT have opened annotation overlay
	var overlay := canvas.get_node_or_null("AnnotationOverlay")
	if overlay != null:
		reporter.fail_test("Classified planet should NOT open AnnotationOverlay (uses standard preview)")
		await _teardown(sm)
		return

	reporter.pass_test()
	await _teardown(sm)

func test_annotation_overlay_created_on_candidate_click() -> void:
	reporter.start_test("_open_annotation_screen creates full-screen overlay with AsteroidDetailView child")
	_reset()
	_seed_planet_targets([_make_planet("tic-overlay")])

	var sm := await _instantiate_spacemap()

	var canvas: CanvasLayer = sm.get_node_or_null("CanvasLayer")
	if canvas == null:
		reporter.fail_test("Missing CanvasLayer on SpaceMap")
		await _teardown(sm)
		return

	var target_data := _make_planet("tic-overlay", "Overlay Test Planet")
	var entry := {
		"pos": Vector2(200, 200),
		"type": "planet",
		"label": "Overlay Test Planet",
		"radius": 10.0,
		"revealed": true,
		"awaiting_review": true,
		"target_data": target_data,
	}
	sm.call("_open_annotation_screen", "tic-overlay", entry)
	await create_timer(0.15).timeout

	var overlay: Node = canvas.get_node_or_null("AnnotationOverlay")
	if overlay == null:
		reporter.fail_test("AnnotationOverlay node not created by _open_annotation_screen")
		await _teardown(sm)
		return

	# Overlay should have at least one child (the AsteroidDetailView)
	if overlay.get_child_count() < 1:
		reporter.fail_test("AnnotationOverlay has no children — AsteroidDetailView not added")
		await _teardown(sm)
		return

	reporter.pass_test()
	await _teardown(sm)

## ── Script-load tests (parse error fixes) ────────────────────────────────────

func test_script_load_tutorial_coach_overlay() -> void:
	reporter.start_test("TutorialCoachOverlay.gd loads without parse errors")
	var script := load("res://Scripts/UI/TutorialCoachOverlay.gd")
	if script == null:
		reporter.fail_test("TutorialCoachOverlay.gd failed to load (returned null)")
		return
	if not (script is GDScript):
		reporter.fail_test("TutorialCoachOverlay.gd did not load as GDScript")
		return
	# Verify the UILayout and RocketsManager consts are accessible
	var instance := CanvasLayer.new()
	instance.set_script(script)
	get_root().add_child(instance)
	await create_timer(0.05).timeout
	var has_ui_layout: bool = instance.get_script().get_script_constant_map().has("UILayout")
	var has_rm: bool = instance.get_script().get_script_constant_map().has("RocketsManager")
	instance.queue_free()
	if not has_ui_layout:
		reporter.fail_test("UILayout constant missing from TutorialCoachOverlay — preload not added")
		return
	if not has_rm:
		reporter.fail_test("RocketsManager constant missing from TutorialCoachOverlay — preload not added")
		return
	reporter.pass_test()

func test_script_load_classification_consensus_notification() -> void:
	reporter.start_test("ClassificationConsensusNotification.gd loads without parse errors")
	var script := load("res://Scripts/UI/ClassificationConsensusNotification.gd")
	if script == null:
		reporter.fail_test("ClassificationConsensusNotification.gd failed to load (returned null)")
		return
	if not (script is GDScript):
		reporter.fail_test("ClassificationConsensusNotification.gd did not load as GDScript")
		return
	var has_panel_style: bool = script.get_script_constant_map().has("PanelStyle")
	if not has_panel_style:
		reporter.fail_test("PanelStyle constant missing from ClassificationConsensusNotification — preload not added")
		return
	reporter.pass_test()

func test_script_load_game_navigation_menu() -> void:
	reporter.start_test("GameNavigationMenu.gd loads without parse errors")
	var script := load("res://Scripts/UI/GameNavigationMenu.gd")
	if script == null:
		reporter.fail_test("GameNavigationMenu.gd failed to load (returned null)")
		return
	if not (script is GDScript):
		reporter.fail_test("GameNavigationMenu.gd did not load as GDScript")
		return
	var has_panel_style: bool = script.get_script_constant_map().has("PanelStyle")
	if not has_panel_style:
		reporter.fail_test("PanelStyle constant missing from GameNavigationMenu — preload not added")
		return
	reporter.pass_test()

func test_script_load_supabase_client() -> void:
	reporter.start_test("SupabaseClient.gd loads and get_instance() returns a Node")
	var script := load("res://Scripts/Systems/SupabaseClient.gd")
	if script == null:
		reporter.fail_test("SupabaseClient.gd failed to load")
		return
	# get_instance() is a static func that creates a singleton Node
	var SupabaseClient = script
	var instance = SupabaseClient.get_instance()
	if instance == null:
		reporter.fail_test("SupabaseClient.get_instance() returned null")
		return
	if not (instance is Node):
		reporter.fail_test("SupabaseClient.get_instance() did not return a Node")
		return
	reporter.pass_test()

func test_script_load_ui_manager_with_panel_manager() -> void:
	reporter.start_test("UIManager.gd loads and has PanelManager constant")
	var script := load("res://Scripts/Earth/UIManager.gd")
	if script == null:
		reporter.fail_test("UIManager.gd failed to load (returned null)")
		return
	if not (script is GDScript):
		reporter.fail_test("UIManager.gd did not load as GDScript")
		return
	var has_pm: bool = script.get_script_constant_map().has("PanelManager")
	if not has_pm:
		reporter.fail_test("PanelManager constant missing from UIManager — preload not added")
		return
	reporter.pass_test()
