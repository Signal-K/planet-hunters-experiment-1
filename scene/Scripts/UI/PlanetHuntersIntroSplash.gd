extends CanvasLayer
class_name PlanetHuntersIntroSplash

const SHOWN_FLAG_PATH := "user://planet_hunters_intro_v1.cfg"
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

signal splash_dismissed

var _panel: PanelContainer
var _overlay: ColorRect
var _shown := false

static func has_been_shown() -> bool:
	return FileAccess.file_exists(SHOWN_FLAG_PATH)

static func mark_shown() -> void:
	var f = FileAccess.open(SHOWN_FLAG_PATH, FileAccess.WRITE)
	if f:
		f.store_string("1")

func _ready() -> void:
	layer = 200
	process_mode = Node.PROCESS_MODE_ALWAYS
	_build_ui()

func _build_ui() -> void:
	# Full-screen dark overlay
	var overlay = ColorRect.new()
	overlay.color = Color(0.04, 0.05, 0.10, 0.96)
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	_overlay = overlay
	add_child(overlay)

	# Centred content panel
	_panel = PanelContainer.new()
	_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	_panel.custom_minimum_size = Vector2(680, 0)
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.08, 0.10, 0.18, 0.97)
	style.border_color = Color(0.25, 0.40, 0.80, 0.9)
	style.border_width_left = 1
	style.border_width_right = 1
	style.border_width_top = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 16
	style.corner_radius_top_right = 16
	style.corner_radius_bottom_left = 16
	style.corner_radius_bottom_right = 16
	style.content_margin_left = 40
	style.content_margin_right = 40
	style.content_margin_top = 40
	style.content_margin_bottom = 40
	_panel.add_theme_stylebox_override("panel", style)
	# Lock before add_child so UIConsistencyEnforcer's node_added handler can't overwrite.
	_panel.set_meta("ui_style_locked", true)
	overlay.add_child(_panel)

	var vbox = VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 20)
	_panel.add_child(vbox)

	# Eyebrow
	var eyebrow = Label.new()
	eyebrow.text = "STAR SAILORS: EXPERIMENT 1"
	eyebrow.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	eyebrow.add_theme_color_override("font_color", Color(0.45, 0.65, 1.0))
	eyebrow.add_theme_font_size_override("font_size", 13)
	vbox.add_child(eyebrow)

	# Title
	var title = Label.new()
	title.text = "PLANET HUNTERS"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_color_override("font_color", Color(0.92, 0.95, 1.0))
	title.add_theme_font_size_override("font_size", 38)
	vbox.add_child(title)

	# Divider
	var sep = HSeparator.new()
	sep.add_theme_color_override("color", Color(0.25, 0.40, 0.80, 0.5))
	vbox.add_child(sep)

	# Body
	var body = Label.new()
	body.text = "You've joined a real citizen science mission.\n\nYour rockets travel to asteroids and planetary candidates drawn from NASA's TESS telescope and the Active Asteroids programme. Every mission you complete contributes genuine observation data to the Planet Hunters network.\n\nThis is Experiment 1. Your feedback will shape what comes next."
	body.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.add_theme_color_override("font_color", Color(0.78, 0.83, 0.95))
	body.add_theme_font_size_override("font_size", 16)
	vbox.add_child(body)

	# Spacer
	var spacer = Control.new()
	spacer.custom_minimum_size = Vector2(0, 8)
	vbox.add_child(spacer)

	# CTA button
	var btn = Button.new()
	btn.text = "Begin Mission"
	btn.custom_minimum_size = Vector2(240, 52)
	btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	var btn_style = StyleBoxFlat.new()
	btn_style.bg_color = Color(0.20, 0.45, 0.90)
	btn_style.corner_radius_top_left = 8
	btn_style.corner_radius_top_right = 8
	btn_style.corner_radius_bottom_left = 8
	btn_style.corner_radius_bottom_right = 8
	btn_style.content_margin_left = 24
	btn_style.content_margin_right = 24
	btn_style.content_margin_top = 12
	btn_style.content_margin_bottom = 12
	btn.add_theme_stylebox_override("normal", btn_style)
	btn.add_theme_color_override("font_color", Color(1, 1, 1))
	btn.add_theme_font_size_override("font_size", 18)
	btn.pressed.connect(_dismiss)
	vbox.add_child(btn)

	# Fine print
	var fine = Label.new()
	fine.text = "Part of the Star Sailors universe • starsailors.space"
	fine.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	fine.add_theme_color_override("font_color", Color(0.45, 0.50, 0.65))
	fine.add_theme_font_size_override("font_size", 12)
	vbox.add_child(fine)

	# Animate in
	_overlay.modulate.a = 0.0
	var tween = create_tween()
	tween.tween_property(_overlay, "modulate:a", 1.0, 0.5).set_trans(Tween.TRANS_SINE)

func _dismiss() -> void:
	if _shown:
		return
	_shown = true
	PlanetHuntersIntroSplash.mark_shown()
	var tween = create_tween()
	tween.tween_property(_overlay, "modulate:a", 0.0, 0.3)
	tween.finished.connect(func():
		splash_dismissed.emit()
		queue_free()
	)
