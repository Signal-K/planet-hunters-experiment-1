extends Control

signal action_requested(action: String)

const FONT_DISPLAY := preload("res://design_system_source/fonts/Oxanium-Bold.ttf")
const FONT_MONO := preload("res://design_system_source/fonts/TurretRoad-Regular.ttf")

@onready var menu_button: Button = $MenuButton
@onready var fan_panel: Control = $FanPanel
@onready var base_button: Button = $FanPanel/BaseButton
@onready var missions_button: Button = $FanPanel/MissionsButton
@onready var atlas_button: Button = $FanPanel/AtlasButton
@onready var build_button: Button = $FanPanel/BuildButton
@onready var base_label: Label = $FanPanel/BaseLabel
@onready var missions_label: Label = $FanPanel/MissionsLabel
@onready var atlas_label: Label = $FanPanel/AtlasLabel
@onready var build_label: Label = $FanPanel/BuildLabel

func _ready() -> void:
	_style()
	menu_button.pressed.connect(_on_menu_pressed)
	base_button.pressed.connect(func(): action_requested.emit("base"))
	missions_button.pressed.connect(func(): action_requested.emit("missions"))
	atlas_button.pressed.connect(func(): action_requested.emit("atlas"))
	build_button.pressed.connect(func(): action_requested.emit("build"))

func set_state(is_open: bool, allow_build: bool) -> void:
	fan_panel.visible = is_open
	build_button.disabled = not allow_build
	build_button.modulate = Color(1, 1, 1, 1) if allow_build else Color(1, 1, 1, 0.35)
	menu_button.icon = preload("res://design_system_source/assets/icons/nav_menu.svg") if not is_open else null
	menu_button.text = "X" if is_open else ""
	menu_button.modulate = Color("#f5a623") if is_open else Color("#6cc2ff")
	_set_tone(base_button, base_label, Color("#39d36a"), Color("#39d36a"), is_open)
	_set_tone(missions_button, missions_label, Color("#f5a623"), Color("#f5a623"), is_open)
	_set_tone(atlas_button, atlas_label, Color("#7ec8ff"), Color("#7ec8ff"), is_open)
	_set_tone(build_button, build_label, Color("#a97cff"), Color("#a97cff"), is_open and allow_build)

func _on_menu_pressed() -> void:
	action_requested.emit("toggle")

func _style() -> void:
	_style_button(menu_button, Color("#081120"), Color("#3fa9ff"), true)
	menu_button.add_theme_font_size_override("font_size", 16)
	_style_button(base_button, Color("#081120"), Color("#39d36a"), true)
	_style_button(missions_button, Color("#081120"), Color("#f5a623"), true)
	_style_button(atlas_button, Color("#081120"), Color("#7ec8ff"), true)
	_style_button(build_button, Color("#081120"), Color("#a97cff"), true)
	_style_label(base_label, Color("#39d36a"))
	_style_label(missions_label, Color("#f5a623"))
	_style_label(atlas_label, Color("#7ec8ff"))
	_style_label(build_label, Color("#a97cff"))

func _set_tone(button: Button, label: Label, fg: Color, accent: Color, active: bool) -> void:
	button.modulate = Color(1, 1, 1, 1) if active else Color(1, 1, 1, 0.72)
	label.modulate = Color(1, 1, 1, 1) if active else Color(1, 1, 1, 0.55)
	label.add_theme_color_override("font_color", fg if active else Color("#5d7390"))
	_style_button(button, Color("#081120"), accent, true)

func _style_button(button: Button, fill: Color, fg: Color, round := false) -> void:
	button.add_theme_font_override("font", FONT_DISPLAY)
	button.add_theme_font_size_override("font_size", 10)
	button.add_theme_color_override("font_color", fg)
	button.add_theme_color_override("font_hover_color", Color("#e6efff"))
	button.add_theme_color_override("font_pressed_color", Color("#06121f"))
	var normal := StyleBoxFlat.new()
	normal.bg_color = fill
	normal.border_color = fg
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(999 if round else 10)
	normal.anti_aliasing = true
	normal.content_margin_left = 6
	normal.content_margin_right = 6
	normal.content_margin_top = 6
	normal.content_margin_bottom = 6
	normal.shadow_color = Color(0, 0, 0, 0.24)
	normal.shadow_size = 8
	normal.shadow_offset = Vector2(0, 2)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", normal.duplicate())
	button.add_theme_stylebox_override("pressed", normal.duplicate())

func _style_label(label: Label, color: Color) -> void:
	label.add_theme_font_override("font", FONT_MONO)
	label.add_theme_font_size_override("font_size", 8)
	label.add_theme_color_override("font_color", color)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
