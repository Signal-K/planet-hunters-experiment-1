extends RefCounted
class_name RocketSelectorUIBuilder

const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const SelectorRootScene = preload("res://Scenes/UI/Templates/RocketSelectorRoot.tscn")
const RocketCardScene = preload("res://Scenes/UI/Templates/RocketSelectorCard.tscn")
const StatChipScene = preload("res://Scenes/UI/Templates/RocketSelectorStatChip.tscn")
const EmptyLabelScene = preload("res://Scenes/UI/Templates/MenuLogbookEmpty.tscn")
const NumberFormat = preload("res://Scripts/Utils/NumberFormat.gd")

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

	var root: VBoxContainer = SelectorRootScene.instantiate()
	root.set_meta("ui_style_locked", true)
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.offset_left = 0
	root.offset_top = 0
	root.offset_right = 0
	root.offset_bottom = 0
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_parent.add_child(root)

	var heading: Label = root.get_node("Heading")
	heading.visible = false

	var subheading: Label = root.get_node("Subheading")
	subheading.visible = false

	var cards_wrap: ScrollContainer = root.get_node("CardsWrap")
	cards_wrap.set_meta("ui_style_locked", true)
	cards_wrap.scroll_vertical = 0
	var cards: VBoxContainer = root.get_node("CardsWrap/Cards")
	cards.set_meta("ui_style_locked", true)
	cards.add_theme_constant_override("separation", 12)

	if unlocked_rockets.is_empty():
		var empty: Label = EmptyLabelScene.instantiate()
		empty.text = "No rockets unlocked."
		PanelStyle.apply_muted(empty)
		cards.add_child(empty)
		return

	var rocket_ids := []
	for rocket_id in unlocked_rockets:
		rocket_ids.append(str(rocket_id))
	for rocket_id in rocket_ids:
		cards.add_child(_build_rocket_card(str(rocket_id), rocket_ids.size()))

func _build_rocket_card(rocket_id: String, _total_cards: int) -> Control:
	var card: PanelContainer = RocketCardScene.instantiate()
	card.set_meta("ui_style_locked", true)
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	card.custom_minimum_size = Vector2(0, 200)
	card.add_theme_stylebox_override("panel", _card_style())

	var body: VBoxContainer = card.get_node("Body")
	body.set_meta("ui_style_locked", true)

	var tex = _rocket_textures.get(rocket_id, null)
	if tex == null:
		var spec = RocketSpecs.get_spec(rocket_id)
		var icon_path = str(spec.get("icon_path", ""))
		if icon_path != "":
			tex = load(icon_path)
	if tex:
		var tr: TextureRect = card.get_node("Body/RocketTexture")
		tr.set_meta("ui_style_locked", true)
		tr.texture = tex
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.mouse_default_cursor_shape = Control.CURSOR_DRAG
		tr.custom_minimum_size = Vector2(0, 110)
		tr.connect("gui_input", _on_texture_input.bind(rocket_id, tex))
	else:
		var tr_missing: Label = Label.new()
		tr_missing.text = "Rocket image unavailable"
		tr_missing.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		tr_missing.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		tr_missing.custom_minimum_size = Vector2(0, 70)
		tr_missing.add_theme_color_override("font_color", PanelStyle.TEXT_PRIMARY)
		tr_missing.add_theme_font_size_override("font_size", 16)
		body.add_child(tr_missing)

	var name_label: Label = card.get_node("Body/NameLabel")
	name_label.set_meta("ui_style_locked", true)
	var display_name = RocketSpecs.get_display_name(rocket_id)
	name_label.text = display_name if display_name != "" else rocket_id.capitalize()
	name_label.add_theme_color_override("font_color", PanelStyle.TEXT_PRIMARY)
	name_label.add_theme_font_size_override("font_size", 24)

	var chips: GridContainer = card.get_node("Body/Chips")

	var spec = RocketSpecs.get_spec(rocket_id)
	var stat_lines = [
		"Speed x%s" % _fmt_one_decimal(float(spec.get("speed_multiplier", 1.0))),
		"Range x%s" % _fmt_one_decimal(float(spec.get("range_multiplier", 1.0)))
	]
	for line in stat_lines:
		chips.add_child(_stat_chip(line))

	var economy: Label = card.get_node("Body/EconomyLabel")
	economy.set_meta("ui_style_locked", true)
	economy.text = "Cost: %s F" % [
		_fmt_francs(int(spec.get("cost", 0))),
	]
	economy.add_theme_color_override("font_color", PanelStyle.TEXT_PRIMARY)
	economy.add_theme_font_size_override("font_size", 18)

	var btn: Button = card.get_node("Body/CreateButton")
	btn.set_meta("ui_style_locked", true)
	btn.name = "CreateButton_%s" % rocket_id
	btn.text = "Create %s" % (display_name if display_name != "" else "Rocket")
	btn.disabled = _creation_locked
	btn.custom_minimum_size = Vector2(0, 56)
	_apply_create_button_style(btn)
	btn.pressed.connect(_on_create.bind(rocket_id))

	return card

func _stat_chip(text: String) -> Control:
	var chip: PanelContainer = StatChipScene.instantiate()
	chip.add_theme_stylebox_override("panel", _chip_style())
	var lbl: Label = chip.get_node("Label")
	lbl.text = text
	lbl.add_theme_color_override("font_color", PanelStyle.TEXT_PRIMARY)
	lbl.add_theme_font_size_override("font_size", 16)
	return chip

func _card_style() -> StyleBoxFlat:
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	var style = panel_style.create_card_style()
	style.bg_color = Color(0.08, 0.12, 0.16, 0.86)
	style.corner_radius_top_left = 20
	style.corner_radius_top_right = 20
	style.corner_radius_bottom_left = 20
	style.corner_radius_bottom_right = 20
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

func _apply_create_button_style(btn: Button) -> void:
	var normal := StyleBoxFlat.new()
	normal.bg_color = PanelStyle.ACCENT_WARM
	normal.border_color = PanelStyle.PANEL_BORDER
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(6)
	normal.content_margin_left = 16
	normal.content_margin_right = 16
	normal.content_margin_top = 10
	normal.content_margin_bottom = 10
	var hover := normal.duplicate()
	hover.bg_color = Color(1.0, 0.78, 0.34, 1.0)
	var pressed := normal.duplicate()
	pressed.bg_color = Color(0.88, 0.64, 0.16, 1.0)
	var disabled := normal.duplicate()
	disabled.bg_color = Color(0.10, 0.15, 0.24, 0.96)
	disabled.border_color = Color(0.44, 0.62, 0.82, 0.85)
	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", pressed)
	btn.add_theme_stylebox_override("focus", hover)
	btn.add_theme_stylebox_override("disabled", disabled)
	btn.add_theme_color_override("font_color", Color(0.04, 0.08, 0.12, 1.0))
	btn.add_theme_color_override("font_hover_color", Color(0.04, 0.08, 0.12, 1.0))
	btn.add_theme_color_override("font_pressed_color", Color(0.04, 0.08, 0.12, 1.0))
	btn.add_theme_color_override("font_disabled_color", Color(0.88, 0.94, 0.98, 1.0))
	btn.add_theme_font_size_override("font_size", 24)

func _fmt_one_decimal(value: float) -> String:
	return "%.1f" % value

func _fmt_francs(value: int) -> String:
	return NumberFormat.compact(value)
