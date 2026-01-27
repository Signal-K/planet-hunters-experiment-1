extends Control

signal panel_closed

const SimpleDetailView = preload("res://Scenes/UI/SimpleDetail/simple_detail_view.tscn")

var panel_container: Node = null
var anomaly_list: Node = null
var close_button: Button = null
var select_rocket_button: Button = null
var launched_list_container: Node = null

func _ready():
	panel_container = get_node_or_null("PanelContainer")
	if panel_container == null:
		push_error("NewMissionPanel: PanelContainer node not found")
		return

	# Match the same structure used by SatelliteStationPanel (ContentContainer may be present)
	anomaly_list = get_node_or_null("PanelContainer/Panel/VBoxContainer/ContentContainer/AnomalyList")
	if anomaly_list == null:
		# fallback to older path
		anomaly_list = get_node_or_null("PanelContainer/Panel/VBoxContainer/AnomalyList")
	if anomaly_list == null:
		push_error("NewMissionPanel: AnomalyList node not found at expected paths")
		return

	close_button = get_node_or_null("PanelContainer/Panel/VBoxContainer/HeaderContainer/CloseButton")
	if close_button:
		close_button.pressed.connect(func():
			panel_closed.emit()
			queue_free()
		)

	# Rocket selector button (added in scene)
	select_rocket_button = get_node_or_null("PanelContainer/Panel/VBoxContainer/HeaderContainer/SelectRocketButton")
	if select_rocket_button:
		select_rocket_button.pressed.connect(self._on_select_rocket_pressed)

	# Container where we'll list launched rockets for mission selection
	launched_list_container = get_node_or_null("PanelContainer/Panel/VBoxContainer/LaunchedList")
	if launched_list_container == null:
		# Create a container if missing
		launched_list_container = VBoxContainer.new()
		launched_list_container.name = "LaunchedList"
		var parent_vbox = get_node_or_null("PanelContainer/Panel/VBoxContainer")
		if parent_vbox:
			parent_vbox.add_child(launched_list_container)

	# Show launched rockets for self-destruct management
	_display_launched_rockets()

func _refresh():
	var items = _load_local_annotations()
	_display_items(items)

func _load_local_annotations() -> Array:
	var results := []
	var annotations_dir = "user://annotations"
	var dir = DirAccess.open(annotations_dir)
	if dir == null:
		print("NewMissionPanel: annotations dir not found:", annotations_dir)
		return results

	# Ensure listing begins (compatibility across Godot versions)
	if dir.has_method("list_dir_begin"):
		dir.list_dir_begin()

	# Collect keys from both JSON and annotated PNGs
	var keys = {}

	while true:
		var fname = dir.get_next()
		if fname == "":
			break
		if fname == "." or fname == "..":
			continue

		# JSON files indicate a saved annotation (even if no PNG)
		if fname.to_lower().ends_with(".json"):
			var key = fname.substr(0, fname.length() - 5) # remove .json
			if not keys.has(key):
				keys[key] = {"content": key, "local_thumbnail": ""}
				print("NewMissionPanel: found annotation json:", fname)

		# Annotated PNGs provide thumbnails
		if fname.to_lower().ends_with("-annotated.png"):
			var keypng = fname.substr(0, fname.length() - "-annotated.png".length())
			var thumb_path = "%s/%s" % [annotations_dir, fname]
			if not keys.has(keypng):
				keys[keypng] = {"content": keypng, "local_thumbnail": thumb_path}
			else:
				keys[keypng]["local_thumbnail"] = thumb_path
			print("NewMissionPanel: found annotated png:", fname, "->", thumb_path)

	# Convert keys dict to results array
	for k in keys.keys():
		results.append(keys[k])

	print("NewMissionPanel: total saved annotations found:", results.size())
	return results

	# If nothing found in current project's user://, try scanning Godot app_userdata for other projects
	if results.size() == 0:
		var global_results := []
		var user_path = ProjectSettings.globalize_path("user://annotations")
		print("NewMissionPanel: user:// annotations absolute path:", user_path)
		var idx = user_path.find("app_userdata")
		if idx >= 0:
			var app_userdata_base = user_path.substr(0, idx + "app_userdata".length())
			print("NewMissionPanel: scanning app_userdata base:", app_userdata_base)
			var base_dir = DirAccess.open(app_userdata_base)
			if base_dir != null:
				var sub = base_dir.get_next()
				while sub != "":
					if sub == "." or sub == "..":
						sub = base_dir.get_next()
						continue
					var ann_path = "%s/%s/annotations" % [app_userdata_base, sub]
					var d2 = DirAccess.open(ann_path)
					if d2 != null:
						var f = d2.get_next()
						while f != "":
							if f.to_lower().ends_with(".json") or f.to_lower().ends_with("-annotated.png"):
								var key = f
								if f.to_lower().ends_with(".json"):
									key = f.substr(0, f.length() - 5)
								if f.to_lower().ends_with("-annotated.png"):
									key = f.substr(0, f.length() - "-annotated.png".length())
								var entry := {"content": key, "local_thumbnail": "%s/%s" % [ann_path, f]}
								global_results.append(entry)
								print("NewMissionPanel: fallback found:", entry)
							f = d2.get_next()
						d2.close()
					sub = base_dir.get_next()
				base_dir.close()
				if global_results.size() > 0:
					print("NewMissionPanel: total fallback annotations found:", global_results.size())
					return global_results
				else:
					print("NewMissionPanel: no fallback annotations found in app_userdata")
			else:
				print("NewMissionPanel: failed to open app_userdata base:", app_userdata_base)
		else:
			print("NewMissionPanel: 'app_userdata' not found in user:// path, cannot fallback scan")
		return results

func _display_items(items: Array) -> void:
	for c in anomaly_list.get_children():
		c.queue_free()
	if items.size() == 0:
		var lbl = Label.new()
		lbl.text = "No saved annotations found."
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		anomaly_list.add_child(lbl)
		return

	for i in range(items.size()):
		var item = _create_item(items[i], i)
		anomaly_list.add_child(item)

func _on_select_rocket_pressed() -> void:
	# Attempt to load RocketSelector script (try both Scripts/ and scripts/ paths)
	var script = null
	if ResourceLoader.exists("res://Scripts/Earth/RocketSelector.gd"):
		script = load("res://Scripts/Earth/RocketSelector.gd")
	elif ResourceLoader.exists("res://scripts/Earth/RocketSelector.gd"):
		script = load("res://scripts/Earth/RocketSelector.gd")
	if script == null:
		push_error("NewMissionPanel: RocketSelector script not found")
		return

	var sel = Control.new()
	sel.set_script(script)
	# prefer adding to the current scene so it overlays the scene content
	var root = get_tree().current_scene
	if root:
		root.add_child(sel)
		# place on right side of screen relative to parent
		sel.position = Vector2(1080, 120)
	else:
		get_tree().root.add_child(sel)


func _create_item(data: Dictionary, idx: int) -> Control:
	var pc = PanelContainer.new()
	pc.custom_minimum_size = Vector2(0, 90)
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.97, 0.98, 1.0) # light card
	style.border_color = Color(0.78, 0.82, 0.88)
	style.border_width_bottom = 1
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	style.corner_radius_top_left = 6
	style.corner_radius_top_right = 6
	style.corner_radius_bottom_left = 6
	style.corner_radius_bottom_right = 6
	pc.add_theme_stylebox_override("panel", style)

	var h = HBoxContainer.new()
	h.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	pc.add_child(h)

	# Icon / thumbnail container with subtle background
	var icon = PanelContainer.new()
	icon.custom_minimum_size = Vector2(64, 64)
	var icon_style = StyleBoxFlat.new()
	icon_style.bg_color = Color(0.88, 0.92, 0.96)
	icon_style.corner_radius_top_left = 8
	icon_style.corner_radius_top_right = 8
	icon_style.corner_radius_bottom_left = 8
	icon_style.corner_radius_bottom_right = 8
	icon_style.content_margin_left = 6
	icon_style.content_margin_right = 6
	icon_style.content_margin_top = 6
	icon_style.content_margin_bottom = 6
	icon.add_theme_stylebox_override("panel", icon_style)
	h.add_child(icon)

	var thumb_path = data.get("local_thumbnail", "")
	if thumb_path != "" and FileAccess.file_exists(thumb_path):
		var img = Image.new()
		var err = img.load(thumb_path)
		if err == OK:
			var tex = ImageTexture.create_from_image(img)
			var tr = TextureRect.new()
			tr.texture = tex
			tr.expand = true
			tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			tr.custom_minimum_size = Vector2(52,52)
			icon.add_child(tr)
		else:
			var lblp = Label.new()
			lblp.text = "☄"
			lblp.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			lblp.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			lblp.add_theme_font_size_override("font_size", 28)
			icon.add_child(lblp)
	else:
		var lbl = Label.new()
		lbl.text = "☄"
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		lbl.add_theme_font_size_override("font_size", 28)
		icon.add_child(lbl)

	# Spacer between icon and content
	var spacer_small = Control.new()
	spacer_small.custom_minimum_size = Vector2(12, 0)
	h.add_child(spacer_small)

	var content_v = VBoxContainer.new()
	content_v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(content_v)

	var title = Label.new()
	title.text = "Asteroid #%s" % str(data.get("content",""))
	title.add_theme_font_size_override("font_size", 24)
	title.add_theme_color_override("font_color", Color(0.06, 0.07, 0.08))
	content_v.add_child(title)

	# Add optional saved indicator on the right
	var right_v = VBoxContainer.new()
	right_v.size_flags_horizontal = Control.SIZE_SHRINK_END
	h.add_child(right_v)

	var saved_lbl = Label.new()
	saved_lbl.text = "Saved"
	saved_lbl.add_theme_color_override("font_color", Color(0.06, 0.6, 0.06))
	saved_lbl.add_theme_font_size_override("font_size", 16)
	right_v.add_child(saved_lbl)

	# Overlay button to capture clicks
	var btn = Button.new()
	btn.text = ""
	btn.flat = true
	btn.focus_mode = Control.FOCUS_NONE
	btn.mouse_filter = Control.MOUSE_FILTER_STOP
	btn.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	pc.add_child(btn)
	btn.pressed.connect(Callable(self, "_on_item_pressed").bind(data))

	# Hover effect
	pc.mouse_entered.connect(func():
		var hover_style = style.duplicate()
		hover_style.bg_color = Color(0.985, 0.99, 1.0)
		pc.add_theme_stylebox_override("panel", hover_style)
	)
	pc.mouse_exited.connect(func():
		pc.add_theme_stylebox_override("panel", style)
	)

	return pc

func _on_item_pressed(data: Dictionary) -> void:
	var detail = SimpleDetailView.instantiate()
	get_tree().root.add_child(detail)
	detail.initialize(data)

func _display_launched_rockets() -> void:
	# Clear existing list
	for c in launched_list_container.get_children():
		c.queue_free()
	# Load launched rockets from RocketsManager
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var launched = []
	if rm:
		launched = rm.get_launched()
	if launched.size() == 0:
		var lbl = Label.new()
		lbl.text = "No launched rockets available."
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		launched_list_container.add_child(lbl)
		return
	# For each launched rocket, add a row with ID and a Self-Destruct button
	for i in range(launched.size()):
		var id = launched[i]
		var h = HBoxContainer.new()
		h.custom_minimum_size = Vector2(0, 48)
		var name_lbl = Label.new()
		name_lbl.text = str(id)
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(name_lbl)
		var btn = Button.new()
		btn.text = "Self-Destruct"
		btn.pressed.connect(Callable(self, "_on_self_destruct_pressed").bind(id))
		h.add_child(btn)
		launched_list_container.add_child(h)

func _on_self_destruct_pressed(rocket_id: String) -> void:
	print("NewMissionPanel: self-destruct requested for", rocket_id)
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if rm:
		var ok = rm.set_destroyed(rocket_id)
		if ok:
			print("NewMissionPanel: rocket", rocket_id, "marked Destroyed")
			# Refresh the launched list UI
			_display_launched_rockets()
		else:
			print("NewMissionPanel: failed to mark rocket destroyed:", rocket_id)
	else:
		print("NewMissionPanel: RocketsManager not available")
