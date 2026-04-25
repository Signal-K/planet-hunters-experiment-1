extends Control

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const OptionCardScene = preload("res://Scenes/UI/Templates/EarthBaseBuildFlowOptionCard.tscn")

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

func _ready() -> void:
	_panel.add_theme_stylebox_override("panel", PanelStyle.create_glass_panel_style())
	if _editor_preview_card and is_instance_valid(_editor_preview_card) and not Engine.is_editor_hint():
		_editor_preview_card.queue_free()
	_cancel_button.pressed.connect(func() -> void:
		cancelled.emit()
		queue_free()
	)
	_back_button.pressed.connect(func() -> void:
		location_selected.emit("")
	)

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
		PanelStyle.apply_button(btn, true)
		var item_id := str(item.get("id", ""))
		btn.pressed.connect(func() -> void:
			on_pressed.call(item_id)
		)
