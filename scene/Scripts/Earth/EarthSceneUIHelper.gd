extends RefCounted
class_name EarthSceneUIHelper

var _owner: Node
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const AppLogger  = preload("res://Scripts/Utils/Logger.gd")

# Icon paths
const ICON_BACK    := "res://Resources/Icons/nav_back.svg"
const ICON_FORWARD := "res://Resources/Icons/nav_forward.svg"
const ICON_MENU    := "res://Resources/Icons/nav_menu.svg"
const ICON_MARKET  := "res://Resources/Icons/nav_market.svg"
const ICON_MAP     := "res://Resources/Icons/nav_map.svg"
const ICON_MISSION := "res://Resources/Icons/nav_mission.svg"

# Out There: Omega palette
const AMBER       := Color(0.941, 0.690, 0.188, 1.0)   # #F0B030 — CTA only
const AMBER_DIM   := Color(0.941, 0.690, 0.188, 0.65)
const CYAN        := Color(0.28, 0.88, 0.96, 1.0)      # #47E0F5 — nav border + dividers
const CYAN_FAINT  := Color(0.28, 0.88, 0.96, 0.35)     # subtle divider
const NAV_BG      := Color(0.03, 0.03, 0.04, 0.94)


func setup(owner: Node) -> void:
	_owner = owner


func setup_buttons() -> void:
	var back_btn        := _owner.get_node("UILayer/ButtonContainer/BackButton")
	var forward_btn     := _owner.get_node("UILayer/ButtonContainer/ForwardButton")
	var menu_btn        := _owner.get_node("UILayer/ButtonContainer/MenuButton")
	var market_btn      := _owner.get_node("UILayer/ButtonContainer/MarketButton")
	var space_map_btn   := _owner.get_node("UILayer/ButtonContainer/SpaceMapButton")
	var new_mission_btn := _owner.get_node("UILayer/ButtonContainer/NewMissionButton")
	var container       := _owner.get_node("UILayer/ButtonContainer") as HBoxContainer

	# ── Add the unified pill background panel behind all buttons ────────────
	_inject_nav_background(container)

	# ── Style each button as a transparent "slot" with a right-divider ──────
	_style_nav_btn(back_btn,        false, false)
	_style_nav_btn(forward_btn,     false, false)
	_style_nav_btn(menu_btn,        false, false)
	_style_nav_btn(market_btn,      false, false)
	_style_nav_btn(space_map_btn,   false, false)
	_style_nav_btn(new_mission_btn, true,  true)   # amber + no right divider

	# ── Apply icons ──────────────────────────────────────────────────────────
	_set_icon(back_btn,        ICON_BACK,    "Back",       false)
	_set_icon(forward_btn,     ICON_FORWARD, "Next",       false)
	_set_icon(menu_btn,        ICON_MENU,    "Menu",       false)
	_set_icon(market_btn,      ICON_MARKET,  "Market",     false)
	_set_icon(space_map_btn,   ICON_MAP,     "Map",        false)
	_set_icon(new_mission_btn, ICON_MISSION, "New Mission",true)

	# ── Enforce minimum tap-target heights for mobile ────────────────────────
	for btn in [back_btn, forward_btn, menu_btn, market_btn, space_map_btn]:
		_set_min(btn, 160, 120)
	_set_min(new_mission_btn, 220, 120)

	# Remove the gap between buttons so dividers butt up cleanly
	container.add_theme_constant_override("separation", 0)

	# ── Connect signals ──────────────────────────────────────────────────────
	back_btn.pressed.connect(Callable(_owner, "_on_back_button_pressed"))
	forward_btn.pressed.connect(Callable(_owner, "_on_forward_button_pressed"))
	menu_btn.pressed.connect(Callable(_owner, "_on_menu_button_pressed"))
	market_btn.pressed.connect(Callable(_owner, "_on_market_button_pressed"))
	space_map_btn.pressed.connect(Callable(_owner, "_on_space_map_button_pressed"))
	new_mission_btn.pressed.connect(Callable(_owner, "_on_new_mission_button_pressed"))

	AppLogger.d("Nav buttons set up with unified pill style")


# ── Private helpers ──────────────────────────────────────────────────────────

func _inject_nav_background(container: HBoxContainer) -> void:
	# Insert a Panel as first child so it sits behind the buttons visually.
	# It stretches to fill the HBoxContainer via anchors.
	var bg := Panel.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Lock before add_child: UIConsistencyEnforcer listens to tree.node_added
	# and would immediately overwrite the custom style otherwise.
	bg.set_meta("ui_style_locked", true)
	var s := StyleBoxFlat.new()
	s.bg_color = NAV_BG
	s.border_color = CYAN_FAINT
	s.set_border_width_all(1)
	s.set_corner_radius_all(12)
	bg.add_theme_stylebox_override("panel", s)
	container.add_child(bg)
	container.move_child(bg, 0)


func _style_nav_btn(btn: Button, is_amber: bool, no_right_divider: bool) -> void:
	if btn == null:
		return
	# Prevent UIConsistencyEnforcer (deferred) from overwriting our nav style.
	btn.set_meta("ui_style_locked", true)

	var divider_color := AMBER_DIM if is_amber else CYAN_FAINT

	# Normal: transparent bg, right-border divider only
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0, 0, 0, 0)
	normal.border_width_right = 0 if no_right_divider else 1
	normal.border_color = divider_color
	normal.set_corner_radius_all(0)
	normal.content_margin_left   = 0
	normal.content_margin_right  = 0
	normal.content_margin_top    = 8
	normal.content_margin_bottom = 8

	# Hover: subtle amber/white tint fill
	var hover := StyleBoxFlat.new()
	hover.bg_color = AMBER.darkened(0.6) if is_amber else Color(1, 1, 1, 0.06)
	hover.border_width_right = normal.border_width_right
	hover.border_color = divider_color
	hover.set_corner_radius_all(0)
	hover.content_margin_left   = 0
	hover.content_margin_right  = 0
	hover.content_margin_top    = 8
	hover.content_margin_bottom = 8

	# Pressed
	var pressed := hover.duplicate()
	pressed.bg_color = AMBER.darkened(0.4) if is_amber else Color(1, 1, 1, 0.12)

	btn.add_theme_stylebox_override("normal",  normal)
	btn.add_theme_stylebox_override("hover",   hover)
	btn.add_theme_stylebox_override("pressed", pressed)
	btn.add_theme_stylebox_override("focus",   hover)

	var col := AMBER if is_amber else Color(0.95, 0.93, 0.90, 1.0)
	btn.add_theme_color_override("font_color",         col)
	btn.add_theme_color_override("font_hover_color",   col)
	btn.add_theme_color_override("font_pressed_color", col)
	btn.add_theme_color_override("font_focus_color",   col)
	btn.add_theme_font_size_override("font_size", 28)


func _set_icon(btn: Button, icon_path: String, label: String, is_amber: bool) -> void:
	if btn == null:
		return
	btn.text = label
	if ResourceLoader.exists(icon_path):
		var tex := load(icon_path) as Texture2D
		if tex:
			btn.icon = tex
			# Tint amber icons at load time via modulate on the button
			if is_amber:
				btn.add_theme_color_override("icon_normal_color",  AMBER)
				btn.add_theme_color_override("icon_hover_color",   AMBER)
				btn.add_theme_color_override("icon_pressed_color", AMBER)
			else:
				btn.add_theme_color_override("icon_normal_color",  Color(0.95, 0.93, 0.90, 1.0))
				btn.add_theme_color_override("icon_hover_color",   Color(1, 1, 1, 1.0))
				btn.add_theme_color_override("icon_pressed_color", Color(1, 1, 1, 0.75))
	else:
		AppLogger.w("EarthSceneUIHelper: icon not found: %s" % icon_path)


func _set_min(btn: Button, min_w: float, min_h: float) -> void:
	if btn == null:
		return
	var cur := btn.custom_minimum_size
	btn.custom_minimum_size = Vector2(max(cur.x, min_w), max(cur.y, min_h))
