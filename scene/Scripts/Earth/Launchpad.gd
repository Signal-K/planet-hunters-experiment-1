
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
	connect_launch_button()

func connect_launch_button() -> void:
	_launch_button.connect_launch_button()

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
	# Show selector panel again after reset so user can create new rockets
	_show_selector_panel()

func clear_rockets() -> void:
	var nodes = get_tree().get_nodes_in_group("rocket")
	for n in nodes:
		if is_instance_valid(n):
			n.queue_free()
	AppLogger.d("Launchpad: cleared rockets from scene")
	# hide standalone launch button when rockets are cleared
	_launch_button.hide_launch_button()
