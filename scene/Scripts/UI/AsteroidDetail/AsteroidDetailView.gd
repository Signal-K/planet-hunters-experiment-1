extends VBoxContainer

signal back_pressed

const ANIMATION_DURATION := 0.6  # seconds for zoom-in effect
const BASE_IMAGE_SIZE := Vector2(512, 512)  # Expected image size

var anomaly_id: String = ""
var anomaly_data: Dictionary = {}

@onready var image_container: CenterContainer = $ContentContainer/ImageContainer
@onready var asteroid_image: TextureRect = $ContentContainer/ImageContainer/AsteroidImage
@onready var loading_label: Label = $ContentContainer/LoadingLabel
@onready var error_label: Label = $ContentContainer/ErrorLabel
@onready var info_label: Label = $ContentContainer/InfoLabel
@onready var back_button: Button = $HeaderContainer/BackButton
@onready var title_label: Label = $HeaderContainer/Title

func _ready():
	# Connect back button
	back_button.pressed.connect(_on_back_pressed)
	
	# Initially hide everything except loading
	asteroid_image.visible = false
	error_label.visible = false
	info_label.visible = false
	loading_label.visible = true
	
	# Set initial scale to 0 for animation
	asteroid_image.scale = Vector2.ZERO
	asteroid_image.pivot_offset = BASE_IMAGE_SIZE / 2

func initialize(anomaly: Dictionary):
	"""Initialize the detail view with anomaly data"""
	anomaly_data = anomaly
	anomaly_id = str(anomaly.get("content", ""))
	
	# Update title
	var tic_id = anomaly.get("ticId", "")
	if tic_id != "" and tic_id != null:
		title_label.text = "TIC %s" % tic_id
	elif anomaly_id != "":
		title_label.text = "Asteroid #%s" % anomaly_id
	else:
		title_label.text = "Asteroid Details"
	
	# Update info label
	_update_info_label()
	
	# Load the image
	if anomaly_id != "":
		_load_asteroid_image()
	else:
		_show_error("No asteroid ID found")

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

func _load_asteroid_image():
	"""Load the asteroid image from Supabase storage"""
	var supabase = SupabaseClient.get_instance()
	# Always use production URL for images (they're not in local storage)
	var image_url = "%s/storage/v1/object/public/telescope/telescope-active-asteroids/%s.png" % [supabase.PROD_SUPABASE_URL, anomaly_id]
	
	print("Loading asteroid image from: ", image_url)
	loading_label.text = "Loading telescope image..."
	
	# Create HTTP request
	var http_request = HTTPRequest.new()
	add_child(http_request)
	http_request.request_completed.connect(_on_image_loaded)
	
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

func _show_error(message: String):
	"""Show an error message"""
	loading_label.visible = false
	error_label.visible = true
	error_label.text = "Error: " + message
	print("AsteroidDetailView error: ", message)

func _on_back_pressed():
	back_pressed.emit()
	queue_free()
