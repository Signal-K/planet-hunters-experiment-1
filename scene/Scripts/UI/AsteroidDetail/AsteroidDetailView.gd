extends VBoxContainer

const SupabaseClient = preload("res://Scripts/Systems/SupabaseClient.gd")

signal back_pressed
signal classification_submitted(result: Dictionary)

const ANIMATION_DURATION := 0.6
const BASE_IMAGE_SIZE := Vector2(768, 768)
const AsteroidAnnotationHelper = preload("res://Scripts/UI/AsteroidDetail/AsteroidAnnotationHelper.gd")
const AsteroidImageHelper = preload("res://Scripts/UI/AsteroidDetail/AsteroidImageHelper.gd")
const AsteroidDetailModel = preload("res://Scripts/UI/AsteroidDetail/AsteroidDetailModel.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const UILayout = preload("res://Scripts/UI/UILayout.gd")
const AsteroidClassificationRowScene = preload("res://Scenes/UI/Templates/AsteroidClassificationRow.tscn")

var anomaly_id: String = ""
var anomaly_data: Dictionary = {}
var _annotations := AsteroidAnnotationHelper.new()
var _image_helper := AsteroidImageHelper.new()
var _model := AsteroidDetailModel.new()
var _classification_row: Control

@onready var header_container: VBoxContainer = $HeaderContainer
@onready var tools_row: HFlowContainer = $HeaderContainer/ToolsRow
@onready var body_scroll: ScrollContainer = $BodyScroll
@onready var body_margin: MarginContainer = $BodyScroll/ContentMargin
@onready var content_container: VBoxContainer = $BodyScroll/ContentMargin/ContentContainer
@onready var image_container: CenterContainer = $BodyScroll/ContentMargin/ContentContainer/ImageContainer
@onready var image_shell: PanelContainer = $BodyScroll/ContentMargin/ContentContainer/ImageContainer/ImageShell
@onready var asteroid_image: TextureRect = $BodyScroll/ContentMargin/ContentContainer/ImageContainer/AsteroidImage
@onready var drawing_canvas: Control = $BodyScroll/ContentMargin/ContentContainer/ImageContainer/DrawingCanvas
@onready var loading_label: Label = $BodyScroll/ContentMargin/ContentContainer/LoadingLabel
@onready var error_label: Label = $BodyScroll/ContentMargin/ContentContainer/ErrorLabel
@onready var info_label: Label = $BodyScroll/ContentMargin/ContentContainer/InfoLabel
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
@onready var _science_summary_card: PanelContainer = get_node_or_null("BodyScroll/ContentMargin/ContentContainer/ScienceSummaryCard") as PanelContainer
@onready var _science_summary_body: Label = get_node_or_null("BodyScroll/ContentMargin/ContentContainer/ScienceSummaryCard/Body/SummaryBodyLabel") as Label
@onready var _science_summary_meta: Label = get_node_or_null("BodyScroll/ContentMargin/ContentContainer/ScienceSummaryCard/Body/SummaryMetaLabel") as Label

func _ready():
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	custom_minimum_size = Vector2.ZERO
	back_button.pressed.connect(_on_back_pressed)
	pen_button.pressed.connect(_on_pen_pressed)
	clear_button.pressed.connect(_on_clear_pressed)
	save_button.pressed.connect(_on_save_pressed)
	pen_free_button.pressed.connect(_on_mode_free)
	pen_rect_button.pressed.connect(_on_mode_rect)
	pen_circle_button.pressed.connect(_on_mode_circle)
	color_picker.color_changed.connect(_on_color_changed)
	drawing_canvas.drawing_changed.connect(_on_drawing_changed)

	asteroid_image.visible = false
	error_label.visible = false
	info_label.visible = false
	loading_label.visible = true
	clear_button.visible = false

	asteroid_image.scale = Vector2.ZERO
	asteroid_image.pivot_offset = BASE_IMAGE_SIZE / 2

	_apply_visual_style()
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
		_show_error
	)
	_image_helper.setup(
		self,
		asteroid_image,
		loading_label,
		info_label,
		content_container,
		ANIMATION_DURATION,
		_show_error
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
	_refresh_science_summary()

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

func _apply_visual_style() -> void:
	add_theme_constant_override("separation", 14)
	header_container.add_theme_constant_override("separation", 12)
	content_container.add_theme_constant_override("separation", 18)
	var header_style := StyleBoxFlat.new()
	header_style.bg_color = Color(0.03, 0.05, 0.10, 0.96)
	header_style.border_color = Color(0.16, 0.27, 0.34, 0.90)
	header_style.set_border_width_all(1)
	header_style.set_corner_radius_all(22)
	header_style.content_margin_left = 18
	header_style.content_margin_top = 16
	header_style.content_margin_right = 18
	header_style.content_margin_bottom = 16
	header_container.add_theme_stylebox_override("panel", header_style)
	title_label.add_theme_color_override("font_color", Color(0.94, 0.97, 1.0, 1.0))
	back_button.add_theme_font_size_override("font_size", 16)
	annotation_count_label.add_theme_color_override("font_color", Color(0.55, 0.96, 0.89, 1.0))
	annotation_count_label.add_theme_font_size_override("font_size", 16)
	loading_label.text = "Loading science frame..."
	loading_label.add_theme_color_override("font_color", Color(0.74, 0.92, 1.0, 1.0))
	loading_label.add_theme_font_size_override("font_size", 18)
	error_label.add_theme_color_override("font_color", Color(1.0, 0.47, 0.43, 1.0))
	error_label.add_theme_font_size_override("font_size", 17)
	info_label.add_theme_color_override("font_color", Color(0.82, 0.89, 0.95, 1.0))
	info_label.add_theme_font_size_override("font_size", 16)
	_style_button(back_button, false)
	_style_button(pen_button, true)
	_style_button(clear_button, false)
	_style_button(save_button, false)
	_style_button(pen_free_button, false)
	_style_button(pen_rect_button, false)
	_style_button(pen_circle_button, false)
	var color_style := StyleBoxFlat.new()
	color_style.bg_color = Color(0.11, 0.15, 0.19, 1.0)
	color_style.border_color = Color(0.28, 0.40, 0.47, 1.0)
	color_style.set_border_width_all(1)
	color_style.set_corner_radius_all(12)
	color_picker.add_theme_stylebox_override("normal", color_style)
	color_picker.add_theme_stylebox_override("hover", color_style)
	var shell_style := StyleBoxFlat.new()
	shell_style.bg_color = Color(0.04, 0.07, 0.11, 1.0)
	shell_style.border_color = Color(0.19, 0.30, 0.36, 1.0)
	shell_style.set_border_width_all(1)
	shell_style.set_corner_radius_all(26)
	image_shell.add_theme_stylebox_override("panel", shell_style)
	var summary_style := StyleBoxFlat.new()
	summary_style.bg_color = Color(0.96, 0.98, 1.0, 0.98)
	summary_style.border_color = Color(0.78, 0.88, 0.93, 0.90)
	summary_style.set_border_width_all(1)
	summary_style.set_corner_radius_all(20)
	summary_style.content_margin_left = 18
	summary_style.content_margin_top = 18
	summary_style.content_margin_right = 18
	summary_style.content_margin_bottom = 18
	if _science_summary_card:
		_science_summary_card.add_theme_stylebox_override("panel", summary_style)
		var summary_eyebrow := _science_summary_card.get_node_or_null("Body/EyebrowLabel") as Label
		if summary_eyebrow:
			summary_eyebrow.add_theme_color_override("font_color", Color(0.05, 0.49, 0.45, 1.0))
			summary_eyebrow.add_theme_font_size_override("font_size", 14)
	if _science_summary_body:
		_science_summary_body.add_theme_color_override("font_color", Color(0.11, 0.15, 0.18, 1.0))
		_science_summary_body.add_theme_font_size_override("font_size", 18)
	if _science_summary_meta:
		_science_summary_meta.add_theme_color_override("font_color", Color(0.28, 0.34, 0.39, 1.0))
		_science_summary_meta.add_theme_font_size_override("font_size", 15)

func _style_button(button: Button, primary: bool) -> void:
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0.07, 0.58, 0.53, 1.0) if primary else Color(0.10, 0.14, 0.18, 0.96)
	normal.border_color = Color(0.27, 0.40, 0.46, 1.0) if not primary else Color(0.41, 0.97, 0.88, 0.70)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(14)
	normal.content_margin_left = 18
	normal.content_margin_top = 13
	normal.content_margin_right = 18
	normal.content_margin_bottom = 13
	var hover := normal.duplicate()
	hover.bg_color = normal.bg_color.lightened(0.06)
	var pressed := normal.duplicate()
	pressed.bg_color = normal.bg_color.darkened(0.06)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("focus", hover)
	button.add_theme_color_override("font_color", Color(0.97, 0.99, 0.99, 1.0) if primary else Color(0.92, 0.96, 1.0, 1.0))
	button.add_theme_color_override("font_hover_color", Color(0.97, 0.99, 0.99, 1.0) if primary else Color(0.92, 0.96, 1.0, 1.0))
	button.add_theme_color_override("font_pressed_color", Color(0.97, 0.99, 0.99, 1.0) if primary else Color(0.92, 0.96, 1.0, 1.0))
	button.add_theme_font_size_override("font_size", 15)

func _refresh_science_summary() -> void:
	if _science_summary_body == null:
		return
	var is_planet := _model.is_planet(anomaly_data)
	var category := "candidate exoplanet light curve" if is_planet else "asteroid prospecting frame"
	_science_summary_body.text = "Review this %s, annotate the strongest signal, and lock a verdict before routing it into operations." % category
	var meta_parts := []
	if anomaly_id != "":
		meta_parts.append("Target ID: %s" % anomaly_id)
	var source := str(anomaly_data.get("science_source", anomaly_data.get("anomalytype", "")))
	if source != "":
		meta_parts.append("Source: %s" % source.replace("_", " "))
	var blurb := str(anomaly_data.get("science_blurb", ""))
	if blurb == "":
		blurb = _model.build_info_text(anomaly_data)
	if blurb != "":
		meta_parts.append(blurb)
	_science_summary_meta.text = "  •  ".join(meta_parts)

func _load_saved_annotations():
	_annotations.load_saved_annotations(anomaly_id)

func _load_anomaly_image(is_planet: bool = false):
	_image_helper.load_anomaly_image(anomaly_id, anomaly_data, is_planet)

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
		pen_button.text = "✓ Annotation On"
		pen_button.modulate = Color.WHITE
	else:
		pen_button.text = "Enable Annotation"
		pen_button.modulate = Color.WHITE

func _apply_layout() -> void:
	var viewport := get_viewport_rect().size
	if viewport == Vector2.ZERO:
		return

	var safe := UILayout.safe_rect(viewport)
	var is_mobile := viewport.x < 900.0
	var is_narrow := viewport.x < 1280.0
	var image_side := clampf(minf(safe.size.x - (40.0 if is_mobile else 120.0), safe.size.y * (0.48 if is_mobile else 0.62)), 280.0, BASE_IMAGE_SIZE.x)
	var button_h := 52.0 if is_mobile else 54.0
	var tool_h := 48.0 if is_mobile else 46.0
	var margin_h := 14 if is_mobile else (28 if is_narrow else 42)
	var margin_v := 14 if is_mobile else 22

	add_theme_constant_override("separation", 12 if is_mobile else 16)
	header_container.add_theme_constant_override("separation", 10 if is_mobile else 12)
	tools_row.add_theme_constant_override("h_separation", 8 if is_mobile else 10)
	tools_row.add_theme_constant_override("v_separation", 8 if is_mobile else 10)
	content_container.add_theme_constant_override("separation", 16 if is_mobile else 20)
	body_margin.add_theme_constant_override("margin_left", margin_h)
	body_margin.add_theme_constant_override("margin_right", margin_h)
	body_margin.add_theme_constant_override("margin_top", margin_v)
	body_margin.add_theme_constant_override("margin_bottom", margin_v + 8)
	var header_height := maxf(
		header_container.get_combined_minimum_size().y,
		158.0 if is_mobile else 176.0
	)
	var body_height := maxf(220.0, safe.size.y - header_height - float(get_theme_constant("separation")))
	body_scroll.custom_minimum_size.y = body_height
	custom_minimum_size = safe.size
	image_container.custom_minimum_size = Vector2(image_side, image_side)
	asteroid_image.custom_minimum_size = Vector2(image_side, image_side)
	drawing_canvas.custom_minimum_size = Vector2(image_side, image_side)
	title_label.add_theme_font_size_override("font_size", 28 if is_mobile else (32 if is_narrow else 36))
	title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	info_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT if is_mobile else HORIZONTAL_ALIGNMENT_CENTER
	info_label.add_theme_font_size_override("font_size", 15 if is_mobile else 16)
	loading_label.add_theme_font_size_override("font_size", 18 if is_mobile else 20)
	error_label.add_theme_font_size_override("font_size", 16 if is_mobile else 18)
	annotation_count_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT if not is_mobile else HORIZONTAL_ALIGNMENT_LEFT
	annotation_count_label.add_theme_font_size_override("font_size", 15 if is_mobile else 16)

	back_button.custom_minimum_size = Vector2(92.0 if is_mobile else 108.0, button_h)
	pen_button.custom_minimum_size = Vector2(134.0 if is_mobile else 156.0, button_h)
	clear_button.custom_minimum_size = Vector2(94.0 if is_mobile else 112.0, button_h)
	save_button.custom_minimum_size = Vector2(94.0 if is_mobile else 112.0, button_h)
	pen_free_button.custom_minimum_size = Vector2(84.0 if is_mobile else 96.0, tool_h)
	pen_rect_button.custom_minimum_size = Vector2(84.0 if is_mobile else 96.0, tool_h)
	pen_circle_button.custom_minimum_size = Vector2(84.0 if is_mobile else 96.0, tool_h)
	color_picker.custom_minimum_size = Vector2(56.0 if is_mobile else 64.0, tool_h)
	_science_summary_card.custom_minimum_size = Vector2(0.0, 0.0 if is_mobile else 110.0)
	if is_instance_valid(_classification_row):
		var prompt: Label = _classification_row.get_node("PromptLabel")
		var note: Label = _classification_row.get_node("NoteLabel")
		var btn_planet: Button = _classification_row.get_node("ClassificationButtons/BtnPlanet")
		var btn_not: Button = _classification_row.get_node("ClassificationButtons/BtnNotPlanet")
		var btn_mark_dip: Button = _classification_row.get_node("ClassificationButtons/BtnMarkDip")
		prompt.add_theme_font_size_override("font_size", 18 if is_mobile else 20)
		note.add_theme_font_size_override("font_size", 14 if is_mobile else 15)
		for button in [btn_planet, btn_not, btn_mark_dip]:
			button.custom_minimum_size = Vector2(164.0 if is_mobile else 196.0, button_h)
			button.add_theme_font_size_override("font_size", 16 if is_mobile else 17)

func _show_error(message: String) -> void:
	loading_label.visible = false
	error_label.visible = true
	error_label.text = "Science frame unavailable: %s" % message

func _build_classification_row() -> void:
	if is_instance_valid(_classification_row):
		return
	var existing_verdict = RocketsManager.get_tess_classification(anomaly_id)

	var row = AsteroidClassificationRowScene.instantiate()
	_classification_row = row
	content_container.add_child(row)

	var prompt: Label = row.get_node("PromptLabel")
	prompt.add_theme_color_override("font_color", Color(0.95, 0.98, 1.0, 1.0))
	prompt.add_theme_font_size_override("font_size", 20)

	var note: Label = row.get_node("NoteLabel")
	note.text = "A confirmed verdict unlocks safer routing. A rejection blocks travel until the signal is revisited."
	note.add_theme_color_override("font_color", Color(0.74, 0.82, 0.88, 1.0))
	note.add_theme_font_size_override("font_size", 15)

	var button_row: HFlowContainer = row.get_node("ClassificationButtons")
	button_row.add_theme_constant_override("h_separation", 10)
	button_row.add_theme_constant_override("v_separation", 10)

	var btn_planet: Button = row.get_node("ClassificationButtons/BtnPlanet")
	btn_planet.text = "Planet" if existing_verdict != "planet" else "✓ Planet"
	btn_planet.disabled = existing_verdict != ""
	PanelStyle.apply_button(btn_planet, existing_verdict == "planet")
	btn_planet.pressed.connect(_on_classify.bind("planet", row))

	var btn_not: Button = row.get_node("ClassificationButtons/BtnNotPlanet")
	btn_not.text = "Not a Planet" if existing_verdict != "not_planet" else "✓ Not a Planet"
	btn_not.disabled = existing_verdict != ""
	PanelStyle.apply_button(btn_not, existing_verdict == "not_planet")
	btn_not.pressed.connect(_on_classify.bind("not_planet", row))

	var btn_mark_dip: Button = row.get_node("ClassificationButtons/BtnMarkDip")
	btn_mark_dip.text = "Mark Dip"
	btn_mark_dip.disabled = existing_verdict != ""
	PanelStyle.apply_button(btn_mark_dip, false)
	btn_mark_dip.pressed.connect(_on_mark_dip_pressed)

func _on_mark_dip_pressed() -> void:
	drawing_canvas.set_mode(3)
	if not drawing_canvas.is_pen_enabled():
		drawing_canvas.toggle_pen()
	_update_pen_button()
	clear_button.visible = drawing_canvas.is_pen_enabled()

func _on_classify(verdict: String, row: VBoxContainer) -> void:
	var annotation_count = drawing_canvas.get_annotation_count() if drawing_canvas.has_method("get_annotation_count") else 0
	var target_type = "planet" if _model.is_planet(anomaly_data) else "asteroid"
	_annotations.save_annotations(anomaly_id, target_type, title_label.text if title_label else "")
	var result: Dictionary = RocketsManager.classify_candidate_target(anomaly_id, verdict, annotation_count)
	AppControllerHelper.record_tutorial_action("classify_candidate", {
		"target_id": anomaly_id,
		"verdict": verdict,
		"confirmed": bool(result.get("confirmed", false))
	})

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

	classification_submitted.emit(result.duplicate(true))

	var supabase = SupabaseClient.get_instance()
	if supabase:
		supabase.ensure_authenticated(func(ok: bool, _err: String) -> void:
			if not ok:
				return
			var normalized_anomaly_id := int(floor(anomaly_id.to_float())) if anomaly_id.to_float() > 0.0 else 0
			var row_data = {
				"anomaly": normalized_anomaly_id,
				"classificationtype": "tess-lightcurve",
				"content": "%s — %d annotation(s)" % [verdict.replace("_", " ").capitalize(), annotation_count],
				"author": supabase.get_authenticated_user_id(),
				"classificationConfiguration": {
					"verdict": verdict,
					"annotation_count": annotation_count,
					"transit_dips": drawing_canvas.get_transit_dips() if drawing_canvas.has_method("get_transit_dips") else [],
					"source": "landnam-game"
				}
			}
			supabase.post_json("classifications", row_data)
		)

func _on_back_pressed():
	back_pressed.emit()
	queue_free()
