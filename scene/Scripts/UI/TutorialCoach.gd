extends Control

signal skip_requested
signal manual_next_requested

const FONT_DISPLAY := preload("res://design_system_source/fonts/Oxanium-Bold.ttf")
const FONT_BODY := preload("res://design_system_source/fonts/Oxanium-Regular.ttf")
const FONT_MONO := preload("res://design_system_source/fonts/TurretRoad-Regular.ttf")

const C_BG       := Color(0.012, 0.024, 0.047, 1.0)   # #030610
const C_SURFACE  := Color(0.051, 0.110, 0.188, 1.0)   # #0d1c30
const C_AMBER    := Color(0.961, 0.651, 0.137, 1.0)   # #f5a623
const C_CYAN     := Color(0.247, 0.663, 1.0, 1.0)     # #3fa9ff
const C_TEXT     := Color(0.902, 0.937, 1.0, 1.0)     # #e6efff
const C_DIM      := Color(0.663, 0.722, 0.808, 1.0)   # #a9b8ce
const C_MUTED    := Color(0.365, 0.451, 0.565, 1.0)   # #5d7390
const C_OK       := Color(0.224, 0.827, 0.416, 1.0)   # #39d36a

const CANVAS_W := 402.0
const CANVAS_H := 874.0

@onready var hint_bar: Control     = $HintBar
@onready var hint_panel: Panel     = $HintBar/HintPanel
@onready var hint_title: Label     = $HintBar/HintPanel/TitleLabel
@onready var hint_action: Label    = $HintBar/HintPanel/ActionLabel
@onready var hint_count: Label     = $HintBar/HintPanel/CountLabel
@onready var hint_skip: Button     = $HintBar/HintPanel/SkipButton
@onready var hint_dots: Control    = $HintBar/DotsBar

@onready var info_card: Panel      = $InfoCard
@onready var info_title: Label     = $InfoCard/TitleLabel
@onready var info_body: Label      = $InfoCard/BodyLabel
@onready var info_count: Label     = $InfoCard/CountLabel
@onready var info_skip: Button     = $InfoCard/SkipButton
@onready var info_next: Button     = $InfoCard/NextButton
@onready var info_dots: Control    = $InfoCard/DotsBar
@onready var pointer: Control      = $Pointer

var _step: Dictionary = {}
var _step_index: int = 0
var _total: int = 8
var _all_steps: Array = []

var _time := 0.0
var _pointer_time := 0.0

func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	_apply_styles()
	hint_skip.pressed.connect(func(): skip_requested.emit())
	info_skip.pressed.connect(func(): skip_requested.emit())
	info_next.pressed.connect(func(): manual_next_requested.emit())
	hint_bar.visible = false
	info_card.visible = false
	pointer.visible = false

func _process(delta: float) -> void:
	_time += delta
	_pointer_time += delta
	queue_redraw()
	pointer.queue_redraw()
	# Animate avatar bob in hint bar
	var bob := sin(_time * TAU / 1.2) * 2.0
	if hint_bar.visible:
		var hp_pos := hint_panel.position
		hint_panel.position = Vector2(hp_pos.x, 0.0 + bob * 0.5)

func set_step(step: Dictionary, step_idx: int, total: int, all_steps: Array) -> void:
	_step = step
	_step_index = step_idx
	_total = total
	_all_steps = all_steps
	_update_ui()

# Called by Main when the real game action for this step is performed.
func acknowledge_step() -> void:
	pass

func _update_ui() -> void:
	if _step.is_empty():
		hint_bar.visible = false
		info_card.visible = false
		pointer.visible = false
		return

	var manual: bool = _step.get("manual", false)
	hint_bar.visible = not manual
	info_card.visible = manual
	pointer.visible = _step.get("spot") != null and not manual

	var idx_str := "%d / %d" % [_step_index + 1, _total]

	if not manual:
		hint_title.text = _step.get("title", "").to_upper()
		var action: String = _step.get("action", "")
		if action.is_empty():
			action = "Tap " + _step.get("cta", "")
		hint_action.text = action
		hint_count.text = idx_str
		hint_dots.queue_redraw()
		_update_pointer()
	else:
		info_title.text = _step.get("title", "")
		info_body.text = _step.get("body", "")
		info_count.text = idx_str
		info_dots.queue_redraw()
		var anchor: String = _step.get("anchor", "top")
		var card_y := 150.0
		if anchor == "center":
			card_y = 330.0
		elif anchor == "bottom":
			card_y = 520.0
		info_card.position = Vector2(14.0, card_y)

func _update_pointer() -> void:
	var spot_d: Variant = _step.get("spot")
	if spot_d == null or not spot_d is Dictionary:
		pointer.visible = false
		return
	var anchor: String = _step.get("anchor", "bottom")
	var sx: float = spot_d.x
	var sy: float = spot_d.y
	var sw: float = spot_d.w
	var sh: float = spot_d.h
	var px := clampf(sx + sw * 0.5 - 13.0, 12.0, 364.0)
	var py := sy + sh + 4.0 if anchor == "top" else sy - 34.0
	pointer.position = Vector2(px, py)
	pointer.set_meta("flip", anchor == "top")

# ── Spotlight drawn directly on this control ──────────────────────────
func _draw() -> void:
	if _step.is_empty():
		return
	var spot_d: Variant = _step.get("spot")
	var manual: bool = _step.get("manual", false)
	var dim_alpha := 0.62 if manual else 0.45
	var dim := Color(C_BG.r, C_BG.g, C_BG.b, dim_alpha)

	if spot_d != null and spot_d is Dictionary:
		var sx: float = spot_d.x
		var sy: float = spot_d.y
		var sw: float = spot_d.w
		var sh: float = spot_d.h
		# Four rects surrounding the spotlight hole
		draw_rect(Rect2(0, 0, CANVAS_W, sy), dim)
		draw_rect(Rect2(0, sy + sh, CANVAS_W, CANVAS_H - sy - sh), dim)
		draw_rect(Rect2(0, sy, sx, sh), dim)
		draw_rect(Rect2(sx + sw, sy, CANVAS_W - sx - sw, sh), dim)
		# Pulsing amber border around hole
		var pulse := 0.55 + 0.45 * sin(_time * TAU / 1.6)
		var border := Color(C_AMBER.r, C_AMBER.g, C_AMBER.b, pulse)
		draw_rect(Rect2(sx - 2, sy - 2, sw + 4, sh + 4), border, false, 2.0)
		var glow := Color(C_AMBER.r, C_AMBER.g, C_AMBER.b, pulse * 0.25)
		draw_rect(Rect2(sx - 6, sy - 6, sw + 12, sh + 12), glow, false, 1.0)
	else:
		draw_rect(Rect2(0, 0, CANVAS_W, CANVAS_H), dim)

# ── Style helpers ──────────────────────────────────────────────────────
func _apply_styles() -> void:
	_style_panel(hint_panel,
		Color(C_SURFACE.r, C_SURFACE.g, C_SURFACE.b, 0.97),
		Color(C_AMBER.r, C_AMBER.g, C_AMBER.b, 0.55), 999)
	_style_label(hint_title, FONT_DISPLAY, 9, C_AMBER, true)
	_style_label(hint_action, FONT_BODY, 12, C_TEXT)
	_style_label(hint_count, FONT_MONO, 9, C_MUTED, true)
	_style_btn_ghost(hint_skip)

	_style_panel(info_card,
		Color(C_SURFACE.r * 0.7, C_SURFACE.g * 0.7, C_SURFACE.b * 0.7, 0.98),
		Color(C_CYAN.r, C_CYAN.g, C_CYAN.b, 0.5), 16)
	_style_label(info_title, FONT_DISPLAY, 15, C_TEXT)
	_style_label(info_body, FONT_BODY, 13, C_DIM)
	_style_label(info_count, FONT_MONO, 10, C_MUTED, true)
	_style_btn_ghost(info_skip)
	_style_btn_primary(info_next)

func _style_panel(p: Panel, fill: Color, border: Color, radius := 8) -> void:
	var s := StyleBoxFlat.new()
	s.bg_color = fill
	s.border_color = border
	s.set_border_width_all(1)
	s.set_corner_radius_all(radius)
	s.anti_aliasing = true
	s.shadow_color = Color(0, 0, 0, 0.35)
	s.shadow_size = 12
	s.shadow_offset = Vector2(0, 4)
	p.add_theme_stylebox_override("panel", s)

func _style_label(l: Label, font: Font, size: int, color: Color, caps := false) -> void:
	l.add_theme_font_override("font", font)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if caps:
		l.text = l.text.to_upper()

func _style_btn_ghost(b: Button) -> void:
	b.add_theme_font_override("font", FONT_DISPLAY)
	b.add_theme_font_size_override("font_size", 9)
	b.add_theme_color_override("font_color", C_MUTED)
	var s := StyleBoxFlat.new()
	s.bg_color = Color(0, 0, 0, 0)
	s.set_border_width_all(0)
	s.set_corner_radius_all(6)
	for state in ["normal", "hover", "pressed", "focus"]:
		b.add_theme_stylebox_override(state, s)

func _style_btn_primary(b: Button) -> void:
	b.add_theme_font_override("font", FONT_DISPLAY)
	b.add_theme_font_size_override("font_size", 12)
	b.add_theme_color_override("font_color", Color("#06121f"))
	var s := StyleBoxFlat.new()
	s.bg_color = Color("#3fa9ff")
	s.set_corner_radius_all(10)
	s.set_border_width_all(0)
	s.content_margin_left = 16
	s.content_margin_right = 16
	s.content_margin_top = 8
	s.content_margin_bottom = 8
	s.shadow_color = Color(0, 0, 0, 0.3)
	s.shadow_size = 4
	s.shadow_offset = Vector2(0, 3)
	b.add_theme_stylebox_override("normal", s)
	var hover := s.duplicate()
	hover.bg_color = Color("#6cc2ff")
	b.add_theme_stylebox_override("hover", hover)
	var pressed := s.duplicate()
	pressed.bg_color = Color("#2d8de0")
	b.add_theme_stylebox_override("pressed", pressed)
	b.add_theme_stylebox_override("focus", s)

# ── Inner classes for custom drawing ──────────────────────────────────

class DotsBar extends Control:
	var step_index: int = 0
	var total: int = 8
	var _parent_coach: Control = null

	func _draw() -> void:
		var dot_w_active := 16.0
		var dot_w := 6.0
		var dot_h := 6.0
		var gap := 4.0
		var total_width := dot_w_active + (total - 1) * (dot_w + gap)
		var ox := (size.x - total_width) * 0.5
		var oy := (size.y - dot_h) * 0.5
		for i in total:
			var w := dot_w_active if i == step_index else dot_w
			var color: Color
			if i < step_index:
				color = Color(0.224, 0.827, 0.416, 1.0)   # ok green
			elif i == step_index:
				color = Color(0.961, 0.651, 0.137, 1.0)   # amber
			else:
				color = Color(0.247, 0.663, 1.0, 0.25)    # dim cyan
			draw_rect(Rect2(ox, oy, w, dot_h), color)
			if i == step_index:
				ox += dot_w_active + gap
			else:
				ox += dot_w + gap


class PointerArrow extends Control:
	var flip: bool = false
	var _time: float = 0.0

	func _process(delta: float) -> void:
		_time += delta
		queue_redraw()

	func _draw() -> void:
		var bob := sin(_time * TAU / 1.0) * 6.0
		var oy := bob if not flip else -bob
		var sy := 0.0 + oy
		# Arrow pointing down (or up if flip)
		var pts := PackedVector2Array([
			Vector2(13, sy + 2),
			Vector2(13, sy + 22),
		])
		draw_polyline(pts, Color(0.961, 0.651, 0.137, 1.0), 4.0)
		if flip:
			draw_line(Vector2(13, sy + 2), Vector2(6, sy + 9), Color(0.961, 0.651, 0.137, 1.0), 4.0)
			draw_line(Vector2(13, sy + 2), Vector2(20, sy + 9), Color(0.961, 0.651, 0.137, 1.0), 4.0)
		else:
			draw_line(Vector2(13, sy + 22), Vector2(6, sy + 15), Color(0.961, 0.651, 0.137, 1.0), 4.0)
			draw_line(Vector2(13, sy + 22), Vector2(20, sy + 15), Color(0.961, 0.651, 0.137, 1.0), 4.0)


class CoachAvatarNode extends Control:
	func _draw() -> void:
		var cx := size.x * 0.5
		var cy := size.y * 0.5
		draw_circle(Vector2(cx, cy), 21.0, Color(0.247, 0.663, 1.0, 0.18))
		draw_circle(Vector2(cx, cy), 19.0, Color("#0d1c30"))
		draw_arc(Vector2(cx, cy), 18.0, PI * 0.14, PI * 0.86, 36, Color("#3fa9ff"), 2.0)
		draw_rect(Rect2(cx - 10, cy - 6, 20, 12), Color("#d9e8f7"), true)
		draw_rect(Rect2(cx - 7, cy - 3, 14, 6), Color("#122236"), true)
		draw_line(Vector2(cx, cy + 6), Vector2(cx, cy + 13), Color("#f5a623"), 2.0)
		draw_circle(Vector2(cx, cy + 14), 3.0, Color("#f5a623"))
