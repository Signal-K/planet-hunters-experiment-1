extends RefCounted
class_name ArchivedAsteroidImageHelper

var _owner: Node
var _asteroid_image: TextureRect
var _loading_label: Label
var _info_label: Label
var _animation_duration: float = 0.0
var _on_error: Callable

func setup(
	owner: Node,
	asteroid_image: TextureRect,
	loading_label: Label,
	info_label: Label,
	animation_duration: float,
	on_error: Callable
) -> void:
	_owner = owner
	_asteroid_image = asteroid_image
	_loading_label = loading_label
	_info_label = info_label
	_animation_duration = animation_duration
	_on_error = on_error

func load_anomaly_image(anomaly_id: String, is_planet: bool = false) -> void:
	var image_url = ""
	if is_planet:
		image_url = "https://api.starsailors.space/storage/v1/object/public/anomalies/%s/Sector1.png" % anomaly_id
	else:
		image_url = "https://api.starsailors.space/storage/v1/object/public/telescope/telescope-active-asteroids/%s.png" % anomaly_id
	_loading_label.text = "Loading image..."
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
	var image = Image.new()
	var error = image.load_png_from_buffer(body)
	if error != OK:
		error = image.load_jpg_from_buffer(body)
	if error != OK:
		_show_error("Failed to decode image")
		return
	var texture = ImageTexture.create_from_image(image)
	_asteroid_image.texture = texture
	_loading_label.visible = false
	_info_label.visible = true
	_asteroid_image.visible = true
	_animate_image_appearance()

func _animate_image_appearance() -> void:
	var tween = _owner.create_tween()
	tween.set_ease(Tween.EASE_OUT)
	tween.set_trans(Tween.TRANS_BACK)
	tween.tween_property(_asteroid_image, "scale", Vector2.ONE, _animation_duration)
	_asteroid_image.rotation = deg_to_rad(5)
	tween.parallel().tween_property(_asteroid_image, "rotation", 0.0, _animation_duration)

func _show_error(message: String) -> void:
	if _on_error.is_valid():
		_on_error.call(message)
	else:
		print("AsteroidDetailView (archived) error: ", message)
