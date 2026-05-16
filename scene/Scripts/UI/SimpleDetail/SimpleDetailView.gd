extends VBoxContainer
const AppLogger = preload("res://Scripts/Utils/Logger.gd")

signal back_pressed

@onready var back_button: Button = $Header/BackButton
@onready var loading_label: Label = $Content/LoadingLabel
@onready var anomaly_image: TextureRect = $Content/ImageContainer/AnomalyImage

var anomaly_id: String = ""
var is_planet: bool = false

func _ready():
	back_button.pressed.connect(_on_back_pressed)
	anomaly_image.visible = false

func initialize(anomaly: Dictionary):
	# Show short tuning message then load image
	# Handle numeric IDs that may be returned as floats (e.g. 68115570.0)
	var id_val = anomaly.get("id", anomaly.get("content", ""))
	if typeof(id_val) == TYPE_FLOAT:
		id_val = int(id_val)
	if typeof(id_val) == TYPE_INT:
		anomaly_id = str(id_val)
	else:
		anomaly_id = str(id_val)
		var raw = anomaly_id
		if raw.begins_with("TIC "):
			raw = raw.substr(4)
		# strip non-digits
		var digits := ""
		for ch in raw:
			if ch >= "0" and ch <= "9":
				digits += ch
		if digits != "":
			anomaly_id = digits
	is_planet = anomaly.get("anomalySet", "active-asteroids") == "telescope-tess"

	loading_label.text = "Telescope is being tuned..."
	# wait 1.2 seconds before showing image
	await get_tree().create_timer(1.2).timeout
	_load_anomaly_image()

func _load_anomaly_image():
	var image_url = ""
	if is_planet:
		image_url = "https://api.starsailors.space/storage/v1/object/public/anomalies/%s/Sector1.png" % anomaly_id
	else:
		image_url = "https://api.starsailors.space/storage/v1/object/public/telescope/telescope-active-asteroids/%s.png" % anomaly_id

	loading_label.text = "Loading image..."
	# Console-log the exact image URL requested (per user request)
	AppLogger.d("SimpleDetailView: requesting image URL -> " + str(image_url))
	var http = HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_image_loaded)
	var err = http.request(image_url)
	if err != OK:
		preload("res://Scripts/Utils/Logger.gd").d("SimpleDetailView: Failed to start HTTP request: %d" % [err])
		loading_label.text = "Failed to start image load"

func _on_image_loaded(result:int, response_code:int, headers:PackedStringArray, body:PackedByteArray):
	if result != HTTPRequest.RESULT_SUCCESS or response_code != 200:
		preload("res://Scripts/Utils/Logger.gd").d("SimpleDetailView: HTTP result=%d status=%d" % [result, response_code])
		loading_label.text = "Failed to load image"
		return
	var img = Image.new()
	var err = img.load_png_from_buffer(body)
	if err != OK:
		# Do NOT attempt fallbacks. Log PNG decode failure and stop.
		push_error("SimpleDetailView: PNG decode failed for requested URL")
		loading_label.text = "Failed to decode image"
		return
	var tex = ImageTexture.create_from_image(img)
	anomaly_image.texture = tex
	anomaly_image.visible = true
	loading_label.visible = false

func _on_back_pressed():
	back_pressed.emit()
	queue_free()
