extends RefCounted
class_name RocketSelectorUIBuilder

const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

var _parent: Node
var _ui_size: Vector2
var _rocket_textures: Dictionary
var _creation_locked: bool
var _on_create: Callable
var _on_texture_input: Callable

func setup(
	parent: Node,
	ui_size: Vector2,
	rocket_textures: Dictionary,
	creation_locked: bool,
	on_create: Callable,
	on_texture_input: Callable
) -> void:
	_parent = parent
	_ui_size = ui_size
	_rocket_textures = rocket_textures
	_creation_locked = creation_locked
	_on_create = on_create
	_on_texture_input = on_texture_input

func build_ui(unlocked_rockets: Array) -> void:
	for child in _parent.get_children():
		child.queue_free()

	var root = VBoxContainer.new()
	root.name = "SelectorRoot"
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_theme_constant_override("separation", 10)
	_parent.add_child(root)

	var heading = Label.new()
	heading.text = "Available Rockets"
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	heading.add_theme_color_override("font_color", PanelStyle.TEXT_PRIMARY)
	heading.add_theme_font_size_override("font_size", 30)
	root.add_child(heading)

	var subheading = Label.new()
	subheading.text = "Choose your vehicle. Drag the image or press Create."
	subheading.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	subheading.add_theme_color_override("font_color", PanelStyle.TEXT_MUTED)
	subheading.add_theme_font_size_override("font_size", 18)
	root.add_child(subheading)

	var scroll = ScrollContainer.new()
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	root.add_child(scroll)

	var cards = GridContainer.new()
	cards.name = "Grid"
	cards.columns = 2 if unlocked_rockets.size() > 1 else 1
	cards.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cards.add_theme_constant_override("h_separation", 16)
	cards.add_theme_constant_override("v_separation", 16)
	scroll.add_child(cards)

	for rocket_id in unlocked_rockets:
		cards.add_child(_build_rocket_card(str(rocket_id)))

func _build_rocket_card(rocket_id: String) -> Control:
	var card = PanelContainer.new()
	card.custom_minimum_size = Vector2(380, 500)
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.add_theme_stylebox_override("panel", _card_style())

	var body = VBoxContainer.new()
	body.add_theme_constant_override("separation", 8)
	card.add_child(body)

	var tex = _rocket_textures.get(rocket_id, null)
	if tex:
		var tr = TextureRect.new()
		tr.texture = tex
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(0, 190)
		tr.mouse_default_cursor_shape = Control.CURSOR_DRAG
		tr.connect("gui_input", _on_texture_input.bind(rocket_id, tex))
		body.add_child(tr)

	var name_label = Label.new()
	name_label.text = RocketSpecs.get_display_name(rocket_id)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.add_theme_color_override("font_color", PanelStyle.TEXT_PRIMARY)
	name_label.add_theme_font_size_override("font_size", 26)
	body.add_child(name_label)

	var chips = GridContainer.new()
	chips.columns = 2
	chips.add_theme_constant_override("h_separation", 8)
	chips.add_theme_constant_override("v_separation", 6)
	body.add_child(chips)

	var spec = RocketSpecs.get_spec(rocket_id)
	var stat_lines = [
		"Speed x%s" % _fmt_one_decimal(float(spec.get("speed_multiplier", 1.0))),
		"Range x%s" % _fmt_one_decimal(float(spec.get("range_multiplier", 1.0))),
		"Cargo x%s" % _fmt_one_decimal(float(spec.get("cargo_multiplier", 1.0))),
		"Mining x%s" % _fmt_one_decimal(float(spec.get("mining_multiplier", 1.0)))
	]
	for line in stat_lines:
		chips.add_child(_stat_chip(line))

	var economy = Label.new()
	economy.text = "Cost: %s F   •   Salvage: %s%%" % [
		_fmt_francs(int(spec.get("cost", 0))),
		str(int(round(float(spec.get("salvage_refund_pct", 0.20)) * 100.0)))
	]
	economy.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	economy.add_theme_color_override("font_color", PanelStyle.TEXT_MUTED)
	economy.add_theme_font_size_override("font_size", 17)
	body.add_child(economy)

	var spacer = Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(spacer)

	var btn = Button.new()
	btn.name = "CreateButton_%s" % rocket_id
	btn.text = "Create %s" % RocketSpecs.get_display_name(rocket_id)
	btn.custom_minimum_size = Vector2(0, 54)
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn.disabled = _creation_locked
	PanelStyle.apply_button(btn, true)
	btn.pressed.connect(_on_create.bind(rocket_id))
	body.add_child(btn)

	return card

func _stat_chip(text: String) -> Control:
	var chip = PanelContainer.new()
	chip.add_theme_stylebox_override("panel", _chip_style())
	var lbl = Label.new()
	lbl.text = text
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.add_theme_color_override("font_color", PanelStyle.TEXT_PRIMARY)
	lbl.add_theme_font_size_override("font_size", 14)
	chip.add_child(lbl)
	return chip

func _card_style() -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.08, 0.12, 0.16, 0.86)
	style.border_color = Color(0.263, 0.298, 0.369, 1.0)
	style.border_width_left = 1
	style.border_width_right = 1
	style.border_width_top = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 20
	style.corner_radius_top_right = 20
	style.corner_radius_bottom_left = 20
	style.corner_radius_bottom_right = 20
	style.content_margin_left = 12
	style.content_margin_top = 12
	style.content_margin_right = 12
	style.content_margin_bottom = 12
	style.shadow_color = Color(0, 0, 0, 0.3)
	style.shadow_size = 10
	style.shadow_offset = Vector2(0, 4)
	return style

func _chip_style() -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.20, 0.27, 0.34, 0.65)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.content_margin_left = 8
	style.content_margin_top = 5
	style.content_margin_right = 8
	style.content_margin_bottom = 5
	return style

func _fmt_one_decimal(value: float) -> String:
	return "%.1f" % value

func _fmt_francs(value: int) -> String:
	var abs_value = abs(value)
	if abs_value >= 1000000000:
		return "%.1fB" % (float(value) / 1000000000.0)
	if abs_value >= 1000000:
		return "%.1fM" % (float(value) / 1000000.0)
	return str(value)
