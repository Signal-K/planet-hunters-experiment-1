extends RefCounted
class_name GameNavigationMenu

const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const AppLogger = preload("res://Scripts/Utils/Logger.gd")

const MENU_LAYER_NAME := "GameMenuLayer"
const MENU_ROOT_NAME := "GameMenuRoot"
const MENU_PANEL_NAME := "GameMenuPanel"
const MENU_LAYER_Z := 150

const TITLE_COLOR := Color(0.95, 0.93, 0.90, 1.0)
const TEXT_COLOR := Color(0.82, 0.84, 0.88, 1.0)
const CYAN := Color(0.28, 0.88, 0.96, 1.0)
const AMBER := Color(0.941, 0.690, 0.188, 1.0)

static func toggle(owner: Node) -> void:
	if owner == null or owner.get_tree() == null:
		return
	if is_open(owner.get_tree()):
		close(owner)
	else:
		open(owner)

static func open(owner: Node) -> void:
	if owner == null or owner.get_tree() == null:
		return
	var tree := owner.get_tree()
	if is_open(tree):
		return
	if tree.root == null:
		return

	var layer := CanvasLayer.new()
	layer.name = MENU_LAYER_NAME
	layer.layer = MENU_LAYER_Z
	layer.set_meta("tutorial_zone_exempt", true)
	layer.process_mode = Node.PROCESS_MODE_ALWAYS

	var menu_root := _build_menu_root(owner)
	layer.add_child(menu_root)
	tree.root.add_child(layer)
	_set_tutorial_overlay_visible(tree, false)
	AppLogger.d("GameNavigationMenu: opened")

static func close(owner: Node) -> void:
	if owner == null or owner.get_tree() == null or owner.get_tree().root == null:
		return
	var tree := owner.get_tree()
	var layer := tree.root.get_node_or_null(MENU_LAYER_NAME)
	if layer != null:
		layer.queue_free()
	_set_tutorial_overlay_visible(tree, true)
	AppLogger.d("GameNavigationMenu: closed")

static func is_open(tree: SceneTree) -> bool:
	if tree == null or tree.root == null:
		return false
	return tree.root.get_node_or_null(MENU_LAYER_NAME) != null

static func _build_menu_root(owner: Node) -> Control:
	var root := Control.new()
	root.name = MENU_ROOT_NAME
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	root.process_mode = Node.PROCESS_MODE_ALWAYS
	root.set_meta("tutorial_zone_exempt", true)

	var overlay := ColorRect.new()
	overlay.name = "Backdrop"
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.color = Color(0.03, 0.05, 0.09, 0.70)
	overlay.set_meta("tutorial_zone_exempt", true)
	root.add_child(overlay)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_STOP
	center.set_meta("tutorial_zone_exempt", true)
	root.add_child(center)

	var panel := PanelContainer.new()
	panel.name = MENU_PANEL_NAME
	panel.custom_minimum_size = Vector2(740.0, 620.0)
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	panel.set_meta("tutorial_zone_exempt", true)
	center.add_child(panel)

	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.04, 0.06, 0.12, 0.96)
	panel_style.border_color = CYAN
	panel_style.set_border_width_all(2)
	panel_style.set_corner_radius_all(8)
	panel_style.content_margin_left = 24
	panel_style.content_margin_right = 24
	panel_style.content_margin_top = 20
	panel_style.content_margin_bottom = 20
	panel.add_theme_stylebox_override("panel", panel_style)

	var shell := VBoxContainer.new()
	shell.add_theme_constant_override("separation", 14)
	panel.add_child(shell)

	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 12)
	shell.add_child(header)

	var title := Label.new()
	title.text = "Main Menu"
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.add_theme_font_size_override("font_size", 34)
	title.add_theme_color_override("font_color", TITLE_COLOR)
	header.add_child(title)

	var close_btn := _build_button("Close", false)
	close_btn.custom_minimum_size = Vector2(140, 50)
	close_btn.pressed.connect(func():
		preload("res://Scripts/UI/GameNavigationMenu.gd").close(owner)
	)
	header.add_child(close_btn)

	var stats_card := PanelContainer.new()
	var stats_style := StyleBoxFlat.new()
	stats_style.bg_color = Color(0.08, 0.11, 0.20, 0.88)
	stats_style.border_color = Color(CYAN.r, CYAN.g, CYAN.b, 0.45)
	stats_style.set_border_width_all(1)
	stats_style.set_corner_radius_all(6)
	stats_style.content_margin_left = 12
	stats_style.content_margin_right = 12
	stats_style.content_margin_top = 10
	stats_style.content_margin_bottom = 10
	stats_card.add_theme_stylebox_override("panel", stats_style)
	shell.add_child(stats_card)

	var stats := Label.new()
	stats.text = _build_stats_text()
	stats.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stats.add_theme_font_size_override("font_size", 20)
	stats.add_theme_color_override("font_color", TEXT_COLOR)
	stats_card.add_child(stats)

	var actions := VBoxContainer.new()
	actions.add_theme_constant_override("separation", 10)
	shell.add_child(actions)

	var practice_btn := _build_button("Practice Mining", true)
	practice_btn.pressed.connect(func():
		var opened := AppControllerHelper.open_mining_practice_panel("menu_panel")
		if opened:
			preload("res://Scripts/UI/GameNavigationMenu.gd").close(owner)
	)
	actions.add_child(practice_btn)

	var skip_btn := _build_button("Skip Onboarding", false)
	skip_btn.pressed.connect(func():
		var app = AppControllerHelper.get_instance()
		if app and app.has_method("skip_tutorial"):
			app.skip_tutorial()
		preload("res://Scripts/UI/GameNavigationMenu.gd").close(owner)
	)
	actions.add_child(skip_btn)

	var replay_mission_btn := _build_button("Replay This Mission Guide", false)
	replay_mission_btn.pressed.connect(func():
		var app = AppControllerHelper.get_instance()
		if app and app.has_method("replay_tutorial_for_current_mission"):
			app.replay_tutorial_for_current_mission()
		preload("res://Scripts/UI/GameNavigationMenu.gd").close(owner)
	)
	actions.add_child(replay_mission_btn)

	var replay_all_btn := _build_button("Replay Full Onboarding", false)
	replay_all_btn.pressed.connect(func():
		var app = AppControllerHelper.get_instance()
		if app and app.has_method("replay_tutorial_from_mission1"):
			app.replay_tutorial_from_mission1()
		preload("res://Scripts/UI/GameNavigationMenu.gd").close(owner)
	)
	actions.add_child(replay_all_btn)

	var dialogue_btn := _build_button("", false)
	_refresh_dialogue_button_text(dialogue_btn)
	dialogue_btn.pressed.connect(func():
		var app = AppControllerHelper.get_instance()
		if app and app.has_method("is_citizen_science_dialogue_enabled") and app.has_method("set_citizen_science_dialogue_enabled"):
			var next_enabled := not bool(app.is_citizen_science_dialogue_enabled())
			app.set_citizen_science_dialogue_enabled(next_enabled)
		_refresh_dialogue_button_text(dialogue_btn)
	)
	actions.add_child(dialogue_btn)

	var reset_btn := _build_button("Reset All Data", false)
	reset_btn.pressed.connect(func():
		var app = AppControllerHelper.get_instance()
		if app and app.has_method("_on_reset_all"):
			app._on_reset_all()
		preload("res://Scripts/UI/GameNavigationMenu.gd").close(owner)
	)
	actions.add_child(reset_btn)

	return root

static func _build_button(text: String, primary: bool) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(0, 56)
	var color := AMBER if primary else CYAN
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0, 0, 0, 0)
	normal.border_color = color
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(28)
	normal.content_margin_left = 18
	normal.content_margin_right = 18
	normal.content_margin_top = 10
	normal.content_margin_bottom = 10
	var hover := normal.duplicate()
	hover.bg_color = Color(color.r, color.g, color.b, 0.12)
	var pressed := normal.duplicate()
	pressed.bg_color = Color(color.r, color.g, color.b, 0.22)
	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", pressed)
	btn.add_theme_stylebox_override("focus", hover)
	btn.add_theme_color_override("font_color", color)
	btn.add_theme_color_override("font_hover_color", color)
	btn.add_theme_color_override("font_pressed_color", color)
	btn.add_theme_font_size_override("font_size", 24)
	return btn

static func _build_stats_text() -> String:
	var app = AppControllerHelper.get_instance()
	var francs := "?"
	var level := "?"
	var xp := "?"
	if app:
		if app.has_method("get_franc_balance"):
			francs = str(app.get_franc_balance())
		if app.has_method("get_experience_level"):
			level = str(app.get_experience_level())
		if app.has_method("get_experience_xp"):
			xp = str(app.get_experience_xp())
	return "Level %s  |  XP %s  |  Francs %s" % [level, xp, francs]

static func _refresh_dialogue_button_text(btn: Button) -> void:
	if btn == null:
		return
	var enabled := AppControllerHelper.is_citizen_science_dialogue_enabled(true)
	btn.text = "Citizen Science Dialogue: %s" % ("On" if enabled else "Off")

static func _set_tutorial_overlay_visible(tree: SceneTree, visible: bool) -> void:
	if tree == null or tree.root == null:
		return
	var overlay = tree.root.get_node_or_null("TutorialCoachOverlay")
	if overlay == null:
		return
	overlay.visible = visible
	if visible and overlay.has_method("_refresh"):
		overlay.call_deferred("_refresh")
