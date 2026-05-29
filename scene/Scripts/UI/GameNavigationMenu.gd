extends RefCounted
class_name GameNavigationMenu

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const DS = preload("res://Scripts/UI/DS.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const AppLogger = preload("res://Scripts/Utils/Logger.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")
const MissionLogManager = preload("res://Scripts/Utils/MissionLogManager.gd")
const NumberFormat = preload("res://Scripts/Utils/NumberFormat.gd")
const FirstTimeMechanicTracker = preload("res://Scripts/Utils/FirstTimeMechanicTracker.gd")
const GameMenuRootScene = preload("res://Scenes/UI/Templates/GameNavigationMenuRoot.tscn")
const GameNavigationOverlayScene = preload("res://Scenes/UI/Templates/GameNavigationOverlay.tscn")
const GameMenuStatsCardScene = preload("res://Scenes/UI/Templates/GameMenuStatsCard.tscn")
const ResourceValueRowScene = preload("res://Scenes/UI/Templates/ResourceValueRow.tscn")
const MenuLogbookCardScene = preload("res://Scenes/UI/Templates/MenuLogbookCard.tscn")
const MenuLogbookKeyValueRowScene = preload("res://Scenes/UI/Templates/MenuLogbookKeyValueRow.tscn")
const MenuLogbookEmptyScene = preload("res://Scenes/UI/Templates/MenuLogbookEmpty.tscn")
const MenuDiscoveryRowScene = preload("res://Scenes/UI/Templates/MenuDiscoveryRow.tscn")
const MenuEmptyStateLabelScene = preload("res://Scenes/UI/Templates/MenuEmptyStateLabel.tscn")
const GameMenuContractorRowScene = preload("res://Scenes/UI/Templates/GameMenuContractorRow.tscn")
const GameMenuResearchCardScene = preload("res://Scenes/UI/Templates/GameMenuResearchCard.tscn")
const GameMenuContentCardScene = preload("res://Scenes/UI/Templates/GameMenuContentCard.tscn")
const GameMenuStatColumnScene = preload("res://Scenes/UI/Templates/GameMenuStatColumn.tscn")
const GameMenuDebugSectionScene = preload("res://Scenes/UI/Templates/GameMenuDebugSection.tscn")
const GameMenuInfoCardScene = preload("res://Scenes/UI/Templates/GameMenuInfoCard.tscn")
const GameMenuLegendLabelScene = preload("res://Scenes/UI/Templates/GameMenuLegendLabel.tscn")
const GameMenuActionsSectionScene = preload("res://Scenes/UI/Templates/GameMenuActionsSection.tscn")
const GameMenuResetButtonScene = preload("res://Scenes/UI/Templates/GameMenuResetButton.tscn")
const MENU_LAYER_NAME := "GameMenuLayer"
const MENU_ROOT_NAME := "GameMenuRoot"
const MENU_PANEL_NAME := "GameMenuPanel"
const MENU_LAYER_Z := 150

const TITLE_COLOR := Color(0.95, 0.93, 0.90, 1.0)
const TEXT_COLOR := Color(0.82, 0.84, 0.88, 1.0)
const TEXT_MUTED := Color(0.55, 0.60, 0.68, 1.0)
const CYAN := Color(0.247, 0.663, 1.000, 1.0)
const AMBER := Color(0.961, 0.651, 0.137, 1.0)
const PANEL_BG := Color(0.04, 0.06, 0.12, 0.96)
const CARD_BG := Color(0.08, 0.11, 0.20, 0.88)

const MISSION_UNLOCKS := [
	{"level": 1, "name": "Asteroid mining missions (belt targets)"},
	{"level": 1, "name": "Orbit sales (80% market rate)"},
	{"level": 3, "name": "Earth-side sales (full market rate)"}
]

static func toggle(owner: Node) -> void:
	if owner == null or owner.get_tree() == null:
		return
	if is_open(owner.get_tree()):
		close(owner)
	else:
		open(owner)

static func open(owner: Node) -> void:
	if owner == null or owner.get_tree() == null:
		return
	var tree := owner.get_tree()
	if is_open(tree):
		return
	if tree.root == null:
		return

	var layer := CanvasLayer.new()
	layer.name = MENU_LAYER_NAME
	layer.layer = MENU_LAYER_Z
	layer.follow_viewport_enabled = true
	layer.set_meta("tutorial_zone_exempt", true)
	layer.process_mode = Node.PROCESS_MODE_ALWAYS

	var menu_root := _build_menu_root(owner)
	layer.add_child(menu_root)
	tree.root.add_child(layer)
	_set_tutorial_overlay_visible(tree, false)
	AppLogger.d("GameNavigationMenu: opened")

static func close(owner: Node) -> void:
	if owner == null or owner.get_tree() == null or owner.get_tree().root == null:
		return
	var tree := owner.get_tree()
	var layer := tree.root.get_node_or_null(MENU_LAYER_NAME)
	if layer != null:
		layer.queue_free()
	_set_tutorial_overlay_visible(tree, true)
	AppLogger.d("GameNavigationMenu: closed")

static func is_open(tree: SceneTree) -> bool:
	if tree == null or tree.root == null:
		return false
	return tree.root.get_node_or_null(MENU_LAYER_NAME) != null

# ---------------------------------------------------------------------------
# Menu root + layout
# ---------------------------------------------------------------------------

static func _build_menu_root(owner: Node) -> Control:
	var root: Control = GameMenuRootScene.instantiate()
	root.name = MENU_ROOT_NAME
	root.process_mode = Node.PROCESS_MODE_ALWAYS
	root.set_meta("tutorial_zone_exempt", true)

	var backdrop: ColorRect = root.get_node("Backdrop")
	backdrop.color = Color(0.03, 0.05, 0.09, 0.70)
	backdrop.set_meta("tutorial_zone_exempt", true)

	var center: CenterContainer = root.get_node("Center")
	center.set_meta("tutorial_zone_exempt", true)

	var vp_w := 1280.0
	if owner != null and owner.get_viewport() != null:
		vp_w = owner.get_viewport().get_visible_rect().size.x
	var panel: PanelContainer = root.get_node("Center/%s" % MENU_PANEL_NAME)
	panel.custom_minimum_size = Vector2(clampf(vp_w - 48.0, 320.0, 920.0), 0.0)
	panel.set_meta("tutorial_zone_exempt", true)

	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = PANEL_BG
	panel_style.border_color = CYAN
	panel_style.set_border_width_all(2)
	panel_style.set_corner_radius_all(8)
	panel_style.content_margin_left = 24
	panel_style.content_margin_right = 24
	panel_style.content_margin_top = 20
	panel_style.content_margin_bottom = 20
	panel.add_theme_stylebox_override("panel", panel_style)

	# Scroll wrapper — height adapts to viewport
	var vp_h := 768.0
	if owner != null and owner.get_viewport() != null:
		vp_h = owner.get_viewport().get_visible_rect().size.y
	var scroll: ScrollContainer = root.get_node("Center/%s/Scroll" % MENU_PANEL_NAME)
	scroll.custom_minimum_size = Vector2(0, clampf(vp_h * 0.82, 400.0, 740.0))
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.set_meta("tutorial_zone_exempt", true)

	var shell: VBoxContainer = root.get_node("Center/%s/Scroll/Shell" % MENU_PANEL_NAME)
	shell.set_meta("tutorial_zone_exempt", true)
	var _vp_w := 480.0
	if owner != null and owner.get_viewport() != null:
		_vp_w = owner.get_viewport().get_visible_rect().size.x
	var _fs_scale := clampf(_vp_w / 480.0, 1.0, 3.0)
	var _disp := DS.font_display()

	var eyebrow: Label = root.get_node("Center/%s/Scroll/Shell/Header/TitleColumn/Eyebrow" % MENU_PANEL_NAME)
	eyebrow.add_theme_font_size_override("font_size", int(11 * _fs_scale))
	eyebrow.add_theme_color_override("font_color", CYAN)
	if _disp: eyebrow.add_theme_font_override("font", _disp)

	var title: Label = root.get_node("Center/%s/Scroll/Shell/Header/TitleColumn/Title" % MENU_PANEL_NAME)
	title.add_theme_font_size_override("font_size", int(28 * _fs_scale))
	title.add_theme_color_override("font_color", TITLE_COLOR)
	if _disp: title.add_theme_font_override("font", _disp)
	var logbook_btn: Button = root.get_node("Center/%s/Scroll/Shell/Header/LogbookButton" % MENU_PANEL_NAME)
	_apply_button_style(logbook_btn, false)
	logbook_btn.custom_minimum_size = Vector2(110, 50)

	var discoveries_btn: Button = root.get_node("Center/%s/Scroll/Shell/Header/DiscoveriesButton" % MENU_PANEL_NAME)
	_apply_button_style(discoveries_btn, false)
	discoveries_btn.custom_minimum_size = Vector2(130, 50)

	var close_btn: Button = root.get_node("Center/%s/Scroll/Shell/Header/CloseButton" % MENU_PANEL_NAME)
	_apply_button_style(close_btn, false)
	close_btn.custom_minimum_size = Vector2(110, 50)
	close_btn.pressed.connect(func():
		GameNavigationMenu.close(root)
	)

	var sep: HSeparator = root.get_node("Center/%s/Scroll/Shell/Separator" % MENU_PANEL_NAME)
	sep.add_theme_color_override("separator", Color(CYAN.r, CYAN.g, CYAN.b, 0.3))

	var stats_host: VBoxContainer = root.get_node("Center/%s/Scroll/Shell/StatsHost" % MENU_PANEL_NAME)
	var cargo_label: Label = root.get_node("Center/%s/Scroll/Shell/CargoSectionLabel" % MENU_PANEL_NAME)
	var cargo_host: VBoxContainer = root.get_node("Center/%s/Scroll/Shell/CargoHost" % MENU_PANEL_NAME)
	var mission_requirements_label: Label = root.get_node("Center/%s/Scroll/Shell/MissionRequirementsSectionLabel" % MENU_PANEL_NAME)
	var mission_requirements_host: VBoxContainer = root.get_node("Center/%s/Scroll/Shell/MissionRequirementsHost" % MENU_PANEL_NAME)
	var settings_label: Label = root.get_node("Center/%s/Scroll/Shell/SettingsSectionLabel" % MENU_PANEL_NAME)
	var settings_host: VBoxContainer = root.get_node("Center/%s/Scroll/Shell/SettingsHost" % MENU_PANEL_NAME)
	var debug_label: Label = root.get_node("Center/%s/Scroll/Shell/DebugSectionLabel" % MENU_PANEL_NAME)
	var debug_host: VBoxContainer = root.get_node("Center/%s/Scroll/Shell/DebugHost" % MENU_PANEL_NAME)

	for section_label in [cargo_label, mission_requirements_label, settings_label, debug_label]:
		section_label.add_theme_font_size_override("font_size", int(14 * _fs_scale))
		section_label.add_theme_color_override("font_color", TEXT_MUTED)
		if _disp: (section_label as Label).add_theme_font_override("font", _disp)

	for host in [stats_host, cargo_host, mission_requirements_host, settings_host, debug_host]:
		host.add_theme_constant_override("separation", 10)

	# Player stats
	stats_host.add_child(_build_stats_card())

	# Cargo — minerals currently in inventory
	cargo_host.add_child(_build_inventory_card())

	# Active mission requirements (only shown when a contractor order is active)
	var req := _build_mission_requirements_card()
	if req != null:
		mission_requirements_label.visible = true
		mission_requirements_host.visible = true
		mission_requirements_host.add_child(req)
	else:
		mission_requirements_label.visible = false
		mission_requirements_host.visible = false

	# Settings
	settings_host.add_child(_build_settings_entry_card(owner))
	settings_host.add_child(_build_reset_progress_button(owner))

	# Debug — editor only; never shown in exported builds
	if OS.has_feature("editor"):
		debug_host.add_child(_build_debug_section(owner))
	else:
		debug_label.visible = false
		debug_host.visible = false

	# Logbook overlay (hidden until logbook_btn pressed)
	var logbook_overlay := _build_logbook_overlay(vp_w)
	root.add_child(logbook_overlay)
	logbook_btn.pressed.connect(func():
		logbook_overlay.visible = true
	)

	# Discoveries overlay (hidden until discoveries_btn pressed)
	var discoveries_overlay := _build_discoveries_overlay(vp_w)
	root.add_child(discoveries_overlay)
	discoveries_btn.pressed.connect(func():
		discoveries_overlay.visible = true
	)

	return root

# ---------------------------------------------------------------------------
# Stats card
# ---------------------------------------------------------------------------

static func _build_stats_card() -> PanelContainer:
	var card: PanelContainer = GameMenuStatsCardScene.instantiate()
	var style := _card_style(0.45)
	card.add_theme_stylebox_override("panel", style)

	var app = AppControllerHelper.get_instance()
	var francs := 0
	var francs_str := "?"
	var missions := 0
	if app:
		if app.has_method("get_franc_balance"):
			francs = int(app.get_franc_balance())
			francs_str = NumberFormat.commas(str(francs)) + " F"
	missions = int(RocketsManager.get_completed_mission_count())

	var hbox: HBoxContainer = card.get_node("StatsRow")

	for stat_pair in [
		["FRANCS", francs_str, AMBER],
		["MISSIONS", str(missions), TEXT_COLOR],
	]:
		var col: VBoxContainer = GameMenuStatColumnScene.instantiate()
		hbox.add_child(col)
		var key_lbl: Label = col.get_node("KeyLabel")
		key_lbl.text = stat_pair[0]
		key_lbl.add_theme_color_override("font_color", TEXT_MUTED)
		var val_lbl: Label = col.get_node("ValueLabel")
		val_lbl.text = stat_pair[1]
		val_lbl.add_theme_color_override("font_color", stat_pair[2])

	return card

# ---------------------------------------------------------------------------
# Settings / actions section
# ---------------------------------------------------------------------------

static func _build_settings_entry_card(owner: Node) -> VBoxContainer:
	var host: VBoxContainer = GameMenuActionsSectionScene.instantiate()

	# 1. Practice Mining
	var practice_btn: Button = host.get_node("PracticeMiningButton")
	_apply_button_style(practice_btn, true)
	_apply_button_font_color(practice_btn, AMBER)
	practice_btn.pressed.connect(func():
		AppControllerHelper.open_mining_practice_panel("navigation_menu")
		GameNavigationMenu.close(owner)
	)

	# 2. Replay Tutorial
	var replay_btn: Button = host.get_node("ReplayTutorialButton")
	_apply_button_style(replay_btn, false)
	_apply_button_font_color(replay_btn, TITLE_COLOR)
	replay_btn.pressed.connect(func():
		var app := AppControllerHelper.get_instance()
		if app and app.has_method("replay_tutorial_for_current_mission"):
			app.replay_tutorial_for_current_mission()
		GameNavigationMenu.close(owner)
	)

	# 3. Skip Tutorial (Conditional)
	var skip_btn: Button = host.get_node("SkipTutorialButton")
	_apply_button_style(skip_btn, false)
	_apply_button_font_color(skip_btn, TITLE_COLOR)
	var app_check := AppControllerHelper.get_instance()
	if app_check != null and app_check.has_method("skip_tutorial"):
		skip_btn.pressed.connect(func():
			var app2 := AppControllerHelper.get_instance()
			if app2 and app2.has_method("skip_tutorial"):
				app2.skip_tutorial()
			GameNavigationMenu.close(owner)
		)
	else:
		skip_btn.visible = false

	# 4. Dialogue Toggle
	var dlg_enabled := AppControllerHelper.is_citizen_science_dialogue_enabled(true)
	var dlg_btn: Button = host.get_node("DialogueToggleButton")
	dlg_btn.text = "Dialogue: %s" % ("On" if dlg_enabled else "Off")
	_apply_button_style(dlg_btn, false)
	_apply_button_font_color(dlg_btn, TITLE_COLOR)
	dlg_btn.pressed.connect(func():
		var app3 := AppControllerHelper.get_instance()
		if app3 and app3.has_method("is_citizen_science_dialogue_enabled") \
				and app3.has_method("set_citizen_science_dialogue_enabled"):
			var next := not bool(app3.is_citizen_science_dialogue_enabled())
			app3.set_citizen_science_dialogue_enabled(next)
			dlg_btn.text = "Dialogue: %s" % ("On" if next else "Off")
	)

	return host

static func _build_reset_progress_button(owner: Node) -> Button:
	var reset_btn: Button = GameMenuResetButtonScene.instantiate()
	_apply_button_style(reset_btn, false)
	_apply_button_font_color(reset_btn, AMBER)
	var style = reset_btn.get_theme_stylebox("normal").duplicate()
	style.border_color = Color(AMBER.r, AMBER.g, AMBER.b, 0.5)
	reset_btn.add_theme_stylebox_override("normal", style)
	reset_btn.pressed.connect(func():
		GameNavigationMenu.close(owner)
		var app = AppControllerHelper.get_instance()
		if app and app.has_method("full_factory_reset"):
			app.full_factory_reset()
		elif app and app.has_method("_on_reset_all"):
			app._on_reset_all()
	)
	return reset_btn

static func _apply_button_font_color(btn: Button, color: Color) -> void:
	btn.add_theme_color_override("font_color", color)
	btn.add_theme_color_override("font_hover_color", color)
	btn.add_theme_color_override("font_pressed_color", color)

static func _build_debug_section(owner: Node) -> VBoxContainer:
	var vbox: VBoxContainer = GameMenuDebugSectionScene.instantiate()
	var instant_btn: Button = vbox.get_node("InstantMiningButton")
	_apply_button_style(instant_btn, false)
	instant_btn.pressed.connect(func():
		var app = AppControllerHelper.get_instance()
		if app and app.has_method("trigger_instant_mining"):
			app.trigger_instant_mining()
			GameNavigationMenu.close(owner)
	)

	var money_btn: Button = vbox.get_node("MoneyButton")
	_apply_button_style(money_btn, false)
	money_btn.pressed.connect(func():
		var app = AppControllerHelper.get_instance()
		if app and app.has_method("set_franc_balance_from_react"):
			app.set_franc_balance_from_react(10000000)
	)

	var mission_lbl: Label = vbox.get_node("MissionLabel")
	mission_lbl.add_theme_color_override("font_color", TEXT_MUTED)

	var mission_buttons: Array[Button] = [
		vbox.get_node("MissionRow/Mission1Button"),
		vbox.get_node("MissionRow/Mission2Button"),
		vbox.get_node("MissionRow/Mission3Button"),
		vbox.get_node("MissionRow/Mission4Button"),
		vbox.get_node("MissionRow/Mission5Button")
	]
	for i in range(mission_buttons.size()):
		var mbtn := mission_buttons[i]
		_apply_button_style(mbtn, false)
		mbtn.pressed.connect(func():
			var app = AppControllerHelper.get_instance()
			if app and app.has_method("debug_skip_to_mission"):
				app.debug_skip_to_mission(i + 1)
			GameNavigationMenu.close(owner)
		)

	return vbox

# ---------------------------------------------------------------------------
# Logbook overlay (full-screen modal, built once, toggled visible)
# ---------------------------------------------------------------------------

static func _build_logbook_overlay(vp_w: float = 1280.0) -> ColorRect:
	var overlay: ColorRect = GameNavigationOverlayScene.instantiate()
	overlay.name = "LogbookOverlay"
	overlay.color = Color(0.0, 0.0, 0.0, 0.55)
	overlay.set_meta("tutorial_zone_exempt", true)
	overlay.visible = false

	var panel: PanelContainer = overlay.get_node("Center/Panel")
	panel.custom_minimum_size = Vector2(clampf(vp_w - 48.0, 320.0, 720.0), 520.0)

	var style := StyleBoxFlat.new()
	style.bg_color = PANEL_BG
	style.border_color = CYAN
	style.set_border_width_all(2)
	style.set_corner_radius_all(8)
	style.content_margin_left = 20
	style.content_margin_right = 20
	style.content_margin_top = 16
	style.content_margin_bottom = 16
	panel.add_theme_stylebox_override("panel", style)

	var vbox: VBoxContainer = overlay.get_node("Center/Panel/Content")
	var title: Label = overlay.get_node("Center/Panel/Content/Header/Title")
	title.text = "Mission Logbook"
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", TITLE_COLOR)

	var close_btn: Button = overlay.get_node("Center/Panel/Content/Header/CloseButton")
	_apply_button_style(close_btn, false)
	close_btn.custom_minimum_size = Vector2(120, 46)
	close_btn.pressed.connect(func():
		overlay.visible = false
	)

	var sep: HSeparator = overlay.get_node("Center/Panel/Content/Separator")
	sep.add_theme_color_override("separator", Color(CYAN.r, CYAN.g, CYAN.b, 0.3))

	var subtitle: Label = overlay.get_node("Center/Panel/Content/Subtitle")
	subtitle.text = "Your mission history — most recent first."
	subtitle.add_theme_font_size_override("font_size", 15)
	subtitle.add_theme_color_override("font_color", TEXT_MUTED)

	var entries: VBoxContainer = overlay.get_node("Center/Panel/Content/Scroll/Body")

	_populate_logbook_entries(entries)

	# Clicking the backdrop closes the overlay
	overlay.gui_input.connect(func(event: InputEvent):
		if event is InputEventMouseButton and event.pressed:
			if not panel.get_global_rect().has_point(event.global_position):
				overlay.visible = false
	)

	return overlay

static func _populate_logbook_entries(entries: VBoxContainer) -> void:
	var log = MissionLogManager
	var rows: Array = log.get_missions() if log else []

	if rows.is_empty():
		var empty_lbl: Label = MenuLogbookEmptyScene.instantiate()
		empty_lbl.text = "No missions completed yet."
		empty_lbl.add_theme_font_size_override("font_size", 16)
		empty_lbl.add_theme_color_override("font_color", TEXT_MUTED)
		entries.add_child(empty_lbl)
		return

	for idx in range(rows.size() - 1, -1, -1):
		var entry = rows[idx]
		if typeof(entry) != TYPE_DICTIONARY:
			continue

		var card: PanelContainer = MenuLogbookCardScene.instantiate()
		card.add_theme_stylebox_override("panel", _card_style(0.45))
		entries.add_child(card)

		var body: VBoxContainer = card.get_node("Body")
		body.add_theme_constant_override("separation", 4)

		# Header: target name (label) + date
		var target_name := str(entry.get("label", entry.get("target_id", "Unknown Target")))
		var date_str := _format_date(str(entry.get("last_timestamp", entry.get("timestamp", ""))))
		var header_text := target_name
		if date_str != "":
			header_text += "  ·  %s" % date_str

		var header_lbl: Label = card.get_node("Body/HeaderLabel")
		header_lbl.text = header_text
		header_lbl.add_theme_font_size_override("font_size", 17)
		header_lbl.add_theme_color_override("font_color", CYAN)

		# Show: payout, contractor (if present)
		var display_keys: Array = ["payout", "subcontractor_name"]
		for key in display_keys:
			if not entry.has(key):
				continue
			var val = entry.get(key)
			if val == null or str(val) == "" or str(val) == "0":
				continue
			var row: HBoxContainer = MenuLogbookKeyValueRowScene.instantiate()
			body.add_child(row)
			var key_lbl: Label = row.get_node("KeyLabel")
			key_lbl.text = "%s:" % _format_key(key)
			key_lbl.add_theme_font_size_override("font_size", 14)
			key_lbl.add_theme_color_override("font_color", TEXT_MUTED)
			var val_lbl: Label = row.get_node("ValueLabel")
			val_lbl.text = _format_value(key, val)
			val_lbl.add_theme_font_size_override("font_size", 14)
			val_lbl.add_theme_color_override("font_color", TEXT_COLOR)

# ---------------------------------------------------------------------------
# Discoveries overlay
# ---------------------------------------------------------------------------

static func _build_discoveries_overlay(vp_w: float = 1280.0) -> ColorRect:
	var overlay: ColorRect = GameNavigationOverlayScene.instantiate()
	overlay.name = "DiscoveriesOverlay"
	overlay.color = Color(0.0, 0.0, 0.0, 0.55)
	overlay.set_meta("tutorial_zone_exempt", true)
	overlay.visible = false

	var panel: PanelContainer = overlay.get_node("Center/Panel")
	panel.custom_minimum_size = Vector2(clampf(vp_w - 48.0, 320.0, 720.0), 520.0)

	var style := StyleBoxFlat.new()
	style.bg_color = PANEL_BG
	style.border_color = AMBER
	style.set_border_width_all(2)
	style.set_corner_radius_all(8)
	style.content_margin_left = 20
	style.content_margin_right = 20
	style.content_margin_top = 16
	style.content_margin_bottom = 16
	panel.add_theme_stylebox_override("panel", style)

	var vbox: VBoxContainer = overlay.get_node("Center/Panel/Content")
	var title: Label = overlay.get_node("Center/Panel/Content/Header/Title")
	title.text = "Personal Discoveries"
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", AMBER)

	var close_btn: Button = overlay.get_node("Center/Panel/Content/Header/CloseButton")
	_apply_button_style(close_btn, false)
	close_btn.custom_minimum_size = Vector2(120, 46)
	close_btn.pressed.connect(func():
		overlay.visible = false
	)

	var sep: HSeparator = overlay.get_node("Center/Panel/Content/Separator")
	sep.add_theme_color_override("separator", Color(AMBER.r, AMBER.g, AMBER.b, 0.3))

	var subtitle: Label = overlay.get_node("Center/Panel/Content/Subtitle")
	subtitle.text = "Targets you personally discovered — tagged with your name."
	subtitle.add_theme_font_size_override("font_size", 15)
	subtitle.add_theme_color_override("font_color", TEXT_MUTED)

	var scroll: ScrollContainer = overlay.get_node("Center/Panel/Content/Scroll")
	scroll.custom_minimum_size = Vector2(0, 320)
	var list: VBoxContainer = overlay.get_node("Center/Panel/Content/Scroll/Body")

	var discoveries := _get_personal_discoveries()
	if discoveries.is_empty():
		var empty_lbl: Label = MenuEmptyStateLabelScene.instantiate()
		empty_lbl.text = "No discoveries yet. Mine a target for the first time to claim it."
		empty_lbl.add_theme_font_size_override("font_size", 16)
		empty_lbl.add_theme_color_override("font_color", TEXT_MUTED)
		list.add_child(empty_lbl)
	else:
		for disc in discoveries:
			list.add_child(_build_discovery_row(disc))

	return overlay

static func _get_personal_discoveries() -> Array:
	var log_mgr = MissionLogManager
	var missions: Array = log_mgr.get_missions()
	var claimed: Dictionary = RocketsManager.load_state().get("discovery_bonus_claimed", {})
	# Build per-target first-visit map from mission log
	var by_target := {}
	for m in missions:
		if typeof(m) != TYPE_DICTIONARY:
			continue
		var tid := str(m.get("target_id", "")).strip_edges()
		if tid == "" or tid.begins_with("debug"):
			continue
		if not claimed.has(tid):
			continue  # only show targets where we got the discovery bonus (= first visit)
		var ts := str(m.get("timestamp", ""))
		if not by_target.has(tid) or ts < str(by_target[tid].get("timestamp", "")):
			by_target[tid] = {
				"target_id": tid,
				"label": str(m.get("label", tid)),
				"timestamp": ts,
				"target_type": str(m.get("target_type", "asteroid"))
			}
	var result := by_target.values()
	result.sort_custom(func(a, b): return str(a.get("timestamp","")) > str(b.get("timestamp","")))
	return result

static func _build_discovery_row(disc: Dictionary) -> HBoxContainer:
	var row: HBoxContainer = MenuDiscoveryRowScene.instantiate()
	var icon_lbl: Label = row.get_node("IconLabel")
	var ttype := str(disc.get("target_type", "asteroid"))
	icon_lbl.text = "🪐" if ttype == "planet" else "☄"
	icon_lbl.add_theme_font_size_override("font_size", 22)

	var name_lbl: Label = row.get_node("Info/NameLabel")
	name_lbl.text = str(disc.get("label", disc.get("target_id", "Unknown")))
	name_lbl.add_theme_font_size_override("font_size", 18)
	name_lbl.add_theme_color_override("font_color", AMBER)

	var ts_lbl: Label = row.get_node("Info/TimestampLabel")
	var ts := str(disc.get("timestamp", ""))
	ts_lbl.text = "Discovered: %s" % (ts.substr(0, 10) if ts.length() >= 10 else ts)
	ts_lbl.add_theme_font_size_override("font_size", 14)
	ts_lbl.add_theme_color_override("font_color", TEXT_MUTED)

	var badge_lbl: Label = row.get_node("Info/BadgeLabel")
	badge_lbl.text = "First discovery — your name is attached"
	badge_lbl.add_theme_font_size_override("font_size", 13)
	badge_lbl.add_theme_color_override("font_color", Color(0.3, 0.85, 0.55))

	return row

# ---------------------------------------------------------------------------
# Inventory card
# ---------------------------------------------------------------------------

static func _build_inventory_card() -> PanelContainer:
	var card: PanelContainer = GameMenuContentCardScene.instantiate()
	card.add_theme_stylebox_override("panel", _card_style(0.45))
	var vbox: VBoxContainer = card.get_node("Body")
	vbox.add_theme_constant_override("separation", 6)

	var inv: Dictionary = RocketsManager.get_inventory()
	if inv.is_empty():
		var empty_lbl: Label = MenuEmptyStateLabelScene.instantiate()
		empty_lbl.text = "No minerals in inventory. Complete a mining mission to collect resources."
		empty_lbl.add_theme_font_size_override("font_size", 16)
		empty_lbl.add_theme_color_override("font_color", TEXT_MUTED)
		vbox.add_child(empty_lbl)
		return card

	var keys: Array = inv.keys()
	keys.sort()
	for mineral in keys:
		var amount := int(inv.get(mineral, 0))
		if amount <= 0:
			continue
		var row: HBoxContainer = ResourceValueRowScene.instantiate()
		vbox.add_child(row)
		var name_lbl: Label = row.get_node("NameLabel")
		name_lbl.text = str(mineral)
		name_lbl.add_theme_font_size_override("font_size", 17)
		name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
		var qty_lbl: Label = row.get_node("ValueLabel")
		qty_lbl.text = "%d kg" % amount
		qty_lbl.add_theme_font_size_override("font_size", 17)
		qty_lbl.add_theme_color_override("font_color", CYAN)
		qty_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT

	return card

# ---------------------------------------------------------------------------
# Mission requirements card
# ---------------------------------------------------------------------------

static func _build_mission_requirements_card() -> PanelContainer:
	var required := RocketsManager.get_current_requested_minerals()
	if required.is_empty():
		return null

	var card: PanelContainer = GameMenuContentCardScene.instantiate()
	card.add_theme_stylebox_override("panel", _card_style(0.45))
	var vbox: VBoxContainer = card.get_node("Body")
	vbox.add_theme_constant_override("separation", 6)

	var inv := RocketsManager.get_inventory()
	var keys: Array = required.keys()
	keys.sort()
	for mineral in keys:
		var need := int(required.get(mineral, 0))
		var have := int(inv.get(mineral, 0))
		var done := have >= need

		var row: HBoxContainer = ResourceValueRowScene.instantiate()
		vbox.add_child(row)
		var name_lbl: Label = row.get_node("NameLabel")
		name_lbl.text = str(mineral).capitalize()
		name_lbl.add_theme_font_size_override("font_size", 17)
		name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
		var qty_lbl: Label = row.get_node("ValueLabel")
		qty_lbl.text = "%d / %d kg" % [have, need]
		qty_lbl.add_theme_font_size_override("font_size", 17)
		qty_lbl.add_theme_color_override("font_color", Color(0.30, 1.0, 0.45) if done else AMBER)
		qty_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT

	return card

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

static func _card_style(border_alpha: float) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = CARD_BG
	style.border_color = Color(CYAN.r, CYAN.g, CYAN.b, border_alpha)
	style.set_border_width_all(1)
	style.set_corner_radius_all(6)
	style.content_margin_left = 14
	style.content_margin_right = 14
	style.content_margin_top = 12
	style.content_margin_bottom = 12
	return style

static func _apply_button_style(btn: Button, primary: bool) -> void:
	if btn == null:
		return
	btn.custom_minimum_size = Vector2(0, 56)
	var color := AMBER if primary else CYAN
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0, 0, 0, 0)
	normal.border_color = color
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(6)
	normal.content_margin_left = 18
	normal.content_margin_right = 18
	normal.content_margin_top = 10
	normal.content_margin_bottom = 10
	var hover := normal.duplicate()
	hover.bg_color = Color(color.r, color.g, color.b, 0.12)
	var pressed_style := normal.duplicate()
	pressed_style.bg_color = Color(color.r, color.g, color.b, 0.22)
	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", pressed_style)
	btn.add_theme_stylebox_override("focus", hover)
	btn.add_theme_color_override("font_color", color)
	btn.add_theme_color_override("font_hover_color", color)
	btn.add_theme_color_override("font_pressed_color", color)
	btn.add_theme_font_size_override("font_size", 22)

static func _refresh_dialogue_button_text(btn: Button) -> void:
	if btn == null:
		return
	var enabled := AppControllerHelper.is_citizen_science_dialogue_enabled(true)
	btn.text = "Citizen Science Dialogue: %s" % ("On" if enabled else "Off")

static func _set_tutorial_overlay_visible(tree: SceneTree, visible: bool) -> void:
	if tree == null or tree.root == null:
		return
	var overlay = tree.root.get_node_or_null("TutorialCoachOverlay")
	if overlay == null:
		return
	overlay.visible = visible
	if visible and overlay.has_method("_refresh"):
		overlay.call_deferred("_refresh")

static func _format_date(ts: String) -> String:
	if ts == "":
		return ""
	# Accept ISO-8601 prefix "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM"
	var parts := ts.split("T")
	var date_part := parts[0] if parts.size() > 0 else ts
	# If it looks like a Unix timestamp (all digits), skip
	if date_part.is_valid_int():
		return ""
	return date_part

static func _format_key(key: String) -> String:
	const KEY_LABELS := {
		"label": "Target",
		"target_id": "Target",
		"rocket_id": "Ship",
		"payout": "Earned",
		"xp_awarded": "XP earned",
		"action": "Outcome",
		"subcontractor_name": "Contractor",
		"operation_mode": "Route",
		"order_completion_pct": "Order filled",
	}
	if KEY_LABELS.has(key):
		return KEY_LABELS[key]
	var words := key.replace("_", " ").split(" ")
	for i in range(words.size()):
		var w := str(words[i])
		if w.length() > 0:
			words[i] = w.substr(0, 1).to_upper() + w.substr(1)
	return " ".join(words)

static func _format_value(key: String, value) -> String:
	if value == null:
		return "-"
	if key in ["payout", "payout_total"]:
		return "%s F" % NumberFormat.commas(str(int(value)))
	if key == "action":
		match str(value):
			"scrap": return "Sold & scrapped"
			"leave_orbit": return "Left in orbit"
			"survey": return "Survey run"
	if key == "operation_mode":
		match str(value):
			"contract": return "Contract route"
			"survey": return "Survey route"
	if key == "order_completion_pct":
		return "%d%%" % int(value)
	return str(value)
