extends RefCounted
class_name SatelliteStationPanelList

const AnomalyItemScene = preload("res://Scenes/UI/Templates/SatelliteAnomalyItem.tscn")
const EmptyLabelScene = preload("res://Scenes/UI/Templates/MenuLogbookEmpty.tscn")
const ClassificationConsensus = preload("res://Scripts/Utils/ClassificationConsensus.gd")

var _anomaly_list: VBoxContainer
var _get_mode: Callable
var _normalize_cb: Callable
var _on_select_cb: Callable
var _on_detail_cb: Callable

func setup(
	anomaly_list: VBoxContainer,
	get_mode: Callable,
	normalize_cb: Callable,
	on_select_cb: Callable,
	on_detail_cb: Callable
) -> void:
	_anomaly_list = anomaly_list
	_get_mode = get_mode
	_normalize_cb = normalize_cb
	_on_select_cb = on_select_cb
	_on_detail_cb = on_detail_cb

func display_anomalies(anomalies: Array) -> void:
	# Clear existing items
	for child in _anomaly_list.get_children():
		child.queue_free()

	if anomalies.is_empty():
		var empty_label: Label = EmptyLabelScene.instantiate()
		var target_type = "planets" if _get_mode.call() == "planets" else "asteroids"
		empty_label.text = "No %s detected in current scan range." % target_type
		var panel_style = preload("res://Scripts/UI/PanelStyle.gd")
		panel_style.apply_muted(empty_label)
		empty_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_anomaly_list.add_child(empty_label)
		return

	for i in range(anomalies.size()):
		var anomaly = anomalies[i]
		var item = _create_anomaly_item(anomaly, i + 1)
		_anomaly_list.add_child(item)

func _create_anomaly_item(anomaly: Dictionary, index: int) -> Control:
	var item_container: PanelContainer = AnomalyItemScene.instantiate()
	var panel_style = preload("res://Scripts/UI/PanelStyle.gd")

	item_container.add_theme_stylebox_override("panel", panel_style.create_list_item_style())

	var icon_container: PanelContainer = item_container.get_node("HBox/IconContainer")
	icon_container.add_theme_stylebox_override("panel", panel_style.create_icon_circle_style())

	var icon_label: Label = item_container.get_node("HBox/IconContainer/IconLabel")
	# Use planet icon for planets, asteroid icon for asteroids (annotation thumbnails archived)
	var icon_text = "🪐" if _get_mode.call() == "planets" else "☄"
	icon_label.text = icon_text
	icon_label.add_theme_font_size_override("font_size", 30)
	icon_label.add_theme_color_override("font_color", panel_style.TEXT_ON_ACCENT)
	icon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	icon_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	icon_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	icon_label.size_flags_vertical = Control.SIZE_EXPAND_FILL

	# Title - use TIC ID or content (asteroid ID)
	var title_label: Label = item_container.get_node("HBox/ContentVBox/TitleLabel")
	var tic_id = anomaly.get("ticId", "")
	var content_text = anomaly.get("content", "")
	var anomaly_id = anomaly.get("id", index)

	if tic_id != "" and tic_id != null:
		title_label.text = "TIC %s" % tic_id
	elif content_text != "" and content_text != null:
		var item_type = "Planet" if _get_mode.call() == "planets" else "Asteroid"
		title_label.text = "%s #%s" % [item_type, str(content_text)]
	else:
		var item_type = "Planet" if _get_mode.call() == "planets" else "Asteroid"
		title_label.text = "%s #%d" % [item_type, anomaly_id]
	panel_style.apply_body(title_label)

	# Subtitle with properties
	var subtitle_label: Label = item_container.get_node("HBox/ContentVBox/SubtitleLabel")
	var properties = []
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var normalized = _normalize_cb.call(anomaly, index)
	var target_type = "planet" if _get_mode.call() == "planets" else "asteroid"
	var profile = rm.build_target_profile(normalized, target_type) if rm else {}
	var distance_au = float(profile.get("distance_au", 0.0))
	var required_level = int(profile.get("required_level", 1))
	var scan_count = int(rm.get_target_scan_count(normalized, target_type)) if rm else 0
	properties.append("Distance: %.0f AU" % distance_au)
	properties.append("Requires: L%d" % required_level)

	var anomaly_type = anomaly.get("anomalytype", "")
	if scan_count >= 1 and anomaly_type != "" and anomaly_type != null:
		properties.append(anomaly_type.capitalize().replace("Telescope", "").strip_edges())

	var radius = anomaly.get("radius")
	if scan_count >= 2 and radius != null:
		properties.append("R: %.2f" % radius)

	var mass = anomaly.get("mass")
	if scan_count >= 3 and mass != null:
		properties.append("M: %.2f" % mass)

	var temp = anomaly.get("temperature")
	if scan_count >= 2 and temp != null:
		properties.append("T: %.0fK" % temp)

	var classification = anomaly.get("classification_status", "")
	if scan_count >= 3 and classification != "" and classification != null:
		properties.append(classification)

	# Consensus badge — if the player has classified this target, show consensus level
	var consensus_label_text := ClassificationConsensus.consensus_label(str(normalized))
	if consensus_label_text != "":
		properties.append("Consensus: " + consensus_label_text)

	subtitle_label.text = " • ".join(properties)
	panel_style.apply_muted(subtitle_label)

	# Select target button (only for detected anomalies)
	var select_btn: Button = item_container.get_node("HBox/ContentVBox/Controls/SelectButton")
	select_btn.focus_mode = Control.FOCUS_NONE
	panel_style.apply_button(select_btn, true)

	var detail_btn: Button = item_container.get_node("HBox/ContentVBox/Controls/DetailButton")
	detail_btn.focus_mode = Control.FOCUS_NONE
	panel_style.apply_button(detail_btn, false)

	# Display selected marker if this matches currently selected target
	var current_target = ""
	if rm:
		current_target = rm.get_selected_target()
	if current_target == normalized:
		select_btn.text = "Target Selected"
		select_btn.disabled = true

	# Connect select action
	select_btn.pressed.connect(_on_select_cb.bind(anomaly, index, select_btn))
	detail_btn.pressed.connect(_on_detail_cb.bind(anomaly, index))

	# Store the base style for hover effects
	var base_style = panel_style.create_list_item_style()
	
	# Add hover effect
	item_container.mouse_entered.connect(func():
		var hover_style = base_style.duplicate()
		hover_style.bg_color = panel_style.BUTTON_PRESSED
		item_container.add_theme_stylebox_override("panel", hover_style)
	)
	item_container.mouse_exited.connect(func():
		item_container.add_theme_stylebox_override("panel", base_style)
	)

	return item_container
