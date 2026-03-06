extends Node3D

const PREVIEW_SCENE_PATH := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"

const EARTH_ORBIT_TIME := 3.5
const EARTH_FADE_TIME := 2.5
const TRAVEL_TIME := 20.0
const TARGET_APPROACH_TIME := 6.0
const ORBIT_ROTATION_SPEED := 0.25
const ORBIT_RADIUS_PX := 416.0
const ORBIT_SEGMENTS := 64
const SHAKE_DURATION := 0.6
const SHAKE_MAGNITUDE := 7.0

const TRAVEL_DISTANCE_TOTAL_KM := 420000.0
const NumberFormat = preload("res://Scripts/Utils/NumberFormat.gd")
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const ResourceValueRowScene = preload("res://Scenes/UI/Templates/ResourceValueRow.tscn")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const OrbitVisuals = preload("res://Scripts/Utils/OrbitVisuals.gd")
const ResourceYield = preload("res://Scripts/Utils/ResourceYield.gd")
const ProceduralBodyBuilder = preload("res://Scripts/Utils/ProceduralBodyBuilder.gd")
const RocketSpriteHelper = preload("res://Scripts/Utils/RocketSpriteHelper.gd")
const RoomCatalog = preload("res://Scripts/Utils/RoomCatalog.gd")


@onready var asteroid_pivot: Node3D = $AsteroidPivot
@onready var asteroid_mesh: MeshInstance3D = $AsteroidPivot/Asteroid
@onready var camera_3d: Camera3D = $Camera3D
@onready var orbit_root: Node2D = $CanvasLayer/Orbit2D
@onready var orbit_circle: Line2D = $CanvasLayer/Orbit2D/OrbitCircle
@onready var orbit_heading: Line2D = $CanvasLayer/Orbit2D/OrbitHeading
@onready var orbit_rocket: AnimatedSprite2D = $CanvasLayer/Orbit2D/OrbitRocket2D
@onready var back_button: Button = $CanvasLayer/UI/Margin/VBox/Header/BackButton
@onready var target_label: Label = $CanvasLayer/UI/Margin/VBox/Header/TargetLabel
@onready var minerals_panel: Panel = $CanvasLayer/UI/Margin/VBox/MineralsPanel
@onready var minerals_title: Label = $CanvasLayer/UI/Margin/VBox/MineralsPanel/MineralsMargin/MineralsContent/MineralsTitle
@onready var minerals_summary: Label = $CanvasLayer/UI/Margin/VBox/MineralsPanel/MineralsMargin/MineralsContent/MineralsSummary
@onready var minerals_list: VBoxContainer = $CanvasLayer/UI/Margin/VBox/MineralsPanel/MineralsMargin/MineralsContent/MineralsList
@onready var control_panel: Panel = $CanvasLayer/UI/ControlPanel
@onready var return_home_button: Button = $CanvasLayer/UI/ControlPanel/ControlPanelMargin/ControlPanelButtons/ReturnHomeButton
@onready var mine_button: Button = $CanvasLayer/UI/ControlPanel/ControlPanelMargin/ControlPanelButtons/MineButton
@onready var inventory_panel: Panel = $CanvasLayer/UI/InventoryPanel
@onready var travel_panel: Panel = $CanvasLayer/UI/TravelPanel
@onready var travel_title: Label = $CanvasLayer/UI/TravelPanel/TravelMargin/TravelContent/TravelTitle
@onready var travel_bar: ProgressBar = $CanvasLayer/UI/TravelPanel/TravelMargin/TravelContent/TravelBar
@onready var travel_speed: Label = $CanvasLayer/UI/TravelPanel/TravelMargin/TravelContent/TravelSpeed

var _orbit_angle := 0.0
var _phase_time := 0.0
var _earth_alpha := 1.0
var _target_alpha := 0.0
var _current_target_id := ""
var _current_target_label := ""
var _current_target_type := ""
var _current_rocket_id := ""
var _earth_pivot: Node3D
var _earth_mesh: MeshInstance3D
# Science image panel shown during TRAVEL phase
var _science_panel: PanelContainer = null
var _science_image: TextureRect = null
var _science_caption: Label = null
var _science_http: HTTPRequest = null
var _science_image_requested := false
var _traveling := false
var _last_viewport_size := Vector2.ZERO
var _shake_offset := Vector2.ZERO
var _shake_elapsed := 0.0
var _shake_active := false
var _travel_start_pos := Vector2.ZERO
var _travel_end_pos := Vector2.ZERO
var _shop_button: Button = null
var _ship_status_panel: PanelContainer = null
var _ship_status_visible := false
var _travel_eta_label: Label = null
var _travel_info_label: Label = null

enum Phase {
	EARTH_ORBIT,
	TRAVEL,
	TARGET_APPROACH,
	TARGET_ORBIT
}

var _phase := Phase.EARTH_ORBIT

func _ready() -> void:
	_setup_ui()
	_load_target_data()
	_generate_target_asteroid(_current_target_id)
	_setup_earth()
	_setup_orbit_visual()
	_build_science_panel()
	_enhance_travel_dashboard()
	_build_shop_button()
	_apply_responsive_layout()
	_start_earth_orbit()

func _process(delta: float) -> void:
	_phase_time += delta
	var viewport_size = get_viewport().get_visible_rect().size
	if viewport_size != _last_viewport_size:
		_last_viewport_size = viewport_size
		_apply_responsive_layout()
	_update_shake(delta)
	_update_orbit(delta)
	_apply_earth_alpha()
	if _phase == Phase.EARTH_ORBIT and _phase_time >= EARTH_ORBIT_TIME:
		_start_travel()
	elif _phase == Phase.TRAVEL:
		_update_travel()
	elif _phase == Phase.TARGET_APPROACH and _phase_time >= TARGET_APPROACH_TIME:
		_start_target_orbit()
	_update_target_label()

func _setup_ui() -> void:
	var panel_style = PanelStyle
	panel_style.apply_button(back_button, false)
	back_button.text = "Skip"
	panel_style.apply_title(target_label)
	panel_style.apply_panel(minerals_panel)
	panel_style.apply_title(minerals_title)
	panel_style.apply_body(minerals_summary)
	panel_style.apply_panel(inventory_panel)
	panel_style.apply_panel(control_panel)
	panel_style.apply_button(return_home_button, false)
	panel_style.apply_button(mine_button, true)
	panel_style.apply_panel(travel_panel)
	panel_style.apply_title(travel_title)
	panel_style.apply_body(travel_speed)
	panel_style.apply_progress_bar(travel_bar)
	travel_panel.visible = false
	minerals_panel.visible = false
	control_panel.visible = false
	inventory_panel.visible = false
	back_button.pressed.connect(_on_back_pressed)
	if mine_button:
		mine_button.pressed.connect(_on_mine_pressed)
	if return_home_button:
		return_home_button.pressed.connect(_on_return_home_pressed)

func _load_target_data() -> void:
	var rm = RocketsManager
	var target := {}
	if rm:
		target = rm.get_preview_target()
	_current_target_id = str(target.get("id", ""))
	_current_target_label = str(target.get("label", ""))
	_current_target_type = str(target.get("type", "asteroid"))
	_current_rocket_id = str(target.get("rocket_id", ""))

func _update_target_label() -> void:
	if target_label == null:
		return
	if _current_target_label != "":
		target_label.text = "En route to %s" % _current_target_label
	elif _current_target_id != "":
		target_label.text = "En route to Asteroid %s" % _current_target_id
	else:
		target_label.text = "En route to target"

func _setup_earth() -> void:
	_earth_pivot = Node3D.new()
	_earth_pivot.name = "EarthPivot"
	add_child(_earth_pivot)
	_earth_mesh = MeshInstance3D.new()
	_earth_mesh.name = "Earth"
	_earth_pivot.add_child(_earth_mesh)
	_generate_earth()
	_earth_mesh.visible = true
	if asteroid_mesh:
		asteroid_mesh.visible = false

func _setup_orbit_visual() -> void:
	if orbit_root == null or orbit_circle == null or orbit_rocket == null or orbit_heading == null:
		return
	orbit_root.visible = true
	_orbit_angle = 0.0
	var orbit_utils = OrbitVisuals
	orbit_utils.build_orbit_circle(orbit_circle, ORBIT_RADIUS_PX, ORBIT_SEGMENTS)
	orbit_rocket.position = Vector2(ORBIT_RADIUS_PX, 0)
	orbit_rocket.scale = Vector2(0.2, 0.2)
	_set_orbit_rocket_visual(_current_rocket_id)
	var orbit_utils2 = OrbitVisuals
	orbit_utils2.update_heading_line(orbit_heading, orbit_rocket)

func _start_earth_orbit() -> void:
	_phase = Phase.EARTH_ORBIT
	_phase_time = 0.0
	_earth_alpha = 1.0
	_target_alpha = 0.0
	_traveling = false
	travel_panel.visible = false
	minerals_panel.visible = false
	control_panel.visible = false
	inventory_panel.visible = false
	if orbit_circle:
		orbit_circle.visible = true
	if _earth_mesh:
		_earth_mesh.visible = true
	if asteroid_mesh:
		asteroid_mesh.visible = false

func _start_travel() -> void:
	_phase = Phase.TRAVEL
	_phase_time = 0.0
	_traveling = true
	travel_panel.visible = true
	travel_panel.modulate.a = 0.0
	get_tree().create_tween().tween_property(travel_panel, "modulate:a", 1.0, 0.6)
	get_tree().create_tween().tween_property(self, "_earth_alpha", 0.0, EARTH_FADE_TIME)
	if orbit_circle:
		orbit_circle.visible = false
	_show_science_panel()
	# Start shake and cache travel arc endpoints
	_shake_active = true
	_shake_elapsed = 0.0
	_shake_offset = Vector2.ZERO
	_travel_start_pos = orbit_rocket.position
	var viewport_size = get_viewport().get_visible_rect().size
	_travel_end_pos = (viewport_size * 0.5) - orbit_root.position
	# Show ship status button during transit
	if _shop_button:
		_shop_button.visible = true

func _update_travel() -> void:
	if not _traveling:
		return
	var pct = clamp(_phase_time / TRAVEL_TIME, 0.0, 1.0)
	if travel_bar:
		travel_bar.value = pct
	if travel_speed:
		var remaining_km = max(int(round(TRAVEL_DISTANCE_TOTAL_KM * (1.0 - pct))), 0)
		travel_speed.text = "Distance: %s km" % NumberFormat.commas(str(remaining_km))
	if _travel_eta_label:
		var remaining_secs = max(TRAVEL_TIME - _phase_time, 0.0)
		var eta_min = int(remaining_secs / 60.0)
		var eta_sec = int(fmod(remaining_secs, 60.0))
		_travel_eta_label.text = "ETA: %02d:%02d" % [eta_min, eta_sec]
	if pct >= 1.0:
		_start_target_approach()

func _start_target_approach() -> void:
	_phase = Phase.TARGET_APPROACH
	_phase_time = 0.0
	_traveling = false
	if _shop_button:
		_shop_button.visible = false
	if _ship_status_panel and _ship_status_visible:
		_ship_status_panel.visible = false
		_ship_status_visible = false
	if travel_panel:
		var fade = get_tree().create_tween()
		fade.tween_property(travel_panel, "modulate:a", 0.0, 0.6)
		fade.finished.connect(func():
			travel_panel.visible = false
		)
	_target_alpha = 1.0
	if asteroid_mesh:
		asteroid_mesh.visible = true
		asteroid_pivot.scale = Vector3(0.35, 0.35, 0.35)
		var grow = get_tree().create_tween()
		grow.tween_property(asteroid_pivot, "scale", Vector3.ONE, TARGET_APPROACH_TIME)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	if _earth_mesh:
		_earth_mesh.visible = false

func _start_target_orbit() -> void:
	_phase = Phase.TARGET_ORBIT
	_phase_time = 0.0
	minerals_panel.visible = true
	control_panel.visible = true
	inventory_panel.visible = true
	minerals_panel.modulate.a = 0.0
	inventory_panel.modulate.a = 0.0
	control_panel.modulate.a = 0.0
	if orbit_circle:
		orbit_circle.visible = true
	if orbit_heading:
		orbit_heading.visible = true
	var t = get_tree().create_tween()
	t.tween_property(minerals_panel, "modulate:a", 1.0, 0.6)
	t.parallel().tween_property(inventory_panel, "modulate:a", 1.0, 0.6)
	t.parallel().tween_property(control_panel, "modulate:a", 1.0, 0.6)
	_build_minerals_list()

func _update_orbit(delta: float) -> void:
	if orbit_root == null or orbit_rocket == null:
		return
	_orbit_angle += ORBIT_ROTATION_SPEED * delta
	if _phase == Phase.TRAVEL:
		var pct = clamp(_phase_time / TRAVEL_TIME, 0.0, 1.0)
		var arc_pos = _travel_start_pos.lerp(_travel_end_pos, pct)
		arc_pos.y += sin(pct * PI) * -50.0
		var travel_dir = (_travel_end_pos - _travel_start_pos).normalized()
		if travel_dir.length_squared() > 0.01:
			orbit_rocket.rotation = atan2(travel_dir.y, travel_dir.x) - PI * 0.5
		orbit_rocket.position = arc_pos + _shake_offset
	else:
		var offset = Vector2(cos(_orbit_angle), sin(_orbit_angle)) * ORBIT_RADIUS_PX
		orbit_rocket.position = offset
		orbit_rocket.rotation = _orbit_angle + PI
	if camera_3d and asteroid_pivot:
		if _phase in [Phase.EARTH_ORBIT, Phase.TRAVEL]:
			orbit_root.position = camera_3d.unproject_position(_earth_pivot.global_position)
		else:
			orbit_root.position = camera_3d.unproject_position(asteroid_pivot.global_position)
	var orbit_utils3 = OrbitVisuals
	orbit_utils3.update_heading_line(orbit_heading, orbit_rocket)

func _build_minerals_list() -> void:
	if minerals_list == null:
		return
	for child in minerals_list.get_children():
		child.queue_free()
	var resource_yield = ResourceYield
	var cargo_multiplier = RocketSpecs.get_cargo_multiplier(_current_rocket_id)
	var yield_data = resource_yield.get_yield_for_target(_current_target_id, _current_target_type, 1, cargo_multiplier)
	var minerals: Dictionary = yield_data.get("minerals", {})
	var capacity = int(yield_data.get("capacity", 0))
	minerals_title.text = "Minerals Available"
	minerals_summary.text = "Asteroid Level 1 • Mineable: %d%% • %s units" % [
		int(round(float(yield_data.get("mineable_pct", 0.1)) * 100.0)),
		NumberFormat.commas(str(capacity))
	]
	var panel_style = PanelStyle
	for name in resource_yield.MINERALS:
		if not minerals.has(name):
			continue
		var row: HBoxContainer = ResourceValueRowScene.instantiate()
		var name_lbl: Label = row.get_node("NameLabel")
		name_lbl.text = str(name)
		panel_style.apply_body(name_lbl)
		var amount_lbl: Label = row.get_node("ValueLabel")
		amount_lbl.text = NumberFormat.commas(str(minerals.get(name, 0)))
		panel_style.apply_muted(amount_lbl)
		minerals_list.add_child(row)

func _generate_target_asteroid(target_id: String) -> void:
	if asteroid_mesh == null:
		return
	var builder = ProceduralBodyBuilder
	builder.build_asteroid(asteroid_mesh, target_id, 0.72, 0.96, Color(0.35, 0.35, 0.35))

func _generate_earth() -> void:
	if _earth_mesh == null:
		return
	var builder = ProceduralBodyBuilder
	builder.build_earth(_earth_mesh, "earth:%s" % _current_target_id, Color(0.1, 0.2, 0.4))
	_apply_earth_alpha()

func _apply_earth_alpha() -> void:
	if _earth_mesh == null:
		return
	var material: StandardMaterial3D = _earth_mesh.material_override
	if material:
		material.albedo_color.a = _earth_alpha

func _set_orbit_rocket_visual(rocket_id: String) -> void:
	if orbit_rocket == null:
		return
	var helper = RocketSpriteHelper
	helper.apply_orbit_sprite(orbit_rocket, rocket_id)

func _advance_to_preview() -> void:
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var scene_manager = null
	if tree.current_scene:
		scene_manager = tree.current_scene.get_node_or_null("SceneManager")
	if scene_manager and scene_manager.has_method("change_to_scene"):
		scene_manager.change_to_scene(PREVIEW_SCENE_PATH)
	else:
		tree.change_scene_to_file(PREVIEW_SCENE_PATH)

func _build_science_panel() -> void:
	# Build a science image panel that sits over the transit UI.
	# It is hidden initially and revealed during the TRAVEL phase.
	var canvas = $CanvasLayer
	if canvas == null:
		return
	_science_panel = PanelContainer.new()
	_science_panel.name = "SciencePanel"
	_science_panel.visible = false
	_science_panel.modulate.a = 0.0
	_science_panel.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_science_panel.anchor_top = 0.0
	_science_panel.anchor_bottom = 0.0
	_science_panel.anchor_left = 0.5
	_science_panel.anchor_right = 0.5
	_science_panel.offset_left = -220
	_science_panel.offset_right = 220
	_science_panel.offset_top = 24
	_science_panel.offset_bottom = 24

	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.06, 0.08, 0.16, 0.92)
	style.border_color = Color(0.30, 0.50, 0.90, 0.8)
	style.border_width_left = 1
	style.border_width_right = 1
	style.border_width_top = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 10
	style.corner_radius_top_right = 10
	style.corner_radius_bottom_left = 10
	style.corner_radius_bottom_right = 10
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 12
	style.content_margin_bottom = 12
	_science_panel.add_theme_stylebox_override("panel", style)

	var vbox = VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	_science_panel.add_child(vbox)

	var header = Label.new()
	header.text = "INCOMING TELESCOPE DATA"
	header.add_theme_color_override("font_color", Color(0.45, 0.70, 1.0))
	header.add_theme_font_size_override("font_size", 11)
	header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(header)

	_science_image = TextureRect.new()
	_science_image.custom_minimum_size = Vector2(320, 200)
	_science_image.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
	_science_image.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_science_image.visible = false
	vbox.add_child(_science_image)

	_science_caption = Label.new()
	_science_caption.text = "Tuning telescope... connecting to target..."
	_science_caption.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_science_caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_science_caption.add_theme_color_override("font_color", Color(0.72, 0.78, 0.92))
	_science_caption.add_theme_font_size_override("font_size", 12)
	vbox.add_child(_science_caption)

	canvas.add_child(_science_panel)

func _apply_responsive_layout() -> void:
	var viewport = get_viewport().get_visible_rect().size
	if viewport == Vector2.ZERO:
		return
	var compact = viewport.x < 1360.0 or viewport.y < 860.0
	var edge_margin = 16.0
	var panel_width = clamp(viewport.x * (0.33 if compact else 0.28), 300.0, 420.0)
	var panel_height = 120.0
	if travel_panel:
		travel_panel.anchor_left = 0.0
		travel_panel.anchor_right = 0.0
		travel_panel.anchor_top = 0.0
		travel_panel.anchor_bottom = 0.0
		travel_panel.offset_left = edge_margin
		travel_panel.offset_top = 96.0
		travel_panel.offset_right = edge_margin + panel_width
		travel_panel.offset_bottom = 96.0 + panel_height
	if _science_panel:
		var science_width = clamp(viewport.x * (0.72 if compact else 0.45), 320.0, 560.0)
		var science_bottom = 24.0
		if compact:
			science_bottom = 12.0
		_science_panel.anchor_left = 0.5
		_science_panel.anchor_right = 0.5
		_science_panel.anchor_top = 1.0
		_science_panel.anchor_bottom = 1.0
		_science_panel.offset_left = -science_width * 0.5
		_science_panel.offset_right = science_width * 0.5
		_science_panel.offset_top = -260.0 - science_bottom
		_science_panel.offset_bottom = -science_bottom
	if _science_image:
		_science_image.custom_minimum_size = Vector2(
			clamp(viewport.x * (0.56 if compact else 0.28), 280.0, 360.0),
			clamp(viewport.y * 0.24, 160.0, 220.0)
		)

func _show_science_panel() -> void:
	if _science_panel == null or _science_image_requested:
		return
	_science_image_requested = true
	_science_panel.visible = true
	var t = create_tween()
	t.tween_property(_science_panel, "modulate:a", 1.0, 0.8).set_delay(1.5)
	var dataset = "Active Asteroids Programme"
	if _current_target_type == "planet" or _current_target_type == "tess":
		dataset = "NASA TESS dataset"
	var label_text = _current_target_label if _current_target_label != "" else "Target %s" % _current_target_id
	_science_caption.text = "Observing: %s\nData source: %s" % [label_text, dataset]
	if _current_target_id != "":
		_fetch_science_image(_current_target_id, _current_target_type)

func _fetch_science_image(target_id: String, target_type: String) -> void:
	var image_url := ""
	if target_type == "planet" or target_type == "tess":
		image_url = "https://api.starsailors.space/storage/v1/object/public/anomalies/%s/Sector1.png" % target_id
	else:
		image_url = "https://api.starsailors.space/storage/v1/object/public/telescope/telescope-active-asteroids/%s.png" % target_id
	_science_http = HTTPRequest.new()
	add_child(_science_http)
	_science_http.request_completed.connect(_on_science_image_loaded)
	_science_http.request(image_url)

func _on_science_image_loaded(result: int, _response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if result != OK or body.is_empty():
		if _science_caption:
			_science_caption.text += "\n(Image unavailable — signal too weak)"
		return
	var img = Image.new()
	var err = img.load_png_from_buffer(body)
	if err != OK:
		err = img.load_jpg_from_buffer(body)
	if err != OK:
		if _science_caption:
			_science_caption.text += "\n(Unable to decode image)"
		return
	var tex = ImageTexture.create_from_image(img)
	if _science_image and is_instance_valid(_science_image):
		_science_image.texture = tex
		_science_image.visible = true

func _on_back_pressed() -> void:
	_advance_to_preview()

func _on_mine_pressed() -> void:
	# This scene is a transit presentation; move into the interactive preview
	# where mining gameplay is handled.
	_advance_to_preview()

func _update_shake(delta: float) -> void:
	if not _shake_active:
		return
	_shake_elapsed += delta
	if _shake_elapsed >= SHAKE_DURATION:
		_shake_active = false
		_shake_offset = Vector2.ZERO
		return
	var decay = 1.0 - (_shake_elapsed / SHAKE_DURATION)
	_shake_offset = Vector2(
		sin(_shake_elapsed * 40.0) * SHAKE_MAGNITUDE * decay,
		cos(_shake_elapsed * 29.0) * SHAKE_MAGNITUDE * decay
	)

func _enhance_travel_dashboard() -> void:
	var vbox = travel_panel.get_node_or_null("TravelMargin/TravelContent")
	if vbox == null:
		return
	var panel_style = PanelStyle
	_travel_eta_label = Label.new()
	_travel_eta_label.text = "ETA: --:--"
	panel_style.apply_body(_travel_eta_label)
	vbox.add_child(_travel_eta_label)
	_travel_info_label = Label.new()
	_travel_info_label.text = "Vessel: %s" % (_current_rocket_id if _current_rocket_id != "" else "—")
	panel_style.apply_muted(_travel_info_label)
	vbox.add_child(_travel_info_label)

func _build_shop_button() -> void:
	var canvas = $CanvasLayer
	if canvas == null:
		return
	_shop_button = Button.new()
	_shop_button.name = "ShipStatusButton"
	_shop_button.text = "Ship Status"
	_shop_button.custom_minimum_size = Vector2(130, 44)
	_shop_button.visible = false
	var panel_style = PanelStyle
	panel_style.apply_button(_shop_button, false)
	_shop_button.anchor_left = 1.0
	_shop_button.anchor_right = 1.0
	_shop_button.anchor_top = 0.0
	_shop_button.anchor_bottom = 0.0
	_shop_button.offset_left = -166.0
	_shop_button.offset_right = -24.0
	_shop_button.offset_top = 24.0
	_shop_button.offset_bottom = 68.0
	canvas.add_child(_shop_button)
	_shop_button.pressed.connect(_on_ship_status_pressed)

func _on_ship_status_pressed() -> void:
	_ship_status_visible = not _ship_status_visible
	if _ship_status_panel == null:
		_build_ship_status_panel()
	if _ship_status_panel:
		_ship_status_panel.visible = _ship_status_visible

func _build_ship_status_panel() -> void:
	var canvas = $CanvasLayer
	if canvas == null:
		return
	_ship_status_panel = PanelContainer.new()
	_ship_status_panel.name = "ShipStatusPanel"
	_ship_status_panel.visible = false
	_ship_status_panel.anchor_left = 1.0
	_ship_status_panel.anchor_right = 1.0
	_ship_status_panel.anchor_top = 0.0
	_ship_status_panel.anchor_bottom = 0.0
	_ship_status_panel.offset_left = -300.0
	_ship_status_panel.offset_right = -24.0
	_ship_status_panel.offset_top = 80.0
	_ship_status_panel.offset_bottom = 80.0
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.06, 0.08, 0.16, 0.94)
	style.border_color = Color(0.28, 0.88, 0.96, 0.8)
	style.border_width_left = 1
	style.border_width_right = 1
	style.border_width_top = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 10
	style.corner_radius_top_right = 10
	style.corner_radius_bottom_left = 10
	style.corner_radius_bottom_right = 10
	style.content_margin_left = 14
	style.content_margin_right = 14
	style.content_margin_top = 12
	style.content_margin_bottom = 12
	_ship_status_panel.add_theme_stylebox_override("panel", style)
	var vbox = VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)
	_ship_status_panel.add_child(vbox)
	var title = Label.new()
	title.text = "SHIP STATUS"
	title.add_theme_color_override("font_color", Color(0.28, 0.88, 0.96))
	title.add_theme_font_size_override("font_size", 12)
	vbox.add_child(title)
	vbox.add_child(HSeparator.new())
	var vessel_lbl = Label.new()
	vessel_lbl.text = "Vessel: %s" % (_current_rocket_id if _current_rocket_id != "" else "—")
	vessel_lbl.add_theme_color_override("font_color", Color(0.85, 0.87, 0.92))
	vessel_lbl.add_theme_font_size_override("font_size", 13)
	vbox.add_child(vessel_lbl)
	var rooms_header = Label.new()
	rooms_header.text = "Rooms:"
	rooms_header.add_theme_color_override("font_color", Color(0.60, 0.65, 0.78))
	rooms_header.add_theme_font_size_override("font_size", 12)
	vbox.add_child(rooms_header)
	var layout = RoomCatalog.create_layout_for_rocket_type(_current_rocket_id)
	var installed = RoomCatalog.get_installed_rooms(layout)
	for room_inst in installed:
		var room_def = RoomCatalog.get_room(str(room_inst.get("room_id", "")))
		var row = Label.new()
		row.text = "  • %s" % room_def.get("name", room_inst.get("room_id", "?"))
		row.add_theme_color_override("font_color", Color(0.72, 0.78, 0.92))
		row.add_theme_font_size_override("font_size", 12)
		vbox.add_child(row)
	canvas.add_child(_ship_status_panel)

func _on_return_home_pressed() -> void:
	# Keep behavior deterministic even if player presses return during transit preview:
	# jump to interactive preview where return flow is available.
	_advance_to_preview()
