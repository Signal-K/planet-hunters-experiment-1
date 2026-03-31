extends CanvasLayer
class_name PlanetHuntersIntroSplash

const SHOWN_FLAG_PATH := "user://planet_hunters_intro_v1.cfg"
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

signal splash_dismissed

var _shown := false

@onready var overlay: ColorRect = $Overlay
@onready var center: CenterContainer = $Overlay/Center
@onready var panel: PanelContainer = $Overlay/Center/Panel
@onready var separator: HSeparator = $Overlay/Center/Panel/VBox/Separator
@onready var begin_button: Button = $Overlay/Center/Panel/VBox/BeginButton

static func has_been_shown() -> bool:
	return FileAccess.file_exists(SHOWN_FLAG_PATH)

static func mark_shown() -> void:
	var f = FileAccess.open(SHOWN_FLAG_PATH, FileAccess.WRITE)
	if f:
		f.store_string("1")

func _ready() -> void:
	layer = 200
	process_mode = Node.PROCESS_MODE_ALWAYS
	var vp_size := get_viewport().get_visible_rect().size
	var panel_w := clampf(vp_size.x - 48.0, 300.0, 560.0)
	panel.custom_minimum_size = Vector2(panel_w, 0)
	panel.set_meta("ui_style_locked", true)
	center.mouse_filter = Control.MOUSE_FILTER_PASS
	separator.add_theme_color_override("color", Color(0.25, 0.40, 0.80, 0.5))
	PanelStyle.apply_button(begin_button, true)
	begin_button.add_theme_font_size_override("font_size", 18)
	begin_button.pressed.connect(_dismiss)

	# Animate in
	overlay.modulate.a = 0.0
	var tween = create_tween()
	tween.tween_property(overlay, "modulate:a", 1.0, 0.5).set_trans(Tween.TRANS_SINE)

func _dismiss() -> void:
	if _shown:
		return
	_shown = true
	mark_shown()
	var tween = create_tween()
	tween.tween_property(overlay, "modulate:a", 0.0, 0.3)
	tween.finished.connect(func():
		splash_dismissed.emit()
		queue_free()
	)
