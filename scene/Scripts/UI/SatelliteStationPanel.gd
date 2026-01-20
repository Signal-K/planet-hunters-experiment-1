extends Control

signal panel_closed

const INITIAL_LOAD_TIME := 3.0  # seconds for initial load
const REFRESH_LOAD_TIME := 10.0  # seconds for refresh
const MAX_ANOMALIES := 5
const ANOMALY_SET := "active-asteroids"

# Preload the asteroid detail view scene
const AsteroidDetailView = preload("res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn")

var is_loading := false
var load_timer := 0.0
var target_load_time := 0.0
var pending_anomalies := []
var detail_view_active := false  # Track if detail view is showing
var current_mode: String = "asteroids"  # Default mode
var local_only: bool = false

func set_local_only(val: bool) -> void:
	local_only = val

@onready var loading_container: VBoxContainer = $PanelContainer/Panel/VBoxContainer/ContentContainer/LoadingContainer
@onready var anomaly_list: VBoxContainer = $PanelContainer/Panel/VBoxContainer/ContentContainer/AnomalyList
@onready var progress_bar: ProgressBar = $PanelContainer/Panel/VBoxContainer/ContentContainer/LoadingContainer/ProgressBar
@onready var loading_label: Label = $PanelContainer/Panel/VBoxContainer/ContentContainer/LoadingContainer/LoadingLabel
@onready var refresh_button: Button = $PanelContainer/Panel/VBoxContainer/ContentContainer/RefreshContainer/RefreshButton
@onready var status_label: Label = $PanelContainer/Panel/VBoxContainer/ContentContainer/StatusContainer/StatusLabel
@onready var content_container: VBoxContainer = $PanelContainer/Panel/VBoxContainer/ContentContainer
@onready var toggle_switch: Button = $PanelContainer/Panel/VBoxContainer/HeaderContainer/ToggleSwitch

func _ready():
	# Apply consistent panel styling
	_apply_panel_style()
	
	# Connect close button
	var close_button = $PanelContainer/Panel/VBoxContainer/HeaderContainer/CloseButton
	close_button.pressed.connect(_on_close_button_pressed)
	
	# Connect background click to close
	$Background.gui_input.connect(_on_background_input)
	
	# Connect refresh button
	refresh_button.pressed.connect(_on_refresh_pressed)
	
	# Connect toggle switch
	toggle_switch.pressed.connect(_on_toggle_switch_pressed)
	
	# Start initial load
	_start_loading(INITIAL_LOAD_TIME)

	if local_only:
		# Local-only mode (New Mission): show saved annotated PNGs
		var local = _load_local_annotations()
		pending_anomalies = local
		_finish_loading()
	else:
		# Default behavior: fetch anomalies from Supabase
		_fetch_anomalies()

func _process(delta: float):
	if is_loading:
		load_timer += delta
		var progress = clampf(load_timer / target_load_time, 0.0, 1.0)
		progress_bar.value = progress * 100.0
		
		var remaining = max(0, target_load_time - load_timer)
		loading_label.text = "Scanning for asteroids... %.1fs" % remaining
		
		# Check if loading complete
		if load_timer >= target_load_time:
			_finish_loading()

func _start_loading(duration: float):
	is_loading = true
	load_timer = 0.0
	target_load_time = duration
	
	loading_container.visible = true
	anomaly_list.visible = false
	refresh_button.disabled = true
	progress_bar.value = 0.0
	status_label.text = "Status: Scanning..."

func _finish_loading():
	is_loading = false
	loading_container.visible = false
	anomaly_list.visible = true
	refresh_button.disabled = false
	
	# Display the pending anomalies
	_display_anomalies(pending_anomalies)
	pending_anomalies = []

func _fetch_anomalies():
	var supabase = SupabaseClient.get_instance()
	supabase.fetch_anomalies(ANOMALY_SET, MAX_ANOMALIES, _on_anomalies_fetched)


func _load_local_annotations() -> Array:
	"""Scan user://annotations for saved annotated PNGs and return array of anomaly-like dictionaries."""
	var results := []
	var annotations_dir = "user://annotations"
	var dir = DirAccess.open(annotations_dir)
	if dir == null:
		return results

	var fname = dir.get_next()
	while fname != "":
		# We look for files like <id>-annotated.png
		if fname.ends_with("-annotated.png"):
			var idx = fname.rfind("-annotated.png")
			var key = fname
			if idx >= 0:
				key = fname.substr(0, idx)
			var entry := {}
			entry["content"] = key
			entry["local_thumbnail"] = "%s/%s" % [annotations_dir, fname]
			results.append(entry)
		fname = dir.get_next()

	return results

func _on_anomalies_fetched(data: Array, error: String):
	if error != "":
		print("Error fetching anomalies: ", error)
		pending_anomalies = []
		status_label.text = "Status: Error - " + error
	else:
		pending_anomalies = data
		status_label.text = "Status: %d asteroids detected" % data.size()

func _display_anomalies(anomalies: Array):
	# Clear existing items
	for child in anomaly_list.get_children():
		child.queue_free()
	
	if anomalies.is_empty():
		var empty_label = Label.new()
		empty_label.text = "No asteroids detected in current scan range."
		empty_label.add_theme_font_size_override("font_size", 24)
		empty_label.add_theme_color_override("font_color", Color(0.3, 0.3, 0.3, 1))
		empty_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		anomaly_list.add_child(empty_label)
		return
	
	for i in range(anomalies.size()):
		var anomaly = anomalies[i]
		var item = _create_anomaly_item(anomaly, i + 1)
		anomaly_list.add_child(item)

func _create_anomaly_item(anomaly: Dictionary, index: int) -> Control:
	var item_container = PanelContainer.new()
	item_container.custom_minimum_size = Vector2(0, 80)
	
	# Style the item
	var item_style = StyleBoxFlat.new()
	item_style.bg_color = Color(0.95, 0.97, 1.0, 1)
	item_style.border_color = Color(0.7, 0.75, 0.85, 1)
	item_style.border_width_bottom = 1
	item_style.corner_radius_top_left = 8
	item_style.corner_radius_top_right = 8
	item_style.corner_radius_bottom_left = 8
	item_style.corner_radius_bottom_right = 8
	item_style.content_margin_left = 16
	item_style.content_margin_right = 16
	item_style.content_margin_top = 12
	item_style.content_margin_bottom = 12
	item_container.add_theme_stylebox_override("panel", item_style)
	
	var hbox = HBoxContainer.new()
	hbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	item_container.add_child(hbox)

	# Add a full-size transparent button to capture clicks reliably
	var click_btn = Button.new()
	click_btn.text = ""
	click_btn.flat = true
	click_btn.focus_mode = Control.FOCUS_NONE
	click_btn.mouse_filter = Control.MOUSE_FILTER_STOP
	# Make it cover the whole item_container
	click_btn.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	item_container.add_child(click_btn)
	
	# Icon/Number circle
	var icon_container = PanelContainer.new()
	icon_container.custom_minimum_size = Vector2(50, 50)
	var icon_style = StyleBoxFlat.new()
	icon_style.bg_color = Color(0.45, 0.62, 0.82, 1)  # Primary color
	icon_style.corner_radius_top_left = 25
	icon_style.corner_radius_top_right = 25
	icon_style.corner_radius_bottom_left = 25
	icon_style.corner_radius_bottom_right = 25
	icon_container.add_theme_stylebox_override("panel", icon_style)
	
	var icon_label = Label.new()
	# If an annotated PNG exists for this anomaly, show it as a thumbnail
	var combined_png = "user://annotations/%s-annotated.png" % anomaly.get("content", str(anomaly.get("id", index)))
	if FileAccess.file_exists(combined_png):
		var img = Image.new()
		var err = img.load(combined_png)
		if err == OK:
			var tex = ImageTexture.create_from_image(img)
			var thumb = TextureRect.new()
			thumb.texture = tex
			thumb.expand = true
			thumb.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			thumb.custom_minimum_size = Vector2(50, 50)
			icon_container.add_child(thumb)
		else:
			icon_label.text = "☄"
			icon_label.add_theme_font_size_override("font_size", 28)
			icon_label.add_theme_color_override("font_color", Color.WHITE)
			icon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			icon_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			icon_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			icon_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
			icon_container.add_child(icon_label)
	else:
		icon_label.text = "☄"
		icon_label.add_theme_font_size_override("font_size", 28)
		icon_label.add_theme_color_override("font_color", Color.WHITE)
		icon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		icon_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		icon_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		icon_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
		icon_container.add_child(icon_label)
	hbox.add_child(icon_container)
	
	# Spacer
	var spacer = Control.new()
	spacer.custom_minimum_size = Vector2(16, 0)
	hbox.add_child(spacer)
	
	# Content
	var content_vbox = VBoxContainer.new()
	content_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(content_vbox)
	
	# Title - use TIC ID or content (asteroid ID)
	var title_label = Label.new()
	var tic_id = anomaly.get("ticId", "")
	var content_text = anomaly.get("content", "")
	var anomaly_id = anomaly.get("id", index)
	
	if tic_id != "" and tic_id != null:
		title_label.text = "TIC %s" % tic_id
	elif content_text != "" and content_text != null:
		title_label.text = "Asteroid #%s" % str(content_text)
	else:
		title_label.text = "Asteroid #%d" % anomaly_id
	title_label.add_theme_font_size_override("font_size", 26)
	title_label.add_theme_color_override("font_color", Color(0.1, 0.1, 0.2, 1))
	content_vbox.add_child(title_label)
	
	# Subtitle with properties
	var subtitle_label = Label.new()
	var properties = []
	
	var anomaly_type = anomaly.get("anomalytype", "")
	if anomaly_type != "" and anomaly_type != null:
		properties.append(anomaly_type.capitalize().replace("Telescope", "").strip_edges())
	
	var radius = anomaly.get("radius")
	if radius != null:
		properties.append("R: %.2f" % radius)
	
	var mass = anomaly.get("mass")
	if mass != null:
		properties.append("M: %.2f" % mass)
	
	var temp = anomaly.get("temperature")
	if temp != null:
		properties.append("T: %.0fK" % temp)
	
	var classification = anomaly.get("classification_status", "")
	if classification != "" and classification != null:
		properties.append(classification)
	
	subtitle_label.text = " • ".join(properties) if properties.size() > 0 else "Awaiting analysis..."
	subtitle_label.add_theme_font_size_override("font_size", 20)
	subtitle_label.add_theme_color_override("font_color", Color(0.4, 0.45, 0.5, 1))
	content_vbox.add_child(subtitle_label)
	
	# Connect the overlay button's pressed signal to open detail view
	click_btn.pressed.connect(Callable(self, "_on_anomaly_item_button_pressed").bind(anomaly))

	# Check for saved annotations for this anomaly and show indicator
	var anomaly_key = anomaly.get("content", "")
	if anomaly_key == "":
		anomaly_key = str(anomaly.get("id", index))
	var annotations_path = "user://annotations/%s.json" % anomaly_key
	print("SatelliteStationPanel: checking annotations for key:", anomaly_key, "path:", annotations_path)
	var exists = FileAccess.file_exists(annotations_path)
	print("SatelliteStationPanel: annotations file exists?", exists)
	if exists:
		var saved_label = Label.new()
		saved_label.text = "Saved"
		saved_label.add_theme_color_override("font_color", Color(0.1, 0.6, 0.1))
		saved_label.add_theme_font_size_override("font_size", 18)
		hbox.add_child(saved_label)
	
	# Add hover effect
	item_container.mouse_entered.connect(func():
		var hover_style = item_style.duplicate()
		hover_style.bg_color = Color(0.90, 0.94, 1.0, 1)
		item_container.add_theme_stylebox_override("panel", hover_style)
	)
	item_container.mouse_exited.connect(func():
		item_container.add_theme_stylebox_override("panel", item_style)
	)
	
	return item_container

func _on_anomaly_item_clicked(event: InputEvent, anomaly: Dictionary):
	"""Handle click on an anomaly item"""
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_show_asteroid_detail(anomaly)


func _on_anomaly_item_gui_input(bound_anomaly: Dictionary, event: InputEvent):
	"""Wrapper for gui_input when using Callable.bind(bound_anomaly) - called with (bound_anomaly, event)"""
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_show_asteroid_detail(bound_anomaly)


func _on_anomaly_item_button_pressed(bound_anomaly: Dictionary):
	"""Called when the overlay button is pressed for an anomaly item."""
	_show_asteroid_detail(bound_anomaly)

func _show_asteroid_detail(anomaly: Dictionary):
	"""Show the asteroid detail view"""
	if detail_view_active:
		return  # Prevent multiple detail views
	
	detail_view_active = true
	
	# Hide toggle switch
	toggle_switch.visible = false
	
	# Change panel background to specified gray (#7f7f7f)
	var panel = $PanelContainer/Panel
	var style_box = StyleBoxFlat.new()
	style_box.bg_color = Color(0.498, 0.498, 0.498, 1.0)  # #7f7f7f in RGB
	style_box.border_color = Color(0.45, 0.62, 0.82, 1)  # Keep original border
	style_box.border_width_left = 3
	style_box.border_width_right = 3
	style_box.border_width_top = 3
	style_box.border_width_bottom = 3
	style_box.corner_radius_top_left = 12
	style_box.corner_radius_top_right = 12
	style_box.corner_radius_bottom_left = 12
	style_box.corner_radius_bottom_right = 12
	panel.add_theme_stylebox_override("panel", style_box)
	
	# Hide the list container contents
	loading_container.visible = false
	anomaly_list.visible = false
	
	# Create and add detail view directly to the content container
	var detail_view = AsteroidDetailView.instantiate()
	content_container.add_child(detail_view)
	detail_view.initialize(anomaly)
	
	# Connect back button
	detail_view.back_pressed.connect(_on_detail_view_back)

func _on_detail_view_back():
	"""Handle back button from detail view"""
	detail_view_active = false
	
	# Show toggle switch again
	toggle_switch.visible = true
	
	# Restore original white panel background
	_apply_panel_style()
	
	loading_container.visible = false
	anomaly_list.visible = true

func _on_refresh_pressed():
	_start_loading(REFRESH_LOAD_TIME)
	_fetch_anomalies()

func _on_toggle_switch_pressed():
	"""Handle toggle switch between asteroids and planets"""
	if current_mode == "asteroids":
		current_mode = "planets"
		toggle_switch.text = "Switch to Asteroids"
		anomaly_list.visible = false
		status_label.text = "Status: Planets mode active"
	else:
		current_mode = "asteroids"
		toggle_switch.text = "Switch to Planets"
		anomaly_list.visible = true
		status_label.text = "Status: Asteroids mode active"

func _apply_panel_style():
	"""Apply styling to match existing menu panels"""
	var panel = $PanelContainer/Panel
	var style_box = StyleBoxFlat.new()
	style_box.bg_color = Color(0.99, 1.002, 1.002, 1)  # --card
	style_box.border_color = Color(0.45, 0.62, 0.82, 1)  # --primary
	style_box.border_width_left = 3
	style_box.border_width_right = 3
	style_box.border_width_top = 3
	style_box.border_width_bottom = 3
	style_box.corner_radius_top_left = 12
	style_box.corner_radius_top_right = 12
	style_box.corner_radius_bottom_left = 12
	style_box.corner_radius_bottom_right = 12
	panel.add_theme_stylebox_override("panel", style_box)
	
	# Fix text colors
	var title = $PanelContainer/Panel/VBoxContainer/HeaderContainer/Title
	title.add_theme_color_override("font_color", Color(0, 0, 0, 1))  # Pure black text
	
	var close_btn = $PanelContainer/Panel/VBoxContainer/HeaderContainer/CloseButton
	close_btn.add_theme_color_override("font_color", Color(0, 0, 0, 1))  # Pure black text

func _on_close_button_pressed():
	panel_closed.emit()
	queue_free()

func _on_background_input(event: InputEvent):
	if event is InputEventMouseButton and event.pressed:
		panel_closed.emit()
		queue_free()
