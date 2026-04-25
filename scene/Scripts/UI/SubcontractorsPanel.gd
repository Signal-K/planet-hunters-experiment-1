extends Control

signal panel_closed

const SubcontractorCardScene = preload("res://Scenes/UI/Templates/SubcontractorCard.tscn")
const SubcontractorDetailLabelScene = preload("res://Scenes/UI/Templates/SubcontractorDetailLabel.tscn")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

@onready var close_btn: Button = $PanelContainer/Panel/VBox/Header/HeaderBar/HeaderContent/CloseButton
@onready var subtitle: Label = $PanelContainer/Panel/VBox/Subtitle
@onready var list: VBoxContainer = $PanelContainer/Panel/VBox/Scroll/List
@onready var hint: Label = $PanelContainer/Panel/VBox/Footer/Hint

func _ready() -> void:
	_apply_style()
	$Overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	$Overlay.gui_input.connect(_on_overlay_input)
	close_btn.pressed.connect(_on_close)
	_build_list()

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		_on_close()

func _apply_style() -> void:
	$Overlay.color = Color(0.03, 0.06, 0.10, 0.80)
	$PanelContainer/Panel.add_theme_stylebox_override(
		"panel",
		PanelStyle.create_glass_panel_style(Color(0.05, 0.09, 0.14, 0.95), 0.70, 22, 24, 20)
	)
	$PanelContainer/Panel/VBox/Header/HeaderBar.add_theme_stylebox_override(
		"panel",
		PanelStyle.create_glass_card_style(Color(0.08, 0.13, 0.20, 0.92), 0.56, 16, 14, 8)
	)
	var title = $PanelContainer/Panel/VBox/Header/HeaderBar/HeaderContent/Title
	PanelStyle.apply_title_on_dark(title)
	title.add_theme_font_size_override("font_size", 28)
	PanelStyle.apply_outline_button(close_btn)
	PanelStyle.apply_body_on_dark(subtitle)
	subtitle.add_theme_font_size_override("font_size", 16)
	subtitle.text = "Build partner standing to unlock rewards."
	PanelStyle.apply_muted_on_dark(hint)

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
		var style = PanelStyle.create_glass_card_style()
		if is_available:
			style.border_color = Color(PanelStyle.ACCENT.r, PanelStyle.ACCENT.g, PanelStyle.ACCENT.b, 0.7)
		else:
			style.bg_color = Color(0.06, 0.10, 0.16, 0.92)
			style.border_color = Color(PanelStyle.ACCENT.r, PanelStyle.ACCENT.g, PanelStyle.ACCENT.b, 0.30)
		card.add_theme_stylebox_override("panel", style)

		var row: VBoxContainer = card.get_node("Row")
		var header: HBoxContainer = card.get_node("Row/Header")
		var name_lbl: Label = card.get_node("Row/Header/NameLabel")
		var display_name = str(entry.get("name", "Unknown"))
		if is_hidden:
			display_name = "Classified Subcontractor"
		name_lbl.text = display_name
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		name_lbl.add_theme_color_override("font_color", PanelStyle.TEXT_ON_DARK)
		name_lbl.add_theme_font_size_override("font_size", 20)
		var level_lbl: Label = card.get_node("Row/Header/LevelLabel")
		level_lbl.text = "Level %s" % str(unlock_level)
		level_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		level_lbl.add_theme_color_override("font_color", PanelStyle.ACCENT)
		level_lbl.add_theme_font_size_override("font_size", 16)

		var role_lbl: Label = card.get_node("Row/RoleLabel")
		if is_available:
			role_lbl.text = "Focus: " + str(entry.get("role", ""))
		else:
			role_lbl.text = "Unlocks at level %s" % str(unlock_level)
		role_lbl.add_theme_color_override("font_color", PanelStyle.MUTED_ON_DARK)
		role_lbl.add_theme_font_size_override("font_size", 14)

		# Show what this contractor wants (their bonus minerals)
		if is_available and not is_hidden:
			var bonus_map = entry.get("bonus", {})
			var wants_parts := []
			for mineral in bonus_map.keys():
				var mult = float(bonus_map[mineral])
				var pct = int(round((mult - 1.0) * 100))
				if pct > 0:
					wants_parts.append("%s +%d%%" % [mineral, pct])
			if not wants_parts.is_empty():
				var wants_lbl: Label = SubcontractorDetailLabelScene.instantiate()
				wants_lbl.text = "Wants: %s" % ", ".join(wants_parts)
				wants_lbl.add_theme_color_override("font_color", Color(1.0, 0.85, 0.3, 1.0))
				wants_lbl.add_theme_font_size_override("font_size", 14)
				row.add_child(wants_lbl)
				row.move_child(wants_lbl, role_lbl.get_index() + 1)

		var sub_id = str(entry.get("id", ""))
		var affinity = int(sm.get_affinity(sub_id))
		var affinity_row: HBoxContainer = card.get_node("Row/AffinityRow")
		var affinity_lbl: Label = card.get_node("Row/AffinityRow/AffinityLabel")
		affinity_lbl.text = "Standing:"
		affinity_lbl.add_theme_color_override("font_color", PanelStyle.MUTED_ON_DARK)
		affinity_lbl.add_theme_font_size_override("font_size", 13)
		var bar: ProgressBar = card.get_node("Row/AffinityRow/AffinityBar")
		bar.max_value = 100
		bar.value = affinity
		bar.show_percentage = false
		PanelStyle.apply_progress_bar(bar)
		var val_lbl: Label = card.get_node("Row/AffinityRow/AffinityValueLabel")
		val_lbl.text = "%s/100" % str(affinity)
		val_lbl.add_theme_color_override("font_color", PanelStyle.MUTED_ON_DARK)
		val_lbl.add_theme_font_size_override("font_size", 13)

		# Reputation level
		if is_available and not is_hidden:
			var rep_xp = int(sm.get_reputation(sub_id))
			var rep_data = sm.get_level_data(rep_xp)
			var rep_lbl: Label = SubcontractorDetailLabelScene.instantiate()
			rep_lbl.text = "Reputation: %s (Level %d)" % [str(rep_data.get("title", "New Partner")), int(rep_data.get("level", 1))]
			rep_lbl.add_theme_color_override("font_color", PanelStyle.ACCENT)
			row.add_child(rep_lbl)

		# Cooldown indicator
		if is_available and not is_hidden:
			var remaining = int(sm.get_cooldown_remaining(sub_id))
			if remaining > 0:
				var mins = int(ceil(float(remaining) / 60.0))
				var cd_lbl: Label = SubcontractorDetailLabelScene.instantiate()
				cd_lbl.text = "Not available — cooldown: %dm remaining" % mins
				cd_lbl.add_theme_color_override("font_color", Color(1.0, 0.45, 0.35, 1.0))
				row.add_child(cd_lbl)

		list.add_child(card)

func _on_overlay_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		var panel_rect := ($PanelContainer as Control).get_global_rect()
		if not panel_rect.has_point(event.global_position):
			_on_close()

func _on_close() -> void:
	panel_closed.emit()
	queue_free()
