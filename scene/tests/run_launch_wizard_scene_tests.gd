extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const LaunchWizardScene = preload("res://Scenes/UI/LaunchWizard.tscn")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")

var reporter := TestReporter.new()

func _init() -> void:
	reporter.start_suite("Launch Wizard Scene UI", {
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
	await test_contractor_step_uses_scene_owned_nodes()
	await test_remaining_steps_use_scene_owned_nodes()
	await test_target_detail_uses_scene_template()
	await test_map_step_uses_template_backed_target_labels()

func _reset_state() -> void:
	RocketsManager.clear_override_state()
	RocketsManager.reset_state()
	var state := RocketsManager.load_state()
	state["mission_progress_completed"] = 0
	state["completed_mission_badges"] = []
	state["starter_contract_offer"] = {}
	state["trip_contract_offer"] = {}
	state["operation_mode"] = "contract"
	RocketsManager.save_state(state)

func test_contractor_step_uses_scene_owned_nodes() -> void:
	reporter.start_test("Contractor selection step uses scene-owned controls")
	_reset_state()
	var wizard := LaunchWizardScene.instantiate()
	get_root().add_child(wizard)
	await create_timer(0.35).timeout

	var contractor_step = wizard.get_node_or_null("Scaffold/Scroll/ScrollMargin/CardList/ContractorStep")
	var intro_title = wizard.get_node_or_null("Scaffold/Scroll/ScrollMargin/CardList/ContractorStep/IntroPanel/Margin/VBox/TitleLabel")
	var grid = wizard.get_node_or_null("Scaffold/Scroll/ScrollMargin/CardList/ContractorStep/ContractorGrid")
	var locked = wizard.get_node_or_null("Scaffold/Scroll/ScrollMargin/CardList/ContractorStep/CustomMissionCard")
	if contractor_step == null or intro_title == null or grid == null or locked == null:
		reporter.fail_test("Expected contractor step layout nodes to exist in LaunchWizard.tscn")
		wizard.queue_free()
		return
	if not contractor_step.visible:
		reporter.fail_test("Expected contractor step to be visible on first launch wizard step")
		wizard.queue_free()
		return
	if grid.get_child_count() < 3:
		reporter.fail_test("Expected runtime contractor cards to populate the scene-owned ContractorGrid")
		wizard.queue_free()
		return
	var first_card = grid.get_child(0)
	if first_card.get_node_or_null("Margin/VBox/TopRow/TitleColumn/NameLabel") == null:
		reporter.fail_test("Expected contractor cards to be instances of the scene card template")
		wizard.queue_free()
		return
	wizard.queue_free()
	reporter.pass_test()

func test_remaining_steps_use_scene_owned_nodes() -> void:
	reporter.start_test("Target, rocket, and confirm steps use scene-owned controls")
	_reset_state()
	var wizard = LaunchWizardScene.instantiate()
	get_root().add_child(wizard)
	await create_timer(0.35).timeout

	var target_step = wizard.get_node_or_null("Scaffold/Scroll/ScrollMargin/CardList/TargetStep")
	var map_step = wizard.get_node_or_null("Scaffold/Scroll/ScrollMargin/CardList/TargetStep/MapPanel/MapStep")
	var target_detail = wizard.get_node_or_null("Scaffold/Scroll/ScrollMargin/CardList/TargetStep/TargetDetailCard")
	var rocket_step = wizard.get_node_or_null("Scaffold/Scroll/ScrollMargin/CardList/RocketStep")
	var rocket_list = wizard.get_node_or_null("Scaffold/Scroll/ScrollMargin/CardList/RocketStep/RocketListColumn")
	var assembly_box = wizard.get_node_or_null("Scaffold/Scroll/ScrollMargin/CardList/RocketStep/AssemblyPanel/Margin/VBox/PartsBox")
	var confirm_step = wizard.get_node_or_null("Scaffold/Scroll/ScrollMargin/CardList/ConfirmStep")
	var rows_box = wizard.get_node_or_null("Scaffold/Scroll/ScrollMargin/CardList/ConfirmStep/SummaryCard/Margin/VBox/RowsBox")
	if target_step == null or map_step == null or target_detail == null or rocket_step == null or rocket_list == null or assembly_box == null or confirm_step == null or rows_box == null:
		reporter.fail_test("Expected target, rocket, and confirm step layout nodes to exist in LaunchWizard.tscn")
		wizard.queue_free()
		return

	wizard._show_step(1)
	await create_timer(0.35).timeout
	if not target_step.visible:
		reporter.fail_test("Expected TargetStep scene node to be visible on target step")
		wizard.queue_free()
		return

	wizard._show_step(2)
	await create_timer(0.35).timeout
	if not rocket_step.visible:
		reporter.fail_test("Expected RocketStep scene node to be visible on rocket step")
		wizard.queue_free()
		return
	if rocket_list.get_child_count() < 1:
		reporter.fail_test("Expected rocket list column to populate scene-owned rocket tile instances")
		wizard.queue_free()
		return
	var rocket_tile = rocket_list.get_child(0)
	if rocket_tile.get_node_or_null("Margin/VBox/ButtonRow/SelectButton") == null:
		reporter.fail_test("Expected rocket tiles to be instances of the scene tile template")
		wizard.queue_free()
		return

	wizard._selected_rocket = "starterrocket1"
	wizard._show_step(3)
	await create_timer(0.35).timeout
	if not confirm_step.visible:
		reporter.fail_test("Expected ConfirmStep scene node to be visible on confirm step")
		wizard.queue_free()
		return
	if rows_box.get_child_count() < 4:
		reporter.fail_test("Expected confirm rows box to populate scene-owned summary rows")
		wizard.queue_free()
		return
	var confirm_row = rows_box.get_child(0)
	if confirm_row.get_node_or_null("ValueLabel") == null:
		reporter.fail_test("Expected confirm rows to be instances of the scene row template")
		wizard.queue_free()
		return

	wizard.queue_free()
	reporter.pass_test()

func test_target_detail_uses_scene_template() -> void:
	reporter.start_test("Target detail card uses template-backed scene content")
	_reset_state()
	var wizard = LaunchWizardScene.instantiate()
	get_root().add_child(wizard)
	await create_timer(0.35).timeout

	wizard._show_step(1)
	await create_timer(0.35).timeout
	var selectable_targets: Array = wizard._targets
	if selectable_targets.is_empty():
		reporter.fail_test("Expected at least one selectable target for target detail test")
		wizard.queue_free()
		return
	wizard._refresh_target_detail(selectable_targets[0])
	await create_timer(0.05).timeout

	var detail_card = wizard.get_node_or_null("Scaffold/Scroll/ScrollMargin/CardList/TargetStep/TargetDetailCard")
	if detail_card == null:
		reporter.fail_test("Expected TargetDetailCard scene node")
		wizard.queue_free()
		return
	var required_names = ["HeaderRow", "IconLabel", "NameLabel", "StatsRow", "ScienceLabel"]
	for node_name in required_names:
		if detail_card.find_child(node_name, true, false) == null:
			reporter.fail_test("Expected target detail template node named %s" % node_name)
			wizard.queue_free()
			return

	wizard.queue_free()
	reporter.pass_test()

func test_map_step_uses_template_backed_target_labels() -> void:
	reporter.start_test("LaunchWizard map step uses template-backed target labels")
	_reset_state()
	var wizard = LaunchWizardScene.instantiate()
	get_root().add_child(wizard)
	await create_timer(0.35).timeout

	wizard._show_step(1)
	await create_timer(0.35).timeout
	var map_step = wizard.get_node_or_null("Scaffold/Scroll/ScrollMargin/CardList/TargetStep/MapPanel/MapStep")
	if map_step == null:
		reporter.fail_test("Expected LaunchWizard MapStep node")
		wizard.queue_free()
		return
	var label_layer = map_step.get_node_or_null("LabelLayer")
	if label_layer == null:
		reporter.fail_test("Expected scene-owned LabelLayer under LaunchWizard MapStep")
		wizard.queue_free()
		return
	var found_template_label := false
	for child in label_layer.get_children():
		if child is Label and str(child.get_meta("ui_template", "")) == "LaunchWizardMapTargetLabel":
			found_template_label = true
			break
	if not found_template_label:
		reporter.fail_test("Expected template-backed LaunchWizardMapTargetLabel under map step")
		wizard.queue_free()
		return

	wizard.queue_free()
	reporter.pass_test()
