extends CanvasLayer

const StructureManager = preload("res://Scripts/Utils/StructureManager.gd")
const RocketsManager   = preload("res://Scripts/Utils/RocketsManager.gd")

# ── HUD ──────────────────────────────────────────────────────────────────
@onready var eyebrow_label: Label  = $Root/TitleBlock/Eyebrow
@onready var francs_label: Label   = $Root/HUD/FrancsChip/FrancsLabel
@onready var jobs_label: Label     = $Root/HUD/JobsChip/JobsHBox/JobsLabel
@onready var status_dot: ColorRect = $Root/HUD/JobsChip/JobsHBox/StatusDot

# ── Progression card ──────────────────────────────────────────────────────
@onready var progression_card: PanelContainer = $Root/ProgressionCard
@onready var card_eyebrow: Label = $Root/ProgressionCard/CardHBox/CardInfo/CardEyebrow
@onready var card_title: Label   = $Root/ProgressionCard/CardHBox/CardInfo/CardTitle
@onready var cta_label: Label    = $Root/ProgressionCard/CardHBox/CardCTA/CTALabel

# ── Tap hint ─────────────────────────────────────────────────────────────
@onready var tap_hint: PanelContainer = $Root/TapHint

# ── Structure buttons (shown only when that structure is built) ───────────
@onready var satellite_btn: Button  = $Root/Structures/SatelliteStation
@onready var launchpad_btn: Button  = $Root/Structures/Launchpad
@onready var control_btn: Button    = $Root/Structures/ControlStation
@onready var rocket_art: TextureRect = $Root/Structures/Launchpad/RocketArt
@onready var launch_sub: Label = $Root/Structures/Launchpad/LaunchChip/LaunchRow/LaunchSub
@onready var ctrl_sub: Label   = $Root/Structures/ControlStation/CtrlChip/CtrlRow/CtrlSub

# ── Ghost slots (shown only in Build Mode) ────────────────────────────────
@onready var sat_ghost: Button    = $Root/Structures/SatGhost
@onready var center_ghost: Button = $Root/Structures/CenterGhost
@onready var ctrl_ghost: Button   = $Root/Structures/CtrlGhost

# ── Build Mode Overlay ────────────────────────────────────────────────────
@onready var build_mode_panel: Control  = $Root/BuildModePanel
@onready var build_dim: ColorRect       = $Root/BuildModePanel/BuildDim
@onready var tray_done_btn: Button      = $Root/BuildModePanel/BuildTray/TrayVBox/TrayHeader/TrayDoneBtn
@onready var lp_card_status: Label  = $Root/BuildModePanel/BuildTray/TrayVBox/TrayCards/LPCard/LPCardVBox/LPCardStatus
@onready var cs_card_status: Label  = $Root/BuildModePanel/BuildTray/TrayVBox/TrayCards/CSCard/CSCardVBox/CSCardStatus
@onready var sc_card_status: Label  = $Root/BuildModePanel/BuildTray/TrayVBox/TrayCards/SCCard/SCCardVBox/SCCardStatus

# ── Radial nav ────────────────────────────────────────────────────────────
@onready var hub_button: Button   = $Root/RadialNav/HubButton
@onready var base_btn: Button     = $Root/RadialNav/BaseBtn
@onready var missions_btn: Button = $Root/RadialNav/MissionsBtn
@onready var atlas_btn: Button    = $Root/RadialNav/AtlasBtn
@onready var build_btn: Button    = $Root/RadialNav/BuildBtn

@onready var market_btn: Button = $Root/SoilSection/MarketButton

var _radial_open: bool = false
var _first_tap: bool   = false
var _in_build_mode: bool = false

# ── Ready ─────────────────────────────────────────────────────────────────
func _ready() -> void:
	_connect_app_controller()
	_refresh_balance()
	_refresh_structures()
	_update_progression_card()

	hub_button.pressed.connect(_on_hub_pressed)
	base_btn.pressed.connect(func(): _navigate("base"))
	missions_btn.pressed.connect(func(): _navigate("missions"))
	atlas_btn.pressed.connect(func(): _navigate("atlas"))
	build_btn.pressed.connect(_open_build_mode)

	# Progression card is a PanelContainer (not a Button) — wire gui_input
	progression_card.gui_input.connect(func(e: InputEvent):
		if e is InputEventMouseButton and e.button_index == MOUSE_BUTTON_LEFT and e.pressed:
			_on_progression_card_tapped())

	satellite_btn.pressed.connect(func(): _on_building_tapped("satellite"))
	launchpad_btn.pressed.connect(func(): _on_building_tapped("launchpad"))
	control_btn.pressed.connect(func(): _on_building_tapped("control"))
	market_btn.pressed.connect(func(): _navigate("market"))

	# Ghost slot tap → place that structure
	center_ghost.pressed.connect(func(): _place_structure("launchpad"))
	ctrl_ghost.pressed.connect(func(): _place_structure("control_station"))
	sat_ghost.pressed.connect(func(): _place_structure("scanning_station"))

	# Build mode tray
	tray_done_btn.pressed.connect(_close_build_mode)
	build_dim.gui_input.connect(func(e): if e is InputEventMouseButton and e.pressed: _close_build_mode())

	_set_radial_open(false)
	build_mode_panel.visible = false

	# Hide TapHint until a structure is placed
	tap_hint.visible = false

	# Tutorial — call_deferred so TutorialController is guaranteed to be in
	# the tree before we call set_screen (both are added via call_deferred
	# from AppController, so they might not exist during _ready() itself).
	var ac := _get_ac()
	if ac and ac.has_method("_ensure_tutorial_runtime"):
		ac._ensure_tutorial_runtime()
	call_deferred("_init_tutorial_screen")

func _init_tutorial_screen() -> void:
	# Called deferred so TutorialController._ready() (and _load()) have
	# already run by the time we call set_screen.
	var tc := _get_tc()
	if tc:
		tc.set_screen("hub")
	# If the overlay hasn't connected yet (it's also deferred), nudge it
	# by directly calling show_step if it's already in the tree.
	var overlay := get_tree().root.get_node_or_null("TutorialCoachOverlay")
	if overlay and overlay.has_method("show_step") and tc:
		var step: Dictionary = tc.current_step()
		if not step.is_empty():
			overlay.show_step(step)

# ── AppController connection ──────────────────────────────────────────────
func _connect_app_controller() -> void:
	var ac := _get_ac()
	if ac == null:
		return
	if ac.has_signal("franc_balance_updated"):
		ac.franc_balance_updated.connect(_on_franc_balance_updated)
	if ac.has_signal("rockets_reset"):
		ac.rockets_reset.connect(_on_rockets_reset)

func _get_ac() -> Node:
	return get_tree().root.get_node_or_null("AppController")

func _get_tc() -> Node:
	var ac := _get_ac()
	if ac == null:
		return null
	if "_tutorial_controller" in ac:
		return ac._tutorial_controller
	return get_tree().root.get_node_or_null("TutorialController")

# ── Balance ───────────────────────────────────────────────────────────────
func _refresh_balance() -> void:
	var ac := _get_ac()
	if ac == null:
		return
	var bal: int = ac.franc_balance if "franc_balance" in ac else 0
	francs_label.text = "▲ %s" % _fmt(bal)

func _fmt(v: int) -> String:
	if v >= 1_000_000_000: return "%.1fB" % (v / 1_000_000_000.0)
	if v >= 1_000_000:     return "%.1fM" % (v / 1_000_000.0)
	if v >= 1_000:         return "%.1fK" % (v / 1_000.0)
	return str(v)

# ── Structure visibility ───────────────────────────────────────────────────
func _refresh_structures() -> void:
	var lp_built  := StructureManager.is_built("launchpad")
	var cs_built  := StructureManager.is_built("control_station")
	var sat_built := StructureManager.is_built("scanning_station")

	# Show or hide each building based on whether it's been placed
	satellite_btn.visible  = sat_built
	launchpad_btn.visible  = lp_built
	control_btn.visible    = cs_built

	# Rocket art: only show when a rocket is awaiting launch
	if lp_built:
		var awaiting := _has_rocket_awaiting()
		rocket_art.visible = awaiting
		if is_instance_valid(launch_sub):
			launch_sub.text = "IN FLIGHT" if awaiting else "READY"

	# Job count on control station chip
	if cs_built and is_instance_valid(ctrl_sub):
		ctrl_sub.text = "0 JOBS"

	# TapHint: show once at least one building is placed (and first tap not done)
	tap_hint.visible = (lp_built or cs_built or sat_built) and not _first_tap

	# Ghost slots: hidden unless in build mode
	sat_ghost.visible    = _in_build_mode and not sat_built
	center_ghost.visible = _in_build_mode and not lp_built
	ctrl_ghost.visible   = _in_build_mode and not cs_built

func _has_rocket_awaiting() -> bool:
	var missions: Array = RocketsManager.get_missions()
	for m in missions:
		var status := str(m.get("status", ""))
		if status in ["pending_launch", "awaiting_launch", "placed"]:
			return true
	# Also check launched rockets
	var launched: Array = RocketsManager.get_launched()
	if not launched.is_empty():
		return true
	return false

# ── Jobs count ────────────────────────────────────────────────────────────
func _refresh_jobs() -> void:
	var count: int = 0
	if not is_instance_valid(jobs_label):
		return
	jobs_label.text = "%d JOBS" % count
	if is_instance_valid(ctrl_sub) and StructureManager.is_built("control_station"):
		ctrl_sub.text = "%d JOBS" % count
	if is_instance_valid(status_dot):
		status_dot.color = Color(0.224, 0.827, 0.416) if count > 0 else Color(0.365, 0.451, 0.565)

# ── Progression card ──────────────────────────────────────────────────────
func _update_progression_card() -> void:
	if not is_instance_valid(progression_card):
		return

	if not StructureManager.is_built("launchpad"):
		card_eyebrow.text = "GET STARTED"
		card_title.text   = "Place the Launchpad"
		cta_label.text    = "OPEN BUILD →"
		progression_card.visible = true
		return

	# Default: next mission
	card_eyebrow.text = "NEXT MISSION AVAILABLE"
	card_title.text   = "Contracts on the board"
	cta_label.text    = "OPEN LAUNCHPAD ›"
	progression_card.visible = true

# ── Radial nav ────────────────────────────────────────────────────────────
func _on_hub_pressed() -> void:
	if _in_build_mode:
		_close_build_mode()
		return
	_set_radial_open(!_radial_open)

func _set_radial_open(open: bool) -> void:
	_radial_open = open
	base_btn.visible     = open
	missions_btn.visible = open
	atlas_btn.visible    = open
	build_btn.visible    = open

func _navigate(screen: String) -> void:
	_set_radial_open(false)
	match screen:
		"missions", "build_nav":
			if ResourceLoader.exists("res://Scenes/UI/LaunchWizard.tscn"):
				get_tree().change_scene_to_file("res://Scenes/UI/LaunchWizard.tscn")
		"atlas":
			if ResourceLoader.exists("res://Scenes/UI/SpaceMap/space_map.tscn"):
				get_tree().change_scene_to_file("res://Scenes/UI/SpaceMap/space_map.tscn")
		"base", "market":
			pass

func _on_building_tapped(building: String) -> void:
	if not _first_tap:
		_first_tap = true
		tap_hint.visible = false

	match building:
		"launchpad":
			if ResourceLoader.exists("res://Scenes/UI/LaunchWizard.tscn"):
				get_tree().change_scene_to_file("res://Scenes/UI/LaunchWizard.tscn")
		"control":
			if ResourceLoader.exists("res://Scenes/UI/LaunchWizard.tscn"):
				get_tree().change_scene_to_file("res://Scenes/UI/LaunchWizard.tscn")
		"satellite":
			pass

# ── Build Mode ────────────────────────────────────────────────────────────
func _open_build_mode() -> void:
	_in_build_mode = true
	_set_radial_open(false)
	build_mode_panel.visible = true
	_refresh_structures()
	_refresh_tray_statuses()

	# Tell tutorial we're on the build_mode screen
	var tc := _get_tc()
	if tc:
		tc.set_screen("build_mode")

func _close_build_mode() -> void:
	_in_build_mode = false
	build_mode_panel.visible = false
	_refresh_structures()

	# Return tutorial to hub screen
	var tc := _get_tc()
	if tc:
		tc.set_screen("hub")

func _place_structure(type: String) -> void:
	var ac := _get_ac()
	var balance: int = ac.franc_balance if ac and "franc_balance" in ac else 0

	if StructureManager.is_built(type):
		return  # Already placed

	if not StructureManager.is_unlocked(type):
		return  # Not yet unlocked

	if not StructureManager.can_afford(type, balance):
		# Flash cost label red — handled by shader/tween in future; silently skip for now
		return

	var cost := StructureManager.get_cost(type)
	if cost > 0 and ac != null and ac.has_method("add_franc_balance"):
		ac.add_franc_balance(-cost, "structure_build")

	StructureManager.build(type)
	_refresh_structures()
	_refresh_tray_statuses()
	_update_progression_card()

	# Tutorial signal
	var tc := _get_tc()
	if tc and tc.has_method("complete_step"):
		if type == "launchpad":
			tc.complete_step(2)

	# Close build mode after placing
	_close_build_mode()

func _refresh_tray_statuses() -> void:
	var ac := _get_ac()
	var balance: int = ac.franc_balance if ac and "franc_balance" in ac else 0

	# Launchpad card
	if StructureManager.is_built("launchpad"):
		lp_card_status.text = "BUILT ✓"
		lp_card_status.add_theme_color_override("font_color", Color(0.224, 0.827, 0.416))
	elif StructureManager.can_afford("launchpad", balance):
		lp_card_status.text = "TAP TO PLACE →"
		lp_card_status.add_theme_color_override("font_color", Color(0.620, 0.863, 1.0, 0.8))
	else:
		lp_card_status.text = "INSUFFICIENT FUNDS"
		lp_card_status.add_theme_color_override("font_color", Color(1.0, 0.353, 0.416, 0.8))

	# Control Station card
	if StructureManager.is_built("control_station"):
		cs_card_status.text = "BUILT ✓"
		cs_card_status.add_theme_color_override("font_color", Color(0.224, 0.827, 0.416))
	elif not StructureManager.is_unlocked("control_station"):
		cs_card_status.text = "COMPLETE M1 FIRST"
		cs_card_status.add_theme_color_override("font_color", Color(0.365, 0.451, 0.565, 0.8))
	elif StructureManager.can_afford("control_station", balance):
		cs_card_status.text = "TAP TO PLACE →"
		cs_card_status.add_theme_color_override("font_color", Color(0.620, 0.863, 1.0, 0.8))
	else:
		cs_card_status.text = "INSUFFICIENT FUNDS"
		cs_card_status.add_theme_color_override("font_color", Color(1.0, 0.353, 0.416, 0.8))

	# Scanning Station card
	if StructureManager.is_built("scanning_station"):
		sc_card_status.text = "BUILT ✓"
		sc_card_status.add_theme_color_override("font_color", Color(0.224, 0.827, 0.416))
	elif not StructureManager.is_unlocked("scanning_station"):
		sc_card_status.text = "FREE OPS · L3"
		sc_card_status.add_theme_color_override("font_color", Color(0.365, 0.451, 0.565, 0.8))
	elif StructureManager.can_afford("scanning_station", balance):
		sc_card_status.text = "TAP TO PLACE →"
		sc_card_status.add_theme_color_override("font_color", Color(0.620, 0.863, 1.0, 0.8))
	else:
		sc_card_status.text = "INSUFFICIENT FUNDS"
		sc_card_status.add_theme_color_override("font_color", Color(1.0, 0.353, 0.416, 0.8))

# ── Signal handlers ───────────────────────────────────────────────────────
func _on_progression_card_tapped() -> void:
	if not StructureManager.is_built("launchpad"):
		_open_build_mode()
	else:
		_navigate("missions")

func _on_franc_balance_updated(new_value: int) -> void:
	francs_label.text = "▲ %s" % _fmt(new_value)

func _on_rockets_reset() -> void:
	_refresh_structures()
	_update_progression_card()
