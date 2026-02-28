extends RefCounted
class_name SatelliteStationPanelDetail

const AsteroidDetailView = preload("res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn")

var _panel: Control
var _loading_container: Control
var _anomaly_list: Control
var _content_container: Control
var _toggle_switch: Control
var _title_label: Label
var _close_button: Button
var _detail_view_active := false

func setup(
	panel: Control,
	loading_container: Control,
	anomaly_list: Control,
	content_container: Control,
	toggle_switch: Control,
	title_label: Label,
	close_button: Button
) -> void:
	_panel = panel
	_loading_container = loading_container
	_anomaly_list = anomaly_list
	_content_container = content_container
	_toggle_switch = toggle_switch
	_title_label = title_label
	_close_button = close_button

func is_active() -> bool:
	return _detail_view_active

func apply_panel_style() -> void:
	"""Apply polished panel styling"""
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_panel(_panel)
	if _title_label:
		panel_style.apply_title(_title_label)
	if _close_button:
		panel_style.apply_button(_close_button, false)

func show_detail(anomaly: Dictionary) -> void:
	"""Show the asteroid detail view"""
	if _detail_view_active:
		return  # Prevent multiple detail views

	_detail_view_active = true

	# Hide toggle switch
	_toggle_switch.visible = false

	# Keep detail view on the same dark panel palette as the rest of the UI.
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
	panel_style.apply_panel(_panel, panel_style.ACCENT_SOFT)

	# Hide the list container contents
	_loading_container.visible = false
	_anomaly_list.visible = false

	# Use annotation-enabled detail for both asteroids and planets.
	var detail_view = AsteroidDetailView.instantiate() if AsteroidDetailView else null
	if detail_view == null:
		return
	_content_container.add_child(detail_view)
	detail_view.initialize(anomaly, true) # force_controls_visible = true
	# Connect back button
	if detail_view.has_signal("back_pressed"):
		detail_view.back_pressed.connect(_on_detail_view_back)

func _on_detail_view_back() -> void:
	"""Handle back button from detail view"""
	_detail_view_active = false

	# Show toggle switch again
	_toggle_switch.visible = true

	# Restore original white panel background
	apply_panel_style()

	_loading_container.visible = false
	_anomaly_list.visible = true
