extends RefCounted
class_name EarthSceneUIHelper

var _owner: Node
var _nav_layout_connected := false
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const AppLogger  = preload("res://Scripts/Utils/Logger.gd")
const UILayout   = preload("res://Scripts/UI/UILayout.gd")

# Icon paths
const ICON_BACK    := "res://Resources/Icons/nav_back.svg"
const ICON_FORWARD := "res://Resources/Icons/nav_forward.svg"
const ICON_MENU    := "res://Resources/Icons/nav_menu.svg"
const ICON_MARKET  := "res://Resources/Icons/nav_market.svg"
const ICON_MAP     := "res://Resources/Icons/nav_map.svg"
const ICON_MISSION := "res://Resources/Icons/nav_mission.svg"

const AMBER       := PanelStyle.ACCENT_WARM
const AMBER_DIM   := Color(AMBER.r, AMBER.g, AMBER.b, 0.68)
const CYAN        := PanelStyle.ACCENT
const CYAN_FAINT  := Color(CYAN.r, CYAN.g, CYAN.b, 0.34)
const NAV_BG      := Color(0.04, 0.07, 0.11, 0.90)
const NAV_TEXT    := PanelStyle.TEXT_ON_DARK
const NAV_BOTTOM_MARGIN := 0.0
const NAV_SIDE_MARGIN := 12.0
const ULTRAWIDE_LIFT := 74.0


func setup(owner: Node) -> void:
	_owner = owner


func setup_buttons() -> void:
	var container := _resolve_button_container()
	if container == null:
		return
	var back_btn := container.get_node_or_null("BackButton") as Button
	var forward_btn := container.get_node_or_null("ForwardButton") as Button
	var menu_btn := container.get_node_or_null("MenuButton") as Button
	var market_btn := container.get_node_or_null("MarketButton") as Button
	var space_map_btn := container.get_node_or_null("SpaceMapButton") as Button
	var new_mission_btn := container.get_node_or_null("NewMissionButton") as Button

	_inject_nav_background(container)
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
	for btn in [back_btn, forward_btn]:
		_set_min(btn, 160, 120)
	for btn in [menu_btn, market_btn, space_map_btn]:
		_set_min(btn, 220, 120)
	_set_min(new_mission_btn, 280, 120)

	container.add_theme_constant_override("separation", 0)
	apply_nav_layout()
	_connect_nav_layout_updates()

	_connect_if_needed(back_btn, "_on_back_button_pressed")
	_connect_if_needed(forward_btn, "_on_forward_button_pressed")
	_connect_if_needed(menu_btn, "_on_menu_button_pressed")
	_connect_if_needed(market_btn, "_on_market_button_pressed")
	_connect_if_needed(space_map_btn, "_on_space_map_button_pressed")
	_connect_if_needed(new_mission_btn, "_on_new_mission_button_pressed")

	AppLogger.d("Nav buttons set up with unified pill style")

func apply_nav_layout() -> void:
	var container := _resolve_button_container()
	if container == null:
		return
	var vp := _owner.get_viewport()
	if vp == null:
		return
	var vp_size := vp.get_visible_rect().size
	if vp_size.x <= 0.0 or vp_size.y <= 0.0:
		return
	var safe := UILayout.safe_rect(vp_size)
	var bar_height := maxf(container.custom_minimum_size.y, 80.0)
	for child in container.get_children():
		if child is Button:
			bar_height = maxf(bar_height, (child as Button).custom_minimum_size.y)
	var bottom_margin := maxf(NAV_BOTTOM_MARGIN, UILayout.bottom_clearance(vp_size))
	if vp_size.x / maxf(vp_size.y, 1.0) > 1.85:
		bottom_margin = maxf(bottom_margin, ULTRAWIDE_LIFT)
	var rect := Rect2(
		safe.position.x + NAV_SIDE_MARGIN,
		safe.end.y - bar_height - bottom_margin,
		safe.size.x - NAV_SIDE_MARGIN * 2.0,
		bar_height
	)
	rect = UILayout.clamp_to_viewport(rect, vp_size)
	container.anchor_left = 0.0
	container.anchor_top = 0.0
	container.anchor_right = 0.0
	container.anchor_bottom = 0.0
	container.offset_left = rect.position.x
	container.offset_top = rect.position.y
	container.offset_right = rect.position.x + rect.size.x
	container.offset_bottom = rect.position.y + rect.size.y


# ── Private helpers ──────────────────────────────────────────────────────────

func _resolve_button_container() -> HBoxContainer:
	if _owner == null:
		return null
	return _owner.get_node_or_null("UILayer/ButtonContainer") as HBoxContainer

func _connect_nav_layout_updates() -> void:
	if _nav_layout_connected or _owner == null:
		return
	var vp := _owner.get_viewport()
	if vp == null:
		return
	var cb := _on_viewport_size_changed
	if not vp.size_changed.is_connected(cb):
		vp.size_changed.connect(cb)
	_nav_layout_connected = true

func _on_viewport_size_changed() -> void:
	apply_nav_layout()

func _connect_if_needed(btn: Button, method_name: String) -> void:
	if btn == null or _owner == null or not _owner.has_method(method_name):
		return
	var cb := Callable(_owner, method_name)
	if not btn.pressed.is_connected(cb):
		btn.pressed.connect(cb)

func _inject_nav_background(container: HBoxContainer) -> void:
	var bg := container.get_node_or_null("NavBackground") as Panel
	if bg == null:
		bg = Panel.new()
		bg.name = "NavBackground"
		bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
		bg.set_meta("ui_style_locked", true)
		container.add_child(bg)
		container.move_child(bg, 0)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.z_index = -1
	var s := PanelStyle.create_glass_panel_style(NAV_BG, 0.42, 18, 0, 0)
	s.shadow_size = 20
	s.shadow_offset = Vector2(0, 8)
	bg.add_theme_stylebox_override("panel", s)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bg.set_meta("ui_style_locked", true)


func _style_nav_btn(btn: Button, is_amber: bool, no_right_divider: bool) -> void:
	if btn == null:
		return
	btn.set_meta("ui_style_locked", true)
	PanelStyle.apply_nav_slot_button(
		btn,
		AMBER_DIM if is_amber else CYAN_FAINT,
		AMBER if is_amber else NAV_TEXT,
		is_amber,
		no_right_divider
	)
	btn.add_theme_font_size_override("font_size", 28)


func _set_icon(btn: Button, icon_path: String, label: String, is_amber: bool) -> void:
	if btn == null:
		return
	btn.text = label
	if ResourceLoader.exists(icon_path):
		var tex := load(icon_path) as Texture2D
		if tex:
			btn.icon = tex
			if is_amber:
				btn.add_theme_color_override("icon_normal_color",  AMBER)
				btn.add_theme_color_override("icon_hover_color",   AMBER)
				btn.add_theme_color_override("icon_pressed_color", AMBER)
			else:
				btn.add_theme_color_override("icon_normal_color",  NAV_TEXT)
				btn.add_theme_color_override("icon_hover_color",   Color(1, 1, 1, 1.0))
				btn.add_theme_color_override("icon_pressed_color", Color(1, 1, 1, 0.78))
	else:
		AppLogger.w("EarthSceneUIHelper: icon not found: %s" % icon_path)


func _set_min(btn: Button, min_w: float, min_h: float) -> void:
	if btn == null:
		return
	var cur := btn.custom_minimum_size
	btn.custom_minimum_size = Vector2(max(cur.x, min_w), max(cur.y, min_h))
