extends RefCounted
class_name NewMissionAnnotations

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

const AnnotationItemScene = preload("res://Scenes/UI/Templates/NewMissionAnnotationItem.tscn")
const EmptyLabelScene = preload("res://Scenes/UI/Templates/MenuLogbookEmpty.tscn")
const AppLogger = preload("res://Scripts/Utils/Logger.gd")

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
		AppLogger.d("NewMissionPanel: annotations dir not found: %s" % annotations_dir)
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
				keys[key] = {"content": key, "local_thumbnail": "", "target_type": "asteroid", "title": ""}
				AppLogger.d("NewMissionPanel: found annotation json: %s" % fname)
			var full_path = "%s/%s" % [annotations_dir, fname]
			var file = FileAccess.open(full_path, FileAccess.READ)
			if file:
				var raw = file.get_as_text()
				file.close()
				var parsed = JSON.parse_string(raw)
				if typeof(parsed) == TYPE_DICTIONARY:
					keys[key]["target_type"] = str(parsed.get("target_type", "asteroid"))
					keys[key]["title"] = str(parsed.get("title", ""))

		# Annotated PNGs provide thumbnails
		if fname.to_lower().ends_with("-annotated.png"):
			var keypng = fname.substr(0, fname.length() - "-annotated.png".length())
			var thumb_path = "%s/%s" % [annotations_dir, fname]
			if not keys.has(keypng):
				keys[keypng] = {"content": keypng, "local_thumbnail": thumb_path, "target_type": "asteroid", "title": ""}
			else:
				keys[keypng]["local_thumbnail"] = thumb_path
			AppLogger.d("NewMissionPanel: found annotated png: %s -> %s" % [fname, thumb_path])

	# Convert keys dict to results array
	for k in keys.keys():
		results.append(keys[k])

	AppLogger.d("NewMissionPanel: total saved annotations found: %s" % results.size())
	return results

func _display_items(items: Array) -> void:
	for c in _anomaly_list.get_children():
		c.queue_free()
	if items.size() == 0:
		var lbl: Label = EmptyLabelScene.instantiate()
		lbl.text = "No saved annotations found."
		_anomaly_list.add_child(lbl)
		return

	for i in range(items.size()):
		var item = _create_item(items[i], i)
		_anomaly_list.add_child(item)

func _create_item(data: Dictionary, idx: int) -> Control:
	var panel_style = PanelStyle
	var pc: PanelContainer = AnnotationItemScene.instantiate()
	
	var style = panel_style.create_list_item_style()
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	style.corner_radius_top_left = 6
	style.corner_radius_top_right = 6
	style.corner_radius_bottom_left = 6
	style.corner_radius_bottom_right = 6
	pc.add_theme_stylebox_override("panel", style)

	var icon: PanelContainer = pc.get_node("Content/IconContainer")
	var icon_style = panel_style.create_icon_circle_style()
	icon_style.bg_color = panel_style.BUTTON_PRESSED
	icon_style.corner_radius_top_left = 8
	icon_style.corner_radius_top_right = 8
	icon_style.corner_radius_bottom_left = 8
	icon_style.corner_radius_bottom_right = 8
	icon_style.content_margin_left = 6
	icon_style.content_margin_right = 6
	icon_style.content_margin_top = 6
	icon_style.content_margin_bottom = 6
	icon.add_theme_stylebox_override("panel", icon_style)
	var icon_label: Label = pc.get_node("Content/IconContainer/IconLabel")
	var thumb: TextureRect = pc.get_node("Content/IconContainer/Thumbnail")

	var thumb_path = data.get("local_thumbnail", "")
	if thumb_path != "" and FileAccess.file_exists(thumb_path):
		var img = Image.new()
		var err = img.load(thumb_path)
		if err == OK:
			var tex = ImageTexture.create_from_image(img)
			thumb.texture = tex
			thumb.visible = true
			icon_label.visible = false

	var title: Label = pc.get_node("Content/Main/TitleLabel")
	var custom_title = str(data.get("title", ""))
	if custom_title != "":
		title.text = custom_title
	else:
		var item_type = "Planet" if str(data.get("target_type", "asteroid")).to_lower() == "planet" else "Asteroid"
		title.text = "%s #%s" % [item_type, str(data.get("content",""))]
	title.add_theme_font_size_override("font_size", 24)
	title.add_theme_color_override("font_color", panel_style.TEXT_PRIMARY)
	var saved_lbl: Label = pc.get_node("Content/Right/SavedLabel")
	saved_lbl.text = "Saved"
	saved_lbl.add_theme_color_override("font_color", panel_style.ACCENT)
	saved_lbl.add_theme_font_size_override("font_size", 16)

	# Overlay button captures click to open details.
	var btn: Button = pc.get_node("OverlayButton")
	btn.focus_mode = Control.FOCUS_NONE
	btn.mouse_filter = Control.MOUSE_FILTER_STOP
	btn.pressed.connect(_on_item_pressed.bind(data))

	# Hover effect
	pc.mouse_entered.connect(func():
		var hover_style = style.duplicate()
		hover_style.bg_color = panel_style.BUTTON_PRESSED
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