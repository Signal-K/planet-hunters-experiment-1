extends Control

signal closed

const FONT_DISPLAY := preload("res://design_system_source/fonts/Oxanium-Bold.ttf")
const FONT_BODY    := preload("res://design_system_source/fonts/Oxanium-Regular.ttf")
const FONT_MONO    := preload("res://design_system_source/fonts/TurretRoad-Regular.ttf")

const C_SURFACE := Color("#0d1c30")
const C_BG      := Color("#060d18")
const C_TEXT    := Color("#e6efff")
const C_DIM     := Color("#a9b8ce")
const C_MUTED   := Color("#7a8294")

const CONFIGS := {
	"sr2": {
		"accent": Color("#3fa9ff"),
		"eyebrow": "VEHICLE UNLOCKED",
		"title": "STARTER ROCKET 2",
		"body": "Faster, longer range, and 1.5x cargo capacity. Now available at the Launchpad.",
		"art": "rocket",
		"stats": [["RANGE", "+60%"], ["CARGO", "x1.5"], ["SPEED", "+40%"]],
		"cta": "OUTSTANDING",
	},
	"freeops": {
		"accent": Color("#f5a623"),
		"eyebrow": "MILESTONE REACHED",
		"title": "FREE OPERATIONS",
		"body": "All authored missions complete. The Marketplace is open, the mission cap is lifted — you're in command now.",
		"art": "star",
		"stats": [["MARKET", "OPEN"], ["MISSIONS", "INF"], ["COACH", "OFF"]],
		"cta": "TAKE COMMAND",
	},
	"loan": {
		"accent": Color("#ffb347"),
		"eyebrow": "OFFER",
		"title": "EMERGENCY LOAN",
		"body": "Running low on Francs? The Foundry Guild offers a 5,000 F advance, repaid from your next two deliveries.",
		"art": "coin",
		"stats": [["ADVANCE", "5,000 F"], ["TERM", "2 RUNS"], ["RATE", "8%"]],
		"cta": "ACCEPT LOAN",
	},
	"science": {
		"accent": Color("#3fa9ff"),
		"eyebrow": "CLASSIFICATION CONSENSUS",
		"title": "CANDIDATE LOGGED",
		"body": "The Satellite Station filed the classification and unlocked a science target.",
		"art": "star",
		"stats": [["CONFIDENCE", "82%"], ["TARGET", "OPEN"], ["COACH", "ON"]],
		"cta": "OUTSTANDING",
	},
}

@onready var backdrop: ColorRect     = $Backdrop
@onready var popup_card: Panel       = $PopupCard
@onready var ray_canvas: Control     = $PopupCard/RayCanvas
@onready var eyebrow_label: Label    = $PopupCard/EyebrowLabel
@onready var art_canvas: Control     = $PopupCard/ArtCanvas
@onready var title_label: Label      = $PopupCard/TitleLabel
@onready var body_label: Label       = $PopupCard/BodyLabel
@onready var stats_bar: Control      = $PopupCard/StatsBar
@onready var cta_button: Button      = $PopupCard/CTAButton

var _kind: String = "sr2"
var _cfg: Dictionary = {}
var _spin_time := 0.0

func _ready() -> void:
	backdrop.color = Color(0.012, 0.024, 0.047, 0.82)
	cta_button.pressed.connect(func(): closed.emit())

func setup(kind: String) -> void:
	_kind = kind
	_cfg = CONFIGS.get(kind, CONFIGS.sr2)
	_apply()

func _process(delta: float) -> void:
	_spin_time += delta
	if ray_canvas:
		ray_canvas.queue_redraw()
	if art_canvas:
		art_canvas.queue_redraw()

func _apply() -> void:
	if _cfg.is_empty():
		return
	var accent: Color = _cfg.accent

	_style_popup_card(accent)
	eyebrow_label.text = _cfg.eyebrow
	eyebrow_label.add_theme_color_override("font_color", accent)
	title_label.text = _cfg.title
	body_label.text = _cfg.body

	_build_stats(accent)
	_style_cta(accent)
	cta_button.text = _cfg.cta

func _style_popup_card(accent: Color) -> void:
	var s := StyleBoxFlat.new()
	s.bg_color = C_BG
	s.border_color = Color(accent.r, accent.g, accent.b, 0.53)
	s.set_border_width_all(1)
	s.set_corner_radius_all(20)
	s.shadow_color = Color(0, 0, 0, 0.7)
	s.shadow_size = 24
	s.shadow_offset = Vector2(0, 8)
	popup_card.add_theme_stylebox_override("panel", s)

func _style_cta(accent: Color) -> void:
	cta_button.add_theme_font_override("font", FONT_DISPLAY)
	cta_button.add_theme_font_size_override("font_size", 14)
	cta_button.add_theme_color_override("font_color", Color("#04121f"))
	var s := StyleBoxFlat.new()
	s.bg_color = accent
	s.set_corner_radius_all(12)
	s.set_border_width_all(0)
	s.content_margin_top = 14
	s.content_margin_bottom = 14
	s.shadow_color = Color(0, 0, 0, 0.3)
	s.shadow_size = 6
	s.shadow_offset = Vector2(0, 4)
	cta_button.add_theme_stylebox_override("normal", s)
	var hover := s.duplicate()
	hover.bg_color = accent.lightened(0.15)
	cta_button.add_theme_stylebox_override("hover", hover)

func _build_stats(accent: Color) -> void:
	for child in stats_bar.get_children():
		child.queue_free()
	var stats: Array = _cfg.get("stats", [])
	var col_w := 80.0
	var gap := 8.0
	var total_w := stats.size() * col_w + (stats.size() - 1) * gap
	var ox := (stats_bar.size.x - total_w) * 0.5
	for pair in stats:
		var chip := _make_stat_chip(pair[0], pair[1], accent, Rect2(ox, 0, col_w, stats_bar.size.y))
		stats_bar.add_child(chip)
		chip.position = Vector2(ox, 0)
		ox += col_w + gap

func _make_stat_chip(key: String, val: String, accent: Color, rect: Rect2) -> Panel:
	var chip := Panel.new()
	chip.size = rect.size
	var cs := StyleBoxFlat.new()
	cs.bg_color = Color(0.031, 0.063, 0.110, 0.7)
	cs.border_color = Color(accent.r, accent.g, accent.b, 0.27)
	cs.set_border_width_all(1)
	cs.set_corner_radius_all(10)
	chip.add_theme_stylebox_override("panel", cs)

	var key_lbl := Label.new()
	key_lbl.text = key
	key_lbl.position = Vector2(4, 8)
	key_lbl.size = Vector2(rect.size.x - 8, 14)
	key_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	key_lbl.add_theme_font_override("font", FONT_DISPLAY)
	key_lbl.add_theme_font_size_override("font_size", 8)
	key_lbl.add_theme_color_override("font_color", C_MUTED)
	chip.add_child(key_lbl)

	var val_lbl := Label.new()
	val_lbl.text = val
	val_lbl.position = Vector2(4, 26)
	val_lbl.size = Vector2(rect.size.x - 8, 22)
	val_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	val_lbl.add_theme_font_override("font", FONT_DISPLAY)
	val_lbl.add_theme_font_size_override("font_size", 15)
	val_lbl.add_theme_color_override("font_color", accent)
	chip.add_child(val_lbl)
	return chip


class RayCanvas extends Control:
	var accent: Color = Color("#3fa9ff")
	var spin_time_ref: Array = [0.0]  # mutable ref

	func _draw() -> void:
		var cx := size.x * 0.5
		var cy := 70.0
		var spin := spin_time_ref[0]
		var spoke_count := 20
		for i in spoke_count:
			var angle := float(i) / float(spoke_count) * TAU + spin * 0.35
			var a := Color(accent.r, accent.g, accent.b, 0.12)
			draw_line(
				Vector2(cx + cos(angle) * 20, cy + sin(angle) * 20),
				Vector2(cx + cos(angle) * 160, cy + sin(angle) * 160),
				a, 10.0
			)


class ArtCanvas extends Control:
	var kind: String = "rocket"
	var accent: Color = Color("#3fa9ff")

	func _draw() -> void:
		var cx := size.x * 0.5
		var cy := size.y * 0.5
		# Glow halo
		draw_circle(Vector2(cx, cy), 54.0, Color(accent.r, accent.g, accent.b, 0.22))
		draw_circle(Vector2(cx, cy), 44.0, Color(accent.r, accent.g, accent.b, 0.15))
		if kind == "rocket":
			_draw_rocket(cx, cy)
		elif kind == "coin":
			_draw_coin(cx, cy)
		else:
			_draw_star(cx, cy)

	func _draw_rocket(cx: float, cy: float) -> void:
		# Simple rocket silhouette
		var body := PackedVector2Array([
			Vector2(cx, cy - 38), Vector2(cx + 14, cy - 14),
			Vector2(cx + 14, cy + 22), Vector2(cx - 14, cy + 22),
			Vector2(cx - 14, cy - 14)
		])
		draw_colored_polygon(body, Color(0.918, 0.953, 1.0, 0.95))
		# Nose cone
		var nose := PackedVector2Array([
			Vector2(cx, cy - 38), Vector2(cx + 14, cy - 14), Vector2(cx - 14, cy - 14)
		])
		draw_colored_polygon(nose, accent)
		# Window
		draw_circle(Vector2(cx, cy - 4), 6.0, Color("#f5a623"))
		draw_circle(Vector2(cx, cy - 4), 4.0, Color("#081120"))
		# Fins
		var fin_l := PackedVector2Array([
			Vector2(cx - 14, cy + 8), Vector2(cx - 26, cy + 28), Vector2(cx - 14, cy + 22)
		])
		var fin_r := PackedVector2Array([
			Vector2(cx + 14, cy + 8), Vector2(cx + 26, cy + 28), Vector2(cx + 14, cy + 22)
		])
		draw_colored_polygon(fin_l, accent)
		draw_colored_polygon(fin_r, accent)
		# Exhaust
		var exh := PackedVector2Array([
			Vector2(cx - 8, cy + 22), Vector2(cx, cy + 36), Vector2(cx + 8, cy + 22)
		])
		draw_colored_polygon(exh, Color("#f5a623"))

	func _draw_coin(cx: float, cy: float) -> void:
		draw_circle(Vector2(cx, cy), 34.0, accent)
		draw_circle(Vector2(cx, cy), 26.0, Color(accent.r, accent.g, accent.b, 0.0))
		draw_arc(Vector2(cx, cy), 30.0, 0.0, TAU, 64, Color(1.0, 0.945, 0.816, 0.6), 1.5)

	func _draw_star(cx: float, cy: float) -> void:
		var pts := PackedVector2Array()
		for i in 10:
			var angle := float(i) / 10.0 * TAU - PI * 0.5
			var r := 38.0 if i % 2 == 0 else 16.0
			pts.append(Vector2(cx + cos(angle) * r, cy + sin(angle) * r))
		draw_colored_polygon(pts, accent)
