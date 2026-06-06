extends Control

signal classification_submitted(result: String)
signal back_requested

const FONT_DISPLAY := preload("res://design_system_source/fonts/Oxanium-Bold.ttf")
const FONT_BODY    := preload("res://design_system_source/fonts/Oxanium-Regular.ttf")
const FONT_MONO    := preload("res://design_system_source/fonts/TurretRoad-Regular.ttf")

const C_BG      := Color("#081120")
const C_SURFACE := Color("#122236")
const C_CYAN    := Color("#3fa9ff")
const C_CYAN_S  := Color(0.247, 0.663, 1.0, 0.18)
const C_AMBER   := Color("#f5a623")
const C_TEXT    := Color("#e6efff")
const C_DIM     := Color("#a9b8ce")
const C_MUTED   := Color("#5d7390")
const C_OK      := Color("#39d36a")
const C_CRIT    := Color("#ff5a6a")
const C_PAPER   := Color("#efe7d3")

@onready var back_button: Button         = $TopBar/BackButton
@onready var eyebrow_label: Label        = $TopBar/EyebrowLabel
@onready var title_label: Label          = $TopBar/TitleLabel
@onready var chart_panel: Panel          = $ChartPanel
@onready var chart_label: Label          = $ChartPanel/ChartLabel
@onready var lightcurve: Control         = $ChartPanel/LightcurveGraph
@onready var confidence_label: Label     = $ChartPanel/ConfidenceLabel
@onready var info_panel: Panel           = $InfoPanel
@onready var sector_label: Label         = $InfoPanel/SectorLabel
@onready var info_body: Label            = $InfoPanel/InfoBody
@onready var planet_btn: Button          = $ClassifyRow/PlanetButton
@onready var not_planet_btn: Button      = $ClassifyRow/NotPlanetButton

func _ready() -> void:
	_apply_styles()
	back_button.pressed.connect(func(): back_requested.emit())
	planet_btn.pressed.connect(func(): _submit("PLANET"))
	not_planet_btn.pressed.connect(func(): _submit("NOT PLANET"))

func _submit(result: String) -> void:
	classification_submitted.emit(result)

func _apply_styles() -> void:
	back_button.add_theme_font_override("font", FONT_DISPLAY)
	back_button.add_theme_font_size_override("font_size", 16)
	back_button.add_theme_color_override("font_color", C_CYAN)
	_ghost_btn_style(back_button)

	_style_label($TopBar/EyebrowLabel, FONT_MONO, 9, C_PAPER, true)
	_style_label($TopBar/TitleLabel, FONT_DISPLAY, 24, C_PAPER)

	_panel_style(chart_panel, C_BG, C_CYAN_S)
	_style_label(chart_label, FONT_DISPLAY, 10, C_CYAN, true)
	_style_label(confidence_label, FONT_MONO, 11, C_AMBER, true)

	_panel_style(info_panel, C_SURFACE, C_CYAN_S)
	_style_label($InfoPanel/SectorLabel, FONT_DISPLAY, 10, C_MUTED, true)
	_style_label($InfoPanel/InfoBody, FONT_BODY, 14, C_DIM)

	_action_btn(planet_btn, C_OK, Color("#06121f"), "PLANET")
	_action_btn(not_planet_btn, C_CRIT, Color("#06121f"), "NOT PLANET")

func _panel_style(p: Panel, fill: Color, border: Color) -> void:
	var s := StyleBoxFlat.new()
	s.bg_color = fill
	s.border_color = border
	s.set_border_width_all(1)
	s.set_corner_radius_all(8)
	p.add_theme_stylebox_override("panel", s)

func _style_label(l: Label, font: Font, size: int, color: Color, caps := false) -> void:
	l.add_theme_font_override("font", font)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if caps:
		l.text = l.text.to_upper()

func _ghost_btn_style(b: Button) -> void:
	var s := StyleBoxFlat.new()
	s.bg_color = Color("#081120")
	s.border_color = C_CYAN
	s.set_border_width_all(1)
	s.set_corner_radius_all(6)
	for state in ["normal", "hover", "pressed", "focus"]:
		b.add_theme_stylebox_override(state, s)

func _action_btn(b: Button, fill: Color, fg: Color, label: String) -> void:
	b.text = label
	b.add_theme_font_override("font", FONT_DISPLAY)
	b.add_theme_font_size_override("font_size", 16)
	b.add_theme_color_override("font_color", fg)
	var s := StyleBoxFlat.new()
	s.bg_color = fill
	s.set_corner_radius_all(8)
	s.set_border_width_all(0)
	s.shadow_color = Color(0, 0, 0, 0.22)
	s.shadow_size = 6
	s.shadow_offset = Vector2(0, 2)
	b.add_theme_stylebox_override("normal", s)
	var hover := s.duplicate()
	hover.bg_color = fill.lightened(0.12)
	b.add_theme_stylebox_override("hover", hover)
	var pressed := s.duplicate()
	pressed.bg_color = fill.darkened(0.10)
	b.add_theme_stylebox_override("pressed", pressed)


class LightcurveGraph extends Control:
	# Draws a TESS transit dip lightcurve (flux vs time).
	# The dip is drawn at ~54% along the x-axis.
	func _draw() -> void:
		draw_rect(Rect2(Vector2.ZERO, size), Color("#05070b"))
		# Grid
		for x in range(0, int(size.x), 32):
			draw_line(Vector2(x, 0), Vector2(x, size.y),
				Color(0.247, 0.663, 1.0, 0.11), 1)
		for y in range(0, int(size.y), 28):
			draw_line(Vector2(0, y), Vector2(size.x, y),
				Color(0.247, 0.663, 1.0, 0.11), 1)
		# Flux line
		var pts := PackedVector2Array()
		for i in range(0, 70):
			var t := float(i) / 69.0
			var x := t * size.x
			var dip := -36.0 if i > 34 and i < 42 else 0.0
			var noise := sin(float(i) * 0.35) * 8.0
			var y := size.y * 0.45 + noise + dip
			pts.append(Vector2(x, y))
		draw_polyline(pts, Color("#3fa9ff"), 2.0)
		# Transit marker dot
		draw_circle(Vector2(size.x * 0.56, size.y * 0.25), 5.0, Color("#f5a623"))
		# Baseline reference
		draw_line(Vector2(0, size.y * 0.45), Vector2(size.x, size.y * 0.45),
			Color(0.247, 0.663, 1.0, 0.22), 1.0)
		# Axis labels
		pass  # Labels drawn in scene nodes
