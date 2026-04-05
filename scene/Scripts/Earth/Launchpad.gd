
class_name Launchpad extends Structure

const AppLogger = preload("res://Scripts/Utils/Logger.gd")

var TimeHelper = preload("res://Scripts/Earth/TimeHelper.gd")
var RocketSpawner = preload("res://Scripts/Earth/RocketSpawner.gd")
var SelectorManager = preload("res://Scripts/Earth/SelectorManager.gd")
var LaunchpadSelectorPanel = preload("res://Scripts/Earth/LaunchpadSelectorPanel.gd")
var LaunchpadAnomalyFetcher = preload("res://Scripts/Earth/LaunchpadAnomalyFetcher.gd")
var LaunchpadLaunchButton = preload("res://Scripts/Earth/LaunchpadLaunchButton.gd")
var LaunchpadRestorer = preload("res://Scripts/Earth/LaunchpadRestorer.gd")

var _selector_panel := LaunchpadSelectorPanel.new()
var _anomaly_fetcher := LaunchpadAnomalyFetcher.new()
var _launch_button := LaunchpadLaunchButton.new()
var _restorer := LaunchpadRestorer.new()
var _cached_visible_texture_rect := Rect2()
var _cached_texture_rid := RID()

func _ready():
	super._ready()
	structure_name = "Launchpad"
	AppLogger.d("Launchpad initialized: %s" % structure_name)
	set_process_unhandled_input(true)
	
	# Debug: List all children at startup
	AppLogger.d("Launchpad children at startup:")
	for child in get_children():
		AppLogger.d("  - %s (%s)" % [child.name, child.get_class()])

	_selector_panel.setup(self)
	_anomaly_fetcher.setup(self, Callable(_selector_panel, "populate_targets"))
	_launch_button.setup(self, Callable(_selector_panel, "show_selector_panel"))
	_restorer.restore_if_needed(self, _selector_panel, _launch_button)

	# Connect to AppController to respond to rockets reset events
	var root = get_tree().root
	var app_controller = root.find_child("AppController", true, false)
	if app_controller and app_controller.has_signal("rockets_reset"):
		app_controller.rockets_reset.connect(Callable(self, "_on_rockets_reset"))
		AppLogger.d("Launchpad: connected to AppController rockets_reset signal")
	else:
		AppLogger.w("Launchpad: AppController not found or missing rockets_reset signal")

	# Try to connect the Launch button; primary location: separate LaunchHUD scene.
	# If the HUD hasn't been instanced yet (by LaunchpadScene), this can be called
	# again later via `connect_launch_button()` which is public.
	if _is_launchpad_scene():
		call_deferred("_open_launchpad_scene_ui")

func _open_launchpad_scene_ui() -> void:
	_restorer.restore_if_needed(self, _selector_panel, _launch_button)
	center_visual_in_viewport()
	connect_launch_button()
	_show_selector_panel()

func connect_launch_button() -> void:
	_launch_button.connect_launch_button()

func refresh_launch_button_visibility() -> void:
	_launch_button.refresh_visibility()

func center_visual_in_viewport() -> void:
	if not _is_launchpad_scene():
		return
	var visual_rect := get_visual_bounds_rect_in_viewport()
	if visual_rect.size.x <= 0.0:
		return
	var viewport_center_x := _launchpad_viewport_center_x()
	var delta_screen_x := viewport_center_x - visual_rect.get_center().x
	if absf(delta_screen_x) < 1.0:
		return
	var screen_per_world_x := _screen_units_per_world_x()
	if screen_per_world_x <= 0.0001:
		return
	position.x += delta_screen_x / screen_per_world_x

func get_visual_bounds_rect_in_viewport() -> Rect2:
	var sprite := _get_launchpad_sprite()
	if sprite == null or sprite.texture == null:
		return Rect2()
	var local_visible_rect := _get_sprite_visible_local_rect(sprite)
	if local_visible_rect.size.x <= 0.0 or local_visible_rect.size.y <= 0.0:
		return Rect2()
	var transform := sprite.global_transform
	var top_left := _world_to_viewport(transform * local_visible_rect.position)
	var top_right := _world_to_viewport(transform * Vector2(local_visible_rect.end.x, local_visible_rect.position.y))
	var bottom_left := _world_to_viewport(transform * Vector2(local_visible_rect.position.x, local_visible_rect.end.y))
	var bottom_right := _world_to_viewport(transform * local_visible_rect.end)
	var min_x := minf(minf(top_left.x, top_right.x), minf(bottom_left.x, bottom_right.x))
	var max_x := maxf(maxf(top_left.x, top_right.x), maxf(bottom_left.x, bottom_right.x))
	var min_y := minf(minf(top_left.y, top_right.y), minf(bottom_left.y, bottom_right.y))
	var max_y := maxf(maxf(top_left.y, top_right.y), maxf(bottom_left.y, bottom_right.y))
	return Rect2(Vector2(min_x, min_y), Vector2(max_x - min_x, max_y - min_y))

func _get_launchpad_sprite() -> Sprite2D:
	return get_node_or_null("Sprite2D") as Sprite2D

func _get_sprite_visible_local_rect(sprite: Sprite2D) -> Rect2:
	var base_rect := sprite.get_rect()
	var used_rect := _get_visible_texture_rect(sprite.texture)
	if used_rect.size.x <= 0.0 or used_rect.size.y <= 0.0:
		return base_rect
	return Rect2(base_rect.position + used_rect.position, used_rect.size)

func _get_visible_texture_rect(texture: Texture2D) -> Rect2:
	if texture == null:
		return Rect2()
	var rid := texture.get_rid()
	if rid == _cached_texture_rid and _cached_visible_texture_rect.size.x > 0.0:
		return _cached_visible_texture_rect
	var visible_rect := Rect2(Vector2.ZERO, texture.get_size())
	var image := texture.get_image()
	if image != null and not image.is_empty():
		var used_rect := image.get_used_rect()
		if used_rect.size.x > 0 and used_rect.size.y > 0:
			visible_rect = Rect2(used_rect.position, used_rect.size)
	_cached_texture_rid = rid
	_cached_visible_texture_rect = visible_rect
	return visible_rect

func _launchpad_viewport_center_x() -> float:
	var viewport := get_viewport()
	if viewport == null:
		return 960.0
	return viewport.get_visible_rect().get_center().x

func _screen_units_per_world_x() -> float:
	var camera := _active_camera()
	if camera != null:
		return maxf(1.0 / maxf(camera.zoom.x, 0.0001), 0.0001)
	return 1.0

func _world_to_viewport(world_pos: Vector2) -> Vector2:
	var viewport := get_viewport()
	if viewport == null:
		return world_pos
	var camera := _active_camera()
	if camera == null:
		return world_pos
	return ((world_pos - camera.global_position) / camera.zoom) + viewport.get_visible_rect().get_center()

func _active_camera() -> Camera2D:
	var viewport := get_viewport()
	if viewport == null:
		return null
	return viewport.get_camera_2d()

func _can_drop_data(_pos, data):
	return data.has("rocket_id")

func _drop_data(pos, data):
	if data.has("rocket_id"):
		var rocket = Node2D.new()
		rocket.position = to_local(pos)
		rocket.name = data["rocket_id"]
		add_child(rocket)
		rocket.add_to_group("rocket")
		AppLogger.d("Rocket dropped and instantiated at %s" % [rocket.position])

func on_interact():
	super.on_interact()
	preload("res://Scripts/Utils/AppControllerHelper.gd").record_tutorial_action("open_launchpad")
	AppLogger.d("Launchpad clicked: %s" % structure_name)
	
	# Get the SceneManager from the scene tree
	var scene_manager = get_tree().get_first_node_in_group("scene_manager")
	AppLogger.d("Found SceneManager in group: %s" % (scene_manager != null))
	
	if not scene_manager:
		# Try to get from main scene
		var main_scene = get_tree().current_scene
		for child in main_scene.get_children():
			if child is SceneManager:
				scene_manager = child
				break
		AppLogger.d("Found SceneManager as child: %s" % (scene_manager != null))
	
	if scene_manager:
		AppLogger.d("Transitioning to earth_launchpad scene...")
		scene_manager.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
	else:
		AppLogger.w("Launchpad: SceneManager not found, using direct scene change fallback")
		get_tree().change_scene_to_file("res://Scenes/Earth/earth_launchpad.tscn")


func spawn_rocket(rocket_id: String) -> bool:
	return RocketSpawner.spawn(self, rocket_id)


func _hide_selector_panel(hide_primary: bool = false) -> void:
	_selector_panel.hide_selector_panel(hide_primary)

func _show_selector_panel() -> void:
	_selector_panel.show_selector_panel()


# Fetch anomalies from Supabase and update selector panel
func _fetch_anomalies_for_selector():
	_anomaly_fetcher.fetch_for_selector()

# Populate selector panel with detected targets from RocketsManager
func _populate_targets() -> void:
	_selector_panel.populate_targets()

func _ensure_targets_loaded_for_launchpad() -> void:
	# Intentionally no-op: launchpad no longer auto-fetches anomalies.
	# Scanner Station is the source of anomaly discovery/selection.
	return

func _on_rockets_reset() -> void:
	AppLogger.d("Launchpad: rockets reset event received, clearing rockets")
	clear_rockets()
	# Only show selector panel if we are actually in the launchpad scene.
	# Earth base also has a Launchpad node and receives rockets_reset.
	if _is_launchpad_scene():
		_show_selector_panel()

func clear_rockets() -> void:
	var nodes = get_tree().get_nodes_in_group("rocket")
	for n in nodes:
		if is_instance_valid(n):
			n.queue_free()
	AppLogger.d("Launchpad: cleared rockets from scene")
	# hide standalone launch button when rockets are cleared
	_launch_button.hide_launch_button()

func _is_launchpad_scene() -> bool:
	var tree = get_tree()
	if tree == null or tree.current_scene == null:
		return false
	return tree.current_scene.scene_file_path.ends_with("earth_launchpad.tscn")
