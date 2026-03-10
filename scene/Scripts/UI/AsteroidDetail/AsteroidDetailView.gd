extends VBoxContainer

signal back_pressed

const ANIMATION_DURATION := 0.6  # seconds for zoom-in effect
const BASE_IMAGE_SIZE := Vector2(768, 768)  # Increased image size for better visibility
const AsteroidAnnotationHelper = preload("res://Scripts/UI/AsteroidDetail/AsteroidAnnotationHelper.gd")
const AsteroidImageHelper = preload("res://Scripts/UI/AsteroidDetail/AsteroidImageHelper.gd")
const AsteroidDetailModel = preload("res://Scripts/UI/AsteroidDetail/AsteroidDetailModel.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

var anomaly_id: String = ""
var anomaly_data: Dictionary = {}
var _annotations := AsteroidAnnotationHelper.new()
var _image_helper := AsteroidImageHelper.new()
var _model := AsteroidDetailModel.new()

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
	_annotations.setup(
		self,
		drawing_canvas,
		annotation_count_label,
		asteroid_image,
		BASE_IMAGE_SIZE,
		Callable(self, "_show_error")
	)
	_image_helper.setup(
		self,
		asteroid_image,
		loading_label,
		info_label,
		get_parent(),
		ANIMATION_DURATION,
		Callable(self, "_show_error")
	)
	_update_annotation_count()

func _on_save_pressed():
	var target_type = "planet" if _model.is_planet(anomaly_data) else "asteroid"
	_annotations.save_annotations(anomaly_id, target_type, title_label.text)

func initialize(anomaly: Dictionary, force_controls_visible := false):
	"""Initialize the detail view with anomaly data. If force_controls_visible is true, always show annotation controls."""
	anomaly_data = anomaly
	var is_planet = _model.is_planet(anomaly)
	anomaly_id = _model.normalize_anomaly_id(anomaly, is_planet)
	title_label.text = _model.build_title(anomaly, anomaly_id, is_planet)
	info_label.text = _model.build_info_text(anomaly_data)

	# Load the image
	if anomaly_id != "":
		_load_anomaly_image(is_planet)
	else:
		_show_error("No ID found")

	# Load any saved annotations for this anomaly
	_load_saved_annotations()

	# If force_controls_visible, ensure all annotation controls are visible
	if force_controls_visible:
		pen_button.visible = true
		clear_button.visible = true
		save_button.visible = true
		pen_free_button.visible = true
		pen_rect_button.visible = true
		pen_circle_button.visible = true
		color_picker.visible = true
		annotation_count_label.visible = true

	# Show classification buttons for unconfirmed TESS candidates
	if _model.is_candidate(anomaly):
		_build_classification_row()


func _load_saved_annotations():
	_annotations.load_saved_annotations(anomaly_id)

func _load_anomaly_image(is_planet: bool = false):
	_image_helper.load_anomaly_image(anomaly_id, is_planet)

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
	_annotations.update_annotation_count()

func _update_pen_button():
	"""Update pen button appearance"""
	if drawing_canvas.is_pen_enabled():
		pen_button.text = "✓ Pen Tool"
		pen_button.modulate = Color(0.5, 1.0, 0.5)  # Green tint
	else:
		pen_button.text = "✏️ Pen Tool"
		pen_button.modulate = Color.WHITE



	# Ensure error label visibility/state is correct when called elsewhere


func _build_classification_row() -> void:
	var existing_verdict = RocketsManager.get_tess_classification(anomaly_id)

	var row = HBoxContainer.new()
	row.name = "ClassificationRow"
	row.add_theme_constant_override("separation", 8)
	add_child(row)

	var prompt = Label.new()
	prompt.text = "Classify this target:"
	prompt.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	PanelStyle.apply_muted(prompt)
	row.add_child(prompt)

	var btn_planet = Button.new()
	btn_planet.name = "BtnPlanet"
	btn_planet.text = "Planet" if existing_verdict != "planet" else "✓ Planet"
	btn_planet.disabled = existing_verdict != ""
	PanelStyle.apply_button(btn_planet, existing_verdict == "planet")
	btn_planet.pressed.connect(_on_classify.bind("planet", row))
	row.add_child(btn_planet)

	var btn_not = Button.new()
	btn_not.name = "BtnNotPlanet"
	btn_not.text = "Not a Planet" if existing_verdict != "not_planet" else "✓ Not a Planet"
	btn_not.disabled = existing_verdict != ""
	PanelStyle.apply_button(btn_not, existing_verdict == "not_planet")
	btn_not.pressed.connect(_on_classify.bind("not_planet", row))
	row.add_child(btn_not)

	var btn_mark_dip = Button.new()
	btn_mark_dip.name = "BtnMarkDip"
	btn_mark_dip.text = "Mark Dip"
	btn_mark_dip.disabled = existing_verdict != ""
	PanelStyle.apply_button(btn_mark_dip, false)
	btn_mark_dip.pressed.connect(Callable(self, "_on_mark_dip_pressed"))
	row.add_child(btn_mark_dip)

func _on_mark_dip_pressed() -> void:
	drawing_canvas.set_mode(3) # TRANSIT_DIP
	if not drawing_canvas.is_pen_enabled():
		drawing_canvas.toggle_pen()
	_update_pen_button()
	clear_button.visible = drawing_canvas.is_pen_enabled()

func _on_classify(verdict: String, row: HBoxContainer) -> void:
	var annotation_count = drawing_canvas.get_annotation_count() if drawing_canvas.has_method("get_annotation_count") else 0
	RocketsManager.set_target_annotation_level(anomaly_id, annotation_count)
	RocketsManager.set_tess_classification(anomaly_id, verdict)
	if verdict == "planet":
		RocketsManager.clear_candidate_visit_block(anomaly_id)
	else:
		RocketsManager.mark_candidate_visit_blocked(anomaly_id)
		RocketsManager.clear_selected_target()
		RocketsManager.set_launch_guidance_notice("This target is not confirmed yet. Pick another target for launch, then scan this one again later.")

	# Update button states immediately
	var btn_planet = row.get_node_or_null("BtnPlanet")
	var btn_not = row.get_node_or_null("BtnNotPlanet")
	if btn_planet:
		btn_planet.text = "✓ Planet" if verdict == "planet" else "Planet"
		btn_planet.disabled = true
		PanelStyle.apply_button(btn_planet, verdict == "planet")
	if btn_not:
		btn_not.text = "✓ Not a Planet" if verdict == "not_planet" else "Not a Planet"
		btn_not.disabled = true
		PanelStyle.apply_button(btn_not, verdict == "not_planet")

	# Show confirmation label
	var prompt = row.get_node_or_null(row.get_children()[0].name if row.get_child_count() > 0 else "")
	for child in row.get_children():
		if child is Label:
			var bonus_text = " — discovery bonus unlocked!" if verdict == "planet" else " — launch blocked until it is confirmed"
			child.text = "Classification submitted%s" % bonus_text
			break

	var app = AppControllerHelper.get_instance()
	if app and app.has_method("add_experience"):
		app.add_experience(1, "tess_classification")

	# Submit to Supabase classifications table (fire-and-forget)
	var supabase = preload("res://Scripts/Systems/SupabaseClient.gd").get_instance()
	if supabase:
		var row_data = {
			"anomaly": int(anomaly_id) if anomaly_id.is_valid_int() else 0,
			"classificationtype": "tess-lightcurve",
			"content": "%s — %d annotation(s)" % [verdict.replace("_", " ").capitalize(), annotation_count],
			"author": "00000000-0000-0000-0000-000000000000",
			"classificationConfiguration": {
				"verdict": verdict,
				"annotation_count": annotation_count,
				"transit_dips": drawing_canvas.get_transit_dips() if drawing_canvas.has_method("get_transit_dips") else [],
				"source": "star-sailors-game"
			}
		}
		supabase.post_json("classifications", row_data)

func _show_error(message: String):
	"""Show an error message"""
	loading_label.visible = false
	error_label.visible = true
	error_label.text = "Error: " + message
	print("AsteroidDetailView error: ", message)

func _on_back_pressed():
	back_pressed.emit()
	queue_free()
