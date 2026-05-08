extends Node2D
## Solar system strategic map — standalone scene.
## Visual structure lives in space_map.tscn via @tool nodes (OrbitLine, PlanetIcon,
## MoonOrbit, StarField, CometOrbit) — editor-visible.
## This script handles: viewport scaling, game-state visibility,
## belt target placement, click detection, target popups, and footer updates.

const SpaceMapTargetDialogueScene = preload("res://Scenes/UI/Templates/SpaceMapTargetDialogue.tscn")
const SpaceMapContractorRowScene  = preload("res://Scenes/UI/Templates/SpaceMapContractorRow.tscn")
const AsteroidDetailViewScene     = preload("res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn")
const GalaxyMapNodeScript         = preload("res://Scripts/UI/SpaceMap/GalaxyMapNode.gd")

const RocketsManager      = preload("res://Scripts/Utils/RocketsManager.gd")
const SectorRevealManager = preload("res://Scripts/Utils/SectorRevealManager.gd")
const SceneManager        = preload("res://Scripts/Earth/SceneManager.gd")
const UIManager           = preload("res://Scripts/Earth/UIManager.gd")

const BASE_W := 1920.0
const BASE_H := 1080.0

const BELT_RX := 286.0
const BELT_RY := 219.0

const EARTH_HIT_R  := 30.0
const TARGET_HIT_R := 22.0

var scene_manager: SceneManager
var ui_manager: UIManager

var _targets: Array = []
var _target_positions: Dictionary = {}
var _personal_discoveries: Array = []
var _tess_classifications: Dictionary = {}
var _last_vp_size := Vector2.ZERO

@onready var solar_system:   Node2D         = $SolarSystem
@onready var info_bar:       PanelContainer = $UILayer/InfoBar
@onready var explored_label: Label          = $UILayer/InfoBar/Sections/ExploredObjects/ExploredLabel
@onready var count_label:    Label          = $UILayer/InfoBar/Sections/UnexploredObjects/CountRow/CountLabel
@onready var home_btn:       Button         = $UILayer/InfoBar/Sections/HomeBtn
@onready var galaxy_btn:     Button         = $UILayer/InfoBar/Sections/GalaxyBtn

func _ready() -> void:
	scene_manager = SceneManager.new()
	add_child(scene_manager)
	scene_manager.add_to_group("scene_manager")
	ui_manager = UIManager.new()
	add_child(ui_manager)
	ui_manager.add_to_group("ui_manager")
	call_deferred("_fit_to_viewport")
	set_process_input(true)
	_refresh_targets()
	_rebuild_solar_targets()
	_apply_exploration_visibility()
	_update_info_bar()
	_setup_home_button()
	_setup_galaxy_button()

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
	solar_system.scale    = Vector2(sf, sf)
	solar_system.position = sz * 0.5
	_reposition_info_bar(sz)

func _reposition_info_bar(sz: Vector2) -> void:
	if info_bar == null:
		return
	var bar_h := 96.0
	info_bar.offset_left   = 0.0
	info_bar.offset_top    = sz.y - bar_h
	info_bar.offset_right  = sz.x
	info_bar.offset_bottom = sz.y

# ── Data refresh ──────────────────────────────────────────────────────────────

func _refresh_targets() -> void:
	_targets = RocketsManager.get_detected_targets() if RocketsManager else []
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
		icon.set("label_text",  str(t.get("label", tid)))
		icon.set("icon_radius", 5.0)
		icon.set("icon_color",  Color(1.0, 0.85, 0.25, 1.0) if is_disc \
			else Color(0.55, 0.58, 0.62, 0.85))
		node.add_child(icon)
		game_nd.add_child(node)

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

# ── Info bar footer ───────────────────────────────────────────────────────────

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

# ── Home button ───────────────────────────────────────────────────────────────

func _setup_home_button() -> void:
	_style_nav_button(home_btn, Color(0.28, 0.88, 0.96, 1.0))
	if home_btn:
		home_btn.pressed.connect(_change_scene_to_base)

func _setup_galaxy_button() -> void:
	_style_nav_button(galaxy_btn, Color(0.941, 0.690, 0.188, 1.0))
	if galaxy_btn:
		galaxy_btn.pressed.connect(_change_to_galaxy_map)

func _style_nav_button(btn: Button, col: Color) -> void:
	if btn == null:
		return
	var sn := StyleBoxFlat.new()
	sn.bg_color = Color(0, 0, 0, 0)
	sn.border_color = Color(col.r, col.g, col.b, 0.35)
	sn.set_border_width_all(1)
	sn.content_margin_left = 14; sn.content_margin_right = 14
	sn.content_margin_top = 6;  sn.content_margin_bottom = 6
	var sh := sn.duplicate() as StyleBoxFlat
	sh.bg_color    = Color(col.r, col.g, col.b, 0.10)
	sh.border_color = col
	btn.add_theme_stylebox_override("normal",  sn)
	btn.add_theme_stylebox_override("hover",   sh)
	btn.add_theme_stylebox_override("pressed", sh)
	btn.add_theme_color_override("font_color",       col)
	btn.add_theme_color_override("font_hover_color", col)

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

	var earth := get_node_or_null("SolarSystem/Bodies/Earth") as Node2D
	if earth and local.distance_to(earth.position) <= EARTH_HIT_R:
		_change_scene_to_base()
		return

	for tid in _target_positions.keys():
		var entry: Dictionary = _target_positions[tid]
		if local.distance_to(entry["pos"] as Vector2) <= TARGET_HIT_R:
			_open_target_preview(tid, entry)
			return

# ── Target popup ──────────────────────────────────────────────────────────────

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

func _change_to_galaxy_map() -> void:
	get_tree().change_scene_to_file("res://Scenes/UI/SpaceMap/galaxy_map.tscn")

func _simple_hash(s: String) -> int:
	var h := 0
	for c in s.to_utf8_buffer():
		h = (h * 31 + int(c)) & 0x7FFFFFFF
	return h
