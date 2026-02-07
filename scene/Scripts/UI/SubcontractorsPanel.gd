extends Control

signal panel_closed

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
	if app and app.has_method("get_experience_level"):
		level = int(app.get_experience_level())
	var roster = sm.get_roster(level)
	for entry in roster:
		var is_hidden = bool(entry.get("hidden", false))
		var is_available = bool(entry.get("available", false))
		var unlock_level = int(entry.get("unlock_level", entry.get("min_level", 1)))

		var card = PanelContainer.new()
		card.custom_minimum_size = Vector2(0, 82)
		card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		card.add_theme_constant_override("content_margin_left", 16)
		card.add_theme_constant_override("content_margin_right", 16)
		card.add_theme_constant_override("content_margin_top", 12)
		card.add_theme_constant_override("content_margin_bottom", 12)

		var style = StyleBoxFlat.new()
		if is_available:
			style.bg_color = Color(0.93, 0.97, 1.0, 1.0)
			style.border_color = Color(0.62, 0.78, 0.92, 1.0)
		else:
			style.bg_color = Color(0.92, 0.93, 0.95, 1.0)
			style.border_color = Color(0.8, 0.82, 0.86, 1.0)
		style.border_width_left = 1
		style.border_width_right = 1
		style.border_width_top = 1
		style.border_width_bottom = 1
		style.corner_radius_top_left = 12
		style.corner_radius_top_right = 12
		style.corner_radius_bottom_left = 12
		style.corner_radius_bottom_right = 12
		card.add_theme_stylebox_override("panel", style)

		var row = VBoxContainer.new()
		row.add_theme_constant_override("separation", 6)

		var header = HBoxContainer.new()
		header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var name_lbl = Label.new()
		var display_name = str(entry.get("name", "Unknown"))
		if is_hidden:
			display_name = "Classified Subcontractor"
		name_lbl.text = display_name
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		name_lbl.add_theme_color_override("font_color", Color(0.12, 0.2, 0.35))
		name_lbl.add_theme_font_size_override("font_size", 20)
		var level_lbl = Label.new()
		level_lbl.text = "Lvl %s" % str(unlock_level)
		level_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		level_lbl.add_theme_color_override("font_color", Color(0.35, 0.48, 0.65))
		level_lbl.add_theme_font_size_override("font_size", 16)
		header.add_child(name_lbl)
		header.add_child(level_lbl)
		row.add_child(header)

		var role_lbl = Label.new()
		if is_available:
			role_lbl.text = str(entry.get("role", ""))
		else:
			role_lbl.text = "Locked until level %s" % str(unlock_level)
		role_lbl.add_theme_color_override("font_color", Color(0.35, 0.4, 0.5))
		role_lbl.add_theme_font_size_override("font_size", 15)
		row.add_child(role_lbl)

		var affinity = int(sm.get_affinity(str(entry.get("id", ""))))
		var affinity_row = HBoxContainer.new()
		affinity_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var affinity_lbl = Label.new()
		affinity_lbl.text = "Affinity"
		affinity_lbl.add_theme_color_override("font_color", Color(0.42, 0.48, 0.58))
		affinity_lbl.add_theme_font_size_override("font_size", 13)
		var bar = ProgressBar.new()
		bar.custom_minimum_size = Vector2(180, 12)
		bar.max_value = 100
		bar.value = affinity
		bar.show_percentage = false
		var val_lbl = Label.new()
		val_lbl.text = "%s/100" % str(affinity)
		val_lbl.add_theme_color_override("font_color", Color(0.42, 0.48, 0.58))
		val_lbl.add_theme_font_size_override("font_size", 13)
		affinity_row.add_child(affinity_lbl)
		affinity_row.add_child(bar)
		affinity_row.add_child(val_lbl)
		row.add_child(affinity_row)

		card.add_child(row)
		list.add_child(card)

func _on_close() -> void:
	panel_closed.emit()
	queue_free()
