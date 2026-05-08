extends Node2D
## Solar system strategic map with switchable galaxy view.
##
## Visual structure lives in space_map.tscn via @tool nodes (OrbitLine, PlanetIcon,
## MoonOrbit, StarField, CometOrbit, GalaxyMapNode, GalaxyBackground) — editor-visible.
## This script handles: viewport scaling, view-mode toggling, game-state visibility,
## galaxy target placement, click detection, target popups, and footer updates.

const SpaceMapTargetDialogueScene = preload("res://Scenes/UI/Templates/SpaceMapTargetDialogue.tscn")
const SpaceMapContractorRowScene  = preload("res://Scenes/UI/Templates/SpaceMapContractorRow.tscn")
const AsteroidDetailViewScene     = preload("res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn")
const GalaxyMapNodeScript         = preload("res://Scripts/UI/SpaceMap/GalaxyMapNode.gd")

const RocketsManager      = preload("res://Scripts/Utils/RocketsManager.gd")
const SectorRevealManager = preload("res://Scripts/Utils/SectorRevealManager.gd")
const PanelStyle          = preload("res://Scripts/UI/PanelStyle.gd")
const EarthSceneUIHelper  = preload("res://Scripts/Earth/EarthSceneUIHelper.gd")
const SceneManager        = preload("res://Scripts/Earth/SceneManager.gd")
const UIManager           = preload("res://Scripts/Earth/UIManager.gd")

const BASE_W := 1920.0
const BASE_H := 1080.0

# Belt orbit fractions for solar game targets
const BELT_RX := 286.0
const BELT_RY := 219.0

const EARTH_HIT_R  := 30.0
const TARGET_HIT_R := 22.0

# ── Background star telemetry (display only) ─────────────────────────────────
const BG_STAR_DATA := {
	"Sol":           {"type": "Yellow Dwarf / G2V", "dist": "0.00 LY", "planets": "8",  "age": "4.57 Gyr"},
	"AlphaCentauri": {"type": "Yellow Dwarf / G2V", "dist": "4.37 LY", "planets": "?",  "age": "6.5 Gyr"},
	"Sirius":        {"type": "White / A1V",         "dist": "8.60 LY", "planets": "1",  "age": "0.24 Gyr"},
	"BarnardsStar":  {"type": "Red Dwarf / M4Ve",    "dist": "5.96 LY", "planets": "1",  "age": "10 Gyr"},
	"Procyon":       {"type": "White / F5IV",         "dist": "11.46 LY","planets": "0",  "age": "1.7 Gyr"},
	"Vega":          {"type": "Blue-White / A0Va",    "dist": "25.1 LY", "planets": "?",  "age": "0.455 Gyr"},
	"Altair":        {"type": "White / A7Vn",         "dist": "16.7 LY", "planets": "?",  "age": "1.2 Gyr"},
	"Fomalhaut":     {"type": "White / A3V",          "dist": "25.1 LY", "planets": "1",  "age": "0.44 Gyr"},
}

# ── State ─────────────────────────────────────────────────────────────────────
var scene_manager: SceneManager
var ui_manager: UIManager
var _ui_helper := EarthSceneUIHelper.new()

var _targets: Array = []
var _planet_targets: Array = []        # type=planet from RocketsManager
var _target_positions: Dictionary = {} # solar asteroid targets (belt area)
var _personal_discoveries: Array = []
var _tess_classifications: Dictionary = {}
var _last_vp_size := Vector2.ZERO

var _galaxy_mode := false
var _selected_galaxy_id := "Sol"        # node name or target_id
var _selected_is_game_target := false

# ── Node refs ─────────────────────────────────────────────────────────────────
@onready var solar_system:    Node2D         = $SolarSystem
@onready var galaxy_layer:    Node2D         = $GalaxyLayer
@onready var galaxy_stars:    Node2D         = $GalaxyLayer/Stars
@onready var galaxy_targets:  Node2D         = $GalaxyLayer/GameTargets
@onready var info_bar:        PanelContainer = $UILayer/InfoBar
@onready var explored_label:  Label          = $UILayer/InfoBar/Sections/ExploredObjects/ExploredLabel
@onready var count_label:     Label          = $UILayer/InfoBar/Sections/UnexploredObjects/CountRow/CountLabel
@onready var mode_toggle:     HBoxContainer  = $UILayer/ModeToggle
@onready var solar_btn:       Button         = $UILayer/ModeToggle/SolarBtn
@onready var galaxy_btn:      Button         = $UILayer/ModeToggle/GalaxyBtn
@onready var telemetry_panel: PanelContainer = $UILayer/TelemetryPanel
@onready var telem_name:      Label          = $UILayer/TelemetryPanel/Row/NameBlock/NameLabel
@onready var telem_sub:       Label          = $UILayer/TelemetryPanel/Row/NameBlock/SubLabel
@onready var telem_type:      Label          = $UILayer/TelemetryPanel/Row/StatsBlock/TypeCol/TypeVal
@onready var telem_dist:      Label          = $UILayer/TelemetryPanel/Row/StatsBlock/DistCol/DistVal
@onready var telem_planets:   Label          = $UILayer/TelemetryPanel/Row/StatsBlock/PlanetsCol/PlanetsVal
@onready var telem_btn:       Button         = $UILayer/TelemetryPanel/Row/ActionBtn

func _ready() -> void:
	scene_manager = SceneManager.new()
	add_child(scene_manager)
	scene_manager.add_to_group("scene_manager")
	ui_manager = UIManager.new()
	add_child(ui_manager)
	ui_manager.add_to_group("ui_manager")
	_ui_helper.setup(self)
	_ui_helper.setup_buttons()
	call_deferred("_fit_to_viewport")
	set_process_input(true)
	_refresh_targets()
	_rebuild_solar_targets()
	_apply_exploration_visibility()
	_update_info_bar()
	_setup_mode_toggle()
	_setup_telemetry_panel()
	_select_galaxy_star("Sol", false, {})

func _process(_delta: float) -> void:
	if get_viewport_rect().size != _last_vp_size:
		_fit_to_viewport()

# ── Layout ────────────────────────────────────────────────────────────────────

func _fit_to_viewport() -> void:
	var vp := get_viewport()
	if vp == null:
		return
	var sz := vp.get_visible_rect().size
	if sz.x <= 0.0 or sz.y <= 0.0:
		return
	_last_vp_size = sz
	var sf := minf(sz.x / BASE_W, sz.y / BASE_H)
	var center := sz * 0.5
	solar_system.scale  = Vector2(sf, sf); solar_system.position  = center
	galaxy_layer.scale  = Vector2(sf, sf); galaxy_layer.position  = center
	_ui_helper.apply_nav_layout()
	_reposition_bottom_bars()
	_reposition_mode_toggle(sz)

func _reposition_bottom_bars() -> void:
	var sz := get_viewport().get_visible_rect().size
	if sz.x <= 0.0:
		return
	var nav_h := 120.0; var bar_h := 96.0
	var top := sz.y - nav_h - bar_h
	for bar in [info_bar, telemetry_panel]:
		if bar:
			bar.offset_left = 0.0; bar.offset_top   = top
			bar.offset_right = sz.x; bar.offset_bottom = sz.y - nav_h

func _reposition_mode_toggle(sz: Vector2) -> void:
	if mode_toggle == null:
		return
	var w := 420.0; var h := 48.0
	mode_toggle.offset_left  = (sz.x - w) * 0.5
	mode_toggle.offset_top   = 8.0
	mode_toggle.offset_right = (sz.x - w) * 0.5 + w
	mode_toggle.offset_bottom = 8.0 + h

# ── Mode toggle setup ─────────────────────────────────────────────────────────

func _setup_mode_toggle() -> void:
	if solar_btn:
		solar_btn.pressed.connect(func(): _set_galaxy_mode(false))
	if galaxy_btn:
		galaxy_btn.pressed.connect(func(): _set_galaxy_mode(true))
	_apply_mode_toggle_style()

func _apply_mode_toggle_style() -> void:
	const C_ACT  := Color(0.28, 0.88, 0.96, 1.0)
	const C_IDLE := Color(0.565, 0.565, 0.592, 0.80)
	const C_BG   := Color(0.075, 0.078, 0.094, 0.88)
	for btn in [solar_btn, galaxy_btn]:
		if btn == null:
			continue
		var is_active: bool = (btn == solar_btn) if not _galaxy_mode else (btn == galaxy_btn)
		var col := C_ACT if is_active else C_IDLE
		var sn := StyleBoxFlat.new()
		sn.bg_color = C_BG
		sn.border_color = col if is_active else Color(col.r, col.g, col.b, 0.30)
		sn.set_border_width_all(1)
		sn.border_width_bottom = 2 if is_active else 1
		sn.content_margin_left = 16; sn.content_margin_right = 16
		sn.content_margin_top = 8;  sn.content_margin_bottom = 8
		var sh := sn.duplicate() as StyleBoxFlat
		sh.bg_color = Color(col.r, col.g, col.b, 0.12)
		btn.add_theme_stylebox_override("normal", sn)
		btn.add_theme_stylebox_override("hover",  sh)
		btn.add_theme_stylebox_override("pressed",sh)
		btn.add_theme_color_override("font_color", col)

func _set_galaxy_mode(enable: bool) -> void:
	_galaxy_mode = enable
	solar_system.visible  = not enable
	galaxy_layer.visible  = enable
	info_bar.visible      = not enable
	telemetry_panel.visible = enable
	_apply_mode_toggle_style()
	if enable:
		_rebuild_galaxy_targets()
		_select_galaxy_star(_selected_galaxy_id, _selected_is_game_target, {})
	_apply_exploration_visibility()

# ── Telemetry panel setup ─────────────────────────────────────────────────────

func _setup_telemetry_panel() -> void:
	if telemetry_panel == null:
		return
	var ps := StyleBoxFlat.new()
	ps.bg_color = Color(0.075, 0.078, 0.094, 0.88)
	ps.border_color = Color(0.745, 0.776, 0.882, 0.30)
	ps.border_width_top = 1
	ps.content_margin_left = 24; ps.content_margin_right = 24
	ps.content_margin_top  = 10; ps.content_margin_bottom = 10
	telemetry_panel.add_theme_stylebox_override("panel", ps)

func _select_galaxy_star(node_name: String, is_game_target: bool, data: Dictionary) -> void:
	# Deselect all background stars
	for s in galaxy_stars.get_children():
		s.set("is_selected", false)
	# Deselect all game targets
	for g in galaxy_targets.get_children():
		g.set("is_selected", false)

	_selected_galaxy_id        = node_name
	_selected_is_game_target   = is_game_target

	if is_game_target:
		for g in galaxy_targets.get_children():
			if g.get_meta("target_id", "") == node_name:
				g.set("is_selected", true)
				break
	else:
		var star := galaxy_stars.get_node_or_null(node_name) as Node2D
		if star:
			star.set("is_selected", true)

	_update_telemetry(node_name, is_game_target, data)

func _update_telemetry(node_name: String, is_game_target: bool, data: Dictionary) -> void:
	if telem_name == null:
		return

	# Disconnect previous action btn callback
	for c in telem_btn.pressed.get_connections():
		telem_btn.pressed.disconnect(c.callable)

	if is_game_target:
		var label    := str(data.get("label", node_name))
		var dist_au  := float(data.get("distance_au", 0.0))
		var sys_name := str(data.get("star_system_name", label + " System"))
		var tic      := str(data.get("ticId", ""))
		var awaiting := not _tess_classifications.has(str(data.get("id", "")))
		var free_ops := RocketsManager.is_free_operations_unlocked()

		telem_name.text = label.to_upper()
		telem_name.add_theme_color_override("font_color", Color(0.28, 0.88, 0.96, 1.0))
		telem_sub.text  = sys_name
		telem_sub.add_theme_color_override("font_color",  Color(0.28, 0.88, 0.96, 0.60))
		telem_type.text    = "TESS Exoplanet Candidate" if tic != "" else "Planet Target"
		telem_dist.text    = "%.0f AU" % dist_au
		telem_planets.text = "1"

		if awaiting:
			telem_btn.text = "⬡  REVIEW CANDIDATE"
			telem_btn.add_theme_color_override("font_color", Color(0.28, 0.88, 0.96, 1.0))
			telem_btn.pressed.connect(func():
				_open_annotation_screen(str(data.get("id", node_name)), {
					"type": "planet", "label": label,
					"awaiting_review": true, "target_data": data,
				}))
		elif free_ops:
			telem_btn.text = "✦  LAUNCH MISSION"
			telem_btn.add_theme_color_override("font_color", Color(0.941, 0.690, 0.188, 1.0))
			telem_btn.pressed.connect(func():
				RocketsManager.set_preview_target(
					str(data.get("id", node_name)), label, "planet", "")
				if scene_manager:
					scene_manager.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
				else:
					get_tree().change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn"))
		else:
			telem_btn.text = "⬡  COMPLETE M3 TO UNLOCK"
			telem_btn.add_theme_color_override("font_color", Color(0.565, 0.565, 0.592, 0.70))
	else:
		var d := BG_STAR_DATA.get(node_name, {}) as Dictionary
		var display := node_name.replace("BarnardsStar", "Barnard's Star") \
			.replace("AlphaCentauri", "Alpha Centauri")
		telem_name.text = display.to_upper()
		telem_name.add_theme_color_override("font_color", Color(0.886, 0.757, 0.612, 1.0))
		telem_sub.text = "Star System"
		telem_sub.add_theme_color_override("font_color", Color(0.886, 0.757, 0.612, 0.60))
		telem_type.text    = str(d.get("type",    "-"))
		telem_dist.text    = str(d.get("dist",    "-"))
		telem_planets.text = str(d.get("planets", "-"))

		if node_name == "Sol":
			telem_sub.text = "Current Location"
			telem_btn.text = "◉  SOLAR SYSTEM VIEW"
			telem_btn.add_theme_color_override("font_color", Color(0.28, 0.88, 0.96, 1.0))
			telem_btn.pressed.connect(func(): _set_galaxy_mode(false))
		else:
			telem_btn.text = "⬡  UNAVAILABLE"
			telem_btn.add_theme_color_override("font_color", Color(0.565, 0.565, 0.592, 0.55))

# ── Data refresh ──────────────────────────────────────────────────────────────

func _refresh_targets() -> void:
	_targets = RocketsManager.get_detected_targets() if RocketsManager else []
	_planet_targets = _targets.filter(func(t): return str(t.get("type","")).to_lower() == "planet")
	_personal_discoveries = _load_personal_discoveries()
	_tess_classifications = RocketsManager.get_all_tess_classifications()

func _load_personal_discoveries() -> Array:
	if not RocketsManager:
		return []
	var result: Array = []
	var claimed: Dictionary = RocketsManager.load_state().get("discovery_bonus_claimed", {})
	for tid in claimed.keys():
		if claimed[tid]:
			result.append(str(tid))
	return result

# ── Solar game targets (asteroid belt) ───────────────────────────────────────

func _rebuild_solar_targets() -> void:
	var game_nd := get_node_or_null("SolarSystem/Belt/GameTargets") as Node2D
	if game_nd == null:
		return
	for c in game_nd.get_children():
		c.queue_free()
	_target_positions.clear()

	for t in _targets:
		var tid := str(t.get("id", ""))
		if tid == "" or str(t.get("type", "")).to_lower() != "asteroid":
			continue
		var h   := _simple_hash(tid)
		var rng := RandomNumberGenerator.new()
		rng.seed = h
		var angle  := rng.randf_range(0.0, TAU)
		var spread := rng.randf_range(0.88, 1.12)
		var lpos   := Vector2(cos(angle) * BELT_RX * spread, sin(angle) * BELT_RY * spread)
		var is_disc := tid in _personal_discoveries
		_target_positions[tid] = {
			"pos": lpos, "label": str(t.get("label", tid)), "type": "asteroid",
			"is_discovery": is_disc, "awaiting_review": false, "target_data": t,
		}
		var node := Node2D.new()
		node.name = "T_" + tid; node.position = lpos
		node.set_meta("target_id", tid); node.set_meta("is_discovery", is_disc)
		var icon := GalaxyMapNodeScript.new()
		icon.set("label_text",   str(t.get("label", tid)))
		icon.set("icon_radius",  5.0)
		icon.set("icon_color",   Color(1.0, 0.85, 0.25, 1.0) if is_disc \
			else Color(0.55, 0.58, 0.62, 0.85))
		node.add_child(icon)
		game_nd.add_child(node)

# ── Galaxy game targets (TESS planet candidates) ──────────────────────────────

func _rebuild_galaxy_targets() -> void:
	for c in galaxy_targets.get_children():
		c.queue_free()

	for t in _planet_targets:
		var tid   := str(t.get("id", ""))
		if tid == "":
			continue
		var label := str(t.get("label", tid))
		var classified := _tess_classifications.has(tid)
		var awaiting   := not classified

		var h   := _simple_hash(tid)
		var rng := RandomNumberGenerator.new()
		rng.seed = h
		var angle := rng.randf_range(0.0, TAU)
		var dist  := rng.randf_range(360.0, 480.0)
		var lpos  := Vector2(cos(angle) * dist, sin(angle) * dist)

		var node := Node2D.new()
		node.name = "GT_" + tid.replace("-", "_")
		node.position = lpos
		node.set_meta("target_id", tid)
		node.set_meta("target_data", t)

		var icon := GalaxyMapNodeScript.new()
		icon.set("star_name",       label)
		icon.set("distance_label",  "%.0f AU" % float(t.get("distance_au", 0.0)))
		icon.set("star_color",      Color(0.28, 0.88, 0.96, 1.0))
		icon.set("star_radius",     7.0)
		icon.set("is_candidate",    true)
		icon.set("awaiting_review", awaiting)
		node.add_child(icon)
		galaxy_targets.add_child(node)

# ── Exploration visibility ────────────────────────────────────────────────────

func _apply_exploration_visibility() -> void:
	var has_belt := not _targets.is_empty()
	var bodies := get_node_or_null("SolarSystem/Bodies") as Node2D
	if bodies:
		for child in bodies.get_children():
			match child.name:
				"Sol", "Earth": child.modulate = Color(1, 1, 1, 1.0)
				"Mars":         child.modulate = Color(1, 1, 1, 1.0 if has_belt else 0.55)
				_:              child.modulate = Color(1, 1, 1, 0.50)
	for nm in ["Ceres", "Vesta", "Hygiea"]:
		var n := get_node_or_null("SolarSystem/Belt/" + nm)
		if n: n.modulate = Color(1, 1, 1, 1.0 if has_belt else 0.45)

# ── Info bar (solar mode footer) ──────────────────────────────────────────────

func _update_info_bar() -> void:
	if explored_label:
		var disc := _personal_discoveries.size()
		explored_label.text = "Earth  +%d targets" % disc if disc > 0 else "Earth"
	if count_label:
		var unexplored := 0
		for entry in _target_positions.values():
			if not bool(entry.get("is_discovery", false)):
				unexplored += 1
		count_label.text = str(unexplored)

# ── Navigation callbacks (wired by EarthSceneUIHelper) ────────────────────────

func _on_back_button_pressed() -> void:
	if _galaxy_mode:
		_set_galaxy_mode(false)
	else:
		_change_scene_to_base()

func _on_forward_button_pressed() -> void: pass
func _on_menu_button_pressed() -> void:
	preload("res://Scripts/UI/GameNavigationMenu.gd").toggle(self)
func _on_market_button_pressed() -> void:
	if ui_manager: ui_manager.show_panel(UIManager.PanelType.MARKET)
func _on_space_map_button_pressed() -> void: pass
func _on_new_mission_button_pressed() -> void:
	if scene_manager:
		scene_manager.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
	else:
		get_tree().change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn")

# ── Input ─────────────────────────────────────────────────────────────────────

func _input(event: InputEvent) -> void:
	if not (event is InputEventMouseButton
			and event.pressed
			and event.button_index == MOUSE_BUTTON_LEFT):
		return
	_handle_click(event.position)

func _handle_click(screen_pos: Vector2) -> void:
	if solar_system == null:
		return
	var local := solar_system.to_local(screen_pos)

	if _galaxy_mode:
		# Check background stars
		for star in galaxy_stars.get_children():
			var snode := star as Node2D
			if local.distance_to(snode.position) <= 28.0:
				_select_galaxy_star(snode.name, false, {})
				return
		# Check game targets
		for gt in galaxy_targets.get_children():
			var gnode := gt as Node2D
			if local.distance_to(gnode.position) <= 28.0:
				var tid  := str(gnode.get_meta("target_id", ""))
				var data := gnode.get_meta("target_data", {}) as Dictionary
				_select_galaxy_star(tid, true, data)
				return
	else:
		# Earth hit → go back to base
		var earth := get_node_or_null("SolarSystem/Bodies/Earth") as Node2D
		if earth and local.distance_to(earth.position) <= EARTH_HIT_R:
			_change_scene_to_base()
			return
		# Solar game targets
		for tid in _target_positions.keys():
			var entry: Dictionary = _target_positions[tid]
			if local.distance_to(entry["pos"] as Vector2) <= TARGET_HIT_R:
				_open_target_preview(tid, entry)
				return

# ── Target popup (solar view) ─────────────────────────────────────────────────

func _open_target_preview(target_id: String, entry: Dictionary) -> void:
	if bool(entry.get("awaiting_review", false)):
		_open_annotation_screen(target_id, entry)
		return
	var existing := get_node_or_null("CanvasLayer/TargetDialogue")
	if existing: existing.queue_free(); return

	var canvas: CanvasLayer = $CanvasLayer
	var target_label := str(entry.get("label", target_id))
	var target_type  := str(entry.get("type", "asteroid"))
	var is_free_ops  := RocketsManager.is_free_operations_unlocked()

	const C_BG   := Color(0.04, 0.06, 0.12, 0.97)
	const C_CYAN := Color(0.28, 0.88, 0.96, 1.0)
	const C_AMB  := Color(0.941, 0.690, 0.188, 1.0)
	const C_TXT  := Color(0.90, 0.92, 0.95, 1.0)
	const C_MUT  := Color(0.55, 0.60, 0.68, 1.0)

	var backdrop: ColorRect = SpaceMapTargetDialogueScene.instantiate()
	canvas.add_child(backdrop)

	var vp_sz := get_viewport().get_visible_rect().size if get_viewport() else Vector2(1280, 768)
	var panel: PanelContainer = backdrop.get_node("Center/Panel")
	panel.custom_minimum_size = Vector2(clampf(vp_sz.x - 48.0, 320.0, 720.0), 0.0)

	var ps := StyleBoxFlat.new()
	ps.bg_color = C_BG; ps.border_color = C_CYAN
	ps.set_border_width_all(2); ps.set_corner_radius_all(8)
	ps.content_margin_left=24; ps.content_margin_right=24
	ps.content_margin_top=20; ps.content_margin_bottom=20
	panel.add_theme_stylebox_override("panel", ps)

	(backdrop.get_node("Center/Panel/Scroll") as ScrollContainer).custom_minimum_size = \
		Vector2(0.0, clampf(vp_sz.y * 0.70, 240.0, 560.0))
	(backdrop.get_node("Center/Panel/Scroll") as ScrollContainer).horizontal_scroll_mode = \
		ScrollContainer.SCROLL_MODE_DISABLED
	(backdrop.get_node("Center/Panel/Scroll/Body") as VBoxContainer)\
		.add_theme_constant_override("separation", 14)

	var title: Label = backdrop.get_node("Center/Panel/Scroll/Body/HeaderRow/TitleLabel")
	title.text = "%s  %s" % ["☄" if target_type == "asteroid" else "🪐", target_label]
	title.add_theme_font_size_override("font_size", 26)
	title.add_theme_color_override("font_color", C_TXT)

	var close: Button = backdrop.get_node("Center/Panel/Scroll/Body/HeaderRow/CloseButton")
	_style_dlg_button(close, C_CYAN, false)
	close.pressed.connect(func(): backdrop.queue_free())

	(backdrop.get_node("Center/Panel/Scroll/Body/PrimarySeparator") as HSeparator)\
		.add_theme_color_override("separator", Color(C_CYAN.r, C_CYAN.g, C_CYAN.b, 0.3))
	(backdrop.get_node("Center/Panel/Scroll/Body/TypeLabel") as Label).text = \
		"Type: %s" % target_type.capitalize()
	(backdrop.get_node("Center/Panel/Scroll/Body/IdLabel") as Label).text = "ID: %s" % target_id
	(backdrop.get_node("Center/Panel/Scroll/Body/SecondarySeparator") as HSeparator)\
		.add_theme_color_override("separator", Color(C_CYAN.r, C_CYAN.g, C_CYAN.b, 0.2))

	var AppCH = preload("res://Scripts/Utils/AppControllerHelper.gd")
	var app := AppCH.get_instance()
	var level := 1
	if app and app.has_method("get_experience_level"):
		level = int(app.get_experience_level())
	var SubCM = preload("res://Scripts/Utils/SubcontractorManager.gd")
	var relevant: Array = []
	for c in SubCM.get_roster(level):
		if (c as Dictionary).get("bonus", {}).is_empty() or target_type == "asteroid":
			relevant.append(c)

	if not relevant.is_empty():
		var ch: Label = backdrop.get_node("Center/Panel/Scroll/Body/ContractorsHeader")
		ch.text = "AVAILABLE CONTRACTORS"; ch.visible = true
		var cl: VBoxContainer = backdrop.get_node("Center/Panel/Scroll/Body/ContractorsList")
		for c in relevant:
			var row: HBoxContainer = SpaceMapContractorRowScene.instantiate()
			cl.add_child(row)
			(row.get_node("NameLabel") as Label).text = str((c as Dictionary).get("name","Unknown"))
			var on_cd := SubCM.is_on_cooldown(str((c as Dictionary).get("id","")))
			var sl: Label = row.get_node("StatusLabel")
			sl.text = "Cooldown" if on_cd else "Ready"
			sl.add_theme_color_override("font_color", Color(0.9,0.45,0.2) if on_cd else Color(0.3,0.85,0.55))
		(backdrop.get_node("Center/Panel/Scroll/Body/TertiarySeparator") as HSeparator).visible = true

	if is_free_ops:
		var lb: Button = backdrop.get_node("Center/Panel/Scroll/Body/LaunchButton")
		lb.text = "Launch Mission to %s" % target_label; lb.visible = true
		_style_dlg_button(lb, C_AMB, true)
		lb.pressed.connect(func():
			backdrop.queue_free()
			RocketsManager.set_preview_target(target_id, target_label, target_type, "")
			var t := Engine.get_main_loop() as SceneTree
			if t == null: return
			var sm = t.current_scene.get_node_or_null("SceneManager") if t.current_scene else null
			if sm and sm.has_method("change_to_scene"):
				sm.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
			else:
				t.change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn"))
	else:
		var ll: Label = backdrop.get_node("Center/Panel/Scroll/Body/LockedLabel")
		ll.text = "Free Operations locked — complete Mission 4 to launch from the map."
		ll.visible = true

	backdrop.gui_input.connect(func(ev: InputEvent):
		if ev is InputEventMouseButton and ev.pressed:
			if not panel.get_global_rect().has_point(ev.global_position):
				backdrop.queue_free())

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
		td = {"id": target_id, "label": str(entry.get("label", target_id)),
		      "type": str(entry.get("type", "planet"))}
	dv.initialize(td, true)
	if dv.has_signal("back_pressed"):
		dv.back_pressed.connect(func():
			overlay.queue_free()
			_refresh_targets()
			_rebuild_solar_targets()
			_rebuild_galaxy_targets()
			_apply_exploration_visibility()
			_update_info_bar())

# ── Helpers ───────────────────────────────────────────────────────────────────

func _style_dlg_button(btn: Button, col: Color, primary: bool) -> void:
	if btn == null: return
	btn.focus_mode = Control.FOCUS_NONE
	btn.custom_minimum_size = Vector2(0, 54)
	var n := StyleBoxFlat.new()
	n.bg_color = Color(col.r,col.g,col.b,0.12) if primary else Color(0,0,0,0)
	n.border_color = col; n.set_border_width_all(1); n.set_corner_radius_all(27)
	n.content_margin_left=18; n.content_margin_right=18
	var h := n.duplicate() as StyleBoxFlat; h.bg_color = Color(col.r,col.g,col.b,0.22)
	var p := n.duplicate() as StyleBoxFlat; p.bg_color = Color(col.r,col.g,col.b,0.32)
	btn.add_theme_stylebox_override("normal", n)
	btn.add_theme_stylebox_override("hover",  h)
	btn.add_theme_stylebox_override("pressed",p)
	btn.add_theme_color_override("font_color",       col)
	btn.add_theme_color_override("font_hover_color", col)
	btn.add_theme_font_size_override("font_size", 20)

func _change_scene_to_base() -> void:
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null: return
	var sm = tree.current_scene.get_node_or_null("SceneManager") if tree.current_scene else null
	if sm and sm.has_method("change_to_scene"):
		sm.change_to_scene("res://Scenes/Earth/earth_base_1.tscn")
	else:
		tree.change_scene_to_file("res://Scenes/Earth/earth_base_1.tscn")

func _simple_hash(s: String) -> int:
	var h := 0
	for c in s.to_utf8_buffer():
		h = (h * 31 + int(c)) & 0x7FFFFFFF
	return h

# ── Viewport scale helper (used by UILayer repositioning) ─────────────────────

func _reposition_info_bar() -> void:
	_reposition_bottom_bars()
