extends CanvasLayer
class_name WelcomeOverlay

## First-run welcome overlay. Shown once on clean start or after a factory reset.
## The flag file (user://landnam_intro_v1.cfg) is cleared by AppController.full_factory_reset().

const DS         = preload("res://Scripts/UI/DS.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

const FLAG_PATH    := "user://landnam_intro_v1.cfg"
const FLAG_SECTION := "welcome"
const FLAG_KEY     := "shown"

static func maybe_show(parent: Node) -> void:
	var cfg := ConfigFile.new()
	cfg.load(FLAG_PATH)
	if cfg.has_section_key(FLAG_SECTION, FLAG_KEY):
		return
	cfg.set_value(FLAG_SECTION, FLAG_KEY, true)
	cfg.save(FLAG_PATH)
	var overlay := WelcomeOverlay.new()
	parent.add_child(overlay)

func _ready() -> void:
	layer = 80
	_build_ui()

func _build_ui() -> void:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(root)

	# Backdrop
	var backdrop := ColorRect.new()
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.color = Color(0.02, 0.035, 0.06, 0.88)
	root.add_child(backdrop)

	# Centered card
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(center)

	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(560.0, 0.0)
	var card_style := StyleBoxFlat.new()
	card_style.bg_color = DS.SURFACE_LOWEST
	card_style.border_color = DS.BORDER_STRONG
	card_style.set_border_width_all(1)
	card_style.set_corner_radius_all(DS.R_MODULE)
	card_style.shadow_color = Color(DS.PRIMARY.r, DS.PRIMARY.g, DS.PRIMARY.b, 0.22)
	card_style.shadow_size = 32
	card_style.shadow_offset = Vector2(0.0, 8.0)
	card_style.content_margin_left   = 48.0
	card_style.content_margin_right  = 48.0
	card_style.content_margin_top    = 44.0
	card_style.content_margin_bottom = 44.0
	card.add_theme_stylebox_override("panel", card_style)
	center.add_child(card)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 24)
	card.add_child(vbox)

	# Eyebrow
	var eyebrow := Label.new()
	eyebrow.text = "LANDNÁM"
	eyebrow.add_theme_color_override("font_color", DS.PRIMARY)
	eyebrow.add_theme_font_size_override("font_size", 13)
	eyebrow.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(eyebrow)

	# Title
	var title := Label.new()
	title.text = "Welcome, Commander."
	title.add_theme_color_override("font_color", DS.TEXT)
	title.add_theme_font_size_override("font_size", 36)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(title)

	# Separator
	var sep := HSeparator.new()
	sep.add_theme_color_override("separator", Color(DS.PRIMARY.r, DS.PRIMARY.g, DS.PRIMARY.b, 0.22))
	vbox.add_child(sep)

	# Body
	var body := Label.new()
	body.text = "You are in command of a deep-space mining operation.\n\nSign contractors, build rockets, and launch missions to real asteroid and planet candidates — contributing to actual ongoing science.\n\nYour first mission briefing is waiting."
	body.add_theme_color_override("font_color", DS.TEXT_MUTED)
	body.add_theme_font_size_override("font_size", 19)
	body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(body)

	# Spacer
	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 8)
	vbox.add_child(spacer)

	# CTA button
	var btn := Button.new()
	btn.text = "Start Exploring  →"
	btn.custom_minimum_size = Vector2(0, 52)
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	PanelStyle.apply_button(btn, true)
	btn.add_theme_font_size_override("font_size", 18)
	btn.pressed.connect(_on_dismiss)
	vbox.add_child(btn)

func _on_dismiss() -> void:
	queue_free()
