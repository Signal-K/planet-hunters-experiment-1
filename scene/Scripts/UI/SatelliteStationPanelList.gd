extends RefCounted
class_name SatelliteStationPanelList

const AnomalyItemScene = preload("res://Scenes/UI/Templates/SatelliteAnomalyItem.tscn")
const EmptyLabelScene = preload("res://Scenes/UI/Templates/MenuLogbookEmpty.tscn")
const ClassificationConsensus = preload("res://Scripts/Utils/ClassificationConsensus.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")

const STATION_CARD_BG := Color(0.99, 0.995, 0.995, 1.0)
const STATION_CARD_BORDER := Color(0.82, 0.89, 0.90, 1.0)
const STATION_CARD_HOVER := Color(0.95, 0.98, 0.98, 1.0)
const STATION_ICON_BG := Color(0.84, 0.97, 0.94, 1.0)
const STATION_TEXT := Color(0.16, 0.20, 0.22, 1.0)
const STATION_MUTED := Color(0.40, 0.46, 0.49, 1.0)
const STATION_TELEMETRY := Color(0.05, 0.49, 0.45, 1.0)

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
		empty_label.add_theme_color_override("font_color", STATION_MUTED)
		empty_label.add_theme_font_size_override("font_size", 16)
		empty_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_anomaly_list.add_child(empty_label)
		return

	for i in range(anomalies.size()):
		var anomaly = anomalies[i]
		var item = _create_anomaly_item(anomaly, i + 1)
		_anomaly_list.add_child(item)

func _create_anomaly_item(anomaly: Dictionary, index: int) -> Control:
	var item_container: PanelContainer = AnomalyItemScene.instantiate()
	item_container.add_theme_stylebox_override("panel", _create_station_item_style())

	var icon_container: PanelContainer = item_container.get_node("HBox/IconContainer")
	icon_container.add_theme_stylebox_override("panel", _create_station_icon_style())

	var icon_label: Label = item_container.get_node("HBox/IconContainer/IconLabel")
	# Use planet icon for planets, asteroid icon for asteroids (annotation thumbnails archived)
	var icon_text = "🪐" if _get_mode.call() == "planets" else "☄"
	icon_label.text = icon_text
	icon_label.add_theme_font_size_override("font_size", 30)
	icon_label.add_theme_color_override("font_color", STATION_TELEMETRY)
	icon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	icon_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	icon_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	icon_label.size_flags_vertical = Control.SIZE_EXPAND_FILL

	# Title - use TIC ID or content (asteroid ID)
	var title_label: Label = item_container.get_node("HBox/ContentVBox/TitleRow/TitleLabel")
	var badge_label: Label = item_container.get_node("HBox/ContentVBox/TitleRow/BadgeLabel")
	var meta_label: Label = item_container.get_node("HBox/ContentVBox/MetaLabel")
	var card_backdrop: ColorRect = item_container.get_node("CardBackdrop")
	card_backdrop.color = Color(0.92, 0.97, 0.96, 0.72)
	var tic_id = _clean_text(anomaly.get("ticId", ""))
	var content_text = _clean_text(anomaly.get("content", ""))
	var anomaly_id = anomaly.get("id", index)

	if tic_id != "" and tic_id != null:
		title_label.text = "TIC %s" % tic_id
	elif content_text != "" and content_text != null:
		var item_type = "Planet" if _get_mode.call() == "planets" else "Asteroid"
		title_label.text = "%s #%s" % [item_type, str(content_text)]
	else:
		var item_type = "Planet" if _get_mode.call() == "planets" else "Asteroid"
		title_label.text = "%s #%d" % [item_type, anomaly_id]
	title_label.add_theme_color_override("font_color", STATION_TEXT)
	title_label.add_theme_font_size_override("font_size", 17)

	var normalized = _normalize_cb.call(anomaly, index)
	var target_type = "planet" if _get_mode.call() == "planets" else "asteroid"
	var profile = RocketsManager.build_target_profile(normalized, target_type)
	var distance_au = float(profile.get("distance_au", 0.0))
	var required_level = int(profile.get("required_level", 1))
	var scan_count = int(RocketsManager.get_target_scan_count(normalized, target_type))
	var scan_pass_text = "%d scan%s" % [max(scan_count, 1), "" if max(scan_count, 1) == 1 else "s"]

	var badge_text := ""
	var tess_disposition: String = _clean_text(anomaly.get("tess_disposition", ""))
	var classification: String = _clean_text(anomaly.get("classification_status", ""))
	var anomaly_type: String = _clean_text(anomaly.get("anomalytype", ""))
	if tess_disposition != "":
		badge_text = tess_disposition
	elif classification != "":
		badge_text = classification.to_upper()
	elif anomaly_type != "":
		badge_text = anomaly_type.replace("_", " ").replace("telescope", "").strip_edges().to_upper()
	else:
		badge_text = "SCANNED"
	badge_label.text = badge_text
	badge_label.add_theme_color_override("font_color", STATION_TELEMETRY)
	badge_label.add_theme_font_size_override("font_size", 12)
	badge_label.uppercase = true

	var meta_parts := [
		"%.0f AU" % distance_au,
		"Lv %d clearance" % required_level,
		scan_pass_text
	]
	var science_source = _clean_text(anomaly.get("science_source", ""))
	if science_source == "":
		science_source = _clean_text(profile.get("science_source", ""))
	if science_source != "":
		meta_parts.append(science_source)
	meta_label.text = "  ·  ".join(meta_parts)
	meta_label.add_theme_color_override("font_color", STATION_MUTED)
	meta_label.add_theme_font_size_override("font_size", 13)

	# Secondary synopsis for richer DB-backed detail without turning the card into a wall of text.
	var subtitle_label: Label = item_container.get_node("HBox/ContentVBox/SubtitleLabel")
	var summary_parts := []
	var science_blurb = _clean_text(anomaly.get("science_blurb", ""))
	if science_blurb == "":
		science_blurb = _clean_text(profile.get("science_blurb", ""))
	if science_blurb != "":
		summary_parts.append(science_blurb)
	var radius = anomaly.get("radius")
	if scan_count >= 2 and radius != null:
		summary_parts.append("R %.2f" % float(radius))
	var mass = anomaly.get("mass")
	if scan_count >= 3 and mass != null:
		summary_parts.append("M %.2f" % float(mass))
	var temp = anomaly.get("temperature")
	if scan_count >= 2 and temp != null:
		summary_parts.append("%.0f K" % float(temp))
	if classification != "":
		summary_parts.append(classification.capitalize())
	var consensus_label_text := ClassificationConsensus.consensus_label(str(normalized))
	if consensus_label_text != "":
		summary_parts.append("Consensus " + consensus_label_text)
	subtitle_label.text = "  ·  ".join(summary_parts)
	subtitle_label.visible = not subtitle_label.text.is_empty()
	subtitle_label.add_theme_color_override("font_color", STATION_MUTED)
	subtitle_label.add_theme_font_size_override("font_size", 12)

	# Select target button (only for detected anomalies)
	var select_btn: Button = item_container.get_node("HBox/ContentVBox/Controls/SelectButton")
	select_btn.focus_mode = Control.FOCUS_NONE
	_apply_station_button(select_btn, true)

	var detail_btn: Button = item_container.get_node("HBox/ContentVBox/Controls/DetailButton")
	detail_btn.focus_mode = Control.FOCUS_NONE
	_apply_station_button(detail_btn, false)

	# Display selected marker if this matches currently selected target
	var current_target = RocketsManager.get_selected_target()
	if current_target == normalized:
		select_btn.text = "Target Selected"
		select_btn.disabled = true

	# Connect select action
	select_btn.pressed.connect(_on_select_cb.bind(anomaly, index, select_btn))
	detail_btn.pressed.connect(_on_detail_cb.bind(anomaly, index))

	# Store the base style for hover effects
	var base_style = _create_station_item_style()
	
	# Add hover effect
	item_container.mouse_entered.connect(func():
		var hover_style = base_style.duplicate()
		hover_style.bg_color = STATION_CARD_HOVER
		item_container.add_theme_stylebox_override("panel", hover_style)
	)
	item_container.mouse_exited.connect(func():
		item_container.add_theme_stylebox_override("panel", base_style)
	)

	return item_container

func _create_station_item_style() -> StyleBoxFlat:
	var style := PanelStyle.create_glass_card_style(STATION_CARD_BG, 0.34, 12, 18, 14)
	style.border_color = STATION_CARD_BORDER
	return style

func _create_station_icon_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = STATION_ICON_BG
	style.border_color = Color(STATION_TELEMETRY.r, STATION_TELEMETRY.g, STATION_TELEMETRY.b, 0.30)
	style.set_border_width_all(1)
	style.set_corner_radius_all(36)
	return style

func _apply_station_button(button: Button, is_primary: bool) -> void:
	if button == null:
		return
	if is_primary:
		PanelStyle.apply_button(button, true)
	else:
		PanelStyle.apply_outline_button(button, STATION_CARD_BORDER, STATION_TEXT)
	button.add_theme_font_size_override("font_size", 15)

func _clean_text(value) -> String:
	if value == null:
		return ""
	var text := str(value).strip_edges()
	if text == "<null>":
		return ""
	return text
