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
	subtitle.text = "Build partner standing to unlock rewards."
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

		var style = panel_style.create_card_style()
		if is_available:
			style.border_color = Color(panel_style.ACCENT.r, panel_style.ACCENT.g, panel_style.ACCENT.b, 0.7)
		else:
			style.bg_color = Color(panel_style.PANEL_BG.r, panel_style.PANEL_BG.g, panel_style.PANEL_BG.b, 0.94)
			style.border_color = panel_style.PANEL_BORDER
		card.add_theme_stylebox_override("panel", style)

		var row: VBoxContainer = card.get_node("Row")
		var header: HBoxContainer = card.get_node("Row/Header")
		var name_lbl: Label = card.get_node("Row/Header/NameLabel")
		var display_name = str(entry.get("name", "Unknown"))
		if is_hidden:
			display_name = "Classified Subcontractor"
		name_lbl.text = display_name
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		name_lbl.add_theme_color_override("font_color", panel_style.TEXT_PRIMARY)
		name_lbl.add_theme_font_size_override("font_size", 20)
		var level_lbl: Label = card.get_node("Row/Header/LevelLabel")
		level_lbl.text = "Lvl %s" % str(unlock_level)
		level_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		level_lbl.add_theme_color_override("font_color", panel_style.ACCENT)
		level_lbl.add_theme_font_size_override("font_size", 16)

		var role_lbl: Label = card.get_node("Row/RoleLabel")
		if is_available:
			role_lbl.text = "Focus: " + str(entry.get("role", ""))
		else:
			role_lbl.text = "Unlocks at level %s" % str(unlock_level)
		role_lbl.add_theme_color_override("font_color", panel_style.TEXT_MUTED)
		role_lbl.add_theme_font_size_override("font_size", 14)

		var affinity = int(sm.get_affinity(str(entry.get("id", ""))))
		var affinity_row: HBoxContainer = card.get_node("Row/AffinityRow")
		var affinity_lbl: Label = card.get_node("Row/AffinityRow/AffinityLabel")
		affinity_lbl.text = "Standing:"
		affinity_lbl.add_theme_color_override("font_color", panel_style.TEXT_MUTED)
		affinity_lbl.add_theme_font_size_override("font_size", 13)
		var bar: ProgressBar = card.get_node("Row/AffinityRow/AffinityBar")
		bar.max_value = 100
		bar.value = affinity
		bar.show_percentage = false
		panel_style.apply_progress_bar(bar)
		var val_lbl: Label = card.get_node("Row/AffinityRow/AffinityValueLabel")
		val_lbl.text = "%s/100" % str(affinity)
		val_lbl.add_theme_color_override("font_color", panel_style.TEXT_MUTED)
		val_lbl.add_theme_font_size_override("font_size", 13)
		list.add_child(card)

func _on_close() -> void:
	panel_closed.emit()
	queue_free()
