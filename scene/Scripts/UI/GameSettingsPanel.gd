extends Control

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const UILayout = preload("res://Scripts/UI/UILayout.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")

signal close_requested

@onready var panel: PanelContainer = $PanelMargin/Panel
@onready var back_button: Button = $PanelMargin/Panel/Shell/Header/BackButton
@onready var close_button: Button = $PanelMargin/Panel/Shell/Header/CloseButton
@onready var bottom_close_button: Button = $PanelMargin/Panel/Shell/BottomBar/BottomCloseButton
@onready var footer_reset_button: Button = $PanelMargin/Panel/Shell/BottomBar/FooterResetButton
@onready var citizen_science_dialogue_button: Button = $PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/GuidanceCard/Body/GuidanceRow/CitizenScienceDialogueButton
@onready var practice_mining_button: Button = $PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/MissionToolsCard/Body/ButtonsRow/PracticeMiningButton
@onready var replay_mission_guide_button: Button = $PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/MissionToolsCard/Body/ButtonsRow/ReplayMissionGuideButton
@onready var skip_tutorial_button: Button = $PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/MissionToolsCard/Body/ButtonsRow/SkipTutorialButton
@onready var reset_all_button: Button = $PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/ProgressCard/Body/ResetAllDataButton
@onready var section_cards: Array[Control] = [
	$PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/MissionToolsCard,
	$PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/GuidanceCard,
	$PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/ProgressCard
]
@onready var content_scroll: ScrollContainer = $PanelMargin/Panel/Shell/ContentScroll
@onready var cards_grid: GridContainer = $PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	_apply_style()
	_apply_layout()
	if get_viewport() != null:
		get_viewport().size_changed.connect(_apply_layout)
	back_button.pressed.connect(_request_close)
	close_button.pressed.connect(_request_close)
	bottom_close_button.pressed.connect(_request_close)
	footer_reset_button.pressed.connect(_on_reset_all_pressed)
	practice_mining_button.pressed.connect(_on_practice_mining_pressed)
	replay_mission_guide_button.pressed.connect(_on_replay_mission_guide_pressed)
	skip_tutorial_button.pressed.connect(_on_skip_tutorial_pressed)
	citizen_science_dialogue_button.pressed.connect(_on_citizen_science_dialogue_pressed)
	reset_all_button.pressed.connect(_on_reset_all_pressed)
	$Backdrop.gui_input.connect(func(ev: InputEvent):
		if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
			_request_close()
	)
	_refresh_dynamic_state()

func _apply_style() -> void:
	$Backdrop.color = Color(0.05, 0.07, 0.12, 0.90)
	panel.add_theme_stylebox_override("panel", PanelStyle.create_glass_panel_style(Color(0.05, 0.08, 0.14, 0.96), 0.72, 18, 22, 18))
	var section_style = PanelStyle.create_glass_card_style(Color(0.09, 0.12, 0.20, 0.88), 0.45, 14, 16, 14)
	for card in section_cards:
		(card as PanelContainer).add_theme_stylebox_override("panel", section_style)

	PanelStyle.apply_outline_button(back_button)
	PanelStyle.apply_outline_button(close_button)
	PanelStyle.apply_outline_button(bottom_close_button)
	PanelStyle.apply_outline_button(footer_reset_button)
	PanelStyle.apply_button(practice_mining_button, true)
	PanelStyle.apply_outline_button(replay_mission_guide_button)
	PanelStyle.apply_outline_button(skip_tutorial_button)
	PanelStyle.apply_outline_button(citizen_science_dialogue_button)
	PanelStyle.apply_outline_button(reset_all_button, Color(PanelStyle.ACCENT_WARM.r, PanelStyle.ACCENT_WARM.g, PanelStyle.ACCENT_WARM.b, 0.82))

	var header_title: Label = $PanelMargin/Panel/Shell/Header/TitleLabel
	var header_status: Label = $PanelMargin/Panel/Shell/Header/HeaderStatusLabel
	PanelStyle.apply_title_on_dark(header_title)
	header_title.add_theme_font_size_override("font_size", 18)
	header_title.add_theme_color_override("font_color", PanelStyle.ACCENT)
	header_title.add_theme_constant_override("outline_size", 0)
	PanelStyle.apply_muted_on_dark(header_status)
	header_status.add_theme_font_size_override("font_size", 12)
	header_status.add_theme_color_override("font_color", PanelStyle.ACCENT)

	var section_title: Label = $PanelMargin/Panel/Shell/ContentScroll/Content/SectionTitle
	var section_hint: Label = $PanelMargin/Panel/Shell/ContentScroll/Content/SectionHint
	PanelStyle.apply_title_on_dark(section_title)
	section_title.add_theme_font_size_override("font_size", 22)
	PanelStyle.apply_muted_on_dark(section_hint)

	for label_path in [
		"PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/MissionToolsCard/Body/SectionLabel",
		"PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/GuidanceCard/Body/SectionLabel",
		"PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/ProgressCard/Body/SectionLabel"
	]:
		var section_label: Label = get_node(label_path)
		PanelStyle.apply_muted_on_dark(section_label)
		section_label.add_theme_color_override("font_color", PanelStyle.ACCENT)
		section_label.add_theme_font_size_override("font_size", 11)

	for label_path in [
		"PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/MissionToolsCard/Body/MissionToolsHint",
		"PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/GuidanceCard/Body/GuidanceRow/GuidanceCopy/CitizenScienceHintLabel",
		"PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/ProgressCard/Body/ProgressHintLabel",
		"PanelMargin/Panel/Shell/BottomBar/BottomStatusLabel"
	]:
		var body_label: Label = get_node(label_path)
		PanelStyle.apply_muted_on_dark(body_label)

	for label_path in [
		"PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/MissionToolsCard/Body/SectionTitle",
		"PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/GuidanceCard/Body/SectionTitle",
		"PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/GuidanceCard/Body/GuidanceRow/GuidanceCopy/CitizenScienceStatusLabel",
		"PanelMargin/Panel/Shell/ContentScroll/Content/CardsGrid/ProgressCard/Body/SectionTitle"
	]:
		var heading: Label = get_node(label_path)
		PanelStyle.apply_body_on_dark(heading)
		heading.add_theme_font_size_override("font_size", 19)

	PanelStyle.apply_separator($PanelMargin/Panel/Shell/Divider)

func _apply_layout() -> void:
	var viewport := get_viewport().get_visible_rect().size
	var safe := UILayout.safe_rect(viewport)
	var margin := $PanelMargin as MarginContainer
	margin.add_theme_constant_override("margin_left", int(safe.position.x + maxf(12.0, safe.size.x * 0.02)))
	margin.add_theme_constant_override("margin_top", int(safe.position.y + maxf(10.0, safe.size.y * 0.02)))
	margin.add_theme_constant_override("margin_right", int(viewport.x - safe.end.x + maxf(12.0, safe.size.x * 0.02)))
	margin.add_theme_constant_override("margin_bottom", int(viewport.y - safe.end.y + maxf(10.0, safe.size.y * 0.02)))

	var compact := viewport.x < 980.0
	cards_grid.columns = 1 if compact else 2
	var button_height := 62 if compact else 74
	for button in [practice_mining_button, replay_mission_guide_button, skip_tutorial_button, citizen_science_dialogue_button, reset_all_button]:
		button.custom_minimum_size.y = button_height

func _refresh_dynamic_state() -> void:
	var app = AppControllerHelper.get_instance()
	var can_skip = app != null and app.has_method("skip_tutorial")
	skip_tutorial_button.visible = can_skip
	_refresh_dialogue_button_text()

func _refresh_dialogue_button_text() -> void:
	var enabled := AppControllerHelper.is_citizen_science_dialogue_enabled(true)
	citizen_science_dialogue_button.text = "Dialogue: %s" % ("On" if enabled else "Off")

func _on_practice_mining_pressed() -> void:
	var opened := AppControllerHelper.open_mining_practice_panel("settings_panel")
	if opened:
		_request_close()

func _on_replay_mission_guide_pressed() -> void:
	var app = AppControllerHelper.get_instance()
	if app and app.has_method("replay_tutorial_for_current_mission"):
		app.replay_tutorial_for_current_mission()
	_request_close()

func _on_skip_tutorial_pressed() -> void:
	var app = AppControllerHelper.get_instance()
	if app and app.has_method("skip_tutorial"):
		app.skip_tutorial()
	_request_close()

func _on_citizen_science_dialogue_pressed() -> void:
	var app = AppControllerHelper.get_instance()
	if app and app.has_method("is_citizen_science_dialogue_enabled") and app.has_method("set_citizen_science_dialogue_enabled"):
		var next_enabled := not bool(app.is_citizen_science_dialogue_enabled())
		app.set_citizen_science_dialogue_enabled(next_enabled)
	_refresh_dialogue_button_text()

func _on_reset_all_pressed() -> void:
	var app = AppControllerHelper.get_instance()
	if app and app.has_method("_on_reset_all"):
		app._on_reset_all()
	_request_close()

func _request_close() -> void:
	close_requested.emit()
	_close_nav_layer()

func _close_nav_layer() -> void:
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null or tree.root == null:
		queue_free()
		return
	var layer := tree.root.get_node_or_null("GameMenuLayer")
	if is_instance_valid(layer):
		var tutorial := tree.root.find_child("TutorialOverlay", true, false)
		if tutorial != null:
			tutorial.visible = true
		layer.queue_free()
	else:
		queue_free()
