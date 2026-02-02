extends VBoxContainer

signal back_pressed

const ANIMATION_DURATION := 0.6  # seconds for zoom-in effect
const BASE_IMAGE_SIZE := Vector2(768, 768)  # Increased image size for better visibility
const AsteroidDetailModel = preload("res://Scripts/UI/AsteroidDetail/AsteroidDetailModel.gd")
const ArchivedAsteroidImageHelper = preload("res://Scripts/Archive/AsteroidDetail/ArchivedAsteroidImageHelper.gd")

var anomaly_id: String = ""
var anomaly_data: Dictionary = {}
var _model := AsteroidDetailModel.new()
var _image_helper := ArchivedAsteroidImageHelper.new()

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
	_image_helper.setup(
		self,
		asteroid_image,
		loading_label,
		info_label,
		ANIMATION_DURATION,
		Callable(self, "_show_error")
	)

func _on_save_pressed():
	# Archived copy: saving annotations kept for backup scene
	print("(archived) _on_save_pressed called for anomaly_id:", anomaly_id)
	# Implementation same as original archived copy (omitted here for brevity)

func initialize(anomaly: Dictionary):
	anomaly_data = anomaly
	anomaly_id = _model.normalize_anomaly_id(anomaly)
	var is_planet = _model.is_planet(anomaly)
	title_label.text = _model.build_title(anomaly, anomaly_id, is_planet)
	info_label.text = _model.build_info_text(anomaly_data)
	if anomaly_id != "":
		_load_anomaly_image(is_planet)
	else:
		_show_error("No ID found")

func _load_saved_annotations():
	# Archived: kept in archive folder
	return

func _load_anomaly_image(is_planet: bool = false):
	_image_helper.load_anomaly_image(anomaly_id, is_planet)

func _show_error(message: String):
	loading_label.visible = false
	error_label.visible = true
	error_label.text = "Error: " + message
	print("AsteroidDetailView (archived) error: ", message)

func _update_annotation_count():
	var count := 0
	if drawing_canvas != null:
		if drawing_canvas.has_method("get_annotation_count"):
			count = drawing_canvas.get_annotation_count()
		elif drawing_canvas.has_method("get_annotations"):
			var anns = drawing_canvas.get_annotations()
			if typeof(anns) == TYPE_ARRAY:
				count = anns.size()
	if annotation_count_label != null:
		annotation_count_label.text = str(count)

func _update_pen_button():
	# Safe no-op: update visual state if drawing_canvas exposes mode/pen info
	if pen_button == null or drawing_canvas == null:
		return
	if drawing_canvas.has_method("is_pen_active"):
		var active = drawing_canvas.is_pen_active()
		if pen_button.has_method("set_pressed"):
			pen_button.set_pressed(active)
		else:
			# fallback: try to toggle visual state via toggle_mode or do nothing
			if pen_button.has_method("toggle") and active:
				pen_button.toggle()

func _on_pen_pressed():
	if drawing_canvas != null and drawing_canvas.has_method("toggle_pen"):
		drawing_canvas.toggle_pen()
	_update_pen_button()

func _on_clear_pressed():
	if drawing_canvas != null and drawing_canvas.has_method("clear_annotations"):
		drawing_canvas.clear_annotations()
	_update_annotation_count()

func _on_mode_free():
	if drawing_canvas != null and drawing_canvas.has_method("set_mode"):
		drawing_canvas.set_mode(0)

func _on_mode_rect():
	if drawing_canvas != null and drawing_canvas.has_method("set_mode"):
		drawing_canvas.set_mode(1)

func _on_mode_circle():
	if drawing_canvas != null and drawing_canvas.has_method("set_mode"):
		drawing_canvas.set_mode(2)

func _on_color_changed(color: Color):
	if drawing_canvas != null and drawing_canvas.has_method("set_pen_color"):
		drawing_canvas.set_pen_color(color)

func _on_drawing_changed():
	_update_annotation_count()

func _on_back_pressed():
	back_pressed.emit()
	queue_free()
