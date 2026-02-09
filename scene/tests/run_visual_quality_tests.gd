extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const FrancBalanceScene = preload("res://Scenes/UI/FrancBalance.tscn")

var reporter := TestReporter.new()

func _init():
	reporter.start_suite("Visual Quality", {
		"engine": Engine.get_version_info()["string"],
		"os": OS.get_name(),
		"project": "scene",
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
	await test_project_uses_linear_canvas_filter()
	await test_franc_balance_button_has_readable_text_color()

func test_project_uses_linear_canvas_filter() -> void:
	reporter.start_test("Project canvas texture filter is linear (not nearest)")
	var filter_mode = int(ProjectSettings.get_setting("rendering/textures/canvas_textures/default_texture_filter", 0))
	if filter_mode == 0:
		reporter.fail_test("Expected non-nearest default texture filter, got 0")
		return
	reporter.pass_test()

func test_franc_balance_button_has_readable_text_color() -> void:
	reporter.start_test("Franc balance button keeps readable text/background contrast")
	var node = FrancBalanceScene.instantiate()
	get_root().add_child(node)
	await create_timer(0.02).timeout
	var button = node.get_node_or_null("Container/BalanceButton")
	if button == null:
		reporter.fail_test("BalanceButton node not found")
		node.queue_free()
		return
	var font_color: Color = button.get_theme_color("font_color")
	var bg_style = button.get_theme_stylebox("normal")
	var bg_color := Color(0.0, 0.0, 0.0, 1.0)
	if bg_style is StyleBoxFlat:
		bg_color = (bg_style as StyleBoxFlat).bg_color
	var luminance_font = 0.2126 * font_color.r + 0.7152 * font_color.g + 0.0722 * font_color.b
	var luminance_bg = 0.2126 * bg_color.r + 0.7152 * bg_color.g + 0.0722 * bg_color.b
	if abs(luminance_font - luminance_bg) < 0.35:
		reporter.fail_test("BalanceButton contrast too low (font=%s bg=%s)" % [str(font_color), str(bg_color)])
		node.queue_free()
		return
	node.queue_free()
	reporter.pass_test()
