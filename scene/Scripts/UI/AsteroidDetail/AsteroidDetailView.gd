extends VBoxContainer

signal back_pressed

const ANIMATION_DURATION := 0.6
const BASE_IMAGE_SIZE := Vector2(768, 768)
const AsteroidAnnotationHelper = preload("res://Scripts/UI/AsteroidDetail/AsteroidAnnotationHelper.gd")
const AsteroidImageHelper = preload("res://Scripts/UI/AsteroidDetail/AsteroidImageHelper.gd")
const AsteroidDetailModel = preload("res://Scripts/UI/AsteroidDetail/AsteroidDetailModel.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const UILayout = preload("res://Scripts/UI/UILayout.gd")

var anomaly_id: String = ""
var anomaly_data: Dictionary = {}
var _annotations := AsteroidAnnotationHelper.new()
var _image_helper := AsteroidImageHelper.new()
var _model := AsteroidDetailModel.new()
var _classification_row: Control

@onready var header_container: VBoxContainer = $HeaderContainer
@onready var tools_row: HFlowContainer = $HeaderContainer/ToolsRow
@onready var body_scroll: ScrollContainer = $BodyScroll
@onready var content_container: VBoxContainer = $BodyScroll/ContentContainer
@onready var image_container: CenterContainer = $BodyScroll/ContentContainer/ImageContainer
@onready var asteroid_image: TextureRect = $BodyScroll/ContentContainer/ImageContainer/AsteroidImage
@onready var drawing_canvas: Control = $BodyScroll/ContentContainer/ImageContainer/DrawingCanvas
@onready var loading_label: Label = $BodyScroll/ContentContainer/LoadingLabel
@onready var error_label: Label = $BodyScroll/ContentContainer/ErrorLabel
@onready var info_label: Label = $BodyScroll/ContentContainer/InfoLabel
@onready var back_button: Button = $HeaderContainer/TopRow/BackButton
@onready var title_label: Label = $HeaderContainer/TopRow/Title
@onready var pen_button: Button = $HeaderContainer/ToolsRow/PenButton
@onready var clear_button: Button = $HeaderContainer/ToolsRow/ClearButton
@onready var save_button: Button = $HeaderContainer/ToolsRow/SaveButton
@onready var pen_free_button: Button = $HeaderContainer/ToolsRow/PenFreeButton
@onready var pen_rect_button: Button = $HeaderContainer/ToolsRow/PenRectButton
@onready var pen_circle_button: Button = $HeaderContainer/ToolsRow/PenCircleButton
@onready var color_picker: ColorPickerButton = $HeaderContainer/ToolsRow/ColorPickerButton
@onready var annotation_count_label: Label = $HeaderContainer/TopRow/AnnotationCount

func _ready():
	back_button.pressed.connect(Callable(self, "_on_back_pressed"))
	pen_button.pressed.connect(Callable(self, "_on_pen_pressed"))
	clear_button.pressed.connect(Callable(self, "_on_clear_pressed"))
	save_button.pressed.connect(Callable(self, "_on_save_pressed"))
	pen_free_button.pressed.connect(Callable(self, "_on_mode_free"))
	pen_rect_button.pressed.connect(Callable(self, "_on_mode_rect"))
	pen_circle_button.pressed.connect(Callable(self, "_on_mode_circle"))
	color_picker.color_changed.connect(Callable(self, "_on_color_changed"))
	drawing_canvas.drawing_changed.connect(Callable(self, "_on_drawing_changed"))

	asteroid_image.visible = false
	error_label.visible = false
	info_label.visible = false
	loading_label.visible = true
	clear_button.visible = false

	asteroid_image.scale = Vector2.ZERO
	asteroid_image.pivot_offset = BASE_IMAGE_SIZE / 2

	_update_pen_button()
	color_picker.color = Color(0, 1, 0)
	drawing_canvas.set_pen_color(color_picker.color)
	drawing_canvas.set_mode(0)
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
		content_container,
		ANIMATION_DURATION,
		Callable(self, "_show_error")
	)
	_update_annotation_count()

	if get_viewport() and not get_viewport().size_changed.is_connected(_apply_layout):
		get_viewport().size_changed.connect(_apply_layout)
	call_deferred("_apply_layout")

func _on_save_pressed():
	var target_type = "planet" if _model.is_planet(anomaly_data) else "asteroid"
	_annotations.save_annotations(anomaly_id, target_type, title_label.text)

func initialize(anomaly: Dictionary, force_controls_visible := false):
	anomaly_data = anomaly
	var is_planet = _model.is_planet(anomaly)
	anomaly_id = _model.normalize_anomaly_id(anomaly, is_planet)
	title_label.text = _model.build_title(anomaly, anomaly_id, is_planet)
	info_label.text = _model.build_info_text(anomaly_data)

	if anomaly_id != "":
		_load_anomaly_image(is_planet)
	else:
		_show_error("No ID found")

	_load_saved_annotations()

	if force_controls_visible:
		pen_button.visible = true
		clear_button.visible = true
		save_button.visible = true
		pen_free_button.visible = true
		pen_rect_button.visible = true
		pen_circle_button.visible = true
		color_picker.visible = true
		annotation_count_label.visible = true

	if _model.is_candidate(anomaly):
		_build_classification_row()

	call_deferred("_apply_layout")

func _load_saved_annotations():
	_annotations.load_saved_annotations(anomaly_id)

func _load_anomaly_image(is_planet: bool = false):
	_image_helper.load_anomaly_image(anomaly_id, is_planet)

func _on_pen_pressed():
	drawing_canvas.toggle_pen()
	_update_pen_button()
	clear_button.visible = drawing_canvas.is_pen_enabled()

func _on_clear_pressed():
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

func _on_drawing_changed(_count: int):
	_update_annotation_count()

func _update_annotation_count():
	_annotations.update_annotation_count()

func _update_pen_button():
	if drawing_canvas.is_pen_enabled():
		pen_button.text = "✓ Pen Tool"
		pen_button.modulate = Color(0.5, 1.0, 0.5)
	else:
		pen_button.text = "✏️ Pen Tool"
		pen_button.modulate = Color.WHITE

func _apply_layout() -> void:
	var viewport := get_viewport_rect().size
	if viewport == Vector2.ZERO:
		return

	var safe := UILayout.safe_rect(viewport)
	var is_mobile := viewport.x < 900.0
	var is_narrow := viewport.x < 1280.0
	var image_side := clampf(minf(safe.size.x - (48.0 if is_mobile else 96.0), safe.size.y * (0.50 if is_mobile else 0.62)), 260.0, BASE_IMAGE_SIZE.x)
	var button_h := 44.0 if is_mobile else 50.0
	var tool_h := 40.0 if is_mobile else 44.0

	add_theme_constant_override("separation", 12 if is_mobile else 16)
	header_container.add_theme_constant_override("separation", 10 if is_mobile else 12)
	tools_row.add_theme_constant_override("h_separation", 8 if is_mobile else 10)
	tools_row.add_theme_constant_override("v_separation", 8 if is_mobile else 10)
	content_container.add_theme_constant_override("separation", 16 if is_mobile else 20)
	body_scroll.custom_minimum_size.y = clampf(safe.size.y - (170.0 if is_mobile else 190.0), 280.0, safe.size.y)
	image_container.custom_minimum_size = Vector2(image_side, image_side)
	asteroid_image.custom_minimum_size = Vector2(image_side, image_side)
	drawing_canvas.custom_minimum_size = Vector2(image_side, image_side)
	title_label.add_theme_font_size_override("font_size", 24 if is_mobile else (28 if is_narrow else 32))
	title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	info_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT if is_mobile else HORIZONTAL_ALIGNMENT_CENTER
	annotation_count_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT if not is_mobile else HORIZONTAL_ALIGNMENT_LEFT
	annotation_count_label.add_theme_font_size_override("font_size", 14 if is_mobile else 16)

	back_button.custom_minimum_size = Vector2(92.0 if is_mobile else 108.0, button_h)
	pen_button.custom_minimum_size = Vector2(116.0 if is_mobile else 136.0, button_h)
	clear_button.custom_minimum_size = Vector2(90.0 if is_mobile else 104.0, button_h)
	save_button.custom_minimum_size = Vector2(90.0 if is_mobile else 104.0, button_h)
	pen_free_button.custom_minimum_size = Vector2(76.0 if is_mobile else 90.0, tool_h)
	pen_rect_button.custom_minimum_size = Vector2(76.0 if is_mobile else 90.0, tool_h)
	pen_circle_button.custom_minimum_size = Vector2(76.0 if is_mobile else 90.0, tool_h)
	color_picker.custom_minimum_size = Vector2(56.0 if is_mobile else 64.0, tool_h)

func _show_error(message: String) -> void:
	loading_label.visible = false
	error_label.visible = true
	error_label.text = "Could not load image: %s" % message

func _build_classification_row() -> void:
	if is_instance_valid(_classification_row):
		return
	var existing_verdict = RocketsManager.get_tess_classification(anomaly_id)

	var row = VBoxContainer.new()
	row.name = "ClassificationRow"
	row.add_theme_constant_override("separation", 8)
	_classification_row = row
	content_container.add_child(row)

	var prompt = Label.new()
	prompt.text = "Classify this target:"
	PanelStyle.apply_muted(prompt)
	row.add_child(prompt)

	var button_row = HFlowContainer.new()
	button_row.name = "ClassificationButtons"
	button_row.add_theme_constant_override("h_separation", 8)
	button_row.add_theme_constant_override("v_separation", 8)
	row.add_child(button_row)

	var btn_planet = Button.new()
	btn_planet.name = "BtnPlanet"
	btn_planet.text = "Planet" if existing_verdict != "planet" else "✓ Planet"
	btn_planet.disabled = existing_verdict != ""
	PanelStyle.apply_button(btn_planet, existing_verdict == "planet")
	btn_planet.pressed.connect(_on_classify.bind("planet", row))
	button_row.add_child(btn_planet)

	var btn_not = Button.new()
	btn_not.name = "BtnNotPlanet"
	btn_not.text = "Not a Planet" if existing_verdict != "not_planet" else "✓ Not a Planet"
	btn_not.disabled = existing_verdict != ""
	PanelStyle.apply_button(btn_not, existing_verdict == "not_planet")
	btn_not.pressed.connect(_on_classify.bind("not_planet", row))
	button_row.add_child(btn_not)

	var btn_mark_dip = Button.new()
	btn_mark_dip.name = "BtnMarkDip"
	btn_mark_dip.text = "Mark Dip"
	btn_mark_dip.disabled = existing_verdict != ""
	PanelStyle.apply_button(btn_mark_dip, false)
	btn_mark_dip.pressed.connect(Callable(self, "_on_mark_dip_pressed"))
	button_row.add_child(btn_mark_dip)

func _on_mark_dip_pressed() -> void:
	drawing_canvas.set_mode(3)
	if not drawing_canvas.is_pen_enabled():
		drawing_canvas.toggle_pen()
	_update_pen_button()
	clear_button.visible = drawing_canvas.is_pen_enabled()

func _on_classify(verdict: String, row: VBoxContainer) -> void:
	var annotation_count = drawing_canvas.get_annotation_count() if drawing_canvas.has_method("get_annotation_count") else 0
	RocketsManager.set_target_annotation_level(anomaly_id, annotation_count)
	RocketsManager.set_tess_classification(anomaly_id, verdict)
	if verdict == "planet":
		RocketsManager.clear_candidate_visit_block(anomaly_id)
	else:
		RocketsManager.mark_candidate_visit_blocked(anomaly_id)
		RocketsManager.clear_selected_target()
		RocketsManager.set_launch_guidance_notice("This target is not confirmed yet. Pick another target for launch, then scan this one again later.")

	var button_row = row.get_node_or_null("ClassificationButtons")
	if button_row:
		var btn_planet = button_row.get_node_or_null("BtnPlanet")
		var btn_not = button_row.get_node_or_null("BtnNotPlanet")
		if btn_planet:
			btn_planet.text = "✓ Planet" if verdict == "planet" else "Planet"
			btn_planet.disabled = true
			PanelStyle.apply_button(btn_planet, verdict == "planet")
		if btn_not:
			btn_not.text = "✓ Not a Planet" if verdict == "not_planet" else "Not a Planet"
			btn_not.disabled = true
			PanelStyle.apply_button(btn_not, verdict == "not_planet")

	for child in row.get_children():
		if child is Label:
			var bonus_text = " — discovery bonus unlocked!" if verdict == "planet" else " — launch blocked until it is confirmed"
			child.text = "Classification submitted%s" % bonus_text
			break

	var app = AppControllerHelper.get_instance()
	if app and app.has_method("add_experience"):
		app.add_experience(1, "tess_classification")

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

func _on_back_pressed():
	back_pressed.emit()
	queue_free()
