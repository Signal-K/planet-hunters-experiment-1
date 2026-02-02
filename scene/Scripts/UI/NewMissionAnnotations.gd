extends RefCounted
class_name NewMissionAnnotations

var _owner: Node
var _anomaly_list: Node
var _simple_detail_scene: PackedScene

func setup(owner: Node, anomaly_list: Node, simple_detail_scene: PackedScene) -> void:
	_owner = owner
	_anomaly_list = anomaly_list
	_simple_detail_scene = simple_detail_scene

func refresh() -> void:
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

func _display_items(items: Array) -> void:
	for c in _anomaly_list.get_children():
		c.queue_free()
	if items.size() == 0:
		var lbl = Label.new()
		lbl.text = "No saved annotations found."
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_anomaly_list.add_child(lbl)
		return

	for i in range(items.size()):
		var item = _create_item(items[i], i)
		_anomaly_list.add_child(item)

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
	var detail = _simple_detail_scene.instantiate()
	_owner.get_tree().root.add_child(detail)
	detail.initialize(data)
