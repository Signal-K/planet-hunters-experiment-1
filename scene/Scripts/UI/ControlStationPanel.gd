extends Control

signal panel_closed

const PREVIEW_SCENE := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")

const MINERAL_ABBREV := {
	"Iron": "Fe",
	"Nickel": "Ni",
	"Cobalt": "Co",
	"Platinum": "Pt",
	"Silicates": "SiO",
	"Rare Earth Elements": "REE",
	"Water Ice": "H2O",
	"Titanium": "Ti",
	"Chromium": "Cr",
	"Manganese": "Mn",
}

const STORY_STEPS := [
	{"code": "01", "title": "First Contact", "description": "Run the first guided mining loop and learn the return and debrief cadence."},
	{"code": "02", "title": "Contract Upgrade", "description": "Add the fleet hub, route the second rocket, and start managing contractor-backed missions."},
	{"code": "03", "title": "Candidate Review", "description": "Bring TESS candidates into the pipeline and use annotation to unlock trustworthy travel."},
	{"code": "04", "title": "Free Operations", "description": "Operate in generated jobs, handle cooldowns, and keep missions cycling after authored beats end."},
]

const MAX_MINERAL_CHIPS := 3

@onready var background: ColorRect = $Background
@onready var legacy_root: Control = $RootHBox

var _view_mode := "active"
var _shell: PanelContainer
var _main_stack: HBoxContainer
var _left_column: VBoxContainer
var _center_column: VBoxContainer
var _right_column: VBoxContainer
var _mission_list: VBoxContainer
var _story_list: VBoxContainer
var _subtitle_label: Label
var _active_tab_btn: Button
var _story_tab_btn: Button
var _mission_status_label: Label
var _queue_list: VBoxContainer
var _log_list: VBoxContainer
var _footer_tabs: Array[Button] = []

func _ready() -> void:
	if background and not background.gui_input.is_connected(_on_background_input):
		background.gui_input.connect(_on_background_input)
	background.color = Color(0.94, 0.97, 0.97, 0.98)
	if legacy_root:
		legacy_root.visible = false
		legacy_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_build_ui()
	_apply_layout()
	if get_viewport() and not get_viewport().size_changed.is_connected(_apply_layout):
		get_viewport().size_changed.connect(_apply_layout)
	_populate_view()

func _build_ui() -> void:
	_shell = PanelContainer.new()
	_shell.name = "StationShell"
	_shell.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_shell)

	var shell_style := StyleBoxFlat.new()
	shell_style.bg_color = Color(0.97, 0.985, 0.985, 0.99)
	shell_style.border_color = Color(0.80, 0.88, 0.88, 1.0)
	shell_style.set_border_width_all(1)
	shell_style.set_corner_radius_all(0)
	_shell.add_theme_stylebox_override("panel", shell_style)

	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 24)
	margin.add_theme_constant_override("margin_top", 18)
	margin.add_theme_constant_override("margin_right", 24)
	margin.add_theme_constant_override("margin_bottom", 18)
	_shell.add_child(margin)

	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation", 16)
	margin.add_child(root)

	root.add_child(_build_top_strip())
	root.add_child(_build_metrics_row())
	root.add_child(_build_header())

	_main_stack = HBoxContainer.new()
	_main_stack.add_theme_constant_override("separation", 18)
	_main_stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_main_stack.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(_main_stack)

	_left_column = VBoxContainer.new()
	_left_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_left_column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_left_column.add_theme_constant_override("separation", 14)
	_main_stack.add_child(_left_column)

	_center_column = VBoxContainer.new()
	_center_column.custom_minimum_size = Vector2(260, 0)
	_center_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_center_column.add_theme_constant_override("separation", 14)
	_main_stack.add_child(_center_column)

	_right_column = VBoxContainer.new()
	_right_column.custom_minimum_size = Vector2(320, 0)
	_right_column.add_theme_constant_override("separation", 14)
	_main_stack.add_child(_right_column)

	_build_left_column()
	_build_center_column()
	_build_right_column()

func _build_top_strip() -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)

	var dot := Label.new()
	dot.text = "●"
	dot.add_theme_color_override("font_color", Color(0.05, 0.49, 0.43, 1.0))
	dot.add_theme_font_size_override("font_size", 14)
	row.add_child(dot)

	var left := Label.new()
	left.text = "SYSTEM.OPERATIONAL // CORE_NOMINAL"
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.add_theme_color_override("font_color", Color(0.06, 0.45, 0.42, 1.0))
	left.add_theme_font_size_override("font_size", 14)
	row.add_child(left)

	var right := Label.new()
	right.text = "ETHEREAL-01 // SIGNAL: 104.2 MHZ"
	right.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	right.add_theme_color_override("font_color", Color(0.41, 0.43, 0.44, 1.0))
	right.add_theme_font_size_override("font_size", 14)
	row.add_child(right)

	return row

func _build_metrics_row() -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	for metric in [
		{"title": "01 // ORBITAL TRAJECTORY", "value": "▂▆█▄█▅", "tone": Color(0.32, 0.92, 0.86, 1.0)},
		{"title": "02 // CORE TEMPERATURE", "value": "284.5 KELVIN", "tone": Color(0.33, 0.48, 0.10, 1.0)},
		{"title": "03 // VECTOR MATH STRINGS", "value": "Σ(v_1...v_n) = ∫[0,T] (P/m) dt + v_0", "tone": Color(0.50, 0.60, 0.64, 1.0)}
	]:
		row.add_child(_build_metric_card(metric))
	return row

func _build_metric_card(metric: Dictionary) -> Control:
	var card := _make_card(14, 14, Color(0.99, 0.995, 0.995, 1.0), Color(0.85, 0.90, 0.91, 1.0))
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.custom_minimum_size = Vector2(0, 110)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	card.add_child(vbox)

	var title := Label.new()
	title.text = str(metric.get("title", ""))
	title.add_theme_color_override("font_color", Color(0.08, 0.45, 0.40, 1.0))
	title.add_theme_font_size_override("font_size", 13)
	vbox.add_child(title)

	var value := Label.new()
	value.text = str(metric.get("value", ""))
	value.add_theme_color_override("font_color", metric.get("tone", Color.WHITE))
	value.add_theme_font_size_override("font_size", 18)
	vbox.add_child(value)

	return card

func _build_header() -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)

	var title_block := VBoxContainer.new()
	title_block.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_block.add_theme_constant_override("separation", 6)
	row.add_child(title_block)

	var title := Label.new()
	title.text = "CONTROL STATION"
	title.add_theme_color_override("font_color", Color(0.12, 0.18, 0.21, 1.0))
	title.add_theme_font_size_override("font_size", 34)
	title_block.add_child(title)

	_subtitle_label = Label.new()
	_subtitle_label.text = "Fleet telemetry, mission routing, and the transition into Free Operations."
	_subtitle_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_subtitle_label.add_theme_color_override("font_color", Color(0.38, 0.44, 0.46, 1.0))
	_subtitle_label.add_theme_font_size_override("font_size", 14)
	title_block.add_child(_subtitle_label)

	var tab_row := HBoxContainer.new()
	tab_row.add_theme_constant_override("separation", 10)
	row.add_child(tab_row)

	_active_tab_btn = _make_tab_button("ACTIVE", true)
	_active_tab_btn.pressed.connect(func(): _set_view_mode("active"))
	tab_row.add_child(_active_tab_btn)

	_story_tab_btn = _make_tab_button("STORY", false)
	_story_tab_btn.pressed.connect(func(): _set_view_mode("story"))
	tab_row.add_child(_story_tab_btn)

	var close_btn := Button.new()
	close_btn.text = "✕"
	close_btn.custom_minimum_size = Vector2(48, 48)
	_apply_secondary_button(close_btn)
	close_btn.add_theme_font_size_override("font_size", 20)
	close_btn.pressed.connect(_close)
	row.add_child(close_btn)

	return row

func _build_left_column() -> void:
	var card := _make_card(18, 18, Color(0.995, 0.998, 0.998, 1.0), Color(0.84, 0.89, 0.90, 1.0))
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_left_column.add_child(card)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 12)
	card.add_child(vbox)

	_mission_status_label = Label.new()
	_mission_status_label.text = "ACTIVE ROUTES"
	_mission_status_label.add_theme_color_override("font_color", Color(0.08, 0.48, 0.43, 1.0))
	_mission_status_label.add_theme_font_size_override("font_size", 14)
	vbox.add_child(_mission_status_label)

	var scroll := ScrollContainer.new()
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	vbox.add_child(scroll)

	_mission_list = VBoxContainer.new()
	_mission_list.add_theme_constant_override("separation", 14)
	scroll.add_child(_mission_list)

	_story_list = VBoxContainer.new()
	_story_list.visible = false
	_story_list.add_theme_constant_override("separation", 12)
	scroll.add_child(_story_list)

func _build_center_column() -> void:
	_center_column.add_child(_build_visual_card("SCAN_IMAGE_002.X", "Yield image alignment nominal.", 0.0))
	_center_column.add_child(_build_visual_card("SCAN_IMAGE_441.Y", "Inbound frame available for contractor review.", 8.0))

func _build_visual_card(caption: String, footer: String, rotation_deg: float) -> Control:
	var card := _make_card(18, 18, Color(0.97, 0.985, 0.985, 1.0), Color(0.86, 0.91, 0.92, 1.0))
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var vbox := VBoxContainer.new()
	vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_theme_constant_override("separation", 12)
	card.add_child(vbox)

	var canvas := CenterContainer.new()
	canvas.custom_minimum_size = Vector2(0, 210)
	canvas.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(canvas)

	var frame := ColorRect.new()
	frame.custom_minimum_size = Vector2(180, 180)
	frame.color = Color(0.92, 0.98, 0.97, 1.0)
	frame.rotation_degrees = rotation_deg
	canvas.add_child(frame)

	var ring := PanelContainer.new()
	ring.custom_minimum_size = Vector2(132, 132)
	var ring_style := StyleBoxFlat.new()
	ring_style.bg_color = Color(0.10, 0.12, 0.13, 1.0)
	ring_style.border_color = Color(0.78, 0.90, 0.88, 1.0)
	ring_style.set_border_width_all(2)
	ring_style.set_corner_radius_all(66)
	ring.add_theme_stylebox_override("panel", ring_style)
	canvas.add_child(ring)

	var caption_label := Label.new()
	caption_label.text = caption
	caption_label.add_theme_color_override("font_color", Color(0.45, 0.70, 0.66, 1.0))
	caption_label.add_theme_font_size_override("font_size", 12)
	vbox.add_child(caption_label)

	var footer_label := Label.new()
	footer_label.text = footer
	footer_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	footer_label.add_theme_color_override("font_color", Color(0.44, 0.48, 0.50, 1.0))
	footer_label.add_theme_font_size_override("font_size", 13)
	vbox.add_child(footer_label)

	return card

func _build_right_column() -> void:
	var queue_card := _make_card(18, 18, Color(0.99, 0.995, 0.995, 1.0), Color(0.85, 0.89, 0.90, 1.0))
	_right_column.add_child(queue_card)

	var queue_vbox := VBoxContainer.new()
	queue_vbox.add_theme_constant_override("separation", 12)
	queue_card.add_child(queue_vbox)

	var queue_title := Label.new()
	queue_title.text = "CONSTRUCTION QUEUE"
	queue_title.add_theme_color_override("font_color", Color(0.14, 0.18, 0.20, 1.0))
	queue_title.add_theme_font_size_override("font_size", 16)
	queue_vbox.add_child(queue_title)

	_queue_list = VBoxContainer.new()
	_queue_list.add_theme_constant_override("separation", 12)
	queue_vbox.add_child(_queue_list)

	var log_card := _make_card(18, 18, Color(0.96, 0.975, 0.98, 1.0), Color(0.84, 0.89, 0.90, 1.0))
	log_card.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_right_column.add_child(log_card)

	var log_vbox := VBoxContainer.new()
	log_vbox.add_theme_constant_override("separation", 10)
	log_card.add_child(log_vbox)

	var log_title := Label.new()
	log_title.text = "SYSTEM LOG"
	log_title.add_theme_color_override("font_color", Color(0.38, 0.44, 0.46, 1.0))
	log_title.add_theme_font_size_override("font_size", 14)
	log_vbox.add_child(log_title)

	_log_list = VBoxContainer.new()
	_log_list.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_log_list.add_theme_constant_override("separation", 6)
	log_vbox.add_child(_log_list)

	var footer_nav := HBoxContainer.new()
	footer_nav.add_theme_constant_override("separation", 12)
	_right_column.add_child(footer_nav)

	for tab_name in ["TELEMETRY", "DIAGNOSTICS", "MISSIONS"]:
		var button := Button.new()
		button.text = tab_name
		button.custom_minimum_size = Vector2(0, 58)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		apply_footer_button(button, tab_name == "MISSIONS")
		footer_nav.add_child(button)
		_footer_tabs.append(button)

func _make_tab_button(text: String, active: bool) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(120, 42)
	if active:
		_apply_primary_button(button)
	else:
		_apply_secondary_button(button)
	button.add_theme_font_size_override("font_size", 14)
	return button

func apply_footer_button(button: Button, active: bool) -> void:
	if active:
		_apply_primary_button(button)
	else:
		_apply_secondary_button(button)
	button.add_theme_font_size_override("font_size", 13)

func _apply_layout() -> void:
	if _shell == null:
		return
	var vp := get_viewport_rect().size
	var compact := vp.x < 1380.0

	if compact:
		_main_stack.add_theme_constant_override("separation", 14)
		_right_column.custom_minimum_size = Vector2(280, 0)
		_center_column.custom_minimum_size = Vector2(220, 0)
	else:
		_main_stack.add_theme_constant_override("separation", 18)
		_right_column.custom_minimum_size = Vector2(320, 0)
		_center_column.custom_minimum_size = Vector2(260, 0)

func _set_view_mode(mode: String) -> void:
	_view_mode = mode
	if mode == "active":
		_apply_primary_button(_active_tab_btn)
		_apply_secondary_button(_story_tab_btn)
	else:
		_apply_secondary_button(_active_tab_btn)
		_apply_primary_button(_story_tab_btn)
	_populate_view()

func _populate_view() -> void:
	_clear_children(_mission_list)
	_clear_children(_story_list)
	_clear_children(_queue_list)
	_clear_children(_log_list)
	_populate_sidebar_cards()

	var state: Dictionary = RocketsManager.load_state()
	var missions: Array = RocketsManager.get_missions()
	var targets: Array = RocketsManager.get_detected_targets()
	var target_map: Dictionary = {}
	var placed_map: Dictionary = {}

	for target_any in targets:
		if typeof(target_any) != TYPE_DICTIONARY:
			continue
		var target: Dictionary = target_any
		target_map[str(target.get("id", ""))] = str(target.get("label", ""))

	var placed_any = state.get("placed", [])
	if typeof(placed_any) == TYPE_ARRAY:
		for placed_item in placed_any:
			if typeof(placed_item) != TYPE_DICTIONARY:
				continue
			var placed: Dictionary = placed_item
			placed_map[str(placed.get("id", ""))] = str(placed.get("status", ""))

	if _view_mode == "story":
		_subtitle_label.text = "Mission roadmap through authored onboarding and the shift into generated work."
		_mission_status_label.text = "MISSION ROADMAP"
		_mission_list.visible = false
		_story_list.visible = true
		for step in STORY_STEPS:
			_story_list.add_child(_create_story_card(step))
		return

	_subtitle_label.text = "Fleet telemetry, mission routing, and the current return queue."
	_mission_status_label.text = "ACTIVE ROUTES"
	_mission_list.visible = true
	_story_list.visible = false
	if missions.is_empty():
		_mission_list.add_child(_create_empty_state_card())
	else:
		for mission_any in missions:
			if typeof(mission_any) != TYPE_DICTIONARY:
				continue
			var mission: Dictionary = mission_any
			var rocket_id := str(mission.get("rocket_id", ""))
			var target_id := str(mission.get("target_id", mission.get("target", "")))
			var target_type := str(mission.get("target_type", ""))
			var status := str(mission.get("status", placed_map.get(rocket_id, "")))
			if status == "":
				status = "returning" if str(mission.get("goingTo", "")).to_lower() == "home" else "in-orbit"
			var location_any = mission.get("location", [])
			var fallback_target := target_id
			if typeof(location_any) == TYPE_ARRAY:
				var location_list: Array = location_any
				if not location_list.is_empty():
					fallback_target = str(location_list[0])
			var target_label := str(target_map.get(target_id, fallback_target))
			var contractor := _get_contractor_for_mission(mission)
			var eta_seconds := _extract_eta_seconds(mission)
			_mission_list.add_child(_create_mission_card(rocket_id, target_label, target_id, target_type, status, contractor, eta_seconds))

func _populate_sidebar_cards() -> void:
	for item in [
		{"title": "LUNAR HABITATION UNIT", "value": "74%"},
		{"title": "REFINING RIG ALPHA", "value": "32%"},
		{"title": "OXYGEN SCRUBBER V2", "value": "QUEUED"}
	]:
		_queue_list.add_child(_create_queue_row(item))

	for line in [
		"[14:02:01] - ACK_REQ_001_RECEIVED",
		"[14:02:04] - CALIBRATING_THRUST_VECTORS",
		"[14:02:09] - PING: 12ms TO RELAY_STATION_B",
		"[14:02:15] - SHIELD_EFFICIENCY: 98.4%",
		"[14:02:22] - NO_ANOMALIES_DETECTED"
	]:
		var label := Label.new()
		label.text = line
		label.add_theme_color_override("font_color", Color(0.48, 0.52, 0.54, 1.0))
		label.add_theme_font_size_override("font_size", 13)
		_log_list.add_child(label)

func _create_queue_row(item: Dictionary) -> Control:
	var row := VBoxContainer.new()
	row.add_theme_constant_override("separation", 6)

	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 8)
	row.add_child(top)

	var title := Label.new()
	title.text = str(item.get("title", ""))
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.add_theme_color_override("font_color", Color(0.22, 0.24, 0.26, 1.0))
	title.add_theme_font_size_override("font_size", 13)
	top.add_child(title)

	var value := Label.new()
	value.text = str(item.get("value", ""))
	value.add_theme_color_override("font_color", Color(0.08, 0.52, 0.47, 1.0))
	value.add_theme_font_size_override("font_size", 13)
	top.add_child(value)

	var bar := ColorRect.new()
	bar.custom_minimum_size = Vector2(0, 8)
	bar.color = Color(0.88, 0.90, 0.91, 1.0)
	row.add_child(bar)

	var fill := ColorRect.new()
	fill.anchor_right = 0.74 if str(item.get("value", "")).contains("%") else 0.38
	fill.anchor_bottom = 1.0
	fill.color = Color(0.05, 0.52, 0.47, 1.0)
	bar.add_child(fill)

	return row

func _create_story_card(step: Dictionary) -> Control:
	var card := _make_card(18, 18, Color(0.995, 0.998, 0.998, 1.0), Color(0.84, 0.89, 0.90, 1.0))
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	card.add_child(vbox)

	var code := Label.new()
	code.text = "%s // MILESTONE" % str(step.get("code", ""))
	code.add_theme_color_override("font_color", Color(0.08, 0.52, 0.47, 1.0))
	code.add_theme_font_size_override("font_size", 12)
	vbox.add_child(code)

	var title := Label.new()
	title.text = str(step.get("title", ""))
	title.add_theme_color_override("font_color", Color(0.13, 0.18, 0.20, 1.0))
	title.add_theme_font_size_override("font_size", 20)
	vbox.add_child(title)

	var body := Label.new()
	body.text = str(step.get("description", ""))
	body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.add_theme_color_override("font_color", Color(0.40, 0.45, 0.47, 1.0))
	body.add_theme_font_size_override("font_size", 14)
	vbox.add_child(body)

	return card

func _create_empty_state_card() -> Control:
	var card := _make_card(20, 20, Color(0.98, 0.99, 0.99, 1.0), Color(0.84, 0.90, 0.91, 1.0))
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	card.add_child(vbox)

	for config in [
		{"text": "MISSION QUEUE", "size": 12, "color": Color(0.08, 0.52, 0.47, 1.0)},
		{"text": "No missions in progress.", "size": 22, "color": Color(0.13, 0.18, 0.20, 1.0)},
		{"text": "Launch from the Launchpad.", "size": 15, "color": Color(0.36, 0.42, 0.45, 1.0)},
		{"text": "Pick a contractor, arm a rocket, and route a target to start the next run.", "size": 13, "color": Color(0.42, 0.48, 0.50, 1.0)}
	]:
		var label := Label.new()
		label.text = str(config.get("text", ""))
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.add_theme_color_override("font_color", config.get("color", Color.WHITE))
		label.add_theme_font_size_override("font_size", int(config.get("size", 12)))
		vbox.add_child(label)
	return card

func _create_mission_card(
	rocket_id: String,
	target_label: String,
	target_id: String,
	target_type: String,
	rocket_status: String,
	contractor: Dictionary,
	eta_seconds: int
) -> Control:
	var is_returning := rocket_status == "returning"
	var card := _make_card(22, 22, Color(0.995, 0.998, 0.998, 1.0), Color(0.84, 0.89, 0.90, 1.0))

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	card.add_child(row)

	var left := VBoxContainer.new()
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.add_theme_constant_override("separation", 12)
	row.add_child(left)

	var title_row := HBoxContainer.new()
	title_row.add_theme_constant_override("separation", 12)
	left.add_child(title_row)

	var rocket_label := Label.new()
	rocket_label.text = "%s // %s" % [RocketSpecs.get_display_name(rocket_id), "Agile Scout" if rocket_id.contains("2") else "Heavy Freighter"]
	rocket_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	rocket_label.add_theme_color_override("font_color", Color(0.14, 0.18, 0.20, 1.0))
	rocket_label.add_theme_font_size_override("font_size", 24)
	title_row.add_child(rocket_label)

	var manifest := Label.new()
	manifest.text = "ORDER RECEIPT" if not is_returning else "YIELD LOG"
	manifest.add_theme_color_override("font_color", Color(0.08, 0.52, 0.47, 1.0))
	manifest.add_theme_font_size_override("font_size", 13)
	title_row.add_child(manifest)

	var subtitle := Label.new()
	var contractor_name := str(contractor.get("name", "Open Market"))
	subtitle.text = "%s   %s" % ["IN-ORBIT" if not is_returning else "RETURNING", contractor_name]
	subtitle.add_theme_color_override("font_color", Color(0.36, 0.42, 0.45, 1.0))
	subtitle.add_theme_font_size_override("font_size", 14)
	left.add_child(subtitle)

	var info_row := HBoxContainer.new()
	info_row.add_theme_constant_override("separation", 14)
	left.add_child(info_row)

	info_row.add_child(_create_data_pill("COORDINATE LINK" if not is_returning else "ENTRY VECTOR", "41.40338, 2.17403" if not is_returning else "02.14921, 5.11022"))
	info_row.add_child(_create_data_pill("DESTINATION" if not is_returning else "PORT", ("%s Moon" % target_label) if not is_returning else "Ethereal Dock 4"))

	var button_col := VBoxContainer.new()
	button_col.add_theme_constant_override("separation", 10)
	info_row.add_child(button_col)

	var action_button := Button.new()
	action_button.text = "INTERCEPT SYSTEM" if not is_returning else "INBOUND %s" % _format_eta(eta_seconds)
	action_button.custom_minimum_size = Vector2(210, 68)
	if is_returning:
		_apply_secondary_button(action_button)
		action_button.disabled = true
	else:
		_apply_primary_button(action_button)
		action_button.pressed.connect(func(): _resume_mission(rocket_id, target_id, target_type))
	button_col.add_child(action_button)

	var chips := HFlowContainer.new()
	chips.add_theme_constant_override("h_separation", 8)
	chips.add_theme_constant_override("v_separation", 8)
	left.add_child(chips)
	var minerals_any = contractor.get("requested_minerals", {})
	if typeof(minerals_any) == TYPE_DICTIONARY:
		_populate_mineral_chips(chips, minerals_any as Dictionary, is_returning)
	else:
		_populate_mineral_chips(chips, {}, is_returning)

	return card

func _create_data_pill(title_text: String, value_text: String) -> Control:
	var panel := _make_card(16, 16, Color(0.93, 0.95, 0.95, 1.0), Color(0.87, 0.90, 0.91, 1.0))
	panel.custom_minimum_size = Vector2(210, 110)
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	panel.add_child(vbox)

	var title := Label.new()
	title.text = title_text
	title.add_theme_color_override("font_color", Color(0.40, 0.46, 0.48, 1.0))
	title.add_theme_font_size_override("font_size", 12)
	vbox.add_child(title)

	var value := Label.new()
	value.text = value_text
	value.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	value.add_theme_color_override("font_color", Color(0.16, 0.20, 0.21, 1.0))
	value.add_theme_font_size_override("font_size", 18)
	vbox.add_child(value)
	return panel

func _populate_mineral_chips(row: HFlowContainer, minerals: Dictionary, dimmed: bool) -> void:
	if minerals.is_empty():
		var empty_label := Label.new()
		empty_label.text = "open market"
		empty_label.add_theme_color_override("font_color", Color(0.40, 0.52, 0.62, 0.70))
		empty_label.add_theme_font_size_override("font_size", 12)
		row.add_child(empty_label)
		return

	var shown := 0
	for mineral_name in minerals.keys():
		if shown >= MAX_MINERAL_CHIPS:
			var overflow := Label.new()
			overflow.text = "+%d" % (minerals.size() - MAX_MINERAL_CHIPS)
			overflow.add_theme_color_override("font_color", Color(0.40, 0.52, 0.62, 0.70))
			overflow.add_theme_font_size_override("font_size", 11)
			row.add_child(overflow)
			break
		var quantity := int(minerals[mineral_name])
		var abbreviation := str(MINERAL_ABBREV.get(mineral_name, str(mineral_name).substr(0, 3)))
		var chip := PanelContainer.new()
		var chip_style := StyleBoxFlat.new()
		chip_style.bg_color = Color(0.07, 0.50, 0.45, 0.10 if not dimmed else 0.06)
		chip_style.border_color = Color(0.07, 0.50, 0.45, 0.36)
		chip_style.set_border_width_all(1)
		chip_style.set_corner_radius_all(8)
		chip_style.content_margin_left = 10
		chip_style.content_margin_top = 6
		chip_style.content_margin_right = 10
		chip_style.content_margin_bottom = 6
		chip.add_theme_stylebox_override("panel", chip_style)
		chip.modulate = Color(1, 1, 1, 0.72) if dimmed else Color.WHITE
		var label := Label.new()
		label.text = "%s x%d" % [abbreviation, quantity]
		label.add_theme_color_override("font_color", Color(0.07, 0.50, 0.45, 1.0))
		label.add_theme_font_size_override("font_size", 12)
		chip.add_child(label)
		row.add_child(chip)
		shown += 1

func _make_card(pad_x: int, pad_y: int, bg: Color, edge: Color) -> PanelContainer:
	var card := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = edge
	style.set_border_width_all(1)
	style.set_corner_radius_all(22)
	style.shadow_color = Color(0.16, 0.22, 0.24, 0.07)
	style.shadow_size = 18
	style.shadow_offset = Vector2(0, 6)
	style.content_margin_left = pad_x
	style.content_margin_top = pad_y
	style.content_margin_right = pad_x
	style.content_margin_bottom = pad_y
	card.add_theme_stylebox_override("panel", style)
	return card

func _apply_primary_button(button: Button) -> void:
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0.07, 0.55, 0.49, 1.0)
	normal.border_color = Color(0.31, 0.92, 0.84, 0.55)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(18)
	normal.content_margin_left = 18
	normal.content_margin_top = 14
	normal.content_margin_right = 18
	normal.content_margin_bottom = 14
	var hover := normal.duplicate()
	hover.bg_color = normal.bg_color.lightened(0.08)
	var pressed := normal.duplicate()
	pressed.bg_color = normal.bg_color.darkened(0.08)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("focus", hover)
	button.add_theme_color_override("font_color", Color(0.97, 0.99, 0.99, 1.0))
	button.add_theme_color_override("font_hover_color", Color(0.97, 0.99, 0.99, 1.0))
	button.add_theme_color_override("font_pressed_color", Color(0.97, 0.99, 0.99, 1.0))

func _apply_secondary_button(button: Button) -> void:
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0.99, 0.995, 0.995, 1.0)
	normal.border_color = Color(0.76, 0.84, 0.85, 1.0)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(18)
	normal.content_margin_left = 18
	normal.content_margin_top = 14
	normal.content_margin_right = 18
	normal.content_margin_bottom = 14
	var hover := normal.duplicate()
	hover.bg_color = Color(0.96, 0.98, 0.98, 1.0)
	var pressed := normal.duplicate()
	pressed.bg_color = Color(0.93, 0.95, 0.96, 1.0)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("focus", hover)
	button.add_theme_color_override("font_color", Color(0.38, 0.42, 0.44, 1.0))
	button.add_theme_color_override("font_hover_color", Color(0.38, 0.42, 0.44, 1.0))
	button.add_theme_color_override("font_pressed_color", Color(0.38, 0.42, 0.44, 1.0))

func _get_contractor_for_mission(mission: Dictionary) -> Dictionary:
	var selected := RocketsManager.get_trip_selected_contractor()
	if not selected.is_empty():
		return selected.duplicate(true)
	var trip_offer = RocketsManager.get_trip_contract_offer()
	if not trip_offer.is_empty():
		var selected_id := str(trip_offer.get("selected_contractor", ""))
		for contractor_any in trip_offer.get("contractors", []):
			if typeof(contractor_any) != TYPE_DICTIONARY:
				continue
			var contractor: Dictionary = contractor_any
			if str(contractor.get("id", "")) == selected_id:
				return contractor.duplicate(true)
	var starter := RocketsManager.get_starter_selected_contractor()
	if not starter.is_empty():
		return starter.duplicate(true)
	var mission_contractor = mission.get("trip_contractor", {})
	if typeof(mission_contractor) == TYPE_DICTIONARY:
		return (mission_contractor as Dictionary).duplicate(true)
	return {}

func _extract_eta_seconds(mission: Dictionary) -> int:
	var eta_seconds := int(mission.get("eta_seconds", 0))
	if eta_seconds > 0:
		return eta_seconds
	var arrival_time := int(mission.get("arrival_time", 0))
	if arrival_time > 0:
		return maxi(arrival_time - int(Time.get_unix_time_from_system()), 0)
	return 0

func _format_eta(seconds: int) -> String:
	if seconds <= 0:
		return "SOON"
	if seconds < 60:
		return "%ds" % seconds
	var mins := seconds / 60
	if mins < 60:
		return "%dm" % mins
	return "%dh" % (mins / 60)

func _resume_mission(rocket_id: String, target_id: String, target_type: String) -> void:
	RocketsManager.set_preview_target(target_id, target_id, target_type, rocket_id)
	get_tree().change_scene_to_file(PREVIEW_SCENE)

func _clear_children(node: Node) -> void:
	for child in node.get_children():
		child.queue_free()

func _close() -> void:
	panel_closed.emit()
	queue_free()

func _on_background_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		_close()
