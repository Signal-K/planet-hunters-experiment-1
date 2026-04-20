extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const EarthBaseScene = preload("res://Scenes/Earth/earth_base_1.tscn")
const TutorialOverlayScene = preload("res://Scenes/UI/TutorialCoachOverlay.tscn")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")

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
	await test_sr2_unlock_overlay_matches_layout_and_copy()
	await test_earth_base_active_mission_card_overrides_build_prompt()
	await test_tutorial_overlay_uses_active_mission_context_on_earth_base()

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

func test_sr2_unlock_overlay_matches_layout_and_copy() -> void:
	reporter.start_test("SR2 unlock overlay shows the mission-complete beat, range upgrade, and mission CTA")
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

	scene.queue_free()
	await create_timer(0.05).timeout
	reporter.pass_test()

func test_earth_base_active_mission_card_overrides_build_prompt() -> void:
	reporter.start_test("Earth base shows active mission card instead of build prompt when a mission is already armed")
	RocketsManager.reset_state()
	RocketsManager.mark_mission_completed("mission-1-active-card-test")
	RocketsManager.add_placed("starterrocket1", Vector2(-110.0, -170.0))
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
	if _find_label_containing(cards_root, "Build Control Station") != null:
		reporter.fail_test("Build Control Station card should be suppressed while an active mission is already armed")
		scene.queue_free()
		RocketsManager.reset_state()
		return
	if _find_label_containing(cards_root, "Launch Ready on Pad") == null:
		reporter.fail_test("Expected active mission card to replace the build prompt")
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

func test_tutorial_overlay_uses_active_mission_context_on_earth_base() -> void:
	reporter.start_test("Tutorial coach uses active mission context on Earth base instead of stale launchpad step copy")
	RocketsManager.reset_state()
	RocketsManager.mark_mission_completed("mission-1-overlay-context-test")
	RocketsManager.add_placed("starterrocket1", Vector2(-110.0, -170.0))
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
	await create_timer(0.03).timeout

	if overlay.title_label.text == "Pick Contractor":
		reporter.fail_test("Expected overlay title to switch to the active mission context")
		overlay.queue_free()
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	if overlay.title_label.text.find("Launch Ready on Pad") == -1:
		reporter.fail_test("Expected launch-ready title when a rocket is already armed on Earth base")
		overlay.queue_free()
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	if overlay.message_label.text.find("armed") == -1:
		reporter.fail_test("Expected overlay message to describe the active mission state")
		overlay.queue_free()
		scene.queue_free()
		current_scene = null
		RocketsManager.reset_state()
		return
	if overlay.open_launchpad_button == null or not overlay.open_launchpad_button.visible:
		reporter.fail_test("Expected overlay CTA to keep the player in the correct launchpad resume flow")
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
