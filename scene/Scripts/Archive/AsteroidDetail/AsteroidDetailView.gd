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
	# Archived copy: saving annotations kept for backup scene
	print("(archived) _on_save_pressed called for anomaly_id:", anomaly_id)
	# Implementation same as original archived copy (omitted here for brevity)

func initialize(anomaly: Dictionary):
	anomaly_data = anomaly
	var raw_id = anomaly.get("id", "")
	if raw_id != null and str(raw_id) != "":
		if typeof(raw_id) == TYPE_FLOAT or typeof(raw_id) == TYPE_INT:
			anomaly_id = str(int(raw_id))
		else:
			anomaly_id = str(raw_id)
	else:
		anomaly_id = str(anomaly.get("content", ""))
		if anomaly_id.begins_with("TIC "):
			anomaly_id = anomaly_id.substr(4)
		var digits := ""
		for ch in anomaly_id:
			if ch >= "0" and ch <= "9":
				digits += ch
		if digits != "":
			anomaly_id = digits

	var anomaly_set = anomaly.get("anomalySet", "active-asteroids")
	var is_planet = anomaly_set == "telescope-tess"

	var tic_id = anomaly.get("ticId", "")
	if tic_id != "" and tic_id != null:
		title_label.text = "TIC %s" % tic_id
	elif anomaly_id != "":
		var item_type = "Planet" if is_planet else "Asteroid"
		title_label.text = "%s #%s" % [item_type, anomaly_id]
	else:
		var item_type = "Planet" if is_planet else "Asteroid"
		title_label.text = "%s Details" % item_type
	
	_update_info_label()
	if anomaly_id != "":
		_load_anomaly_image(is_planet)
	else:
		_show_error("No ID found")

func _load_saved_annotations():
	# Archived: kept in archive folder
	return

func _update_info_label():
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
	var image_url = ""
	if is_planet:
		image_url = "https://api.starsailors.space/storage/v1/object/public/anomalies/%s/Sector1.png" % anomaly_id
	else:
		image_url = "https://api.starsailors.space/storage/v1/object/public/telescope/telescope-active-asteroids/%s.png" % anomaly_id
	loading_label.text = "Loading image..."
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
	var image = Image.new()
	var error = image.load_png_from_buffer(body)
	if error != OK:
		error = image.load_jpg_from_buffer(body)
	if error != OK:
		_show_error("Failed to decode image")
		return
	var texture = ImageTexture.create_from_image(image)
	asteroid_image.texture = texture
	loading_label.visible = false
	info_label.visible = true
	asteroid_image.visible = true
	_animate_image_appearance()

func _animate_image_appearance():
	var tween = create_tween()
	tween.set_ease(Tween.EASE_OUT)
	tween.set_trans(Tween.TRANS_BACK)
	tween.tween_property(asteroid_image, "scale", Vector2.ONE, ANIMATION_DURATION)
	asteroid_image.rotation = deg_to_rad(5)
	tween.parallel().tween_property(asteroid_image, "rotation", 0.0, ANIMATION_DURATION)

func _show_error(message: String):
	loading_label.visible = false
	error_label.visible = true
	error_label.text = "Error: " + message
	print("AsteroidDetailView (archived) error: ", message)

func _on_back_pressed():
	back_pressed.emit()
	queue_free()
