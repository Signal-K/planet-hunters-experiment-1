extends "res://Scenes/Earth/earth_scene_base.gd"

const MissionGuidanceOverlayScene = preload("res://Scenes/UI/Templates/LaunchpadMissionGuidanceOverlay.tscn")
const RoomCatalog = preload("res://Scripts/Utils/RoomCatalog.gd")
const RoomSpriteAtlas = preload("res://Scripts/UI/RoomSpriteAtlas.gd")
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")

var _mission_guidance_id: int = 0
var _mission_guidance_layer: CanvasLayer = null
var _mission_guidance_label: Label = null
var _mission_guidance_pointer: Label = null
var _mission_guidance_active: bool = false
var _inspect_rooms_btn: Button = null
var _default_camera_zoom := Vector2(2.2, 2.2)
var _default_camera_position := Vector2.ZERO
var _camera_zoomed_in := false
var _active_rocket_path := NodePath("")
var _interior_overlay: Node2D = null
var _interior_outline_fill: Polygon2D = null
var _interior_outline_line: Line2D = null

const ROOM_TILE_COLUMNS := 3
const ZOOM_IN_LEVEL := Vector2(1.25, 1.25)

func _ready():
	# Auto-instance the external Launch HUD so the Launch button is available
	# when this scene is loaded. Avoid creating duplicate instances.
	var root_scene = get_tree().current_scene
	if root_scene:
		if not root_scene.get_node_or_null("LaunchHUD"):
			var hud_packed = load("res://Scenes/UI/launch_hud.tscn")
			if hud_packed:
				var hud_inst = hud_packed.instantiate()
				root_scene.add_child(hud_inst)
				print("LaunchpadScene: instanced LaunchHUD")
				# If a Launchpad node exists in this scene, ask it to connect to the HUD button
				var lp = root_scene.get_node_or_null("StructuresLayer/Launchpad")
				if lp and lp.has_method("connect_launch_button"):
					lp.connect_launch_button()
			else:
				print("LaunchpadScene: failed to load launch_hud.tscn")
		else:
			print("LaunchpadScene: LaunchHUD already present, skipping instancing")
	_setup_mission_guidance()
	_setup_room_inspection()
	set_process_unhandled_input(true)

func _process(_delta: float) -> void:
	_update_mission_guidance()
	_refresh_inspect_button_state()
	_validate_zoom_target()

## Earth Launchpad Scene
##
## This scene shows the launchpad area and overrides navigation behavior
## to return to the earth base scene when the back button is pressed.

func _on_back_button_pressed() -> void:
	if _camera_zoomed_in:
		_set_zoom_mode(false)
	print("Launchpad back button pressed - returning to earth base")
	# Navigate specifically back to the earth base scene
	var scene_manager = null
	# 1) Group lookup
	scene_manager = get_tree().get_first_node_in_group("scene_manager")
	# 2) Check current_scene children for a SceneManager instance or a node exposing change_to_scene()
	if scene_manager == null:
		var main = get_tree().current_scene
		if main:
			for c in main.get_children():
				if c is SceneManager:
					scene_manager = c
					break
				if c.has_method("change_to_scene"):
					scene_manager = c
					break
	# 3) Fallback: search the current scene by node name using a safe recursive finder
	if scene_manager == null:
		var root_scene = get_tree().current_scene
		if root_scene:
			scene_manager = _recursive_find_by_name(root_scene, "SceneManager")
	# 4) Last resort: try a global singleton or root child named "SceneManager"
	if scene_manager == null:
		# Check current_scene exists and look for a SceneManager child named 'SceneManager'
		if get_tree().current_scene != null:
			var root_child = get_tree().current_scene.get_node_or_null("SceneManager")
			if root_child:
				scene_manager = root_child
	# Execute navigation if found
	if scene_manager and scene_manager.has_method("change_to_scene"):
		print("LaunchpadScene: navigating back via SceneManager (node=", scene_manager.get_path(), ")")
		scene_manager.change_to_scene("res://Scenes/Earth/earth_base_1.tscn")
	else:
		print("LaunchpadScene: SceneManager not found; falling back to direct scene change")
		# Fallback: directly change the scene file
		if get_tree().has_method("change_scene_to_file"):
			get_tree().change_scene_to_file("res://Scenes/Earth/earth_base_1.tscn")
		else:
			# Older API fallback
			get_tree().change_scene("res://Scenes/Earth/earth_base_1.tscn")

func _recursive_find_by_name(node: Node, target_name: String) -> Node:
	if node.name == target_name:
		return node
	for child in node.get_children():
		var found = _recursive_find_by_name(child, target_name)
		if found:
			return found
	return null

func _setup_mission_guidance() -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	_mission_guidance_id = int(rm.consume_pending_mission_guidance_id())
	if _mission_guidance_id <= 0:
		return
	_mission_guidance_active = true
	set_process(true)
	_mission_guidance_layer = MissionGuidanceOverlayScene.instantiate()
	if _mission_guidance_layer == null:
		return
	add_child(_mission_guidance_layer)
	var mission_panel: PanelContainer = _mission_guidance_layer.get_node_or_null("Panel")
	_mission_guidance_label = _mission_guidance_layer.get_node_or_null("Panel/Margin/MessageLabel")
	_mission_guidance_pointer = _mission_guidance_layer.get_node_or_null("PointerLabel")
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	if mission_panel:
		panel_style.apply_panel(mission_panel)
	if _mission_guidance_label:
		panel_style.apply_body(_mission_guidance_label)

func _update_mission_guidance() -> void:
	if not _mission_guidance_active:
		return
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	if rm.get_launched().size() > 0:
		_clear_mission_guidance()
		return

	var launchpad_root = get_tree().current_scene
	if launchpad_root == null:
		return
	var target_button: Control = null
	var selected_target = str(rm.get_selected_target())
	var rockets = get_tree().get_nodes_in_group("rocket")
	if rockets.is_empty():
		target_button = _find_button_by_text(launchpad_root, "Create")
		_mission_guidance_label.text = "Mission %d: Create a rocket to begin." % _mission_guidance_id
	elif selected_target == "":
		target_button = _find_button_by_text(launchpad_root, "Select")
		_mission_guidance_label.text = "Mission %d: Select a mission target before launch." % _mission_guidance_id
	else:
		target_button = _find_button_by_text(launchpad_root, "Launch")
		_mission_guidance_label.text = "Mission %d: Press Launch to start the mission." % _mission_guidance_id
	_position_mission_pointer(target_button)

func _position_mission_pointer(target_button: Control) -> void:
	if _mission_guidance_pointer == null:
		return
	if target_button == null:
		_mission_guidance_pointer.visible = false
		return
	var rect = target_button.get_global_rect()
	_mission_guidance_pointer.position = Vector2(rect.position.x + rect.size.x * 0.5 - 8.0, rect.position.y - 34.0)
	_mission_guidance_pointer.visible = true

func _find_button_by_text(root: Node, expected_text: String) -> Button:
	if root == null:
		return null
	var expected = expected_text.strip_edges().to_lower()
	var stack := [root]
	while not stack.is_empty():
		var node = stack.pop_back()
		for child in node.get_children():
			if child is Button:
				var txt = str(child.text).strip_edges().to_lower()
				if txt.begins_with(expected):
					return child
			stack.append(child)
	return null

func _clear_mission_guidance() -> void:
	_mission_guidance_active = false
	_mission_guidance_id = 0
	if _mission_guidance_layer and is_instance_valid(_mission_guidance_layer):
		_mission_guidance_layer.queue_free()
	_mission_guidance_layer = null
	_mission_guidance_label = null
	_mission_guidance_pointer = null

func _setup_room_inspection() -> void:
	var camera = get_node_or_null("Camera2D")
	if camera:
		_default_camera_position = camera.position
		_default_camera_zoom = camera.zoom
	var ui_layer = get_node_or_null("UILayer")
	if ui_layer == null:
		return
	_inspect_rooms_btn = Button.new()
	_inspect_rooms_btn.name = "InspectRoomsButton"
	_inspect_rooms_btn.text = "Inspect Rooms"
	_inspect_rooms_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	_inspect_rooms_btn.position = Vector2(24, 24)
	_inspect_rooms_btn.custom_minimum_size = Vector2(170, 46)
	_inspect_rooms_btn.visible = false
	_inspect_rooms_btn.pressed.connect(_on_inspect_rooms_pressed)
	ui_layer.add_child(_inspect_rooms_btn)

func _refresh_inspect_button_state() -> void:
	if _inspect_rooms_btn == null:
		return
	var rocket = _get_primary_rocket()
	_inspect_rooms_btn.visible = rocket != null
	_inspect_rooms_btn.text = "Exit Interior" if _camera_zoomed_in else "Inspect Rooms"

func _on_inspect_rooms_pressed() -> void:
	var rocket = _get_primary_rocket()
	if rocket == null:
		_set_zoom_mode(false)
		return
	_set_zoom_mode(not _camera_zoomed_in, rocket)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if _try_open_inspect_from_click(event.position):
			get_viewport().set_input_as_handled()
			return
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_I:
			_on_inspect_rooms_pressed()
		elif event.keycode == KEY_ESCAPE and _camera_zoomed_in:
			_set_zoom_mode(false)
	if not _camera_zoomed_in:
		return
	if event is InputEventMouseButton and event.pressed:
		var camera = get_node_or_null("Camera2D")
		if camera == null:
			return
		var zoom_step := 0.12
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			camera.zoom = Vector2(
				max(camera.zoom.x - zoom_step, 0.75),
				max(camera.zoom.y - zoom_step, 0.75)
			)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			camera.zoom = Vector2(
				min(camera.zoom.x + zoom_step, _default_camera_zoom.x),
				min(camera.zoom.y + zoom_step, _default_camera_zoom.y)
			)

func _set_zoom_mode(enabled: bool, rocket: Node2D = null) -> void:
	var camera = get_node_or_null("Camera2D")
	if camera == null:
		return
	var tween = create_tween()
	tween.set_trans(Tween.TRANS_SINE)
	tween.set_ease(Tween.EASE_IN_OUT)
	if enabled:
		if rocket == null:
			rocket = _get_primary_rocket()
		if rocket == null:
			return
		_camera_zoomed_in = true
		_active_rocket_path = rocket.get_path()
		_ensure_interior_overlay(rocket)
		var focus_pos = rocket.global_position + Vector2(0, -85)
		tween.parallel().tween_property(camera, "position", focus_pos, 0.35)
		tween.parallel().tween_property(camera, "zoom", ZOOM_IN_LEVEL, 0.35)
		_fade_rocket_to_interior(rocket, tween, true)
	else:
		_camera_zoomed_in = false
		_active_rocket_path = NodePath("")
		tween.parallel().tween_property(camera, "position", _default_camera_position, 0.30)
		tween.parallel().tween_property(camera, "zoom", _default_camera_zoom, 0.30)
		var active_rocket = rocket if rocket != null else _get_overlay_rocket_owner()
		if active_rocket != null:
			_fade_rocket_to_interior(active_rocket, tween, false)
		elif _interior_overlay != null and is_instance_valid(_interior_overlay):
			tween.parallel().tween_property(_interior_overlay, "modulate:a", 0.0, 0.22)

func _validate_zoom_target() -> void:
	if not _camera_zoomed_in:
		return
	var rocket = _get_active_zoom_rocket()
	if rocket == null:
		_set_zoom_mode(false)

func _ensure_interior_overlay(rocket: Node2D) -> void:
	if _interior_overlay != null and is_instance_valid(_interior_overlay):
		_interior_overlay.queue_free()
	_interior_overlay = Node2D.new()
	_interior_overlay.name = "InteriorOverlay"
	_interior_overlay.modulate = Color(1, 1, 1, 0)
	_interior_overlay.z_index = 3
	rocket.add_child(_interior_overlay)
	_build_hull_outline(_interior_overlay)
	_build_rooms(_interior_overlay, _resolve_rocket_type(rocket))

func _build_hull_outline(parent: Node2D) -> void:
	_interior_outline_fill = Polygon2D.new()
	_interior_outline_fill.color = Color(0.08, 0.14, 0.20, 0.88)
	_interior_outline_fill.polygon = PackedVector2Array([
		Vector2(0, -168),
		Vector2(68, -112),
		Vector2(84, 126),
		Vector2(42, 182),
		Vector2(-42, 182),
		Vector2(-84, 126),
		Vector2(-68, -112)
	])
	parent.add_child(_interior_outline_fill)

	_interior_outline_line = Line2D.new()
	_interior_outline_line.width = 3
	_interior_outline_line.default_color = Color(0.42, 0.86, 0.98, 0.95)
	_interior_outline_line.closed = true
	_interior_outline_line.points = PackedVector2Array([
		Vector2(0, -168),
		Vector2(68, -112),
		Vector2(84, 126),
		Vector2(42, 182),
		Vector2(-42, 182),
		Vector2(-84, 126),
		Vector2(-68, -112)
	])
	parent.add_child(_interior_outline_line)

func _build_rooms(parent: Node2D, rocket_type: String) -> void:
	var layout = RoomCatalog.create_layout_for_rocket_type(rocket_type)
	var rooms = RoomCatalog.get_installed_rooms(layout)
	if rooms.is_empty():
		return
	var start := Vector2(-54, -88)
	var step := Vector2(54, 42)
	for i in range(rooms.size()):
		var room = rooms[i]
		var room_id = str(room.get("room_id", ""))
		var row = int(i / ROOM_TILE_COLUMNS)
		var col = int(i % ROOM_TILE_COLUMNS)
		var local_pos = start + Vector2(col * step.x, row * step.y)
		var room_tex = RoomSpriteAtlas.texture_for_room(room_id)
		if room_tex != null:
			var sprite := Sprite2D.new()
			sprite.texture = room_tex
			sprite.position = local_pos
			var w = max(room_tex.get_width(), 1)
			var h = max(room_tex.get_height(), 1)
			sprite.scale = Vector2(44.0 / float(w), 20.0 / float(h))
			parent.add_child(sprite)
		else:
			var fallback := Polygon2D.new()
			fallback.position = local_pos
			fallback.color = Color(0.16, 0.22, 0.34, 0.92)
			fallback.polygon = PackedVector2Array([
				Vector2(-22, -10), Vector2(22, -10), Vector2(22, 10), Vector2(-22, 10)
			])
			parent.add_child(fallback)
		if bool(room.get("offline", false)):
			var stripe := Line2D.new()
			stripe.width = 2
			stripe.default_color = Color(1.0, 0.4, 0.3, 0.95)
			stripe.points = PackedVector2Array([local_pos + Vector2(-20, -8), local_pos + Vector2(20, 8)])
			parent.add_child(stripe)

func _fade_rocket_to_interior(rocket: Node2D, tween: Tween, show_interior: bool) -> void:
	var sprite = _find_primary_sprite(rocket)
	if sprite != null:
		var target_alpha = 0.08 if show_interior else 1.0
		tween.parallel().tween_property(sprite, "modulate:a", target_alpha, 0.25)
	if _interior_overlay != null and is_instance_valid(_interior_overlay):
		var overlay_alpha = 1.0 if show_interior else 0.0
		tween.parallel().tween_property(_interior_overlay, "modulate:a", overlay_alpha, 0.25)

func _get_primary_rocket() -> Node2D:
	var rockets = get_tree().get_nodes_in_group("rocket")
	for node in rockets:
		if node is Node2D and is_instance_valid(node):
			return node
	return null

func _get_active_zoom_rocket() -> Node2D:
	if _active_rocket_path == NodePath(""):
		return _get_primary_rocket()
	var node = get_node_or_null(_active_rocket_path)
	if node is Node2D and is_instance_valid(node):
		return node
	return null

func _get_overlay_rocket_owner() -> Node2D:
	if _interior_overlay == null or not is_instance_valid(_interior_overlay):
		return null
	var parent = _interior_overlay.get_parent()
	if parent is Node2D:
		return parent
	return null

func _find_primary_sprite(node: Node) -> Sprite2D:
	if node == null:
		return null
	if node is Sprite2D:
		return node
	for child in node.get_children():
		var found = _find_primary_sprite(child)
		if found != null:
			return found
	return null

func _resolve_rocket_type(rocket: Node2D) -> String:
	if rocket == null:
		return "starterrocket1"
	var from_name = RocketSpecs.rocket_type_from_id(str(rocket.name)).strip_edges().to_lower()
	if from_name.begins_with("starterrocket"):
		return from_name
	var label = str(rocket.name).strip_edges().to_lower()
	if label.find("starterrocket3") != -1:
		return "starterrocket3"
	if label.find("starterrocket2") != -1:
		return "starterrocket2"
	return "starterrocket1"

func _try_open_inspect_from_click(screen_pos: Vector2) -> bool:
	if _camera_zoomed_in:
		return false
	var rocket = _get_primary_rocket()
	if rocket == null:
		return false
	var world_pos = get_viewport().get_canvas_transform().affine_inverse() * screen_pos
	if not _point_hits_rocket_sprite(rocket, world_pos):
		return false
	_set_zoom_mode(true, rocket)
	return true

func _point_hits_rocket_sprite(node: Node, world_pos: Vector2) -> bool:
	if node == null or not (node is Node2D):
		return false
	if node is Sprite2D:
		var sprite := node as Sprite2D
		if sprite.visible and sprite.texture != null:
			var local_pos = sprite.to_local(world_pos)
			if sprite.get_rect().has_point(local_pos):
				return true
	for child in node.get_children():
		if _point_hits_rocket_sprite(child, world_pos):
			return true
	return false
