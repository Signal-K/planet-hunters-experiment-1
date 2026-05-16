extends RefCounted
class_name AsteroidAnnotationHelper
const AppLogger = preload("res://Scripts/Utils/Logger.gd")

const AnnotationRenderViewportScene = preload("res://Scenes/UI/Templates/AnnotationRenderViewport.tscn")

var _owner: Node
var _drawing_canvas: Control
var _annotation_count_label: Label
var _asteroid_image: TextureRect
var _base_image_size: Vector2
var _on_error: Callable

func setup(
	owner: Node,
	drawing_canvas: Control,
	annotation_count_label: Label,
	asteroid_image: TextureRect,
	base_image_size: Vector2,
	on_error: Callable
) -> void:
	_owner = owner
	_drawing_canvas = drawing_canvas
	_annotation_count_label = annotation_count_label
	_asteroid_image = asteroid_image
	_base_image_size = base_image_size
	_on_error = on_error

func save_annotations(anomaly_id: String, target_type: String = "asteroid", title: String = "") -> void:
	"""Save current annotations for this asteroid to user://annotations/<id>.json"""
	AppLogger.d("save_annotations called for anomaly_id:" + str(anomaly_id))
	if anomaly_id == "":
		_show_error("No asteroid ID to save annotations for")
		return

	var strokes = _drawing_canvas.get_drawing_data()
	AppLogger.d("Found strokes count:" + str(strokes.size()))
	var serializable := []
	for s in strokes:
		var item := {}
		item["type"] = s.get("type")
		item["width"] = s.get("width", 3.0)
		var c = s.get("color", Color(0,1,0))
		item["color"] = [c.r, c.g, c.b, c.a]
		if item["type"] == "freeform":
			var pts = []
			for p in s.get("points", []):
				pts.append([p.x, p.y])
			item["points"] = pts
		elif item["type"] == "rect" or item["type"] == "transit_dip":
			var r = s.get("rect", Rect2())
			item["rect"] = [r.position.x, r.position.y, r.size.x, r.size.y]
		elif item["type"] == "circle":
			var center = s.get("center", Vector2.ZERO)
			var radius = s.get("radius", 0)
			item["center"] = [center.x, center.y]
			item["radius"] = radius
		serializable.append(item)

	var annotations_dir = "user://annotations"
	var test_dir = DirAccess.open(annotations_dir)
	if test_dir == null:
		var base = DirAccess.open("user://")
		if base == null:
			_show_error("Failed to access user:// for annotations")
			return
		var mk = base.make_dir_recursive("annotations")
		if mk != OK:
			_show_error("Failed to create annotations directory")
			return

	var file_path = "%s/%s.json" % [annotations_dir, anomaly_id]
	var file = FileAccess.open(file_path, FileAccess.WRITE)
	if file == null:
		_show_error("Failed to open file for saving annotations")
		return
	var payload := {
		"version": 2,
		"target_type": target_type,
		"title": title,
		"strokes": serializable
	}
	var write_err = file.store_string(JSON.stringify(payload))
	file.close()
	AppLogger.d("Saved annotations (variant) to:" + str(file_path) + " result=" + str(write_err))

	_render_annotated_image(anomaly_id)
	update_annotation_count()

func load_saved_annotations(anomaly_id: String) -> void:
	"""Load saved annotations from user://annotations/<id>.json and populate drawing canvas"""
	if anomaly_id == "":
		return

	var annotations_path = "user://annotations/%s.json" % anomaly_id
	if not FileAccess.file_exists(annotations_path):
		return

	var file = FileAccess.open(annotations_path, FileAccess.READ)
	if file == null:
		push_error("Failed to open annotations file: %s" % annotations_path)
		return

	var content = file.get_as_text()
	file.close()

	var parsed = null
	var json = JSON.new()
	var parse_result = json.parse(content)
	if parse_result == OK and typeof(json.data) == TYPE_ARRAY:
		parsed = json.data
	elif parse_result == OK and typeof(json.data) == TYPE_DICTIONARY:
		var parsed_obj: Dictionary = json.data
		parsed = parsed_obj.get("strokes", [])
	else:
		# Fallback: maybe the file was written with store_var(), attempt to read variant
		var file2 = FileAccess.open(annotations_path, FileAccess.READ)
		if file2 == null:
			push_error("Failed to reopen annotations file for variant read: %s" % annotations_path)
			return
		var var_data = file2.get_var()
		file2.close()
		if typeof(var_data) == TYPE_ARRAY:
			parsed = var_data
		else:
			AppLogger.d("Annotations file parse/read returned unexpected type: %s" % typeof(var_data))
			return

	var strokes := []
	for item in parsed:
		var s := {}
		s["type"] = item.get("type", "freeform")
		s["width"] = item.get("width", 3.0)
		var col_a = item.get("color", [0,1,0,1])
		s["color"] = Color(col_a[0], col_a[1], col_a[2], col_a[3])
		if s["type"] == "freeform":
			var pts := []
			for pp in item.get("points", []):
				pts.append(Vector2(pp[0], pp[1]))
			s["points"] = pts
		elif s["type"] == "rect" or s["type"] == "transit_dip":
			var rarr = item.get("rect", [0,0,0,0])
			s["rect"] = Rect2(Vector2(rarr[0], rarr[1]), Vector2(rarr[2], rarr[3]))
		elif s["type"] == "circle":
			var carr = item.get("center", [0,0])
			s["center"] = Vector2(carr[0], carr[1])
			s["radius"] = item.get("radius", 0)
		strokes.append(s)

	if _drawing_canvas:
		_drawing_canvas.set_drawing_data(strokes)
		update_annotation_count()

func update_annotation_count() -> void:
	var count = 0
	if _drawing_canvas:
		count = _drawing_canvas.get_annotation_count()
	_annotation_count_label.text = "Annotations: %d" % count

func _render_annotated_image(anomaly_id: String) -> void:
	var canvas_size = Vector2.ZERO
	if _drawing_canvas:
		if _drawing_canvas.has_method("get_size"):
			canvas_size = _drawing_canvas.get_size()
		elif _drawing_canvas.has_method("get_rect"):
			canvas_size = _drawing_canvas.get_rect().size
		elif _drawing_canvas.has_meta("rect_size"):
			canvas_size = _drawing_canvas.get_meta("rect_size")
		else:
			canvas_size = _drawing_canvas.size
	if canvas_size == Vector2.ZERO:
		canvas_size = _base_image_size

	var render_w = int(canvas_size.x)
	var render_h = int(canvas_size.y)
	if render_w > 0 and render_h > 0 and _asteroid_image.texture != null:
		var vp: SubViewport = AnnotationRenderViewportScene.instantiate()
		if vp == null:
			return
		vp.size = Vector2(render_w, render_h)
		_owner.add_child(vp)

		var tex_rect: TextureRect = vp.get_node("Image")
		tex_rect.texture = _asteroid_image.texture
		tex_rect.set_custom_minimum_size(Vector2(render_w, render_h))

		var canvas_copy = _drawing_canvas.duplicate()
		if canvas_copy and canvas_copy is Control:
			canvas_copy.set_custom_minimum_size(Vector2(render_w, render_h))
		vp.add_child(canvas_copy)

		await _owner.get_tree().process_frame
		var img = vp.get_texture().get_image()
		var combined_path = "user://annotations/%s-annotated.png" % anomaly_id
		var save_err = img.save_png(combined_path)
		AppLogger.d("Saved combined annotated image:" + str(combined_path) + " result=" + str(save_err))
		vp.queue_free()

func _show_error(message: String) -> void:
	if _on_error.is_valid():
		_on_error.call(message)
	else:
		push_error("AsteroidDetailView error: " + str(message))
