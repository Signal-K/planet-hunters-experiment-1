extends RefCounted
class_name SatelliteStationPanelDetail

static var AsteroidDetailView: PackedScene = load("res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn") if ResourceLoader.exists("res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn") else null
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

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
	"""Apply scanner-aligned shell styling."""
	if _panel:
		_panel.add_theme_stylebox_override("panel", PanelStyle.create_glass_panel_style(Color(0.06, 0.10, 0.16, 0.96), 0.86, 18, 20, 16))
	if _title_label:
		PanelStyle.apply_title_on_dark(_title_label)
	if _close_button:
		PanelStyle.apply_outline_button(_close_button, PanelStyle.ACCENT, PanelStyle.TEXT_ON_DARK)

func show_detail(anomaly: Dictionary) -> void:
	"""Show the asteroid detail view."""
	if _detail_view_active:
		return  # Prevent multiple detail views

	_detail_view_active = true

	# Hide toggle switch
	_toggle_switch.visible = false

	# Keep the drill-down shell on the same dark-glass palette as the scanner.
	apply_panel_style()

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

	# Restore the scanner shell styling.
	apply_panel_style()

	_loading_container.visible = false
	_anomaly_list.visible = true
