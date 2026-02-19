extends Control

signal panel_closed

const SubcontractorCardScene = preload("res://Scenes/UI/Templates/SubcontractorCard.tscn")

@onready var close_btn: Button = $PanelContainer/Panel/VBox/Header/HeaderBar/HeaderContent/CloseButton
@onready var subtitle: Label = $PanelContainer/Panel/VBox/Subtitle
@onready var list: VBoxContainer = $PanelContainer/Panel/VBox/Scroll/List
@onready var hint: Label = $PanelContainer/Panel/VBox/Footer/Hint

func _ready() -> void:
	_apply_style()
	close_btn.pressed.connect(_on_close)
	_build_list()

func _apply_style() -> void:
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	var title = $PanelContainer/Panel/VBox/Header/HeaderBar/HeaderContent/Title
	panel_style.apply_title(title)
	panel_style.apply_button(close_btn, false)
	panel_style.apply_body(subtitle)
	panel_style.apply_muted(hint)

func _build_list() -> void:
	for child in list.get_children():
		child.queue_free()
	var sm = preload("res://Scripts/Utils/SubcontractorManager.gd")
	if not sm:
		return
	var app = get_node_or_null("/root/AppController")
	var level = 1
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	if app and app.has_method("get_experience_level"):
		level = int(app.get_experience_level())
	var roster = sm.get_roster(level)
	for entry in roster:
		var is_hidden = bool(entry.get("hidden", false))
		var is_available = bool(entry.get("available", false))
		var unlock_level = int(entry.get("unlock_level", entry.get("min_level", 1)))

		var card: PanelContainer = SubcontractorCardScene.instantiate()
		card.add_theme_constant_override("content_margin_left", 16)
		card.add_theme_constant_override("content_margin_right", 16)
		card.add_theme_constant_override("content_margin_top", 12)
		card.add_theme_constant_override("content_margin_bottom", 12)

		var style = StyleBoxFlat.new()
		if is_available:
			style.bg_color = Color(0.168627, 0.188235, 0.231373, 0.96)
			style.border_color = Color(0.533, 0.753, 0.816, 0.7)
		else:
			style.bg_color = Color(0.133333, 0.152941, 0.180392, 0.94)
			style.border_color = Color(0.263, 0.298, 0.369, 1.0)
		style.border_width_left = 1
		style.border_width_right = 1
		style.border_width_top = 1
		style.border_width_bottom = 1
		style.corner_radius_top_left = 12
		style.corner_radius_top_right = 12
		style.corner_radius_bottom_left = 12
		style.corner_radius_bottom_right = 12
		card.add_theme_stylebox_override("panel", style)

		var row: VBoxContainer = card.get_node("Row")
		var header: HBoxContainer = card.get_node("Row/Header")
		var name_lbl: Label = card.get_node("Row/Header/NameLabel")
		var display_name = str(entry.get("name", "Unknown"))
		if is_hidden:
			display_name = "Classified Subcontractor"
		name_lbl.text = display_name
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		name_lbl.add_theme_color_override("font_color", Color(0.847, 0.871, 0.914, 1))
		name_lbl.add_theme_font_size_override("font_size", 20)
		var level_lbl: Label = card.get_node("Row/Header/LevelLabel")
		level_lbl.text = "Lvl %s" % str(unlock_level)
		level_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		level_lbl.add_theme_color_override("font_color", Color(0.533, 0.753, 0.816, 1))
		level_lbl.add_theme_font_size_override("font_size", 16)

		var role_lbl: Label = card.get_node("Row/RoleLabel")
		if is_available:
			role_lbl.text = str(entry.get("role", ""))
		else:
			role_lbl.text = "Locked until level %s" % str(unlock_level)
		role_lbl.add_theme_color_override("font_color", Color(0.639, 0.694, 0.784, 1))
		role_lbl.add_theme_font_size_override("font_size", 15)

		var affinity = int(sm.get_affinity(str(entry.get("id", ""))))
		var affinity_row: HBoxContainer = card.get_node("Row/AffinityRow")
		var affinity_lbl: Label = card.get_node("Row/AffinityRow/AffinityLabel")
		affinity_lbl.add_theme_color_override("font_color", Color(0.639, 0.694, 0.784, 1))
		affinity_lbl.add_theme_font_size_override("font_size", 13)
		var bar: ProgressBar = card.get_node("Row/AffinityRow/AffinityBar")
		bar.max_value = 100
		bar.value = affinity
		bar.show_percentage = false
		panel_style.apply_progress_bar(bar)
		var val_lbl: Label = card.get_node("Row/AffinityRow/AffinityValueLabel")
		val_lbl.text = "%s/100" % str(affinity)
		val_lbl.add_theme_color_override("font_color", Color(0.639, 0.694, 0.784, 1))
		val_lbl.add_theme_font_size_override("font_size", 13)
		list.add_child(card)

func _on_close() -> void:
	panel_closed.emit()
	queue_free()
