extends Control

signal action_requested(action: String)

const FONT_DISPLAY := preload("res://design_system_source/fonts/Oxanium-Bold.ttf")

@onready var base_icon: TextureRect = $Bar/BaseButton/BaseIcon
@onready var atlas_icon: TextureRect = $Bar/AtlasButton/AtlasIcon
@onready var missions_icon: TextureRect = $Bar/MissionsButton/MissionsIcon
@onready var build_icon: TextureRect = $Bar/BuildButton/BuildIcon
@onready var base_label: Label = $Bar/BaseButton/BaseLabel
@onready var atlas_label: Label = $Bar/AtlasButton/AtlasLabel
@onready var missions_label: Label = $Bar/MissionsButton/MissionsLabel
@onready var build_label: Label = $Bar/BuildButton/BuildLabel

@onready var base_button: Button = $Bar/BaseButton
@onready var atlas_button: Button = $Bar/AtlasButton
@onready var missions_button: Button = $Bar/MissionsButton
@onready var build_button: Button = $Bar/BuildButton

func _ready() -> void:
	_style()
	base_button.pressed.connect(func(): action_requested.emit("base"))
	atlas_button.pressed.connect(func(): action_requested.emit("atlas"))
	missions_button.pressed.connect(func(): action_requested.emit("missions"))
	build_button.pressed.connect(func(): action_requested.emit("build"))

func set_state(active: String, build_enabled: bool) -> void:
	_set_active(base_button, base_label, base_icon, active == "hub")
	_set_active(atlas_button, atlas_label, atlas_icon, active == "galaxy")
	_set_active(missions_button, missions_label, missions_icon, active == "missions" or active == "targets")
	_set_active(build_button, build_label, build_icon, active == "build")
	build_button.disabled = not build_enabled
	build_button.modulate = Color(1, 1, 1, 1) if build_enabled else Color(1, 1, 1, 0.45)

func _set_active(button: Button, label: Label, icon: TextureRect, on: bool) -> void:
	button.modulate = Color(1, 1, 1, 1) if on else Color(1, 1, 1, 0.70)
	label.add_theme_color_override("font_color", Color("#7ec8ff") if on else Color("#5d7390"))
	icon.modulate = Color("#7ec8ff") if on else Color("#5d7390")
	_apply_button_state(button, on)

func _style() -> void:
	_style_button(base_button)
	_style_button(atlas_button)
	_style_button(missions_button)
	_style_button(build_button)
	_style_label(base_label)
	_style_label(atlas_label)
	_style_label(missions_label)
	_style_label(build_label)
	_style_icon(base_icon)
	_style_icon(atlas_icon)
	_style_icon(missions_icon)
	_style_icon(build_icon)

func _style_button(button: Button) -> void:
	button.add_theme_font_override("font", FONT_DISPLAY)
	button.add_theme_font_size_override("font_size", 10)
	button.add_theme_color_override("font_color", Color("#3fa9ff"))
	button.add_theme_color_override("font_hover_color", Color("#6cc2ff"))
	button.add_theme_color_override("font_pressed_color", Color("#06121f"))
	_apply_button_state(button, false)

func _apply_button_state(button: Button, on: bool) -> void:
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color("#0d2841") if on else Color("#081120")
	normal.border_color = Color("#3fa9ff") if on else Color("#3fa9ff")
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(8)
	normal.anti_aliasing = true
	normal.content_margin_left = 8
	normal.content_margin_right = 8
	normal.content_margin_top = 8
	normal.content_margin_bottom = 8
	normal.shadow_color = Color(0, 0, 0, 0.24)
	normal.shadow_size = 8
	normal.shadow_offset = Vector2(0, 2)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", normal.duplicate())
	button.add_theme_stylebox_override("pressed", normal.duplicate())

func _style_label(label: Label) -> void:
	label.add_theme_font_override("font", FONT_DISPLAY)
	label.add_theme_font_size_override("font_size", 9)
	label.add_theme_color_override("font_color", Color("#5d7390"))
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER

func _style_icon(icon: TextureRect) -> void:
	icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	icon.modulate = Color("#5d7390")
