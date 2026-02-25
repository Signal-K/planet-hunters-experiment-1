extends RefCounted
class_name RocketSelectorUIBuilder

const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const SelectorRootScene = preload("res://Scenes/UI/Templates/RocketSelectorRoot.tscn")
const RocketCardScene = preload("res://Scenes/UI/Templates/RocketSelectorCard.tscn")
const StatChipScene = preload("res://Scenes/UI/Templates/RocketSelectorStatChip.tscn")
const EmptyLabelScene = preload("res://Scenes/UI/Templates/MenuLogbookEmpty.tscn")

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
	_parent.add_child(root)

	var heading: Label = root.get_node("Heading")
	heading.add_theme_color_override("font_color", PanelStyle.TEXT_PRIMARY)
	heading.add_theme_font_size_override("font_size", 34)

	var subheading: Label = root.get_node("Subheading")
	subheading.add_theme_color_override("font_color", PanelStyle.TEXT_MUTED)
	subheading.add_theme_font_size_override("font_size", 20)

	var cards: HBoxContainer = root.get_node("CardsWrap/Cards")

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

func _build_rocket_card(rocket_id: String, total_cards: int) -> Control:
	var card: PanelContainer = RocketCardScene.instantiate()
	card.custom_minimum_size = Vector2(520, 520) if total_cards <= 1 else Vector2(480, 520)
	card.add_theme_stylebox_override("panel", _card_style())

	var body: VBoxContainer = card.get_node("Body")

	var tex = _rocket_textures.get(rocket_id, null)
	if tex:
		var tr: TextureRect = card.get_node("Body/RocketTexture")
		tr.texture = tex
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.mouse_default_cursor_shape = Control.CURSOR_DRAG
		tr.connect("gui_input", _on_texture_input.bind(rocket_id, tex))

	var name_label: Label = card.get_node("Body/NameLabel")
	name_label.text = RocketSpecs.get_display_name(rocket_id)
	name_label.add_theme_color_override("font_color", PanelStyle.TEXT_PRIMARY)
	name_label.add_theme_font_size_override("font_size", 28)

	var chips: GridContainer = card.get_node("Body/Chips")

	var spec = RocketSpecs.get_spec(rocket_id)
	var stat_lines = [
		"Speed x%s" % _fmt_one_decimal(float(spec.get("speed_multiplier", 1.0))),
		"Range x%s" % _fmt_one_decimal(float(spec.get("range_multiplier", 1.0))),
		"Cargo x%s" % _fmt_one_decimal(float(spec.get("cargo_multiplier", 1.0))),
		"Mining x%s" % _fmt_one_decimal(float(spec.get("mining_multiplier", 1.0)))
	]
	for line in stat_lines:
		chips.add_child(_stat_chip(line))

	var economy: Label = card.get_node("Body/EconomyLabel")
	economy.text = "Cost: %s F   •   Salvage: %s%%" % [
		_fmt_francs(int(spec.get("cost", 0))),
		str(int(round(float(spec.get("salvage_refund_pct", 0.20)) * 100.0)))
	]
	economy.add_theme_color_override("font_color", PanelStyle.TEXT_MUTED)
	economy.add_theme_font_size_override("font_size", 18)

	var btn: Button = card.get_node("Body/CreateButton")
	btn.name = "CreateButton_%s" % rocket_id
	btn.text = "Create %s" % RocketSpecs.get_display_name(rocket_id)
	btn.disabled = _creation_locked
	PanelStyle.apply_button(btn, true)
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

func _fmt_one_decimal(value: float) -> String:
	return "%.1f" % value

func _fmt_francs(value: int) -> String:
	var abs_value = abs(value)
	if abs_value >= 1000000000:
		return "%.1fB" % (float(value) / 1000000000.0)
	if abs_value >= 1000000:
		return "%.1fM" % (float(value) / 1000000.0)
	return str(value)
