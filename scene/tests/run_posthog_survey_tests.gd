extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const PostHogNativeSurveyBridge = preload("res://Scripts/Systems/PostHogNativeSurveyBridge.gd")
const LaunchWizardScene = preload("res://Scenes/UI/LaunchWizard.tscn")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")

var reporter := TestReporter.new()

func _init() -> void:
	reporter.start_suite("PostHog Survey Triggers", {
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
	await test_native_survey_bridge_opens_expected_external_urls_once()
	await test_launch_wizard_contractor_selection_triggers_native_survey()

func test_native_survey_bridge_opens_expected_external_urls_once() -> void:
	reporter.start_test("Native survey bridge opens expected external survey URLs once")
	_reset_native_survey_state()
	PostHogNativeSurveyBridge.handle_event("contractor_signed", {
		"mission_stage": 1,
		"contractor_id": "test-contractor"
	})
	PostHogNativeSurveyBridge.handle_event("mining_run_completed", {
		"mission_stage": 1,
		"target_id": "test-asteroid",
		"target_type": "asteroid"
	})
	PostHogNativeSurveyBridge.handle_event("scanner_scan_completed", {
		"mission_stage": 3,
		"target_id": "TIC-123",
		"target_type": "planet"
	})
	PostHogNativeSurveyBridge.handle_event("mission_debrief_resolved", {
		"mission_stage": 1,
		"mission_count": 1,
		"target_id": "test-asteroid",
		"target_type": "asteroid"
	})
	PostHogNativeSurveyBridge.handle_event("mission_debrief_resolved", {
		"mission_stage": 2,
		"mission_count": 2,
		"target_id": "test-asteroid-2",
		"target_type": "asteroid"
	})
	PostHogNativeSurveyBridge.handle_event("contractor_signed", {
		"mission_stage": 1,
		"contractor_id": "test-contractor"
	})

	var urls := PostHogNativeSurveyBridge.opened_urls
	if urls.size() != 5:
		reporter.fail_test("Expected 5 native survey URLs, got %d: %s" % [urls.size(), str(urls)])
		return
	if not _urls_contain(urls, "micro_contractor_first_impression"):
		return
	if not _urls_contain(urls, "micro_mining_loop_feel"):
		return
	if not _urls_contain(urls, "micro_real_science_awareness"):
		return
	if not _urls_contain(urls, "experiment1_first_mission"):
		return
	if not _urls_contain(urls, "micro_mission_progression_clarity"):
		return
	reporter.pass_test()

func _urls_contain(urls: Array[String], needle: String) -> bool:
	for url in urls:
		if url.find(needle) >= 0:
			return true
	reporter.fail_test("Expected native survey URL containing '%s'; got %s" % [needle, str(urls)])
	return false

func _reset_native_survey_state() -> void:
	PostHogNativeSurveyBridge.reset_for_tests()
	var absolute_path := ProjectSettings.globalize_path("user://posthog_native_survey_gates.cfg")
	if FileAccess.file_exists(absolute_path):
		DirAccess.remove_absolute(absolute_path)

func test_launch_wizard_contractor_selection_triggers_native_survey() -> void:
	reporter.start_test("LaunchWizard contractor selection triggers native contractor survey")
	_reset_native_survey_state()
	_reset_rocket_state()
	var wizard := LaunchWizardScene.instantiate()
	get_root().add_child(wizard)
	await create_timer(0.55).timeout
	wizard.call("_rebuild_cards")
	await create_timer(0.05).timeout
	var grid = wizard.get_node_or_null("Scaffold/Scroll/ScrollMargin/CardList/ContractorStep/ContractorGrid")
	if grid == null or grid.get_child_count() == 0:
		reporter.fail_test("Expected LaunchWizard contractor cards")
		wizard.queue_free()
		return
	var first_card = grid.get_child(0)
	var button = first_card.get_node_or_null("Margin/VBox/SelectButton") as Button
	if button == null:
		reporter.fail_test("Expected first contractor card select button")
		wizard.queue_free()
		return
	button.pressed.emit()
	await create_timer(0.05).timeout
	wizard.queue_free()
	var urls := PostHogNativeSurveyBridge.opened_urls
	if urls.size() != 1 or urls[0].find("micro_contractor_first_impression") < 0:
		reporter.fail_test("Expected one contractor survey URL from LaunchWizard, got %s" % str(urls))
		return
	reporter.pass_test()

func _reset_rocket_state() -> void:
	RocketsManager.clear_override_state()
	RocketsManager.reset_state()
	var state := RocketsManager.load_state()
	state["mission_progress_completed"] = 0
	state["completed_mission_badges"] = []
	state["starter_contract_offer"] = {}
	state["trip_contract_offer"] = {}
	state["operation_mode"] = "contract"
	state["planning_step"] = 0
	state["planning_rocket_type"] = ""
	state["selected_target"] = ""
	RocketsManager.save_state(state)
