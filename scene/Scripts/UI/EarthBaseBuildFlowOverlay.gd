extends Control

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
static var OptionCardScene: PackedScene = load("res://Scenes/UI/Templates/EarthBaseBuildFlowOptionCard.tscn") if ResourceLoader.exists("res://Scenes/UI/Templates/EarthBaseBuildFlowOptionCard.tscn") else null

signal cancelled
signal location_selected(location_id: String)
signal structure_selected(structure_id: String)

@onready var _panel: PanelContainer = $Center/Panel
@onready var _step_label: Label = $Center/Panel/Margin/VBox/StepLabel
@onready var _title_label: Label = $Center/Panel/Margin/VBox/TitleLabel
@onready var _subtitle_label: Label = $Center/Panel/Margin/VBox/SubtitleLabel
@onready var _options_list: VBoxContainer = $Center/Panel/Margin/VBox/OptionsList
@onready var _editor_preview_card: Node = $Center/Panel/Margin/VBox/OptionsList/EditorPreviewCard
@onready var _message_label: Label = $Center/Panel/Margin/VBox/MessageLabel
@onready var _cancel_button: Button = $Center/Panel/Margin/VBox/FooterRow/CancelButton
@onready var _back_button: Button = $Center/Panel/Margin/VBox/FooterRow/BackButton

const DARK_BG := Color(0.06, 0.10, 0.16, 0.98)

func _ready() -> void:
	_panel.add_theme_stylebox_override(
		"panel",
		PanelStyle.create_glass_panel_style(DARK_BG, 1.0, 16, 28, 24)
	)
	_style_footer_buttons()
	if _editor_preview_card and is_instance_valid(_editor_preview_card) and not Engine.is_editor_hint():
		_editor_preview_card.queue_free()
	_cancel_button.pressed.connect(func() -> void:
		cancelled.emit()
		queue_free()
	)
	_back_button.pressed.connect(func() -> void:
		location_selected.emit("")
	)

func _style_footer_buttons() -> void:
	for btn in [_cancel_button, _back_button]:
		if btn == null:
			continue
		var s := StyleBoxFlat.new()
		s.bg_color = Color(0.14, 0.22, 0.32, 1.0)
		s.border_color = Color(0.28, 0.88, 0.96, 0.35)
		s.set_border_width_all(1)
		s.set_corner_radius_all(8)
		s.content_margin_left = 20
		s.content_margin_right = 20
		s.content_margin_top = 10
		s.content_margin_bottom = 10
		btn.add_theme_stylebox_override("normal", s)
		btn.add_theme_stylebox_override("hover", s)
		btn.add_theme_stylebox_override("pressed", s)
		btn.add_theme_color_override("font_color", Color(0.78, 0.84, 0.92, 1.0))

func show_location_step(title: String, subtitle: String, locations: Array, message: String = "") -> void:
	_step_label.text = "STEP 1 OF 2"
	_title_label.text = title
	_subtitle_label.text = subtitle
	_message_label.text = message
	_back_button.visible = false
	_rebuild_options(locations, "Select base", func(id: String) -> void:
		location_selected.emit(id)
	)

func show_structure_step(title: String, subtitle: String, structures: Array, message: String = "") -> void:
	_step_label.text = "STEP 2 OF 2"
	_title_label.text = title
	_subtitle_label.text = subtitle
	_message_label.text = message
	_back_button.visible = true
	_rebuild_options(structures, "Place structure", func(id: String) -> void:
		structure_selected.emit(id)
	)

func _style_action_button(btn: Button) -> void:
	var s := StyleBoxFlat.new()
	s.bg_color = Color(0.10, 0.54, 0.46, 1.0)
	s.set_corner_radius_all(8)
	s.content_margin_left = 20
	s.content_margin_right = 20
	s.content_margin_top = 10
	s.content_margin_bottom = 10
	var s_hover := s.duplicate() as StyleBoxFlat
	s_hover.bg_color = Color(0.13, 0.65, 0.55, 1.0)
	btn.add_theme_stylebox_override("normal", s)
	btn.add_theme_stylebox_override("hover", s_hover)
	btn.add_theme_stylebox_override("pressed", s)
	btn.add_theme_color_override("font_color", Color(1.0, 1.0, 1.0, 1.0))

func _rebuild_options(items: Array, button_text: String, on_pressed: Callable) -> void:
	for child in _options_list.get_children():
		child.queue_free()
	for item_any in items:
		if typeof(item_any) != TYPE_DICTIONARY:
			continue
		var item: Dictionary = item_any
		var card := OptionCardScene.instantiate() as PanelContainer
		if card == null:
			continue
		_options_list.add_child(card)
		(card.get_node("Margin/VBox/TitleLabel") as Label).text = str(item.get("title", "Option"))
		(card.get_node("Margin/VBox/SubtitleLabel") as Label).text = str(item.get("subtitle", ""))
		(card.get_node("Margin/VBox/MetaLabel") as Label).text = str(item.get("meta", ""))
		var btn := card.get_node("Margin/VBox/ActionButton") as Button
		btn.text = button_text
		_style_action_button(btn)
		var item_id := str(item.get("id", ""))
		btn.pressed.connect(func() -> void:
			on_pressed.call(item_id)
		)
