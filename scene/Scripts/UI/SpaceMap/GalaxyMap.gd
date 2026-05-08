extends Node2D
## Galaxy map — standalone scene.
## Visual structure is editor-visible via @tool nodes (GalaxyBackground, GalaxyMapNode).
## Clicking Sol opens space_map.tscn (Sol's solar system).
## Clicking a TESS target opens the mission/review flow.

const AsteroidDetailViewScene = preload("res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn")
const GalaxyMapNodeScript     = preload("res://Scripts/UI/SpaceMap/GalaxyMapNode.gd")
const RocketsManager          = preload("res://Scripts/Utils/RocketsManager.gd")

const BASE_W := 1920.0
const BASE_H := 1080.0

const BG_STAR_DATA := {
	"Sol":           {"type": "Yellow Dwarf / G2V", "dist": "0.00 LY", "planets": "8"},
	"AlphaCentauri": {"type": "Yellow Dwarf / G2V", "dist": "4.37 LY", "planets": "?"},
	"Sirius":        {"type": "White / A1V",         "dist": "8.60 LY", "planets": "1"},
	"BarnardsStar":  {"type": "Red Dwarf / M4Ve",    "dist": "5.96 LY", "planets": "1"},
	"Procyon":       {"type": "White / F5IV",         "dist": "11.46 LY","planets": "0"},
	"Vega":          {"type": "Blue-White / A0Va",    "dist": "25.1 LY", "planets": "?"},
	"Altair":        {"type": "White / A7Vn",         "dist": "16.7 LY", "planets": "?"},
	"Fomalhaut":     {"type": "White / A3V",          "dist": "25.1 LY", "planets": "1"},
}

var _planet_targets: Array = []
var _personal_discoveries: Array = []
var _tess_classifications: Dictionary = {}
var _selected_id := "Sol"
var _selected_is_game_target := false
var _last_vp_size := Vector2.ZERO

@onready var galaxy_system: Node2D        = $GalaxySystem
@onready var galaxy_stars:  Node2D        = $GalaxySystem/Stars
@onready var galaxy_targets:Node2D        = $GalaxySystem/GameTargets
@onready var telem_panel:   PanelContainer = $UILayer/TelemetryPanel
@onready var telem_name:    Label          = $UILayer/TelemetryPanel/Row/NameBlock/NameLabel
@onready var telem_sub:     Label          = $UILayer/TelemetryPanel/Row/NameBlock/SubLabel
@onready var telem_type:    Label          = $UILayer/TelemetryPanel/Row/StatsBlock/TypeCol/TypeVal
@onready var telem_dist:    Label          = $UILayer/TelemetryPanel/Row/StatsBlock/DistCol/DistVal
@onready var telem_planets: Label          = $UILayer/TelemetryPanel/Row/StatsBlock/PlanetsCol/PlanetsVal
@onready var action_btn:    Button         = $UILayer/TelemetryPanel/Row/ActionBtn
@onready var home_btn:      Button         = $UILayer/TelemetryPanel/Row/HomeBtn

func _ready() -> void:
	call_deferred("_fit_to_viewport")
	set_process_input(true)
	_refresh_targets()
	_rebuild_galaxy_targets()
	_setup_telemetry_panel()
	_setup_home_button()
	_select_star("Sol", false, {})

func _process(_delta: float) -> void:
	if get_viewport_rect().size != _last_vp_size:
		_fit_to_viewport()

# ── Layout ────────────────────────────────────────────────────────────────────

func _fit_to_viewport() -> void:
	var vp := get_viewport()
	if vp == null: return
	var sz := vp.get_visible_rect().size
	if sz.x <= 0.0 or sz.y <= 0.0: return
	_last_vp_size = sz
	var sf := minf(sz.x / BASE_W, sz.y / BASE_H)
	galaxy_system.scale    = Vector2(sf, sf)
	galaxy_system.position = sz * 0.5
	_reposition_panel(sz)

func _reposition_panel(sz: Vector2) -> void:
	if telem_panel == null: return
	var h := 96.0
	telem_panel.offset_left   = 0.0
	telem_panel.offset_top    = sz.y - h
	telem_panel.offset_right  = sz.x
	telem_panel.offset_bottom = sz.y

# ── Data ──────────────────────────────────────────────────────────────────────

func _refresh_targets() -> void:
	var all := RocketsManager.get_detected_targets() if RocketsManager else []
	_planet_targets = all.filter(func(t): return str(t.get("type","")).to_lower() == "planet")
	_personal_discoveries = _load_personal_discoveries()
	_tess_classifications  = RocketsManager.get_all_tess_classifications()

func _load_personal_discoveries() -> Array:
	if not RocketsManager: return []
	var result: Array = []
	for tid in RocketsManager.load_state().get("discovery_bonus_claimed", {}).keys():
		if RocketsManager.load_state().get("discovery_bonus_claimed", {})[tid]:
			result.append(str(tid))
	return result

func _rebuild_galaxy_targets() -> void:
	for c in galaxy_targets.get_children():
		c.queue_free()
	for t in _planet_targets:
		var tid   := str(t.get("id", ""))
		if tid == "": continue
		var label := str(t.get("label", tid))
		var classified := _tess_classifications.has(tid)

		var h   := _simple_hash(tid)
		var rng := RandomNumberGenerator.new()
		rng.seed = h
		var pos := Vector2(cos(rng.randf_range(0.0, TAU)) * rng.randf_range(360.0, 480.0),
		                   sin(rng.randf_range(0.0, TAU)) * rng.randf_range(360.0, 480.0))

		var node := Node2D.new()
		node.name     = "GT_" + tid.replace("-", "_")
		node.position = pos
		node.set_meta("target_id",   tid)
		node.set_meta("target_data", t)

		var icon := GalaxyMapNodeScript.new()
		icon.set("star_name",       label)
		icon.set("distance_label",  "%.0f AU" % float(t.get("distance_au", 0.0)))
		icon.set("star_color",      Color(0.28, 0.88, 0.96, 1.0))
		icon.set("star_radius",     7.0)
		icon.set("is_candidate",    true)
		icon.set("awaiting_review", not classified)
		node.add_child(icon)
		galaxy_targets.add_child(node)

# ── Star selection ────────────────────────────────────────────────────────────

func _select_star(node_name: String, is_game_target: bool, data: Dictionary) -> void:
	for s in galaxy_stars.get_children():
		s.set("is_selected", false)
	for g in galaxy_targets.get_children():
		g.set("is_selected", false)
	_selected_id             = node_name
	_selected_is_game_target = is_game_target
	if is_game_target:
		for g in galaxy_targets.get_children():
			if g.get_meta("target_id", "") == node_name:
				g.set("is_selected", true)
				break
	else:
		var s := galaxy_stars.get_node_or_null(node_name) as Node2D
		if s: s.set("is_selected", true)
	_update_telemetry(node_name, is_game_target, data)

# ── Telemetry panel ───────────────────────────────────────────────────────────

func _setup_telemetry_panel() -> void:
	if telem_panel == null: return
	var ps := StyleBoxFlat.new()
	ps.bg_color = Color(0.075, 0.078, 0.094, 0.88)
	ps.border_color = Color(0.745, 0.776, 0.882, 0.30)
	ps.border_width_top = 1
	ps.content_margin_left=24; ps.content_margin_right=24
	ps.content_margin_top=10;  ps.content_margin_bottom=10
	telem_panel.add_theme_stylebox_override("panel", ps)

func _setup_home_button() -> void:
	if home_btn == null: return
	const C := Color(0.28, 0.88, 0.96, 1.0)
	var sn := StyleBoxFlat.new()
	sn.bg_color = Color(0, 0, 0, 0)
	sn.border_color = Color(C.r, C.g, C.b, 0.35)
	sn.set_border_width_all(1)
	sn.content_margin_left=14; sn.content_margin_right=14
	sn.content_margin_top=6;   sn.content_margin_bottom=6
	var sh := sn.duplicate() as StyleBoxFlat
	sh.bg_color    = Color(C.r, C.g, C.b, 0.10)
	sh.border_color = C
	home_btn.add_theme_stylebox_override("normal",  sn)
	home_btn.add_theme_stylebox_override("hover",   sh)
	home_btn.add_theme_stylebox_override("pressed", sh)
	home_btn.add_theme_color_override("font_color", C)
	home_btn.pressed.connect(_change_to_base)

func _update_telemetry(node_name: String, is_game_target: bool, data: Dictionary) -> void:
	if telem_name == null: return
	for c in action_btn.pressed.get_connections():
		action_btn.pressed.disconnect(c.callable)

	if is_game_target:
		var label    := str(data.get("label", node_name))
		var dist_au  := float(data.get("distance_au", 0.0))
		var sys_name := str(data.get("star_system_name", label + " System"))
		var tid      := str(data.get("id", ""))
		var awaiting := not _tess_classifications.has(tid)
		var free_ops := RocketsManager.is_free_operations_unlocked()

		telem_name.text = label.to_upper()
		telem_name.add_theme_color_override("font_color", Color(0.28, 0.88, 0.96, 1.0))
		telem_sub.text = sys_name
		telem_sub.add_theme_color_override("font_color", Color(0.28, 0.88, 0.96, 0.60))
		telem_type.text    = "TESS Exoplanet Candidate"
		telem_dist.text    = "%.0f AU" % dist_au
		telem_planets.text = "1"

		if awaiting:
			action_btn.text = "⬡  REVIEW CANDIDATE"
			action_btn.add_theme_color_override("font_color", Color(0.28, 0.88, 0.96, 1.0))
			action_btn.pressed.connect(func():
				_open_annotation_screen(tid, {
					"type": "planet", "label": label,
					"awaiting_review": true, "target_data": data,
				}))
		elif free_ops:
			action_btn.text = "✦  LAUNCH MISSION"
			action_btn.add_theme_color_override("font_color", Color(0.941, 0.690, 0.188, 1.0))
			action_btn.pressed.connect(func():
				RocketsManager.set_preview_target(tid, label, "planet", "")
				get_tree().change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn"))
		else:
			action_btn.text = "⬡  COMPLETE M3 TO UNLOCK"
			action_btn.add_theme_color_override("font_color", Color(0.565, 0.565, 0.592, 0.70))
	else:
		var d := BG_STAR_DATA.get(node_name, {}) as Dictionary
		var display := node_name.replace("BarnardsStar","Barnard's Star").replace("AlphaCentauri","Alpha Centauri")
		var is_sol := (node_name == "Sol")
		var c_name := Color(0.886, 0.757, 0.612, 1.0) if is_sol else Color(0.894, 0.886, 0.894, 1.0)
		telem_name.text = display.to_upper()
		telem_name.add_theme_color_override("font_color", c_name)
		telem_sub.text = "Current Location" if is_sol else "Star System"
		telem_sub.add_theme_color_override("font_color", Color(c_name.r, c_name.g, c_name.b, 0.60))
		telem_type.text    = str(d.get("type",    "-"))
		telem_dist.text    = str(d.get("dist",    "-"))
		telem_planets.text = str(d.get("planets", "-"))

		if is_sol:
			action_btn.text = "◉  SOLAR SYSTEM"
			action_btn.add_theme_color_override("font_color", Color(0.28, 0.88, 0.96, 1.0))
			action_btn.pressed.connect(_change_to_solar_map)
		else:
			action_btn.text = "⬡  UNAVAILABLE"
			action_btn.add_theme_color_override("font_color", Color(0.565, 0.565, 0.592, 0.55))

# ── Input ─────────────────────────────────────────────────────────────────────

func _input(event: InputEvent) -> void:
	if not (event is InputEventMouseButton and event.pressed
			and event.button_index == MOUSE_BUTTON_LEFT):
		return
	_handle_click(event.position)

func _handle_click(screen_pos: Vector2) -> void:
	if galaxy_system == null: return
	var local := galaxy_system.to_local(screen_pos)
	for star in galaxy_stars.get_children():
		if local.distance_to((star as Node2D).position) <= 28.0:
			_select_star(star.name, false, {})
			return
	for gt in galaxy_targets.get_children():
		if local.distance_to((gt as Node2D).position) <= 28.0:
			var tid  := str(gt.get_meta("target_id", ""))
			var data := gt.get_meta("target_data", {}) as Dictionary
			_select_star(tid, true, data)
			return

# ── Annotation overlay ────────────────────────────────────────────────────────

func _open_annotation_screen(target_id: String, entry: Dictionary) -> void:
	var existing := get_node_or_null("CanvasLayer/AnnotationOverlay")
	if existing: existing.queue_free(); return
	var canvas: CanvasLayer = $CanvasLayer
	var overlay := ColorRect.new()
	overlay.name = "AnnotationOverlay"
	overlay.color = Color(0.02, 0.03, 0.08, 0.98)
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	canvas.add_child(overlay)
	var dv = AsteroidDetailViewScene.instantiate()
	overlay.add_child(dv)
	dv.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var td: Dictionary = entry.get("target_data", {})
	if td.is_empty():
		td = {"id": target_id, "label": str(entry.get("label", target_id)), "type": "planet"}
	dv.initialize(td, true)
	if dv.has_signal("back_pressed"):
		dv.back_pressed.connect(func():
			overlay.queue_free()
			_refresh_targets()
			_rebuild_galaxy_targets())

# ── Navigation ────────────────────────────────────────────────────────────────

func _change_to_solar_map() -> void:
	get_tree().change_scene_to_file("res://Scenes/UI/SpaceMap/space_map.tscn")

func _change_to_base() -> void:
	get_tree().change_scene_to_file("res://Scenes/Earth/earth_base_1.tscn")

# ── Utility ───────────────────────────────────────────────────────────────────

func _simple_hash(s: String) -> int:
	var h := 0
	for c in s.to_utf8_buffer():
		h = (h * 31 + int(c)) & 0x7FFFFFFF
	return h
