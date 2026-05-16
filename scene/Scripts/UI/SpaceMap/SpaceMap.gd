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
const TARGET_HIT_R := 32.0

var scene_manager: SceneManager
var ui_manager: UIManager

var _targets: Array = []
var _target_positions: Dictionary = {}
var _personal_discoveries: Array = []
var _tess_classifications: Dictionary = {}
var _last_vp_size := Vector2.ZERO
var _selection_in_progress := false

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
	# UIManager adds FrancBalance HUD — not needed on the map scene
	call_deferred("_fit_to_viewport")
	set_process_input(true)
	_refresh_targets()
	_rebuild_solar_targets()
	_apply_exploration_visibility()
	_update_info_bar()
	_setup_home_button()
	if RocketsManager.is_map_return_mode():
		_setup_selection_mode_ui()
		# AUTO-FIX: If we are on the map in selection mode but tutorial is stuck on 
		# contractor selection, force-record the contractor action so the coach
		# updates to "Select Target".
		var app = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
		if app and app.has_method("get_tutorial_state"):
			var state: Dictionary = app.get_tutorial_state()
			var step: Dictionary = state.get("current_step", {})
			var stage = int(state.get("current_stage", 1))
			if stage == 1 and str(step.get("action_key", "")) == "accept_contractor_offer":
				# Double check if we actually have an active mission target selected or if we are just in the right scene
				# If we are in selection mode, it means we have passed the contractor step.
				print("[SpaceMap] Tutorial stuck on M1 contractor selection - auto-advancing to Target Selection")
				app.record_tutorial_action("accept_contractor_offer")
	else:
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
	if RocketsManager == null:
		return
	# In launchpad selection mode show only the targets valid for this mission stage.
	if RocketsManager.is_map_return_mode():
		var stage := RocketsManager.get_mission_stage()
		_targets = RocketsManager.get_selectable_targets_for_stage(stage)
		if _targets.is_empty():
			_targets = RocketsManager.get_selectable_targets_for_stage()
	else:
		_targets = RocketsManager.get_detected_targets()
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
		icon.set("star_name", str(t.get("label", tid)))
		
		var base_color := Color(1.0, 0.85, 0.25, 1.0) if is_disc else Color(0.55, 0.58, 0.62, 0.85)
		var radius := 5.0
		
		if RocketsManager.is_map_return_mode():
			# Highlight available mission targets
			base_color = Color(0.28, 0.88, 0.96, 1.0) # MISSION CYAN
			radius = 8.0
			icon.set("is_selected", true) # Brackets
			
			# Only show as candidate/awaiting review if it's a TESS candidate or similar
			# For asteroids, they are just targets to be selected.
			var is_candidate = t.get("classification_status", "") == "candidate"
			icon.set("is_candidate", is_candidate)
			if is_candidate:
				var tid_classified = _tess_classifications.has(tid)
				icon.set("awaiting_review", not tid_classified)
			else:
				icon.set("awaiting_review", false)
			
		icon.set("star_radius", radius)
		icon.set("star_color", base_color)
		node.add_child(icon)
		game_nd.add_child(node)

# ── Exploration visibility ────────────────────────────────────────────────────

func _apply_exploration_visibility() -> void:
	var has_belt := not _targets.is_empty()
	var selection_mode := RocketsManager.is_map_return_mode()
	var bodies := get_node_or_null("SolarSystem/Bodies") as Node2D
	if bodies:
		for child in bodies.get_children():
			match child.name:
				"Sol", "Earth":
					child.modulate = Color(1, 1, 1, 1.0)
				"Mars":
					# Hide in selection mode — not a valid M1/M2 target
					child.modulate = Color(1, 1, 1, 0.0 if selection_mode else (1.0 if has_belt else 0.55))
				_:
					child.modulate = Color(1, 1, 1, 0.0 if selection_mode else 0.50)
	for nm in ["Ceres", "Vesta", "Hygiea"]:
		var n := get_node_or_null("SolarSystem/Belt/" + nm)
		if n: n.modulate = Color(1, 1, 1, 1.0 if has_belt else 0.45)
	
	var game_targets := get_node_or_null("SolarSystem/Belt/GameTargets") as Node2D
	if game_targets:
		game_targets.modulate = Color(1, 1, 1, 1.0)
		game_targets.visible = true

	# Hide outer regions (comets, Eris, Oort, Kuiper) in selection mode
	if selection_mode:
		var outer := get_node_or_null("SolarSystem/OuterRegions") as Node2D
		if outer: outer.modulate = Color(1, 1, 1, 0.0)

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

func _setup_selection_mode_ui() -> void:
	# Hide persistent root-level HUD nodes that don't belong on the map,
	# or move them so they don't block target clicks.
	
	var progress = get_tree().root.get_node_or_null("MissionProgressTracker")
	if progress is CanvasItem:
		progress.visible = false
	# Replace footer buttons with a "tap a target" hint + cancel back to launchpad
	if galaxy_btn:
		galaxy_btn.text = "← CANCEL"
		_style_nav_button(galaxy_btn, Color(0.565, 0.565, 0.592, 1.0))
		galaxy_btn.pressed.connect(func():
			RocketsManager.set_map_return_mode(false)
			get_tree().change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn")
		)
	var preselected_id := RocketsManager.get_selected_target()
	if explored_label:
		if preselected_id != "":
			var details := RocketsManager.get_target_details(preselected_id)
			var label := str(details.get("label", details.get("name", preselected_id)))
			explored_label.text = "%s selected — tap another to change" % label
		else:
			explored_label.text = "Tap a target to select it for this mission"
		explored_label.add_theme_color_override("font_color", Color(0.941, 0.690, 0.188, 1.0))
	if count_label:
		count_label.text = ""
	# Add a Confirm button when a target is already selected
	if preselected_id != "":
		var sections: HBoxContainer = get_node_or_null("UILayer/InfoBar/Sections")
		if sections:
			var confirm_btn := Button.new()
			confirm_btn.name = "ConfirmTargetBtn"
			confirm_btn.text = "✓ CONFIRM"
			_style_nav_button(confirm_btn, Color(0.28, 0.88, 0.96, 1.0))
			confirm_btn.pressed.connect(func():
				_select_mission_target(preselected_id)
			)
			sections.add_child(confirm_btn)

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
	if _selection_in_progress:
		var viewport := get_viewport()
		if viewport != null:
			viewport.set_input_as_handled()
		return
	if not (event is InputEventMouseButton
			and event.pressed
			and event.button_index == MOUSE_BUTTON_LEFT):
		return
	_handle_click(event.position)

func _handle_click(screen_pos: Vector2) -> void:
	if solar_system == null:
		return

	var is_selection_mode := RocketsManager.is_map_return_mode()

	# 1. Prioritize Target check (especially in selection mode)
	var belt_targets_node = get_node_or_null("SolarSystem/Belt/GameTargets") as Node2D
	if belt_targets_node:
		for target_node in belt_targets_node.get_children():
			if not (target_node is Node2D):
				continue
			
			var target_global_pos = target_node.global_position
			var dist = screen_pos.distance_to(target_global_pos)
			# Scale the hit radius by the solar system's current view scale
			var effective_radius = (TARGET_HIT_R + 8.0) * solar_system.scale.x
			
			if dist <= effective_radius:
				var tid = str(target_node.get_meta("target_id", ""))
				if tid == "" and target_node.name.begins_with("T_"):
					tid = target_node.name.substr(2)
				
				if tid != "" and _target_positions.has(tid):
					print("[SpaceMap] Target clicked: ", tid)
					if is_selection_mode:
						_select_mission_target(tid)
						return
					_open_target_preview(tid, _target_positions[tid])
					return

	# 2. Earth check (Go Home) - Disabled in selection mode to prevent accidents
	if not is_selection_mode:
		var earth := get_node_or_null("SolarSystem/Bodies/Earth") as Node2D
		if earth:
			var earth_global_pos = earth.global_position
			var dist = screen_pos.distance_to(earth_global_pos)
			var threshold = EARTH_HIT_R * solar_system.scale.x
			if dist <= threshold:
				_change_scene_to_base()
				return
	else:
		# In selection mode, clicking Earth does nothing or shows a "Current Location" hint
		var earth := get_node_or_null("SolarSystem/Bodies/Earth") as Node2D
		if earth:
			var dist = screen_pos.distance_to(earth.global_position)
			if dist <= EARTH_HIT_R * solar_system.scale.x:
				print("[SpaceMap] Earth clicked in selection mode - ignoring")
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
	var is_selection_mode := RocketsManager.is_map_return_mode()
	var is_free_ops  := RocketsManager.is_free_operations_unlocked()

	const C_BG   := Color(0.04, 0.06, 0.12, 0.97)
	const C_CYAN := Color(0.28, 0.88, 0.96, 1.0)
	const C_AMB  := Color(0.941, 0.690, 0.188, 1.0)
	const C_TXT  := Color(0.90, 0.92, 0.95, 1.0)
	const C_MUTED := Color(0.55, 0.62, 0.70, 1.0)

	var backdrop: ColorRect = SpaceMapTargetDialogueScene.instantiate()
	canvas.add_child(backdrop)
	backdrop.name = "TargetDialogue"

	var vp_sz := get_viewport().get_visible_rect().size if get_viewport() else Vector2(1280, 768)
	var panel: PanelContainer = backdrop.get_node("Center/Panel")
	panel.custom_minimum_size = Vector2(clampf(vp_sz.x - 48.0, 320.0, 720.0), 0.0)

	var ps := StyleBoxFlat.new()
	ps.bg_color = C_BG; ps.border_color = C_AMB if is_selection_mode else C_CYAN
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
	
	# Show Mission Relevance
	if is_selection_mode:
		var reqs := RocketsManager.get_current_requested_minerals()
		if not reqs.is_empty():
			var rel_lbl := Label.new()
			rel_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			rel_lbl.add_theme_font_size_override("font_size", 16)
			
			var matches := []
			# Predefined M1 target is always relevant for M1
			if target_id == "mission-1-training-target":
				matches = reqs.keys()
			else:
				# Simple check: asteroids are assumed to have common minerals in early stages
				for m in ["Iron", "Nickel", "Silicates"]:
					if reqs.has(m): matches.append(m)
			
			if not matches.is_empty():
				rel_lbl.text = "MISSION RELEVANT: Contains " + ", ".join(matches)
				rel_lbl.add_theme_color_override("font_color", Color(0.3, 1.0, 0.45)) # Green
			else:
				rel_lbl.text = "NOT IDEAL: Does not match contractor requirements."
				rel_lbl.add_theme_color_override("font_color", Color(1.0, 0.4, 0.3)) # Red
				
			backdrop.get_node("Center/Panel/Scroll/Body").add_child(rel_lbl)
			backdrop.get_node("Center/Panel/Scroll/Body").move_child(rel_lbl, 2)

	(backdrop.get_node("Center/Panel/Scroll/Body/TypeLabel") as Label).text = \
		"Type: %s" % target_type.capitalize()
	(backdrop.get_node("Center/Panel/Scroll/Body/IdLabel") as Label).text = "ID: %s" % target_id
	(backdrop.get_node("Center/Panel/Scroll/Body/SecondarySeparator") as HSeparator)\
		.add_theme_color_override("separator", Color(C_CYAN.r, C_CYAN.g, C_CYAN.b, 0.2))

	var SubCM = preload("res://Scripts/Utils/SubcontractorManager.gd")
	var RocketsMgr = preload("res://Scripts/Utils/RocketsManager.gd")
	var relevant: Array = []
	for c in SubCM.get_roster(int(RocketsMgr.get_mission_stage())):
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

	if is_selection_mode or is_free_ops:
		var lb: Button = backdrop.get_node("Center/Panel/Scroll/Body/LaunchButton")
		lb.text = "Select as Mission Target" if is_selection_mode else ("Launch Mission to %s" % target_label)
		lb.visible = true
		_style_dlg_button(lb, C_AMB, true)
		lb.pressed.connect(func():
			backdrop.queue_free()
			if is_selection_mode:
				RocketsManager.consume_map_return_mode() # Clear the flag
				RocketsManager.select_target(target_id)
				
				# Record tutorial progress
				var app_inst = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
				if app_inst and app_inst.has_method("record_tutorial_action"):
					app_inst.record_tutorial_action("select_launch_target")
				
				get_tree().change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn")
			else:
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

func _select_mission_target(target_id: String) -> void:
	if target_id == "":
		return
	if _selection_in_progress:
		return
	_selection_in_progress = true
	if not RocketsManager.select_target(target_id):
		_selection_in_progress = false
		print("[SpaceMap] Target selection rejected: ", target_id)
		return
	RocketsManager.consume_map_return_mode()
	var viewport := get_viewport()
	if viewport != null:
		viewport.set_input_as_handled()
	var app_inst = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	if app_inst and app_inst.has_method("record_tutorial_action"):
		app_inst.record_tutorial_action("select_launch_target", {"target_id": target_id})
	call_deferred("_return_to_launchpad_after_target_selection", target_id)

func _return_to_launchpad_after_target_selection(target_id: String) -> void:
	print("[SpaceMap] Target selected, returning to launchpad: ", target_id)
	var tree := get_tree()
	if tree == null:
		_selection_in_progress = false
		return
	var err := tree.change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn")
	if err != OK:
		_selection_in_progress = false
		RocketsManager.set_map_return_mode(true)
		print("[SpaceMap] Failed to return to launchpad after target selection: ", err)

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
