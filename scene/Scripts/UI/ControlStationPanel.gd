extends Control

signal panel_closed

const ROADMAP_MISSIONS := [
	{
		"id": 1,
		"title": "Mission 1",
		"summary": "Launch your first target run.",
		"note": "No scanner required. First target is progression-selected."
	},
	{
		"id": 2,
		"title": "Mission 2",
		"summary": "Re-run target with upgraded rocket.",
		"note": "Use L2 capability for improved yields."
	},
	{
		"id": 3,
		"title": "Mission 3",
		"summary": "Introduce the system scanner.",
		"note": "Scanning reveals richer target details over time."
	},
	{
		"id": 4,
		"title": "Mission 4",
		"summary": "Expand into planetary targets.",
		"note": "Progression unlocks broader object classes."
	},
	{
		"id": 5,
		"title": "Mission 5",
		"summary": "Handle multi-object operations.",
		"note": "Use scanner intelligence to optimize choices."
	}
]

func _ready():
	# Apply consistent panel styling
	_apply_panel_style()
	_populate_mission_roadmap()
	_populate_orbiting_list()
	
	# Connect close button
	var close_button = $PanelContainer/Panel/VBoxContainer/HeaderContainer/CloseButton
	close_button.pressed.connect(_on_close_button_pressed)
	
	# Connect background click to close
	$Background.gui_input.connect(_on_background_input)

func _apply_panel_style():
	"""Apply polished panel styling"""
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	var panel = $PanelContainer/Panel
	panel_style.apply_panel(panel)

	var title = $PanelContainer/Panel/VBoxContainer/HeaderContainer/Title
	var content = $PanelContainer/Panel/VBoxContainer/ContentContainer/Description
	var orbit_header = $PanelContainer/Panel/VBoxContainer/ContentContainer/OrbitingHeader
	var close_btn = $PanelContainer/Panel/VBoxContainer/HeaderContainer/CloseButton
	var separator = $PanelContainer/Panel/VBoxContainer/HSeparator

	panel_style.apply_title(title)
	panel_style.apply_richtext(content)
	panel_style.apply_body(orbit_header)
	panel_style.apply_button(close_btn, false)
	panel_style.apply_separator(separator)

func _populate_orbiting_list() -> void:
	var list: VBoxContainer = $PanelContainer/Panel/VBoxContainer/ContentContainer/OrbitingList
	for child in list.get_children():
		child.queue_free()
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var launchpad_rockets: Array = []
	var in_flight: Array = []
	if rm:
		var placed = rm.get_placed()
		for entry in placed:
			var status = str(entry.get("status", ""))
			if status == "awaitingLaunch":
				launchpad_rockets.append(entry)
		var launched = rm.get_launched()
		var targets = rm.get_detected_targets()
		var target_map := {}
		for t in targets:
			var tid = str(t.get("id", ""))
			if tid != "":
				target_map[tid] = str(t.get("label", tid))
		var missions = rm.get_missions()
		var missions_by_rocket := {}
		for m in missions:
			var rid = str(m.get("rocket_id", ""))
			if rid != "":
				missions_by_rocket[rid] = m
		for rid_any in launched:
			var rid = str(rid_any)
			var mission = missions_by_rocket.get(rid, {})
			var target_id = str(mission.get("target", ""))
			var target_label = str(target_map.get(target_id, "Target %s" % target_id if target_id != "" else "Unknown target"))
			in_flight.append({
				"rocket_id": rid,
				"target_label": target_label
			})

	if launchpad_rockets.is_empty() and in_flight.is_empty():
		var empty = Label.new()
		empty.text = "No rockets on launchpad or in flight."
		panel_style.apply_muted(empty)
		list.add_child(empty)
		return

	if not launchpad_rockets.is_empty():
		var lp_header = Label.new()
		lp_header.text = "On Launchpad"
		panel_style.apply_body(lp_header)
		list.add_child(lp_header)
		for entry in launchpad_rockets:
			var row = HBoxContainer.new()
			row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			var rocket_id = str(entry.get("id", ""))
			var name_lbl = Label.new()
			name_lbl.text = "Rocket %s" % rocket_id
			name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			panel_style.apply_body(name_lbl)
			var status_lbl = Label.new()
			status_lbl.text = "Awaiting launch"
			panel_style.apply_muted(status_lbl)
			row.add_child(name_lbl)
			row.add_child(status_lbl)
			list.add_child(row)

	if not in_flight.is_empty():
		var flight_header = Label.new()
		flight_header.text = "In Flight"
		panel_style.apply_body(flight_header)
		list.add_child(flight_header)
		for entry in in_flight:
			var row = HBoxContainer.new()
			row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			var rocket_id = str(entry.get("rocket_id", ""))
			var target_label = str(entry.get("target_label", "Unknown target"))
			var name_lbl = Label.new()
			name_lbl.text = "Rocket %s" % rocket_id
			name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			panel_style.apply_body(name_lbl)
			var target_lbl = Label.new()
			target_lbl.text = "To %s" % target_label
			panel_style.apply_muted(target_lbl)
			row.add_child(name_lbl)
			row.add_child(target_lbl)
			list.add_child(row)

func _populate_mission_roadmap() -> void:
	var content = $PanelContainer/Panel/VBoxContainer/ContentContainer
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	var next_data = build_next_mission_highlight_data()

	var next_header = content.get_node_or_null("NextMissionHeader")
	if next_header == null:
		next_header = Label.new()
		next_header.name = "NextMissionHeader"
		next_header.text = "Next Mission"
		content.add_child(next_header)
		content.move_child(next_header, 1)
	panel_style.apply_title(next_header)

	var next_card = content.get_node_or_null("NextMissionCard")
	if next_card == null:
		next_card = PanelContainer.new()
		next_card.name = "NextMissionCard"
		content.add_child(next_card)
		content.move_child(next_card, 2)
	for c in next_card.get_children():
		c.queue_free()
	next_card.add_theme_stylebox_override("panel", _roadmap_card_style(str(next_data.get("status", "current"))))
	var next_body = VBoxContainer.new()
	next_body.add_theme_constant_override("separation", 4)
	next_card.add_child(next_body)
	var next_title = Label.new()
	next_title.text = str(next_data.get("title", "Mission"))
	panel_style.apply_body(next_title)
	next_title.add_theme_font_size_override("font_size", 18)
	next_body.add_child(next_title)
	var next_summary = Label.new()
	next_summary.text = str(next_data.get("summary", ""))
	panel_style.apply_muted(next_summary)
	next_summary.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	next_body.add_child(next_summary)
	var next_note = Label.new()
	next_note.text = str(next_data.get("note", ""))
	panel_style.apply_muted(next_note)
	next_note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	next_body.add_child(next_note)

	var roadmap_header = content.get_node_or_null("MissionRoadmapHeader")
	if roadmap_header == null:
		roadmap_header = Label.new()
		roadmap_header.name = "MissionRoadmapHeader"
		roadmap_header.text = "Mission Roadmap"
		content.add_child(roadmap_header)
		content.move_child(roadmap_header, 3)
	panel_style.apply_title(roadmap_header)

	var roadmap_list = content.get_node_or_null("MissionRoadmapList")
	if roadmap_list == null:
		roadmap_list = VBoxContainer.new()
		roadmap_list.name = "MissionRoadmapList"
		roadmap_list.add_theme_constant_override("separation", 8)
		content.add_child(roadmap_list)
		content.move_child(roadmap_list, 4)
	for child in roadmap_list.get_children():
		child.queue_free()

	for item in build_mission_roadmap():
		var row = _build_roadmap_row(item)
		roadmap_list.add_child(row)

func build_next_mission_highlight_data() -> Dictionary:
	var roadmap = build_mission_roadmap()
	for item in roadmap:
		if str(item.get("status", "")) == "current":
			return item
	if roadmap.is_empty():
		return {
			"title": "No missions available",
			"summary": "No mission roadmap entries were found.",
			"note": "",
			"status": "upcoming"
		}
	var last = roadmap[roadmap.size() - 1]
	return {
		"title": "All planned missions complete",
		"summary": "No upcoming missions are currently queued.",
		"note": "Latest completed: %s" % str(last.get("title", "Mission")),
		"status": "completed"
	}

func build_mission_roadmap() -> Array:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var completed_count := 0
	if rm:
		completed_count = int(rm.get_completed_mission_count())
	var out := []
	for mission in ROADMAP_MISSIONS:
		var mission_id = int(mission.get("id", 0))
		var status = "upcoming"
		if mission_id <= completed_count:
			status = "completed"
		elif mission_id == completed_count + 1:
			status = "current"
		out.append({
			"id": mission_id,
			"title": str(mission.get("title", "Mission")),
			"summary": str(mission.get("summary", "")),
			"note": str(mission.get("note", "")),
			"status": status
		})
	return out

func _build_roadmap_row(item: Dictionary) -> PanelContainer:
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	var status = str(item.get("status", "upcoming"))
	var card = PanelContainer.new()
	card.add_theme_stylebox_override("panel", _roadmap_card_style(status))
	var body = VBoxContainer.new()
	body.add_theme_constant_override("separation", 4)
	card.add_child(body)

	var top_row = HBoxContainer.new()
	var title = Label.new()
	title.text = "%s" % str(item.get("title", "Mission"))
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel_style.apply_body(title)
	title.add_theme_font_size_override("font_size", 16)
	var badge: Control = Label.new()
	if status == "current":
		var start_btn = Button.new()
		start_btn.text = "Start"
		start_btn.custom_minimum_size = Vector2(110, 34)
		panel_style.apply_button(start_btn, true)
		start_btn.pressed.connect(Callable(self, "_on_start_mission_pressed").bind(int(item.get("id", 0))))
		badge = start_btn
	else:
		var badge_lbl = Label.new()
		badge_lbl.text = _status_label(status)
		panel_style.apply_muted(badge_lbl)
		badge = badge_lbl
	top_row.add_child(title)
	top_row.add_child(badge)
	body.add_child(top_row)

	var summary = Label.new()
	summary.text = str(item.get("summary", ""))
	panel_style.apply_muted(summary)
	summary.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.add_child(summary)

	var note = Label.new()
	note.text = str(item.get("note", ""))
	panel_style.apply_muted(note)
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.add_child(note)

	return card

func _on_start_mission_pressed(mission_id: int) -> void:
	var current_mission_id = _get_current_mission_id()
	if mission_id != current_mission_id:
		return
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		rm.set_pending_mission_guidance_id(mission_id)
	panel_closed.emit()
	queue_free()
	var tree = get_tree()
	if tree == null:
		return
	var scene_manager = tree.get_first_node_in_group("scene_manager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
	else:
		tree.change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn")

func _get_current_mission_id() -> int:
	for item in build_mission_roadmap():
		if str(item.get("status", "")) == "current":
			return int(item.get("id", 0))
	return 0

func _status_label(status: String) -> String:
	match status:
		"completed":
			return "Completed"
		"current":
			return "Current"
		_:
			return "Upcoming"

func _roadmap_card_style(status: String) -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	style.corner_radius_top_left = 10
	style.corner_radius_top_right = 10
	style.corner_radius_bottom_left = 10
	style.corner_radius_bottom_right = 10
	style.content_margin_left = 10
	style.content_margin_top = 8
	style.content_margin_right = 10
	style.content_margin_bottom = 8
	style.border_width_left = 1
	style.border_width_right = 1
	style.border_width_top = 1
	style.border_width_bottom = 1
	match status:
		"completed":
			style.bg_color = Color(0.12, 0.20, 0.17, 0.85)
			style.border_color = Color(0.30, 0.55, 0.45, 0.95)
		"current":
			style.bg_color = Color(0.16, 0.20, 0.26, 0.9)
			style.border_color = Color(0.40, 0.56, 0.72, 0.95)
		_:
			style.bg_color = Color(0.12, 0.13, 0.15, 0.8)
			style.border_color = Color(0.26, 0.29, 0.34, 0.8)
	return style

func _on_close_button_pressed():
	panel_closed.emit()
	queue_free()

func _on_background_input(event: InputEvent):
	if event is InputEventMouseButton and event.pressed:
		panel_closed.emit()
		queue_free()
