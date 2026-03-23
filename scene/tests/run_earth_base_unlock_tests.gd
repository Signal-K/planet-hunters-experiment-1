extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const EarthBaseScene = preload("res://Scenes/Earth/earth_base_1.tscn")

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
