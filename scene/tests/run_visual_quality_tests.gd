extends SceneTree

const TestReporter = preload("res://tests/TestReporter.gd")
const FrancBalanceScene = preload("res://Scenes/UI/FrancBalance.tscn")
const EarthWeatherEngine = preload("res://Scripts/Earth/Environment/EarthWeatherEngine.gd")
const UIConsistencyEnforcer = preload("res://Scripts/UI/UIConsistencyEnforcer.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

var reporter := TestReporter.new()

class WeatherProbe:
	extends Node
	var tick_count := 0
	var signal_hits := 0
	var last_cycle_t := -1.0
	var last_night_factor := -1.0
	var last_delta := -1.0

	func on_day_night_tick(cycle_t: float, night_factor: float, delta: float) -> void:
		tick_count += 1
		last_cycle_t = cycle_t
		last_night_factor = night_factor
		last_delta = delta

	func on_cycle_updated(_cycle_t: float, _night_factor: float) -> void:
		signal_hits += 1

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
	await test_primary_button_hover_state_keeps_warm_fill()
	await test_weather_cycle_and_event_hooks()
	await test_ui_consistency_enforcer_applies_expected_defaults()

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

func test_primary_button_hover_state_keeps_warm_fill() -> void:
	reporter.start_test("Primary buttons keep warm fill across hover and pressed states")
	var button := Button.new()
	PanelStyle.apply_button(button, true)
	var hover := button.get_theme_stylebox("hover") as StyleBoxFlat
	var pressed := button.get_theme_stylebox("pressed") as StyleBoxFlat
	if hover == null or pressed == null:
		reporter.fail_test("Primary button missing hover/pressed styleboxes")
		return
	if hover.bg_color.r <= hover.bg_color.b:
		reporter.fail_test("Primary hover color drifted away from warm accent: %s" % str(hover.bg_color))
		return
	if pressed.bg_color.r <= pressed.bg_color.b:
		reporter.fail_test("Primary pressed color drifted away from warm accent: %s" % str(pressed.bg_color))
		return
	reporter.pass_test()

func test_weather_cycle_and_event_hooks() -> void:
	reporter.start_test("[Baseline] Weather engine cycle updates and event hooks remain functional")
	var host = Node.new()
	get_root().add_child(host)
	var engine = EarthWeatherEngine.new()
	engine.auto_start = false
	engine.cycle_duration_seconds = 60.0
	host.add_child(engine)
	var probe = WeatherProbe.new()
	host.add_child(probe)
	engine.register_event(probe)
	engine.cycle_updated.connect(Callable(probe, "on_cycle_updated"))

	engine.set_cycle_t(0.0)
	if not is_equal_approx(engine.get_night_factor(), 0.0):
		reporter.fail_test("Expected night_factor=0.0 at cycle_t=0.0")
		host.queue_free()
		return
	engine.set_cycle_t(0.5)
	if abs(engine.get_night_factor() - 1.0) > 0.001:
		reporter.fail_test("Expected night_factor near 1.0 at cycle_t=0.5, got %s" % str(engine.get_night_factor()))
		host.queue_free()
		return
	if probe.tick_count < 2:
		reporter.fail_test("Expected weather probe to receive >=2 tick callbacks, got %s" % probe.tick_count)
		host.queue_free()
		return
	if probe.signal_hits < 2:
		reporter.fail_test("Expected cycle_updated signal hits >=2, got %s" % probe.signal_hits)
		host.queue_free()
		return
	host.queue_free()
	reporter.pass_test()

func test_ui_consistency_enforcer_applies_expected_defaults() -> void:
	reporter.start_test("[Baseline] UI consistency enforcer applies defaults and respects style locks")
	var root = Control.new()
	var launch_button = Button.new()
	launch_button.name = "LaunchButton"
	launch_button.text = "Launch"
	root.add_child(launch_button)
	var muted_label = Label.new()
	muted_label.name = "StatusHintLabel"
	root.add_child(muted_label)
	var title_label = Label.new()
	title_label.name = "TitleLabel"
	root.add_child(title_label)
	var locked = Button.new()
	locked.name = "LockedButton"
	locked.set_meta(UIConsistencyEnforcer.META_LOCK, true)
	root.add_child(locked)

	var enforcer = UIConsistencyEnforcer.new()
	enforcer._apply_tree(root)

	if not launch_button.has_theme_stylebox_override("normal"):
		reporter.fail_test("Expected LaunchButton to receive themed normal style")
		return
	if not muted_label.has_theme_color_override("font_color"):
		reporter.fail_test("Expected muted label to receive font_color override")
		return
	if not _colors_close(muted_label.get_theme_color("font_color"), PanelStyle.TEXT_MUTED):
		reporter.fail_test("Muted label color mismatch")
		return
	if not _colors_close(title_label.get_theme_color("font_color"), PanelStyle.TEXT_PRIMARY):
		reporter.fail_test("Primary label color mismatch")
		return
	if locked.has_meta(UIConsistencyEnforcer.META_KEY):
		reporter.fail_test("Locked control should not be marked as consistency-applied")
		return
	reporter.pass_test()

func _colors_close(a: Color, b: Color) -> bool:
	return (
		abs(a.r - b.r) <= 0.01 and
		abs(a.g - b.g) <= 0.01 and
		abs(a.b - b.b) <= 0.01 and
		abs(a.a - b.a) <= 0.01
	)
