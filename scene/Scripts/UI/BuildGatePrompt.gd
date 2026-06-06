extends Control

signal build_requested
signal close_requested

const FONT_DISPLAY := preload("res://design_system_source/fonts/Oxanium-Bold.ttf")
const FONT_BODY    := preload("res://design_system_source/fonts/Oxanium-Regular.ttf")
const FONT_MONO    := preload("res://design_system_source/fonts/TurretRoad-Regular.ttf")

const C_BG      := Color("#060d18")
const C_SURFACE := Color("#0d1c30")
const C_AMBER   := Color("#f5a623")
const C_CYAN    := Color("#3fa9ff")
const C_TEXT    := Color("#e6efff")
const C_DIM     := Color("#a9b8ce")
const C_MUTED   := Color("#5d7390")
const C_CRIT    := Color("#ff5a6a")

const COST := 500_000_000

@onready var backdrop: ColorRect    = $Backdrop
@onready var gate_card: Panel       = $GateCard
@onready var handle: ColorRect      = $GateCard/Handle
@onready var eyebrow_label: Label   = $GateCard/EyebrowLabel
@onready var title_label: Label     = $GateCard/TitleLabel
@onready var body_label: Label      = $GateCard/BodyLabel
@onready var cost_label: Label      = $GateCard/CostLabel
@onready var balance_label: Label   = $GateCard/BalanceLabel
@onready var build_button: Button   = $GateCard/BuildButton
@onready var close_button: Button   = $GateCard/CloseButton
@onready var art_canvas: Control    = $GateCard/ArtCanvas

var _francs: int = 0

func _ready() -> void:
	backdrop.color = Color(0.012, 0.024, 0.047, 0.72)
	_apply_styles()
	build_button.pressed.connect(func(): build_requested.emit())
	close_button.pressed.connect(func(): close_requested.emit())

func set_state(state: Dictionary) -> void:
	visible = bool(state.get("visible", true))
	_francs = int(state.get("francs", 0))
	_refresh_balance()

func _refresh_balance() -> void:
	var afford := _francs >= COST
	cost_label.text = "COST   TRI 500,000,000"
	balance_label.text = "BAL  TRI %s" % _fmt(_francs)
	cost_label.add_theme_color_override("font_color", C_AMBER if afford else C_CRIT)
	balance_label.add_theme_color_override("font_color", C_MUTED)
	build_button.disabled = not afford
	var s := StyleBoxFlat.new()
	s.bg_color = C_AMBER if afford else Color(C_AMBER.r, C_AMBER.g, C_AMBER.b, 0.35)
	s.set_corner_radius_all(12)
	s.set_border_width_all(0)
	s.content_margin_top = 15
	s.content_margin_bottom = 15
	s.shadow_color = Color(0, 0, 0, 0.3)
	s.shadow_size = 6
	s.shadow_offset = Vector2(0, 4)
	build_button.add_theme_stylebox_override("normal", s)
	build_button.add_theme_color_override("font_color",
		Color("#1d0c00") if afford else Color("#7a5200"))

func _fmt(n: int) -> String:
	var s := str(n)
	var result := ""
	var count := 0
	for i in range(s.length() - 1, -1, -1):
		if count > 0 and count % 3 == 0:
			result = "," + result
		result = s[i] + result
		count += 1
	return result

func _apply_styles() -> void:
	var card_style := StyleBoxFlat.new()
	card_style.bg_color = C_BG
	card_style.border_color = Color(C_AMBER.r, C_AMBER.g, C_AMBER.b, 0.5)
	card_style.set_border_width_all(1)
	card_style.corner_radius_top_left = 20
	card_style.corner_radius_top_right = 20
	card_style.set_corner_radius_all(20)
	card_style.shadow_color = Color(0, 0, 0, 0.6)
	card_style.shadow_size = 20
	card_style.shadow_offset = Vector2(0, -8)
	gate_card.add_theme_stylebox_override("panel", card_style)

	handle.color = Color(1, 1, 1, 0.25)

	eyebrow_label.add_theme_font_override("font", FONT_DISPLAY)
	eyebrow_label.add_theme_font_size_override("font_size", 9)
	eyebrow_label.add_theme_color_override("font_color", C_AMBER)

	title_label.add_theme_font_override("font", FONT_DISPLAY)
	title_label.add_theme_font_size_override("font_size", 18)
	title_label.add_theme_color_override("font_color", C_TEXT)

	body_label.add_theme_font_override("font", FONT_BODY)
	body_label.add_theme_font_size_override("font_size", 12)
	body_label.add_theme_color_override("font_color", C_DIM)

	cost_label.add_theme_font_override("font", FONT_DISPLAY)
	cost_label.add_theme_font_size_override("font_size", 16)
	balance_label.add_theme_font_override("font", FONT_MONO)
	balance_label.add_theme_font_size_override("font_size", 10)

	build_button.add_theme_font_override("font", FONT_DISPLAY)
	build_button.add_theme_font_size_override("font_size", 14)

	close_button.add_theme_font_override("font", FONT_MONO)
	close_button.add_theme_font_size_override("font_size", 11)
	close_button.add_theme_color_override("font_color", C_MUTED)
	var cs := StyleBoxFlat.new()
	cs.bg_color = Color(0, 0, 0, 0)
	cs.set_border_width_all(0)
	for state in ["normal", "hover", "pressed", "focus"]:
		close_button.add_theme_stylebox_override(state, cs)


class ArtCanvas extends Control:
	func _draw() -> void:
		# Control station icon — a simple command console glyph
		var cx := size.x * 0.5
		var cy := size.y * 0.5
		draw_circle(Vector2(cx, cy), 28.0, Color(0.247, 0.663, 1.0, 0.12))
		draw_arc(Vector2(cx, cy), 26.0, 0.0, TAU, 48, Color(0.961, 0.651, 0.137, 0.8), 2.0)
		# Console panel shape
		draw_rect(Rect2(cx - 18, cy - 14, 36, 28), Color("#0d1c30"), true)
		draw_rect(Rect2(cx - 18, cy - 14, 36, 28), Color(0.961, 0.651, 0.137, 0.8), false, 1.5)
		# Status dots
		for i in 3:
			var dx := cx - 10.0 + float(i) * 10.0
			draw_circle(Vector2(dx, cy - 5), 3.0, Color(0.224, 0.827, 0.416, 1.0))
		# Screen bar
		draw_rect(Rect2(cx - 14, cy + 2, 28, 8), Color(0.247, 0.663, 1.0, 0.55), true)
