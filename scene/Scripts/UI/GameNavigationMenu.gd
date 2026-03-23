extends RefCounted
class_name GameNavigationMenu

const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const AppLogger = preload("res://Scripts/Utils/Logger.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const SubcontractorManager = preload("res://Scripts/Utils/SubcontractorManager.gd")
const MissionLogManager = preload("res://Scripts/Utils/MissionLogManager.gd")
const NumberFormat = preload("res://Scripts/Utils/NumberFormat.gd")
const ConstructionManager = preload("res://Scripts/Utils/ConstructionManager.gd")
const MineralPricing = preload("res://Scripts/Utils/MineralPricing.gd")
const RoomCatalog = preload("res://Scripts/Utils/RoomCatalog.gd")
const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const FirstTimeMechanicTracker = preload("res://Scripts/Utils/FirstTimeMechanicTracker.gd")

const MENU_LAYER_NAME := "GameMenuLayer"
const MENU_ROOT_NAME := "GameMenuRoot"
const MENU_PANEL_NAME := "GameMenuPanel"
const MENU_LAYER_Z := 150

const TITLE_COLOR := Color(0.95, 0.93, 0.90, 1.0)
const TEXT_COLOR := Color(0.82, 0.84, 0.88, 1.0)
const TEXT_MUTED := Color(0.55, 0.60, 0.68, 1.0)
const CYAN := Color(0.28, 0.88, 0.96, 1.0)
const AMBER := Color(0.941, 0.690, 0.188, 1.0)
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
	var root := Control.new()
	root.name = MENU_ROOT_NAME
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	root.process_mode = Node.PROCESS_MODE_ALWAYS
	root.set_meta("tutorial_zone_exempt", true)

	var backdrop := ColorRect.new()
	backdrop.name = "Backdrop"
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	backdrop.color = Color(0.03, 0.05, 0.09, 0.70)
	backdrop.set_meta("tutorial_zone_exempt", true)
	root.add_child(backdrop)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_STOP
	center.set_meta("tutorial_zone_exempt", true)
	root.add_child(center)

	var vp_w := 1280.0
	if owner != null and owner.get_viewport() != null:
		vp_w = owner.get_viewport().get_visible_rect().size.x
	var panel := PanelContainer.new()
	panel.name = MENU_PANEL_NAME
	panel.custom_minimum_size = Vector2(clampf(vp_w - 48.0, 320.0, 920.0), 0.0)
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	panel.set_meta("tutorial_zone_exempt", true)
	center.add_child(panel)

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
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(0, clampf(vp_h * 0.82, 400.0, 740.0))
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.set_meta("tutorial_zone_exempt", true)
	panel.add_child(scroll)

	var shell := VBoxContainer.new()
	shell.add_theme_constant_override("separation", 14)
	shell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	shell.set_meta("tutorial_zone_exempt", true)
	scroll.add_child(shell)

	# Header — game identity + action buttons
	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 12)
	shell.add_child(header)

	var title_col := VBoxContainer.new()
	title_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_col.add_theme_constant_override("separation", 2)
	header.add_child(title_col)

	var eyebrow := Label.new()
	eyebrow.text = "PLANET HUNTERS"
	eyebrow.add_theme_font_size_override("font_size", 11)
	eyebrow.add_theme_color_override("font_color", CYAN)
	title_col.add_child(eyebrow)

	var title := Label.new()
	title.text = "Base of Operations"
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", TITLE_COLOR)
	title_col.add_child(title)

	var logbook_btn := _build_button("Logbook", false)
	logbook_btn.custom_minimum_size = Vector2(110, 50)
	header.add_child(logbook_btn)

	var discoveries_btn := _build_button("Discoveries", false)
	discoveries_btn.custom_minimum_size = Vector2(130, 50)
	header.add_child(discoveries_btn)

	var close_btn := _build_button("Close", false)
	close_btn.custom_minimum_size = Vector2(110, 50)
	close_btn.pressed.connect(func():
		preload("res://Scripts/UI/GameNavigationMenu.gd").close(owner)
	)
	header.add_child(close_btn)

	var sep := HSeparator.new()
	sep.add_theme_color_override("separator", Color(CYAN.r, CYAN.g, CYAN.b, 0.3))
	shell.add_child(sep)

	# Player stats
	shell.add_child(_build_stats_card())

	# Cargo — minerals currently in inventory
	shell.add_child(_build_section_header("CARGO"))
	shell.add_child(_build_inventory_card())

	# Active mission requirements (only shown when a contractor order is active)
	var req := _build_mission_requirements_card()
	if req != null:
		shell.add_child(_build_section_header("MISSION REQUIREMENTS"))
		shell.add_child(req)

	# Settings / Actions
	shell.add_child(_build_section_header("SETTINGS"))
	shell.add_child(_build_actions_section(owner))

	# Debug
	shell.add_child(_build_section_header("DEBUG"))
	shell.add_child(_build_debug_section(owner))

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
	var card := PanelContainer.new()
	var style := _card_style(0.45)
	card.add_theme_stylebox_override("panel", style)

	var app = AppControllerHelper.get_instance()
	var francs := 0
	var francs_str := "?"
	var level := 1
	var level_str := "?"
	var xp := 0
	var xp_str := "?"
	var missions := 0
	if app:
		if app.has_method("get_franc_balance"):
			francs = int(app.get_franc_balance())
			francs_str = NumberFormat.commas(str(francs)) + " F"
		if app.has_method("get_experience_level"):
			level = int(app.get_experience_level())
			level_str = str(level)
		if app.has_method("get_experience_xp"):
			xp = int(app.get_experience_xp())
			xp_str = str(xp)
	missions = int(RocketsManager.get_completed_mission_count())

	var hbox := HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 20)
	card.add_child(hbox)

	for stat_pair in [
		["LEVEL", level_str, CYAN],
		["XP", xp_str, TEXT_COLOR],
		["FRANCS", francs_str, AMBER],
		["MISSIONS", str(missions), TEXT_COLOR],
	]:
		var col := VBoxContainer.new()
		col.add_theme_constant_override("separation", 3)
		col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		hbox.add_child(col)
		var key_lbl := Label.new()
		key_lbl.text = stat_pair[0]
		key_lbl.add_theme_font_size_override("font_size", 10)
		key_lbl.add_theme_color_override("font_color", TEXT_MUTED)
		col.add_child(key_lbl)
		var val_lbl := Label.new()
		val_lbl.text = stat_pair[1]
		val_lbl.add_theme_font_size_override("font_size", 20)
		val_lbl.add_theme_color_override("font_color", stat_pair[2])
		val_lbl.clip_text = true
		col.add_child(val_lbl)

	return card

# ---------------------------------------------------------------------------
# Progress card (XP bar + next-level info)
# ---------------------------------------------------------------------------

static func _build_progress_card() -> PanelContainer:
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", _card_style(0.45))

	var app = AppControllerHelper.get_instance()
	var level := 1
	var xp := 0
	var total_xp := 0
	var next_req := 10
	if app:
		level = int(app.get_experience_level()) if app.has_method("get_experience_level") else 1
		xp = int(app.get_experience_xp()) if app.has_method("get_experience_xp") else 0
		total_xp = int(app.get_total_experience()) if app.has_method("get_total_experience") else xp
		next_req = int(app.get_xp_required_for_next_level()) if app.has_method("get_xp_required_for_next_level") else max(10, xp + 1)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	card.add_child(vbox)

	var level_row := HBoxContainer.new()
	vbox.add_child(level_row)

	var level_lbl := Label.new()
	level_lbl.text = "Level %d" % level
	level_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	level_lbl.add_theme_font_size_override("font_size", 22)
	level_lbl.add_theme_color_override("font_color", CYAN)
	level_row.add_child(level_lbl)

	var xp_lbl := Label.new()
	xp_lbl.text = "Total XP: %d  •  Current: %d" % [total_xp, xp]
	xp_lbl.add_theme_font_size_override("font_size", 16)
	xp_lbl.add_theme_color_override("font_color", TEXT_MUTED)
	level_row.add_child(xp_lbl)

	var bar := ProgressBar.new()
	bar.max_value = max(next_req, 1)
	bar.value = clamp(xp, 0, bar.max_value)
	bar.show_percentage = false
	bar.custom_minimum_size = Vector2(0, 12)
	var bar_fill := StyleBoxFlat.new()
	bar_fill.bg_color = CYAN
	bar_fill.set_corner_radius_all(4)
	var bar_bg := StyleBoxFlat.new()
	bar_bg.bg_color = Color(0.10, 0.13, 0.22, 1.0)
	bar_bg.set_corner_radius_all(4)
	bar.add_theme_stylebox_override("fill", bar_fill)
	bar.add_theme_stylebox_override("background", bar_bg)
	vbox.add_child(bar)

	var next_lbl := Label.new()
	next_lbl.text = "%d XP to next level" % max(next_req - xp, 0)
	next_lbl.add_theme_font_size_override("font_size", 15)
	next_lbl.add_theme_color_override("font_color", TEXT_MUTED)
	vbox.add_child(next_lbl)

	return card

# ---------------------------------------------------------------------------
# Settings / actions section
# ---------------------------------------------------------------------------

static func _build_actions_section(owner: Node) -> VBoxContainer:
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)

	var practice_btn := _build_button("Practice Mining", true)
	practice_btn.pressed.connect(func():
		var opened := AppControllerHelper.open_mining_practice_panel("menu_panel")
		if opened:
			preload("res://Scripts/UI/GameNavigationMenu.gd").close(owner)
	)
	vbox.add_child(practice_btn)

	var skip_btn := _build_button("Skip Onboarding", false)
	skip_btn.pressed.connect(func():
		var app = AppControllerHelper.get_instance()
		if app and app.has_method("skip_tutorial"):
			app.skip_tutorial()
		preload("res://Scripts/UI/GameNavigationMenu.gd").close(owner)
	)
	vbox.add_child(skip_btn)

	var replay_mission_btn := _build_button("Replay This Mission Guide", false)
	replay_mission_btn.pressed.connect(func():
		var app = AppControllerHelper.get_instance()
		if app and app.has_method("replay_tutorial_for_current_mission"):
			app.replay_tutorial_for_current_mission()
		preload("res://Scripts/UI/GameNavigationMenu.gd").close(owner)
	)
	vbox.add_child(replay_mission_btn)

	var replay_all_btn := _build_button("Replay Full Onboarding", false)
	replay_all_btn.pressed.connect(func():
		var app = AppControllerHelper.get_instance()
		if app and app.has_method("replay_tutorial_from_mission1"):
			app.replay_tutorial_from_mission1()
		preload("res://Scripts/UI/GameNavigationMenu.gd").close(owner)
	)
	vbox.add_child(replay_all_btn)

	var dialogue_btn := _build_button("", false)
	_refresh_dialogue_button_text(dialogue_btn)
	dialogue_btn.pressed.connect(func():
		var app = AppControllerHelper.get_instance()
		if app and app.has_method("is_citizen_science_dialogue_enabled") and app.has_method("set_citizen_science_dialogue_enabled"):
			var next_enabled := not bool(app.is_citizen_science_dialogue_enabled())
			app.set_citizen_science_dialogue_enabled(next_enabled)
		_refresh_dialogue_button_text(dialogue_btn)
	)
	vbox.add_child(dialogue_btn)

	var reset_btn := _build_button("Reset All Data", false)
	reset_btn.pressed.connect(func():
		var app = AppControllerHelper.get_instance()
		if app and app.has_method("_on_reset_all"):
			app._on_reset_all()
		preload("res://Scripts/UI/GameNavigationMenu.gd").close(owner)
	)
	vbox.add_child(reset_btn)

	return vbox

# ---------------------------------------------------------------------------
# Unlocks card
# ---------------------------------------------------------------------------

static func _build_unlocks_card() -> PanelContainer:
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", _card_style(0.45))

	var app = AppControllerHelper.get_instance()
	var current_level := 1
	if app and app.has_method("get_experience_level"):
		current_level = int(app.get_experience_level())

	var list := VBoxContainer.new()
	list.add_theme_constant_override("separation", 4)
	card.add_child(list)

	var unlocks_by_level := {}
	const ROCKET_DISPLAY_NAMES := {
		"starterrocket1": "Starter Rocket 1",
		"starterrocket2": "Starter Rocket 2",
		"starterrocket3": "Starter Rocket 3",
	}
	for rocket_id in RocketsManager.ROCKET_UNLOCK_LEVELS.keys():
		var lvl := int(RocketsManager.ROCKET_UNLOCK_LEVELS.get(rocket_id, 1))
		if not unlocks_by_level.has(lvl):
			unlocks_by_level[lvl] = []
		var display_name: String = str(ROCKET_DISPLAY_NAMES.get(str(rocket_id), str(rocket_id)))
		unlocks_by_level[lvl].append("Ship: %s" % display_name)

	for idx in range(SubcontractorManager.SUBCONTRACTORS.size()):
		var c = SubcontractorManager.SUBCONTRACTORS[idx]
		var lvl := int(SubcontractorManager.get_unlock_level_for_index(idx))
		if not unlocks_by_level.has(lvl):
			unlocks_by_level[lvl] = []
		var cname = str(c.get("name", ""))
		if c.get("hidden", false):
			cname = "Classified Subcontractor"
		unlocks_by_level[lvl].append("Partner: %s" % cname)

	for m in MISSION_UNLOCKS:
		var lvl := int(m.get("level", 1))
		if not unlocks_by_level.has(lvl):
			unlocks_by_level[lvl] = []
		unlocks_by_level[lvl].append("Mission: %s" % str(m.get("name", "")))

	var levels: Array = unlocks_by_level.keys()
	levels.sort()
	for lvl in levels:
		var header_lbl := Label.new()
		header_lbl.text = "Level %d" % lvl
		header_lbl.add_theme_font_size_override("font_size", 16)
		header_lbl.add_theme_color_override("font_color", CYAN if lvl <= current_level else TEXT_MUTED)
		list.add_child(header_lbl)

		var items: Array = unlocks_by_level[lvl].duplicate()
		items.sort()
		for item in items:
			var row := Label.new()
			row.text = "  • %s" % str(item)
			row.add_theme_font_size_override("font_size", 15)
			row.add_theme_color_override("font_color", TEXT_COLOR if lvl <= current_level else TEXT_MUTED)
			list.add_child(row)

	return card

# ---------------------------------------------------------------------------
# Debug section
# ---------------------------------------------------------------------------

static func _build_debug_section(owner: Node) -> VBoxContainer:
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)

	var instant_btn := _build_button("DEBUG: Start Instant Mining", false)
	instant_btn.pressed.connect(func():
		var app = AppControllerHelper.get_instance()
		if app and app.has_method("trigger_instant_mining"):
			app.trigger_instant_mining()
			preload("res://Scripts/UI/GameNavigationMenu.gd").close(owner)
	)
	vbox.add_child(instant_btn)

	var money_btn := _build_button("DEBUG: Grant 10M Francs", false)
	money_btn.pressed.connect(func():
		var app = AppControllerHelper.get_instance()
		if app and app.has_method("set_franc_balance_from_react"):
			app.set_franc_balance_from_react(10000000)
	)
	vbox.add_child(money_btn)

	var mission_lbl := Label.new()
	mission_lbl.text = "Jump to Mission:"
	mission_lbl.add_theme_font_size_override("font_size", 16)
	mission_lbl.add_theme_color_override("font_color", TEXT_MUTED)
	vbox.add_child(mission_lbl)

	var mission_row := HBoxContainer.new()
	mission_row.add_theme_constant_override("separation", 8)
	for i in range(1, 6):
		var mbtn := _build_button("M%d" % i, false)
		mbtn.custom_minimum_size = Vector2(80, 50)
		mbtn.pressed.connect(func():
			var app = AppControllerHelper.get_instance()
			if app and app.has_method("debug_skip_to_mission"):
				app.debug_skip_to_mission(i)
			preload("res://Scripts/UI/GameNavigationMenu.gd").close(owner)
		)
		mission_row.add_child(mbtn)
	vbox.add_child(mission_row)

	return vbox

# ---------------------------------------------------------------------------
# Logbook overlay (full-screen modal, built once, toggled visible)
# ---------------------------------------------------------------------------

static func _build_logbook_overlay(vp_w: float = 1280.0) -> ColorRect:
	var overlay := ColorRect.new()
	overlay.name = "LogbookOverlay"
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.color = Color(0.0, 0.0, 0.0, 0.55)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.set_meta("tutorial_zone_exempt", true)
	overlay.visible = false

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(clampf(vp_w - 48.0, 320.0, 720.0), 520.0)
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	center.add_child(panel)

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

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	panel.add_child(vbox)

	# Header row
	var header := HBoxContainer.new()
	vbox.add_child(header)

	var title := Label.new()
	title.text = "Mission Logbook"
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", TITLE_COLOR)
	header.add_child(title)

	var close_btn := _build_button("Close", false)
	close_btn.custom_minimum_size = Vector2(120, 46)
	close_btn.pressed.connect(func():
		overlay.visible = false
	)
	header.add_child(close_btn)

	var sep := HSeparator.new()
	sep.add_theme_color_override("separator", Color(CYAN.r, CYAN.g, CYAN.b, 0.3))
	vbox.add_child(sep)

	# Subtitle
	var subtitle := Label.new()
	subtitle.text = "Your mission history — most recent first."
	subtitle.add_theme_font_size_override("font_size", 15)
	subtitle.add_theme_color_override("font_color", TEXT_MUTED)
	vbox.add_child(subtitle)

	# Scroll area for entries
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(scroll)

	var entries := VBoxContainer.new()
	entries.add_theme_constant_override("separation", 8)
	entries.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(entries)

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
		var empty_lbl := Label.new()
		empty_lbl.text = "No mission records yet."
		empty_lbl.add_theme_font_size_override("font_size", 16)
		empty_lbl.add_theme_color_override("font_color", TEXT_MUTED)
		entries.add_child(empty_lbl)
		return

	for idx in range(rows.size() - 1, -1, -1):
		var entry = rows[idx]
		if typeof(entry) != TYPE_DICTIONARY:
			continue

		var card := PanelContainer.new()
		card.add_theme_stylebox_override("panel", _card_style(0.45))
		entries.add_child(card)

		var body := VBoxContainer.new()
		body.add_theme_constant_override("separation", 4)
		card.add_child(body)

		var action := str(entry.get("action", "mission"))
		var timestamp := str(entry.get("timestamp", ""))
		var header_text := "Mission #%d  •  %s" % [idx + 1, action]
		if timestamp != "":
			header_text += "  •  %s" % timestamp

		var header_lbl := Label.new()
		header_lbl.text = header_text
		header_lbl.add_theme_font_size_override("font_size", 17)
		header_lbl.add_theme_color_override("font_color", CYAN)
		body.add_child(header_lbl)

		for key in ["target_id", "rocket_id", "subcontractor_name", "operation_mode", "payout", "order_completion_pct"]:
			if not entry.has(key):
				continue
			var row := HBoxContainer.new()
			body.add_child(row)
			var key_lbl := Label.new()
			key_lbl.text = "%s:" % _format_key(key)
			key_lbl.custom_minimum_size = Vector2(160, 0)
			key_lbl.add_theme_font_size_override("font_size", 14)
			key_lbl.add_theme_color_override("font_color", TEXT_MUTED)
			row.add_child(key_lbl)
			var val_lbl := Label.new()
			val_lbl.text = _format_value(key, entry.get(key))
			val_lbl.add_theme_font_size_override("font_size", 14)
			val_lbl.add_theme_color_override("font_color", TEXT_COLOR)
			row.add_child(val_lbl)

# ---------------------------------------------------------------------------
# Discoveries overlay
# ---------------------------------------------------------------------------

static func _build_discoveries_overlay(vp_w: float = 1280.0) -> ColorRect:
	var overlay := ColorRect.new()
	overlay.name = "DiscoveriesOverlay"
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.color = Color(0.0, 0.0, 0.0, 0.55)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.set_meta("tutorial_zone_exempt", true)
	overlay.visible = false

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(clampf(vp_w - 48.0, 320.0, 720.0), 520.0)
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	center.add_child(panel)

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

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	panel.add_child(vbox)

	var header := HBoxContainer.new()
	vbox.add_child(header)

	var title := Label.new()
	title.text = "Personal Discoveries"
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", AMBER)
	header.add_child(title)

	var close_btn := _build_button("Close", false)
	close_btn.custom_minimum_size = Vector2(120, 46)
	close_btn.pressed.connect(func():
		overlay.visible = false
	)
	header.add_child(close_btn)

	var sep := HSeparator.new()
	sep.add_theme_color_override("separator", Color(AMBER.r, AMBER.g, AMBER.b, 0.3))
	vbox.add_child(sep)

	var subtitle := Label.new()
	subtitle.text = "Targets you personally discovered — tagged with your name."
	subtitle.add_theme_font_size_override("font_size", 15)
	subtitle.add_theme_color_override("font_color", TEXT_MUTED)
	vbox.add_child(subtitle)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.custom_minimum_size = Vector2(0, 320)
	vbox.add_child(scroll)

	var list := VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list.add_theme_constant_override("separation", 8)
	scroll.add_child(list)

	var discoveries := _get_personal_discoveries()
	if discoveries.is_empty():
		var empty_lbl := Label.new()
		empty_lbl.text = "No discoveries yet. Mine a target for the first time to claim it."
		empty_lbl.add_theme_font_size_override("font_size", 16)
		empty_lbl.add_theme_color_override("font_color", TEXT_MUTED)
		empty_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		list.add_child(empty_lbl)
	else:
		for disc in discoveries:
			list.add_child(_build_discovery_row(disc))

	return overlay

static func _get_personal_discoveries() -> Array:
	var log_mgr = preload("res://Scripts/Utils/MissionLogManager.gd")
	var missions: Array = log_mgr.get_missions()
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	var claimed: Dictionary = rm.load_state().get("discovery_bonus_claimed", {})
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
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)

	var icon_lbl := Label.new()
	var ttype := str(disc.get("target_type", "asteroid"))
	icon_lbl.text = "🪐" if ttype == "planet" else "☄"
	icon_lbl.add_theme_font_size_override("font_size", 22)
	row.add_child(icon_lbl)

	var info := VBoxContainer.new()
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(info)

	var name_lbl := Label.new()
	name_lbl.text = str(disc.get("label", disc.get("target_id", "Unknown")))
	name_lbl.add_theme_font_size_override("font_size", 18)
	name_lbl.add_theme_color_override("font_color", AMBER)
	info.add_child(name_lbl)

	var ts_lbl := Label.new()
	var ts := str(disc.get("timestamp", ""))
	ts_lbl.text = "Discovered: %s" % (ts.substr(0, 10) if ts.length() >= 10 else ts)
	ts_lbl.add_theme_font_size_override("font_size", 14)
	ts_lbl.add_theme_color_override("font_color", TEXT_MUTED)
	info.add_child(ts_lbl)

	var badge_lbl := Label.new()
	badge_lbl.text = "First discovery — your name is attached"
	badge_lbl.add_theme_font_size_override("font_size", 13)
	badge_lbl.add_theme_color_override("font_color", Color(0.3, 0.85, 0.55))
	info.add_child(badge_lbl)

	return row

# ---------------------------------------------------------------------------
# Job board card
# ---------------------------------------------------------------------------

static func _build_job_board_card() -> PanelContainer:
	var sm = preload("res://Scripts/Utils/SubcontractorManager.gd")
	var app = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
	var level := 1
	if app and app.has_method("get_experience_level_value"):
		level = int(app.get_experience_level_value())
	elif app and app.get("experience_level") != null:
		level = int(app.experience_level)

	var contractors: Array = sm.get_roster(level)
	var market_pct := 80
	var contractor_pct := 120

	var card := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.06, 0.09, 0.15, 1.0)
	style.set_corner_radius_all(6)
	card.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)
	card.add_child(vbox)

	# Legend row
	var legend_row := HBoxContainer.new()
	legend_row.add_theme_constant_override("separation", 8)
	vbox.add_child(legend_row)
	for col_text in ["Contractor", "Buys", "Payout", "Status"]:
		var lbl := Label.new()
		lbl.text = col_text
		lbl.add_theme_font_size_override("font_size", 13)
		lbl.add_theme_color_override("font_color", TEXT_MUTED)
		if col_text == "Contractor":
			lbl.custom_minimum_size = Vector2(130, 0)
		elif col_text == "Buys":
			lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		elif col_text == "Payout":
			lbl.custom_minimum_size = Vector2(100, 0)
		else:
			lbl.custom_minimum_size = Vector2(90, 0)
		legend_row.add_child(lbl)

	var sep := HSeparator.new()
	sep.add_theme_color_override("separator", Color(CYAN.r, CYAN.g, CYAN.b, 0.2))
	vbox.add_child(sep)

	if contractors.is_empty():
		var empty := Label.new()
		empty.text = "No contractors unlocked yet."
		empty.add_theme_font_size_override("font_size", 15)
		empty.add_theme_color_override("font_color", TEXT_MUTED)
		vbox.add_child(empty)
	else:
		for c in contractors:
			var cid := str(c.get("id", ""))
			var on_cooldown := sm.is_on_cooldown(cid)
			var affinity := sm.get_affinity(cid)
			var bonus: Dictionary = c.get("bonus", {})
			var mineral_str := ", ".join(bonus.keys()) if not bonus.is_empty() else "General cargo"

			var row := HBoxContainer.new()
			row.add_theme_constant_override("separation", 8)
			vbox.add_child(row)

			var name_lbl := Label.new()
			name_lbl.text = str(c.get("name", cid))
			name_lbl.add_theme_font_size_override("font_size", 15)
			var name_col = TEXT_MUTED if on_cooldown else TEXT_COLOR
			name_lbl.add_theme_color_override("font_color", name_col)
			name_lbl.custom_minimum_size = Vector2(130, 0)
			row.add_child(name_lbl)

			var mineral_lbl := Label.new()
			mineral_lbl.text = mineral_str
			mineral_lbl.add_theme_font_size_override("font_size", 14)
			mineral_lbl.add_theme_color_override("font_color", AMBER if not on_cooldown else TEXT_MUTED)
			mineral_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			mineral_lbl.clip_text = true
			row.add_child(mineral_lbl)

			var payout_lbl := Label.new()
			payout_lbl.text = "+%d%% (vs %d%%)" % [contractor_pct - market_pct, market_pct]
			payout_lbl.add_theme_font_size_override("font_size", 14)
			payout_lbl.add_theme_color_override("font_color", Color(0.3, 0.85, 0.55) if not on_cooldown else TEXT_MUTED)
			payout_lbl.custom_minimum_size = Vector2(100, 0)
			row.add_child(payout_lbl)

			var status_lbl := Label.new()
			if on_cooldown:
				var remaining := int(sm.get_cooldown_remaining(cid))
				var mins := int(ceil(float(remaining) / 60.0))
				status_lbl.text = "%d min" % mins
				status_lbl.add_theme_color_override("font_color", Color(0.9, 0.45, 0.2))
			elif affinity > 0:
				status_lbl.text = "%d ★" % affinity
				status_lbl.add_theme_color_override("font_color", AMBER)
			else:
				status_lbl.text = "Ready"
				status_lbl.add_theme_color_override("font_color", Color(0.3, 0.85, 0.55))
			status_lbl.add_theme_font_size_override("font_size", 14)
			status_lbl.custom_minimum_size = Vector2(90, 0)
			row.add_child(status_lbl)

	var note_lbl := Label.new()
	note_lbl.text = "Contract route pays %d%% vs open market %d%% — pick a contractor at the Launchpad." % [contractor_pct, market_pct]
	note_lbl.add_theme_font_size_override("font_size", 13)
	note_lbl.add_theme_color_override("font_color", TEXT_MUTED)
	note_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(note_lbl)

	return card

# ---------------------------------------------------------------------------
# Inventory card
# ---------------------------------------------------------------------------

static func _build_inventory_card() -> PanelContainer:
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", _card_style(0.45))

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)
	card.add_child(vbox)

	var inv: Dictionary = RocketsManager.get_inventory()
	if inv.is_empty():
		var empty_lbl := Label.new()
		empty_lbl.text = "No minerals in inventory. Complete a mining mission to collect resources."
		empty_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
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
		var row := HBoxContainer.new()
		vbox.add_child(row)
		var name_lbl := Label.new()
		name_lbl.text = str(mineral)
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		name_lbl.add_theme_font_size_override("font_size", 17)
		name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
		row.add_child(name_lbl)
		var qty_lbl := Label.new()
		qty_lbl.text = "%d kg" % amount
		qty_lbl.add_theme_font_size_override("font_size", 17)
		qty_lbl.add_theme_color_override("font_color", CYAN)
		row.add_child(qty_lbl)

	return card

# ---------------------------------------------------------------------------
# Mission requirements card
# ---------------------------------------------------------------------------

static func _build_mission_requirements_card() -> PanelContainer:
	var required := RocketsManager.get_starter_requested_minerals()
	if required.is_empty():
		return null

	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", _card_style(0.45))

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)
	card.add_child(vbox)

	var inv := RocketsManager.get_inventory()
	var keys: Array = required.keys()
	keys.sort()
	for mineral in keys:
		var need := int(required.get(mineral, 0))
		var have := int(inv.get(mineral, 0))
		var done := have >= need

		var row := HBoxContainer.new()
		vbox.add_child(row)

		var name_lbl := Label.new()
		name_lbl.text = str(mineral).capitalize()
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		name_lbl.add_theme_font_size_override("font_size", 17)
		name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
		row.add_child(name_lbl)

		var qty_lbl := Label.new()
		qty_lbl.text = "%d / %d kg" % [have, need]
		qty_lbl.add_theme_font_size_override("font_size", 17)
		qty_lbl.add_theme_color_override("font_color", Color(0.30, 1.0, 0.45) if done else AMBER)
		row.add_child(qty_lbl)

	return card

# ---------------------------------------------------------------------------
# Marketplace card (unlocks at Level 5)
# ---------------------------------------------------------------------------

const MARKETPLACE_UNLOCK_LEVEL := 5

static func _build_marketplace_card() -> PanelContainer:
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", _card_style(0.45))

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)
	card.add_child(vbox)

	# Check player level
	var app = AppControllerHelper.get_instance()
	var player_level := 1
	if app and app.has_method("get_experience_level"):
		player_level = max(int(app.get_experience_level()), 1)

	if player_level < MARKETPLACE_UNLOCK_LEVEL:
		var locked_lbl := Label.new()
		locked_lbl.text = "Mineral market prices unlock at Level %d.\nSell timing and supply/demand become visible." % MARKETPLACE_UNLOCK_LEVEL
		locked_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		locked_lbl.add_theme_font_size_override("font_size", 16)
		locked_lbl.add_theme_color_override("font_color", TEXT_MUTED)
		vbox.add_child(locked_lbl)
		return card

	# Header
	var header_lbl := Label.new()
	header_lbl.text = "Live mineral prices — selling depresses demand"
	header_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	header_lbl.add_theme_font_size_override("font_size", 15)
	header_lbl.add_theme_color_override("font_color", TEXT_MUTED)
	vbox.add_child(header_lbl)

	var minerals = MineralPricing.BASE_PRICES.keys()
	minerals.sort()
	for mineral in minerals:
		var base_price = int(MineralPricing.BASE_PRICES.get(mineral, 0))
		var current_price = MineralPricing.get_current_price(str(mineral))
		var mult = MineralPricing.get_price_multiplier(str(mineral))
		var pct_change = int(round((mult - 1.0) * 100.0))
		var change_str := "—"
		var change_color := TEXT_MUTED
		if pct_change < 0:
			change_str = "%d%%" % pct_change
			change_color = Color(1.0, 0.4, 0.3, 1.0)  # red for depressed
		elif pct_change > 0:
			change_str = "+%d%%" % pct_change
			change_color = Color(0.3, 0.9, 0.5, 1.0)  # green for above base

		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)
		vbox.add_child(row)

		var name_lbl := Label.new()
		name_lbl.text = str(mineral)
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		name_lbl.add_theme_font_size_override("font_size", 17)
		name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
		row.add_child(name_lbl)

		var price_lbl := Label.new()
		price_lbl.text = NumberFormat.compact(current_price) + " F/kg"
		price_lbl.add_theme_font_size_override("font_size", 17)
		price_lbl.add_theme_color_override("font_color", CYAN)
		row.add_child(price_lbl)

		var change_lbl := Label.new()
		change_lbl.text = change_str
		change_lbl.custom_minimum_size = Vector2(52, 0)
		change_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		change_lbl.add_theme_font_size_override("font_size", 15)
		change_lbl.add_theme_color_override("font_color", change_color)
		row.add_child(change_lbl)

	return card

# ---------------------------------------------------------------------------
# Room Upgrades card
# ---------------------------------------------------------------------------

const ROOM_UPGRADE_UNLOCK_LEVEL := 5

static func _build_room_upgrades_card(owner: Node) -> PanelContainer:
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", _card_style(0.45))

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	card.add_child(vbox)

	var app = AppControllerHelper.get_instance()
	var player_level := 1
	if app and app.has_method("get_experience_level"):
		player_level = max(int(app.get_experience_level()), 1)

	if player_level < ROOM_UPGRADE_UNLOCK_LEVEL:
		var locked_lbl := Label.new()
		locked_lbl.text = "Room upgrades unlock at Level %d.\nUpgrade your rocket's modules to unlock better laser tiers, cargo capacity, and scanner range." % ROOM_UPGRADE_UNLOCK_LEVEL
		locked_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		locked_lbl.add_theme_font_size_override("font_size", 16)
		locked_lbl.add_theme_color_override("font_color", TEXT_MUTED)
		vbox.add_child(locked_lbl)
		return card

	# Determine the active rocket type
	var awaiting_id = RocketsManager.get_primary_awaiting_rocket_id()
	var rocket_type := ""
	if awaiting_id != "":
		var placed = RocketsManager.get_placed()
		for item in placed:
			if str(item.get("id", "")) == awaiting_id:
				rocket_type = str(item.get("type", item.get("rocket_type", "starterrocket1")))
				break
	if rocket_type == "":
		rocket_type = "starterrocket1"

	var type_upgrades = RocketsManager.get_type_room_upgrades(rocket_type)
	var upgradeable = RoomCatalog.get_upgradeable_rooms(rocket_type, type_upgrades)

	var header_lbl := Label.new()
	header_lbl.text = RocketSpecs.get_display_name(rocket_type)
	header_lbl.add_theme_font_size_override("font_size", 14)
	header_lbl.add_theme_color_override("font_color", TEXT_MUTED)
	vbox.add_child(header_lbl)

	var franc_balance := 0
	if app and app.has_method("get_franc_balance"):
		franc_balance = int(app.get_franc_balance())

	for entry in upgradeable:
		var category = str(entry.get("category", ""))
		var display_name = str(entry.get("display_name", category))
		var current_tier = int(entry.get("current_tier", 1))
		var max_tier = int(entry.get("max_tier", 1))
		var cost = int(entry.get("upgrade_cost", 0))
		var at_max = bool(entry.get("at_max", false))

		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)
		vbox.add_child(row)

		var name_col := VBoxContainer.new()
		name_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(name_col)

		var name_lbl := Label.new()
		name_lbl.text = display_name
		name_lbl.add_theme_font_size_override("font_size", 17)
		name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
		name_col.add_child(name_lbl)

		var tier_lbl := Label.new()
		tier_lbl.text = "Tier %d / %d" % [current_tier, max_tier]
		tier_lbl.add_theme_font_size_override("font_size", 13)
		tier_lbl.add_theme_color_override("font_color", TEXT_MUTED)
		name_col.add_child(tier_lbl)

		if at_max:
			var maxed_lbl := Label.new()
			maxed_lbl.text = "MAX"
			maxed_lbl.add_theme_font_size_override("font_size", 15)
			maxed_lbl.add_theme_color_override("font_color", Color(0.3, 0.9, 0.5, 1.0))
			row.add_child(maxed_lbl)
		else:
			var btn := Button.new()
			btn.text = "Upgrade\n%s F" % NumberFormat.compact(cost)
			btn.custom_minimum_size = Vector2(110, 0)
			btn.add_theme_font_size_override("font_size", 13)
			var can_afford = franc_balance >= cost
			if not can_afford:
				btn.disabled = true
				btn.modulate = Color(0.5, 0.5, 0.5, 0.8)
				btn.tooltip_text = "Need %s F" % NumberFormat.compact(cost)
			var cap_category = category
			var cap_type = rocket_type
			var cap_tier = current_tier
			var cap_owner = owner
			btn.pressed.connect(func():
				_do_room_upgrade(cap_owner, cap_type, cap_category, cap_tier + 1)
			)
			row.add_child(btn)

	if upgradeable.is_empty():
		var none_lbl := Label.new()
		none_lbl.text = "No upgradeable rooms available for this rocket type."
		none_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		none_lbl.add_theme_font_size_override("font_size", 15)
		none_lbl.add_theme_color_override("font_color", TEXT_MUTED)
		vbox.add_child(none_lbl)

	return card

static func _do_room_upgrade(owner: Node, rocket_type: String, category: String, new_tier: int) -> void:
	var cost = RoomCatalog.get_upgrade_cost(category, new_tier - 1)
	var app = AppControllerHelper.get_instance()
	if not app or not app.has_method("get_franc_balance"):
		return
	if int(app.get_franc_balance()) < cost:
		return
	app.add_franc_balance(-cost, "room_upgrade_%s_%s" % [rocket_type, category])
	RocketsManager.set_type_room_tier(rocket_type, category, new_tier)
	# Show room-upgrades intro the first time the player performs an upgrade
	var tree := Engine.get_main_loop() as SceneTree
	if tree:
		FirstTimeMechanicTracker.maybe_show("room_upgrades", tree)
	# Close and reopen to rebuild with updated state
	preload("res://Scripts/UI/GameNavigationMenu.gd").close(owner)
	preload("res://Scripts/UI/GameNavigationMenu.gd").open(owner)

# ---------------------------------------------------------------------------
# Construction card
# ---------------------------------------------------------------------------

static func _build_construction_card(root: Control) -> VBoxContainer:
	var outer := VBoxContainer.new()
	outer.add_theme_constant_override("separation", 10)

	var projects: Array = ConstructionManager.get_available_projects()

	for proj in projects:
		var proj_id := str(proj.get("id", ""))
		var proj_name := str(proj.get("name", proj_id))
		var proj_desc := str(proj.get("description", ""))
		var reqs: Dictionary = proj.get("requirements", {})
		var is_done := bool(proj.get("completed", false))
		var progress: Dictionary = proj.get("progress", {})

		var card := PanelContainer.new()
		var card_style := _card_style(0.3 if is_done else 0.45)
		if is_done:
			card_style.border_color = Color(0.28, 0.96, 0.60, 0.5)
		card.add_theme_stylebox_override("panel", card_style)
		outer.add_child(card)

		var vbox := VBoxContainer.new()
		vbox.add_theme_constant_override("separation", 6)
		card.add_child(vbox)

		# Title row
		var title_row := HBoxContainer.new()
		vbox.add_child(title_row)
		var title_lbl := Label.new()
		title_lbl.text = proj_name
		title_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		title_lbl.add_theme_font_size_override("font_size", 19)
		title_lbl.add_theme_color_override("font_color", Color(0.28, 0.96, 0.60, 1.0) if is_done else TITLE_COLOR)
		title_row.add_child(title_lbl)
		if is_done:
			var done_badge := Label.new()
			done_badge.text = "COMPLETE"
			done_badge.add_theme_font_size_override("font_size", 14)
			done_badge.add_theme_color_override("font_color", Color(0.28, 0.96, 0.60, 1.0))
			title_row.add_child(done_badge)

		# Description
		var desc_lbl := Label.new()
		desc_lbl.text = proj_desc
		desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		desc_lbl.add_theme_font_size_override("font_size", 15)
		desc_lbl.add_theme_color_override("font_color", TEXT_MUTED)
		vbox.add_child(desc_lbl)

		# Requirements with progress bars
		var req_keys: Array = reqs.keys()
		req_keys.sort()
		for mineral in req_keys:
			var required := int(reqs.get(mineral, 0))
			var contributed := int(progress.get(mineral, 0))
			var clamped: int = min(contributed, required)

			var req_row := HBoxContainer.new()
			req_row.add_theme_constant_override("separation", 8)
			vbox.add_child(req_row)

			var req_name := Label.new()
			req_name.text = str(mineral)
			req_name.custom_minimum_size = Vector2(110, 0)
			req_name.add_theme_font_size_override("font_size", 15)
			req_name.add_theme_color_override("font_color", TEXT_COLOR)
			req_row.add_child(req_name)

			var bar := ProgressBar.new()
			bar.max_value = required
			bar.value = clamped
			bar.show_percentage = false
			bar.custom_minimum_size = Vector2(0, 12)
			bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			var fill := StyleBoxFlat.new()
			fill.bg_color = Color(0.28, 0.96, 0.60, 1.0) if clamped >= required else CYAN
			fill.set_corner_radius_all(3)
			var bg := StyleBoxFlat.new()
			bg.bg_color = Color(0.10, 0.13, 0.22, 1.0)
			bg.set_corner_radius_all(3)
			bar.add_theme_stylebox_override("fill", fill)
			bar.add_theme_stylebox_override("background", bg)
			req_row.add_child(bar)

			var qty_lbl := Label.new()
			qty_lbl.text = "%d / %d kg" % [clamped, required]
			qty_lbl.custom_minimum_size = Vector2(120, 0)
			qty_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
			qty_lbl.add_theme_font_size_override("font_size", 14)
			qty_lbl.add_theme_color_override("font_color", Color(0.28, 0.96, 0.60, 1.0) if clamped >= required else TEXT_MUTED)
			req_row.add_child(qty_lbl)

		# Contribute button (disabled when complete)
		if not is_done:
			var inv: Dictionary = RocketsManager.get_inventory()
			var can_contribute := false
			for mineral in req_keys:
				if int(inv.get(mineral, 0)) > 0:
					can_contribute = true
					break

			var contrib_btn := _build_button("Contribute Minerals", false)
			contrib_btn.disabled = not can_contribute
			if not can_contribute:
				contrib_btn.add_theme_color_override("font_color", TEXT_MUTED)
			contrib_btn.pressed.connect(func():
				_open_contribute_overlay(root, proj_id, proj_name, reqs, progress)
			)
			vbox.add_child(contrib_btn)

	if projects.is_empty():
		var empty_lbl := Label.new()
		empty_lbl.text = "No construction projects available yet."
		empty_lbl.add_theme_font_size_override("font_size", 16)
		empty_lbl.add_theme_color_override("font_color", TEXT_MUTED)
		outer.add_child(empty_lbl)

	return outer

static func _open_contribute_overlay(root: Control, proj_id: String, proj_name: String, reqs: Dictionary, current_progress: Dictionary) -> void:
	# Remove any existing contribute overlay
	var old = root.get_node_or_null("ContributeOverlay")
	if old:
		old.queue_free()

	var overlay := ColorRect.new()
	overlay.name = "ContributeOverlay"
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.color = Color(0.0, 0.0, 0.0, 0.65)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.set_meta("tutorial_zone_exempt", true)
	root.add_child(overlay)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.add_child(center)

	var panel := PanelContainer.new()
	var _cvp_w := root.get_viewport().get_visible_rect().size.x if root.get_viewport() else 1280.0
	panel.custom_minimum_size = Vector2(clampf(_cvp_w - 48.0, 300.0, 560.0), 0.0)
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	center.add_child(panel)

	var pstyle := StyleBoxFlat.new()
	pstyle.bg_color = PANEL_BG
	pstyle.border_color = CYAN
	pstyle.set_border_width_all(2)
	pstyle.set_corner_radius_all(8)
	pstyle.content_margin_left = 20
	pstyle.content_margin_right = 20
	pstyle.content_margin_top = 16
	pstyle.content_margin_bottom = 16
	panel.add_theme_stylebox_override("panel", pstyle)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 12)
	panel.add_child(vbox)

	# Title
	var title_row := HBoxContainer.new()
	vbox.add_child(title_row)
	var title_lbl := Label.new()
	title_lbl.text = "Contribute to: %s" % proj_name
	title_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_lbl.add_theme_font_size_override("font_size", 22)
	title_lbl.add_theme_color_override("font_color", TITLE_COLOR)
	title_row.add_child(title_lbl)
	var close_btn := _build_button("Cancel", false)
	close_btn.custom_minimum_size = Vector2(100, 44)
	close_btn.pressed.connect(func(): overlay.queue_free())
	title_row.add_child(close_btn)

	var sep := HSeparator.new()
	sep.add_theme_color_override("separator", Color(CYAN.r, CYAN.g, CYAN.b, 0.3))
	vbox.add_child(sep)

	var inv: Dictionary = RocketsManager.get_inventory()

	# Per-mineral contribution rows
	var req_keys: Array = reqs.keys()
	req_keys.sort()
	var spinboxes := {}

	for mineral in req_keys:
		var required := int(reqs.get(mineral, 0))
		var contributed := int(current_progress.get(mineral, 0))
		var remaining: int = max(required - contributed, 0)
		var in_inv := int(inv.get(mineral, 0))
		var max_contribute: int = min(remaining, in_inv)

		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 10)
		vbox.add_child(row)

		var name_lbl := Label.new()
		name_lbl.text = str(mineral)
		name_lbl.custom_minimum_size = Vector2(110, 0)
		name_lbl.add_theme_font_size_override("font_size", 16)
		name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
		row.add_child(name_lbl)

		var info_lbl := Label.new()
		info_lbl.text = "Need %d kg  •  In inventory: %d kg" % [remaining, in_inv]
		info_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		info_lbl.add_theme_font_size_override("font_size", 14)
		info_lbl.add_theme_color_override("font_color", TEXT_MUTED)
		row.add_child(info_lbl)

		var spin := SpinBox.new()
		spin.min_value = 0
		spin.max_value = max_contribute
		spin.step = 1
		spin.value = max_contribute
		spin.custom_minimum_size = Vector2(110, 44)
		spin.suffix = "kg"
		spin.editable = max_contribute > 0
		spinboxes[mineral] = spin
		row.add_child(spin)

	var status_lbl := Label.new()
	status_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status_lbl.add_theme_font_size_override("font_size", 15)
	status_lbl.add_theme_color_override("font_color", TEXT_MUTED)
	vbox.add_child(status_lbl)

	var confirm_btn := _build_button("Contribute", true)
	confirm_btn.pressed.connect(func():
		var contribution := {}
		for mineral in spinboxes.keys():
			var amt := int((spinboxes[mineral] as SpinBox).value)
			if amt > 0:
				contribution[mineral] = amt
		if contribution.is_empty():
			status_lbl.text = "Enter an amount for at least one mineral."
			return
		var ok := ConstructionManager.add_contribution(proj_id, contribution)
		if ok:
			status_lbl.text = "Contributed successfully!"
			status_lbl.add_theme_color_override("font_color", Color(0.28, 0.96, 0.60, 1.0))
			confirm_btn.disabled = true
		else:
			status_lbl.text = "Could not contribute — check your inventory."
			status_lbl.add_theme_color_override("font_color", Color(1.0, 0.45, 0.35, 1.0))
	)
	vbox.add_child(confirm_btn)

# ---------------------------------------------------------------------------
# Rocket Research card (L5+)
# ---------------------------------------------------------------------------

static func _build_rocket_research_card(owner: Node) -> PanelContainer:
	var tree := Engine.get_main_loop() as SceneTree
	if tree:
		FirstTimeMechanicTracker.maybe_show("reusable_research", tree)
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", _card_style(0.4))
	card.size_flags_horizontal = Control.SIZE_FILL
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	card.add_child(vbox)

	var title := Label.new()
	title.text = "Reusable Rockets Research"
	title.add_theme_font_size_override("font_size", 16)
	title.add_theme_color_override("font_color", Color(0.92, 0.95, 1.0, 1.0))
	vbox.add_child(title)

	var current_tier := RocketsManager.get_reusable_research_tier()
	var tier_lbl := Label.new()
	var discount_pct := int(round((1.0 - RocketsManager.get_reusable_research_cost_mult()) * 100))
	if current_tier == 0:
		tier_lbl.text = "Not researched — rocket costs are at full price."
	else:
		tier_lbl.text = "Tier %d researched — %d%% launch cost reduction." % [current_tier, discount_pct]
	tier_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	PanelStyle.apply_body(tier_lbl)
	vbox.add_child(tier_lbl)

	var desc_lbl := Label.new()
	desc_lbl.text = "Invest in rocket reusability research to permanently reduce the cost of each mission. Each tier makes your fleet more economical."
	desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	PanelStyle.apply_muted(desc_lbl)
	vbox.add_child(desc_lbl)

	var next_tier := current_tier + 1
	if next_tier <= 3:
		var upgrade_cost := int(RocketsManager.REUSABLE_RESEARCH_UPGRADE_COSTS.get(next_tier, 0))
		var new_discount: float = (1.0 - ([1.0, 0.90, 0.80, 0.70] as Array)[next_tier]) * 100.0
		var app := AppControllerHelper.get_instance()
		var can_afford := app != null and app.has_method("get_franc_balance") and \
			int(app.get_franc_balance()) >= upgrade_cost

		var upgrade_btn := Button.new()
		upgrade_btn.text = "Research Tier %d — %s F (−%d%% cost)" % [
			next_tier,
			NumberFormat.compact(upgrade_cost),
			int(new_discount)
		]
		PanelStyle.apply_button(upgrade_btn, can_afford)
		upgrade_btn.disabled = not can_afford
		upgrade_btn.focus_mode = Control.FOCUS_NONE
		upgrade_btn.pressed.connect(func():
			var a := AppControllerHelper.get_instance()
			if a == null or not a.has_method("get_franc_balance"):
				return
			if int(a.get_franc_balance()) < upgrade_cost:
				return
			a.add_franc_balance(-upgrade_cost, "reusable_research_tier%d" % next_tier)
			RocketsManager.set_reusable_research_tier(next_tier)
			preload("res://Scripts/UI/GameNavigationMenu.gd").close(owner)
			preload("res://Scripts/UI/GameNavigationMenu.gd").open(owner)
		)
		vbox.add_child(upgrade_btn)
	else:
		var maxed_lbl := Label.new()
		maxed_lbl.text = "Maximum research tier achieved — 30% launch cost reduction active."
		maxed_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		PanelStyle.apply_muted(maxed_lbl)
		vbox.add_child(maxed_lbl)

	return card

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

static func _build_section_header(text: String) -> Label:
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", 14)
	lbl.add_theme_color_override("font_color", TEXT_MUTED)
	return lbl

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

static func _build_button(text: String, primary: bool) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(0, 56)
	var color := AMBER if primary else CYAN
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0, 0, 0, 0)
	normal.border_color = color
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(28)
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
	return btn

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

static func _format_key(key: String) -> String:
	const KEY_LABELS := {
		"target_id": "Target",
		"rocket_id": "Ship",
		"payout": "Earnings",
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
