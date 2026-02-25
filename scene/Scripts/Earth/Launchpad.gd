
class_name Launchpad extends Structure

const ACTION_OPEN_LAUNCHPAD := "open_launchpad"
const HINT_OPEN_LAUNCHPAD := "Use the Launchpad to set up a rocket and start a mission."

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
	print("Launchpad initialized: " + structure_name)
	set_process_unhandled_input(true)
	
	# Debug: List all children at startup
	print("Launchpad children at startup:")
	for child in get_children():
		print("  - " + child.name + " (" + child.get_class() + ")")

	_selector_panel.setup(self)
	_anomaly_fetcher.setup(self, Callable(_selector_panel, "populate_targets"))
	_launch_button.setup(self, Callable(_selector_panel, "show_selector_panel"))
	_restorer.restore_if_needed(self, _selector_panel, _launch_button)

	# Connect to AppController to respond to rockets reset events
	var root = get_tree().root
	var app_controller = root.find_child("AppController", true, false)
	if app_controller and app_controller.has_signal("rockets_reset"):
		app_controller.rockets_reset.connect(Callable(self, "_on_rockets_reset"))
		print("Launchpad: connected to AppController rockets_reset signal")
	else:
		print("Launchpad: AppController not found or missing rockets_reset signal")

	# Try to connect the Launch button; primary location: separate LaunchHUD scene.
	# If the HUD hasn't been instanced yet (by LaunchpadScene), this can be called
	# again later via `connect_launch_button()` which is public.
	connect_launch_button()
	_ensure_targets_loaded_for_launchpad()

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
		print("Rocket dropped and instantiated at ", rocket.position)

func on_interact():
	super.on_interact()
	_show_tutorial_hint_once(ACTION_OPEN_LAUNCHPAD, HINT_OPEN_LAUNCHPAD)
	print("Launchpad clicked: " + structure_name)
	
	# Get the SceneManager from the scene tree
	var scene_manager = get_tree().get_first_node_in_group("scene_manager")
	print("Found SceneManager in group: ", scene_manager != null)
	
	if not scene_manager:
		# Try to get from main scene
		var main_scene = get_tree().current_scene
		for child in main_scene.get_children():
			if child is SceneManager:
				scene_manager = child
				break
		print("Found SceneManager as child: ", scene_manager != null)
	
	if scene_manager:
		print("Transitioning to earth_launchpad scene...")
		scene_manager.change_to_scene("res://Scenes/Earth/earth_launchpad.tscn")
	else:
		print("ERROR: SceneManager not found for Launchpad")

func _show_tutorial_hint_once(action_key: String, message: String) -> void:
	preload("res://Scripts/Utils/AppControllerHelper.gd").show_tutorial_hint_once(action_key, message)

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
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var detected = rm.get_detected_targets()
	if detected.size() > 0:
		return
	_fetch_anomalies_for_selector()

func _on_rockets_reset() -> void:
	print("Launchpad: rockets reset event received, clearing rockets")
	clear_rockets()
	# Show selector panel again after reset so user can create new rockets
	_show_selector_panel()

func clear_rockets() -> void:
	var nodes = get_tree().get_nodes_in_group("rocket")
	for n in nodes:
		if is_instance_valid(n):
			n.queue_free()
	print("Launchpad: cleared rockets from scene")
	# hide standalone launch button when rockets are cleared
	_launch_button.hide_launch_button()
