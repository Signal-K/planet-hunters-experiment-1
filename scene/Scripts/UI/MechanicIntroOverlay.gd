extends CanvasLayer
## MechanicIntroOverlay.gd
## Self-building overlay that introduces a new game mechanic to the player.
## Shown exactly once per mechanic via FirstTimeMechanicTracker.
##
## Content dict keys: title, icon, what, how, expect

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

func _ready() -> void:
	layer = 128  # above HUD, below system alerts

func show_intro(content: Dictionary) -> void:
	_build(content)

func _build(content: Dictionary) -> void:
	# Full-screen dim
	var bg := ColorRect.new()
	bg.color = Color(0.0, 0.0, 0.0, 0.72)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	# Centre panel
	var centre := CenterContainer.new()
	centre.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(centre)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(360, 0)

	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.08, 0.10, 0.16, 0.97)
	panel_style.border_color = Color(0.30, 0.60, 1.00, 0.85)
	panel_style.set_border_width_all(2)
	panel_style.set_corner_radius_all(10)
	panel_style.content_margin_left = 24
	panel_style.content_margin_right = 24
	panel_style.content_margin_top = 22
	panel_style.content_margin_bottom = 22
	panel.add_theme_stylebox_override("panel", panel_style)
	centre.add_child(panel)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 14)
	panel.add_child(vbox)

	# Icon + title row
	var title_row := HBoxContainer.new()
	title_row.add_theme_constant_override("separation", 8)
	vbox.add_child(title_row)

	var icon_str := str(content.get("icon", ""))
	if icon_str != "":
		var icon_lbl := Label.new()
		icon_lbl.text = icon_str
		icon_lbl.add_theme_font_size_override("font_size", 28)
		title_row.add_child(icon_lbl)

	var title_lbl := Label.new()
	title_lbl.text = str(content.get("title", "New Mechanic"))
	title_lbl.add_theme_color_override("font_color", Color(0.4, 0.75, 1.0, 1.0))
	title_lbl.add_theme_font_size_override("font_size", 20)
	title_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.add_child(title_lbl)

	var sep := HSeparator.new()
	sep.add_theme_color_override("color", Color(0.3, 0.5, 0.8, 0.4))
	vbox.add_child(sep)

	# Sections
	_add_section(vbox, "What is it?", str(content.get("what", "")))
	_add_section(vbox, "How to do it", str(content.get("how", "")))
	_add_section(vbox, "What to expect", str(content.get("expect", "")))

	# Dismiss button
	var btn := Button.new()
	btn.text = "Got it  →"
	PanelStyle.apply_button(btn, true)
	btn.pressed.connect(_on_dismiss)
	vbox.add_child(btn)

func _add_section(parent: VBoxContainer, heading: String, body: String) -> void:
	if body.strip_edges() == "":
		return
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 4)
	parent.add_child(col)

	var h := Label.new()
	h.text = heading.to_upper()
	h.add_theme_color_override("font_color", Color(0.65, 0.75, 0.90, 1.0))
	h.add_theme_font_size_override("font_size", 11)
	col.add_child(h)

	var b := Label.new()
	b.text = body
	b.add_theme_color_override("font_color", Color(0.85, 0.88, 0.92, 1.0))
	b.add_theme_font_size_override("font_size", 14)
	b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_child(b)

func _on_dismiss() -> void:
	queue_free()
