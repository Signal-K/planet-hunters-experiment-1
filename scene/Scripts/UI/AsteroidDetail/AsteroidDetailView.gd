extends VBoxContainer

signal back_pressed

const ANIMATION_DURATION := 0.6  # seconds for zoom-in effect
const BASE_IMAGE_SIZE := Vector2(768, 768)  # Increased image size for better visibility

var anomaly_id: String = ""
var anomaly_data: Dictionary = {}

@onready var image_container: CenterContainer = $ContentContainer/ImageContainer
@onready var asteroid_image: TextureRect = $ContentContainer/ImageContainer/AsteroidImage
@onready var drawing_canvas: Control = $ContentContainer/ImageContainer/DrawingCanvas
@onready var loading_label: Label = $ContentContainer/LoadingLabel
@onready var error_label: Label = $ContentContainer/ErrorLabel
@onready var info_label: Label = $ContentContainer/InfoLabel
@onready var back_button: Button = $HeaderContainer/BackButton
@onready var title_label: Label = $HeaderContainer/Title
@onready var pen_button: Button = $HeaderContainer/PenButton
@onready var clear_button: Button = $HeaderContainer/ClearButton
@onready var save_button: Button = $HeaderContainer/SaveButton
@onready var pen_free_button: Button = $HeaderContainer/PenFreeButton
@onready var pen_rect_button: Button = $HeaderContainer/PenRectButton
@onready var pen_circle_button: Button = $HeaderContainer/PenCircleButton
@onready var color_picker: ColorPickerButton = $HeaderContainer/ColorPickerButton
@onready var annotation_count_label: Label = $HeaderContainer/AnnotationCount

func _ready():
	# Connect buttons (use Callable for Godot 4 compatibility)
	back_button.pressed.connect(Callable(self, "_on_back_pressed"))
	pen_button.pressed.connect(Callable(self, "_on_pen_pressed"))
	clear_button.pressed.connect(Callable(self, "_on_clear_pressed"))
	save_button.pressed.connect(Callable(self, "_on_save_pressed"))

	# Mode and color controls
	pen_free_button.pressed.connect(Callable(self, "_on_mode_free"))
	pen_rect_button.pressed.connect(Callable(self, "_on_mode_rect"))
	pen_circle_button.pressed.connect(Callable(self, "_on_mode_circle"))
	color_picker.color_changed.connect(Callable(self, "_on_color_changed"))

	# Listen to drawing updates
	drawing_canvas.drawing_changed.connect(Callable(self, "_on_drawing_changed"))
	
	# Initially hide everything except loading
	asteroid_image.visible = false
	error_label.visible = false
	info_label.visible = false
	loading_label.visible = true
	clear_button.visible = false
	
	# Set initial scale to 0 for animation
	asteroid_image.scale = Vector2.ZERO
	asteroid_image.pivot_offset = BASE_IMAGE_SIZE / 2
	
	# Update button states
	_update_pen_button()
	# set default drawing color and mode
	color_picker.color = Color(0, 1, 0)
	drawing_canvas.set_pen_color(color_picker.color)
	drawing_canvas.set_mode(0) # freeform default
	_update_annotation_count()

func _on_save_pressed():
	"""Save current annotations for this asteroid to user://annotations/<id>.json"""
	print("_on_save_pressed called for anomaly_id:", anomaly_id)
	if anomaly_id == "":
		_show_error("No asteroid ID to save annotations for")
		return

	var strokes = drawing_canvas.get_drawing_data()
	print("Found strokes count:", strokes.size())
	# Convert strokes to JSON-serializable form (no Vector2/Color objects)
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
		elif item["type"] == "rect":
			var r = s.get("rect", Rect2())
			item["rect"] = [r.position.x, r.position.y, r.size.x, r.size.y]
		elif item["type"] == "circle":
			var center = s.get("center", Vector2.ZERO)
			var radius = s.get("radius", 0)
			item["center"] = [center.x, center.y]
			item["radius"] = radius
		serializable.append(item)

	# Use Variant serialization to avoid JSON API mismatches across Godot versions
	var serialized = null

	var annotations_dir = "user://annotations"
	# Ensure directory exists (Godot 4 DirAccess)
	var test_dir = DirAccess.open(annotations_dir)
	if test_dir == null:
		# Create using a DirAccess instance rooted at user://
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
	# Store as a Variant (binary) to avoid JSON stringify issues
	var write_err = file.store_var(serializable)
	file.close()
	print("Saved annotations (variant) to:", file_path, " result=", write_err)
	# Also render and save the annotated image (base image + drawing overlay)
	# Determine render size from the drawing canvas (matches visible area)
	var render_w = int(drawing_canvas.rect_size.x)
	var render_h = int(drawing_canvas.rect_size.y)
	if render_w > 0 and render_h > 0 and asteroid_image.texture != null:
		var vp = SubViewport.new()
		vp.disable_3d = true
		# Don't set render_target_update_mode explicitly (constant names vary across Godot versions)
		vp.render_target_v_flip = true
		vp.size = Vector2(render_w, render_h)
		add_child(vp)

		# Add the base image
		var tex_rect = TextureRect.new()
		tex_rect.texture = asteroid_image.texture
		tex_rect.expand = true
		tex_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tex_rect.rect_size = Vector2(render_w, render_h)
		vp.add_child(tex_rect)

		# Duplicate the drawing canvas so we can render the strokes on top
		var canvas_copy = drawing_canvas.duplicate()
		canvas_copy.rect_size = Vector2(render_w, render_h)
		vp.add_child(canvas_copy)

		# Wait one frame so the viewport has rendered
		await get_tree().process_frame
		var img = vp.get_texture().get_image()
		var combined_path = "%s/%s-annotated.png" % [annotations_dir, anomaly_id]
		var save_err = img.save_png(combined_path)
		print("Saved combined annotated image:", combined_path, " result=", save_err)
		vp.queue_free()

	# update UI
	_update_annotation_count()

func initialize(anomaly: Dictionary):
	"""Initialize the detail view with anomaly data"""
	anomaly_data = anomaly
	# Prefer the numeric DB 'id' when available. Fallback to 'content' but
	# strip any leading "TIC " text or non-digit characters so image URLs
	# use the raw numeric id (e.g. 76835246 not "TIC 76835246").
	var raw_id = anomaly.get("id", "")
	if raw_id != null and str(raw_id) != "":
		# Convert to int first to avoid .0 in string (e.g. 63769326.0 -> 63769326)
		if typeof(raw_id) == TYPE_FLOAT or typeof(raw_id) == TYPE_INT:
			anomaly_id = str(int(raw_id))
		else:
			anomaly_id = str(raw_id)
	else:
		anomaly_id = str(anomaly.get("content", ""))
		# Remove common "TIC " prefix if present
		if anomaly_id.begins_with("TIC "):
			anomaly_id = anomaly_id.substr(4)
		# Strip any non-digit characters, leaving digits only
		var digits := ""
		for ch in anomaly_id:
			if ch >= "0" and ch <= "9":
				digits += ch
		if digits != "":
			anomaly_id = digits

	# Determine if this is a planet or asteroid based on anomalySet
	var anomaly_set = anomaly.get("anomalySet", "active-asteroids")
	var is_planet = anomaly_set == "telescope-tess"

	# Update title
	var tic_id = anomaly.get("ticId", "")
	if tic_id != "" and tic_id != null:
		title_label.text = "TIC %s" % tic_id
	elif anomaly_id != "":
		var item_type = "Planet" if is_planet else "Asteroid"
		title_label.text = "%s #%s" % [item_type, anomaly_id]
	else:
		var item_type = "Planet" if is_planet else "Asteroid"
		title_label.text = "%s Details" % item_type
	
	# Update info label
	_update_info_label()
	
	# Load the image
	if anomaly_id != "":
		_load_anomaly_image(is_planet)
	else:
		_show_error("No ID found")

	# Load any saved annotations for this anomaly
	_load_saved_annotations()


func _load_saved_annotations():
	"""Load saved annotations from user://annotations/<id>.json and populate drawing canvas"""
	if anomaly_id == "":
		return

	var annotations_path = "user://annotations/%s.json" % anomaly_id
	if not FileAccess.file_exists(annotations_path):
		return

	var file = FileAccess.open(annotations_path, FileAccess.READ)
	if file == null:
		print("Failed to open annotations file: %s" % annotations_path)
		return

	var content = file.get_as_text()
	file.close()

	var parsed = null

	var json = JSON.new()
	var parse_result = json.parse(content)
	if parse_result == OK and typeof(json.data) == TYPE_ARRAY:
		parsed = json.data
	else:
		# Fallback: maybe the file was written with store_var(), attempt to read variant
		var file2 = FileAccess.open(annotations_path, FileAccess.READ)
		if file2 == null:
			print("Failed to reopen annotations file for variant read: %s" % annotations_path)
			return
		# Try reading as Variant (binary) - get_var will advance the file pointer
		var ok = true
		var var_data = null
		# Protect with a try/catch-like pattern: check eof after get_var
		var_data = file2.get_var()
		file2.close()
		if typeof(var_data) == TYPE_ARRAY:
			parsed = var_data
		else:
			print("Annotations file parse/read returned unexpected type: %s" % typeof(var_data))
			return

	# Convert parsed primitive arrays back into DrawingCanvas stroke dictionaries
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
		elif s["type"] == "rect":
			var rarr = item.get("rect", [0,0,0,0])
			s["rect"] = Rect2(Vector2(rarr[0], rarr[1]), Vector2(rarr[2], rarr[3]))
		elif s["type"] == "circle":
			var carr = item.get("center", [0,0])
			s["center"] = Vector2(carr[0], carr[1])
			s["radius"] = item.get("radius", 0)
		strokes.append(s)

	# Populate the drawing canvas
	if drawing_canvas:
		drawing_canvas.set_drawing_data(strokes)
		_update_annotation_count()

func _update_info_label():
	"""Update the info label with anomaly properties"""
	var properties = []
	
	var anomaly_type = anomaly_data.get("anomalytype", "")
	if anomaly_type != "" and anomaly_type != null:
		properties.append(anomaly_type.capitalize().replace("Telescope", "").strip_edges())
	
	var radius = anomaly_data.get("radius")
	if radius != null:
		properties.append("Radius: %.2f" % radius)
	
	var mass = anomaly_data.get("mass")
	if mass != null:
		properties.append("Mass: %.2f" % mass)
	
	var temp = anomaly_data.get("temperature")
	if temp != null:
		properties.append("Temperature: %.0fK" % temp)
	
	var classification = anomaly_data.get("classification_status", "")
	if classification != "" and classification != null:
		properties.append("Status: " + classification)
	
	if properties.size() > 0:
		info_label.text = "\n".join(properties)
	else:
		info_label.text = "No additional data available"

func _load_anomaly_image(is_planet: bool = false):
	"""Load the anomaly image from storage (planet or asteroid)"""
	# Construct URL based on anomaly type
	var image_url = ""
	if is_planet:
		# Use the API format for planets
		image_url = "https://api.starsailors.space/storage/v1/object/public/anomalies/%s/Sector1.png" % anomaly_id
	else:
		# Use the API format for asteroids
		image_url = "https://api.starsailors.space/storage/v1/object/public/telescope/telescope-active-asteroids/%s.png" % anomaly_id
	
	var item_type = "planet" if is_planet else "asteroid"
	print("Loading %s image from: " % item_type, image_url)
	loading_label.text = "Loading %s image..." % item_type
	
	# Create HTTP request
	var http_request = HTTPRequest.new()
	add_child(http_request)
	http_request.request_completed.connect(Callable(self, "_on_image_loaded"))
	
	var error = http_request.request(image_url)
	if error != OK:
		_show_error("Failed to initiate image download")
		http_request.queue_free()

func _on_image_loaded(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray):
	if result != HTTPRequest.RESULT_SUCCESS or response_code != 200:
		_show_error("Failed to load image (Code: %d)" % response_code)
		return
	
	# Create image from downloaded data
	var image = Image.new()
	var error = image.load_png_from_buffer(body)
	
	if error != OK:
		# Try JPG if PNG fails
		error = image.load_jpg_from_buffer(body)
	
	if error != OK:
		_show_error("Failed to decode image")
		return
	
	# Create texture from image
	var texture = ImageTexture.create_from_image(image)
	asteroid_image.texture = texture
	
	# Extract and apply dominant color from image to background
	var dominant_color = _get_dominant_color(image)
	_apply_background_color(dominant_color)
	
	# Update info and show image with animation
	loading_label.visible = false
	info_label.visible = true
	asteroid_image.visible = true
	
	# Animate the image expanding from center
	_animate_image_appearance()

func _animate_image_appearance():
	"""Animate the image expanding from center with a smooth effect"""
	# Create tween for smooth animation
	var tween = create_tween()
	tween.set_ease(Tween.EASE_OUT)
	tween.set_trans(Tween.TRANS_BACK)
	
	# Animate scale from 0 to 1
	tween.tween_property(asteroid_image, "scale", Vector2.ONE, ANIMATION_DURATION)
	
	# Optional: Add a subtle rotation for extra flair
	asteroid_image.rotation = deg_to_rad(5)
	tween.parallel().tween_property(asteroid_image, "rotation", 0.0, ANIMATION_DURATION)

func _get_dominant_color(image: Image) -> Color:
	"""Extract the average/dominant color from the image"""
	var color_sum = Vector3.ZERO
	var pixel_count = 0
	
	# Sample pixels from the image (sample every 4th pixel for performance)
	var sample_rate = 4
	for y in range(0, image.get_height(), sample_rate):
		for x in range(0, image.get_width(), sample_rate):
			var pixel = image.get_pixel(x, y)
			# Convert to vector for averaging, ignore alpha
			color_sum += Vector3(pixel.r, pixel.g, pixel.b)
			pixel_count += 1
	
	# Calculate average color
	if pixel_count > 0:
		color_sum /= pixel_count
	
	return Color(color_sum.x, color_sum.y, color_sum.z, 1.0)

func _apply_background_color(color: Color):
	"""Apply a hardcoded gray background matching asteroid image"""
	# Use hardcoded gray that matches the telescope image aesthetic
	var background_color = Color(0.45, 0.45, 0.45, 1.0)
	
	# Apply to the content container background
	var background_style = StyleBoxFlat.new()
	background_style.bg_color = background_color
	get_parent().add_theme_stylebox_override("panel", background_style)

func _on_pen_pressed():
	"""Toggle the pen tool"""
	drawing_canvas.toggle_pen()
	_update_pen_button()
	clear_button.visible = drawing_canvas.is_pen_enabled()

func _on_clear_pressed():
	"""Clear all drawings"""
	drawing_canvas.clear_drawing()
	_update_annotation_count()

func _on_mode_free():
	drawing_canvas.set_mode(0)
	pen_free_button.modulate = Color(0.7, 1, 0.7)
	pen_rect_button.modulate = Color.WHITE
	pen_circle_button.modulate = Color.WHITE

func _on_mode_rect():
	drawing_canvas.set_mode(1)
	pen_rect_button.modulate = Color(0.7, 1, 0.7)
	pen_free_button.modulate = Color.WHITE
	pen_circle_button.modulate = Color.WHITE

func _on_mode_circle():
	drawing_canvas.set_mode(2)
	pen_circle_button.modulate = Color(0.7, 1, 0.7)
	pen_free_button.modulate = Color.WHITE
	pen_rect_button.modulate = Color.WHITE

func _on_color_changed(color: Color):
	drawing_canvas.set_pen_color(color)

func _on_drawing_changed(count: int):
	_update_annotation_count()

func _update_annotation_count():
	var count = 0
	if drawing_canvas:
		count = drawing_canvas.get_annotation_count()
	annotation_count_label.text = "Annotations: %d" % count

func _update_pen_button():
	"""Update pen button appearance"""
	if drawing_canvas.is_pen_enabled():
		pen_button.text = "✓ Pen Tool"
		pen_button.modulate = Color(0.5, 1.0, 0.5)  # Green tint
	else:
		pen_button.text = "✏️ Pen Tool"
		pen_button.modulate = Color.WHITE



	# Ensure error label visibility/state is correct when called elsewhere


func _show_error(message: String):
	"""Show an error message"""
	loading_label.visible = false
	error_label.visible = true
	error_label.text = "Error: " + message
	print("AsteroidDetailView error: ", message)

func _on_back_pressed():
	back_pressed.emit()
	queue_free()
