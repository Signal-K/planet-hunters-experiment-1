extends RefCounted
class_name AsteroidImageHelper

const AppLogger = preload("res://Scripts/Utils/Logger.gd")

var _owner: Node
var _asteroid_image: TextureRect
var _loading_label: Label
var _info_label: Label
var _content_parent: Control
var _animation_duration: float = 0.0
var _on_error: Callable
var _current_target_data: Dictionary = {}

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

func load_anomaly_image(anomaly_id: String, anomaly_data: Dictionary = {}, is_planet: bool = false) -> void:
	"""Load the anomaly image from storage, or render a local TESS lightcurve."""
	_current_target_data = anomaly_data.duplicate(true)
	if is_planet:
		_render_tess_lightcurve(anomaly_id, _current_target_data)
		return

	"""Load the anomaly image from storage (asteroid)"""
	# Construct URL based on anomaly type
	var image_url = ""
	image_url = "https://api.starsailors.space/storage/v1/object/public/telescope/telescope-active-asteroids/%s.png" % anomaly_id

	var item_type = "asteroid"
	AppLogger.d("Loading %s image from: %s" % [item_type, image_url])
	_loading_label.text = "Loading %s image..." % item_type

	# Create HTTP request
	var http_request = HTTPRequest.new()
	_owner.add_child(http_request)
	http_request.request_completed.connect(Callable(self, "_on_image_loaded"))

	var error = http_request.request(image_url)
	if error != OK:
		_show_error("Failed to initiate image download")
		http_request.queue_free()

func _render_tess_lightcurve(anomaly_id: String, anomaly_data: Dictionary) -> void:
	var image_size := Vector2i(1600, 1600)
	var image := Image.create(image_size.x, image_size.y, false, Image.FORMAT_RGBA8)
	image.fill(Color(0.03, 0.05, 0.10, 1.0))

	var chart_rect := Rect2i(120, 180, image_size.x - 240, image_size.y - 360)
	_fill_rect(image, chart_rect, Color(0.05, 0.08, 0.14, 1.0))
	_draw_grid(image, chart_rect)
	_draw_axes(image, chart_rect)
	_draw_signal(image, chart_rect, anomaly_id, anomaly_data)

	var texture := ImageTexture.create_from_image(image)
	_asteroid_image.texture = texture
	_asteroid_image.scale = Vector2.ZERO
	_apply_background_color(Color(0.06, 0.11, 0.17, 1.0))

	var period_days: float = float(anomaly_data.get("period_days", 0.0))
	var source_label := str(anomaly_data.get("science_source", "NASA TESS")).strip_edges()
	var detail_text := "Synthetic TESS lightcurve preview"
	if period_days > 0.0:
		detail_text += " • Period %.2f d" % period_days
	if source_label != "":
		detail_text += " • %s" % source_label
	_info_label.text = detail_text

	_loading_label.visible = false
	_info_label.visible = true
	_error_label_reset()
	_asteroid_image.visible = true
	_animate_image_appearance()

func _draw_grid(image: Image, rect: Rect2i) -> void:
	for step in range(1, 5):
		var y := rect.position.y + int(round(float(rect.size.y) * float(step) / 5.0))
		_draw_horizontal_line(image, rect.position.x, rect.position.x + rect.size.x, y, Color(0.16, 0.23, 0.31, 1.0), 1)
	for step in range(1, 7):
		var x := rect.position.x + int(round(float(rect.size.x) * float(step) / 7.0))
		_draw_vertical_line(image, x, rect.position.y, rect.position.y + rect.size.y, Color(0.13, 0.19, 0.27, 1.0), 1)

func _draw_axes(image: Image, rect: Rect2i) -> void:
	_draw_horizontal_line(
		image,
		rect.position.x,
		rect.position.x + rect.size.x,
		rect.position.y + int(round(float(rect.size.y) * 0.56)),
		Color(0.28, 0.72, 0.69, 0.70),
		2
	)
	_draw_vertical_line(
		image,
		rect.position.x + 24,
		rect.position.y,
		rect.position.y + rect.size.y,
		Color(0.28, 0.72, 0.69, 0.32),
		2
	)

func _draw_signal(image: Image, rect: Rect2i, anomaly_id: String, anomaly_data: Dictionary) -> void:
	var hash_value: int = abs(anomaly_id.hash())
	var phase_offset: float = float(hash_value % 360) / 57.2958
	var period_days: float = maxf(float(anomaly_data.get("period_days", 0.0)), 0.25)
	var dip_center: float = 0.36 + (float(hash_value % 100) / 100.0) * 0.28
	var dip_width: float = 0.030 + fmod(period_days, 9.0) * 0.0025
	var dip_depth: float = 0.13 + float(hash_value % 7) * 0.016
	var baseline_y: float = rect.position.y + rect.size.y * 0.42
	var previous_point := Vector2i.ZERO
	var has_previous := false
	for x in range(rect.position.x, rect.position.x + rect.size.x):
		var normalized_x: float = float(x - rect.position.x) / maxf(float(rect.size.x - 1), 1.0)
		var wobble := sin(normalized_x * TAU * 1.4 + phase_offset) * 7.5
		var micro_noise := sin(normalized_x * TAU * 9.0 + phase_offset * 0.6) * 2.2
		var dip_profile := exp(-pow((normalized_x - dip_center) / dip_width, 2.0))
		var y_float := baseline_y + wobble + micro_noise + dip_profile * (rect.size.y * dip_depth)
		var point := Vector2i(x, clampi(int(round(y_float)), rect.position.y + 10, rect.position.y + rect.size.y - 10))
		if has_previous:
			_draw_line(image, previous_point, point, Color(0.54, 0.94, 0.88, 1.0), 4)
		previous_point = point
		has_previous = true

	var dip_start := rect.position.x + int(round(rect.size.x * maxf(dip_center - dip_width * 1.45, 0.0)))
	var dip_end := rect.position.x + int(round(rect.size.x * minf(dip_center + dip_width * 1.45, 1.0)))
	var dip_band := Rect2i(dip_start, rect.position.y, max(dip_end - dip_start, 8), rect.size.y)
	_fill_rect(image, dip_band, Color(0.55, 0.98, 0.78, 0.07))
	_draw_vertical_line(image, dip_start, rect.position.y, rect.position.y + rect.size.y, Color(0.52, 0.96, 0.86, 0.35), 2)
	_draw_vertical_line(image, dip_end, rect.position.y, rect.position.y + rect.size.y, Color(0.52, 0.96, 0.86, 0.35), 2)

func _fill_rect(image: Image, rect: Rect2i, color: Color) -> void:
	var x_end: int = min(rect.position.x + rect.size.x, image.get_width())
	var y_end: int = min(rect.position.y + rect.size.y, image.get_height())
	for y in range(max(rect.position.y, 0), y_end):
		for x in range(max(rect.position.x, 0), x_end):
			image.set_pixel(x, y, color)

func _draw_horizontal_line(image: Image, x0: int, x1: int, y: int, color: Color, thickness: int) -> void:
	for offset in range(-(thickness / 2), thickness - (thickness / 2)):
		var yy := y + offset
		if yy < 0 or yy >= image.get_height():
			continue
		for x in range(max(x0, 0), min(x1, image.get_width())):
			image.set_pixel(x, yy, color)

func _draw_vertical_line(image: Image, x: int, y0: int, y1: int, color: Color, thickness: int) -> void:
	for offset in range(-(thickness / 2), thickness - (thickness / 2)):
		var xx := x + offset
		if xx < 0 or xx >= image.get_width():
			continue
		for y in range(max(y0, 0), min(y1, image.get_height())):
			image.set_pixel(xx, y, color)

func _draw_line(image: Image, start: Vector2i, finish: Vector2i, color: Color, thickness: int) -> void:
	var dx: int = abs(finish.x - start.x)
	var dy: int = abs(finish.y - start.y)
	var steps: int = max(dx, dy)
	if steps <= 0:
		_draw_brush(image, start.x, start.y, thickness, color)
		return
	for step in range(steps + 1):
		var t := float(step) / float(steps)
		var x := int(round(lerpf(float(start.x), float(finish.x), t)))
		var y := int(round(lerpf(float(start.y), float(finish.y), t)))
		_draw_brush(image, x, y, thickness, color)

func _draw_brush(image: Image, center_x: int, center_y: int, thickness: int, color: Color) -> void:
	var radius: int = max(1, thickness / 2)
	for y in range(center_y - radius, center_y + radius + 1):
		if y < 0 or y >= image.get_height():
			continue
		for x in range(center_x - radius, center_x + radius + 1):
			if x < 0 or x >= image.get_width():
				continue
			if Vector2(float(x - center_x), float(y - center_y)).length() <= float(radius) + 0.4:
				image.set_pixel(x, y, color)

func _error_label_reset() -> void:
	if _owner == null:
		return
	var error_label := _owner.get_node_or_null("BodyScroll/ContentMargin/ContentContainer/ErrorLabel") as Label
	if error_label:
		error_label.visible = false
		error_label.text = ""

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
	"""Tint panel background toward image dominant color while preserving UI contrast."""
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	var background_color = Color(
		lerp(panel_style.PANEL_BG.r, color.r, 0.22),
		lerp(panel_style.PANEL_BG.g, color.g, 0.22),
		lerp(panel_style.PANEL_BG.b, color.b, 0.22),
		0.92
	)
	var background_style = panel_style.create_card_style()
	background_style.bg_color = background_color
	background_style.border_color = panel_style.PANEL_BORDER
	_content_parent.add_theme_stylebox_override("panel", background_style)

func _show_error(message: String) -> void:
	_loading_label.visible = false
	if _on_error.is_valid():
		_on_error.call(message)
	else:
		AppLogger.w("AsteroidDetailView error: %s" % message)
