extends RefCounted
class_name AsteroidImageHelper

var _owner: Node
var _asteroid_image: TextureRect
var _loading_label: Label
var _info_label: Label
var _content_parent: Control
var _animation_duration: float = 0.0
var _on_error: Callable

func setup(
	owner: Node,
	asteroid_image: TextureRect,
	loading_label: Label,
	info_label: Label,
	content_parent: Control,
	animation_duration: float,
	on_error: Callable
) -> void:
	_owner = owner
	_asteroid_image = asteroid_image
	_loading_label = loading_label
	_info_label = info_label
	_content_parent = content_parent
	_animation_duration = animation_duration
	_on_error = on_error

func load_anomaly_image(anomaly_id: String, is_planet: bool = false) -> void:
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
	_loading_label.text = "Loading %s image..." % item_type

	# Create HTTP request
	var http_request = HTTPRequest.new()
	_owner.add_child(http_request)
	http_request.request_completed.connect(Callable(self, "_on_image_loaded"))

	var error = http_request.request(image_url)
	if error != OK:
		_show_error("Failed to initiate image download")
		http_request.queue_free()

func _on_image_loaded(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray) -> void:
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
	_asteroid_image.texture = texture

	# Extract and apply dominant color from image to background
	var dominant_color = _get_dominant_color(image)
	_apply_background_color(dominant_color)

	# Update info and show image with animation
	_loading_label.visible = false
	_info_label.visible = true
	_asteroid_image.visible = true

	# Animate the image expanding from center
	_animate_image_appearance()

func _animate_image_appearance() -> void:
	"""Animate the image expanding from center with a smooth effect"""
	# Create tween for smooth animation
	var tween = _owner.create_tween()
	tween.set_ease(Tween.EASE_OUT)
	tween.set_trans(Tween.TRANS_BACK)

	# Animate scale from 0 to 1
	tween.tween_property(_asteroid_image, "scale", Vector2.ONE, _animation_duration)

	# Optional: Add a subtle rotation for extra flair
	_asteroid_image.rotation = deg_to_rad(5)
	tween.parallel().tween_property(_asteroid_image, "rotation", 0.0, _animation_duration)

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

func _apply_background_color(color: Color) -> void:
	"""Apply a hardcoded gray background matching asteroid image"""
	# Use hardcoded gray that matches the telescope image aesthetic
	var background_color = Color(0.45, 0.45, 0.45, 1.0)

	# Apply to the content container background
	var background_style = StyleBoxFlat.new()
	background_style.bg_color = background_color
	_content_parent.add_theme_stylebox_override("panel", background_style)

func _show_error(message: String) -> void:
	_loading_label.visible = false
	if _on_error.is_valid():
		_on_error.call(message)
	else:
		print("AsteroidDetailView error: ", message)
