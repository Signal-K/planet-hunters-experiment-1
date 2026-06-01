extends CanvasLayer

@onready var francs_label: Label = $Root/HUD/FrancsChip/FrancsLabel
@onready var jobs_label: Label = $Root/HUD/JobsChip/HBox/JobsLabel
@onready var status_dot: ColorRect = $Root/HUD/JobsChip/HBox/StatusDot
@onready var progression_card: PanelContainer = $Root/ProgressionCard
@onready var card_eyebrow: Label = $Root/ProgressionCard/HBox/Info/CardEyebrow
@onready var card_title: Label = $Root/ProgressionCard/HBox/Info/CardTitle
@onready var cta_label: Label = $Root/ProgressionCard/HBox/CardCTA/CTALabel
@onready var tap_hint: Label = $Root/TapHint
@onready var hub_button: Button = $Root/RadialNav/HubButton
@onready var radial_nav: Control = $Root/RadialNav
@onready var base_btn: Button = $Root/RadialNav/BaseBtn
@onready var atlas_btn: Button = $Root/RadialNav/AtlasBtn
@onready var build_btn: Button = $Root/RadialNav/BuildBtn
@onready var missions_btn: Button = $Root/RadialNav/MissionsBtn
@onready var satellite_station: Button = $Root/Structures/SatelliteStation
@onready var launchpad: Button = $Root/Structures/Launchpad
@onready var control_station: Button = $Root/Structures/ControlStation
@onready var market_button: Button = $Root/SoilSection/MarketButton

var _radial_open: bool = false
var _first_tap_done: bool = false

func _ready() -> void:
	_connect_app_controller()
	_refresh_balance()
	_refresh_jobs()
	_update_progression_card()
	hub_button.pressed.connect(_on_hub_pressed)
	base_btn.pressed.connect(func(): _navigate("base"))
	atlas_btn.pressed.connect(func(): _navigate("atlas"))
	build_btn.pressed.connect(func(): _navigate("build"))
	missions_btn.pressed.connect(func(): _navigate("missions"))
	satellite_station.pressed.connect(func(): _on_building_tapped("satellite"))
	launchpad.pressed.connect(func(): _on_building_tapped("launchpad"))
	control_station.pressed.connect(func(): _on_building_tapped("control"))
	market_button.pressed.connect(func(): _navigate("market"))
	_set_radial_visible(false)

	# Notify tutorial
	var ac := _get_app_controller()
	if ac and ac.has_method("_ensure_tutorial_runtime"):
		ac._ensure_tutorial_runtime()
	var tc := _get_tutorial_controller()
	if tc:
		tc.set_screen("hub")

func _connect_app_controller() -> void:
	var ac := _get_app_controller()
	if ac == null:
		return
	if ac.has_signal("franc_balance_updated"):
		ac.franc_balance_updated.connect(_on_franc_balance_updated)
	if ac.has_signal("rockets_reset"):
		ac.rockets_reset.connect(_refresh_jobs)

func _get_app_controller() -> Node:
	return get_tree().root.get_node_or_null("AppController")

func _get_tutorial_controller() -> Node:
	var ac := _get_app_controller()
	if ac == null:
		return null
	if ac.has_method("get") and "_tutorial_controller" in ac:
		return ac._tutorial_controller
	return get_tree().root.get_node_or_null("TutorialController")

func _refresh_balance() -> void:
	var ac := _get_app_controller()
	if ac == null:
		return
	var bal: int = ac.franc_balance if "franc_balance" in ac else 0
	_set_balance(bal)

func _set_balance(bal: int) -> void:
	if not is_instance_valid(francs_label):
		return
	francs_label.text = "▲ %s" % _format_francs(bal)

func _refresh_jobs() -> void:
	if not is_instance_valid(jobs_label):
		return
	# Count active rockets in flight
	var count := 0
	var ac := _get_app_controller()
	if ac and "franc_balance" in ac:
		# RocketsManager is available via AppController reference
		pass
	jobs_label.text = "%d JOBS" % count
	if is_instance_valid(status_dot):
		status_dot.color = Color(0.224, 0.827, 0.416) if count > 0 else Color(0.365, 0.451, 0.565)

func _format_francs(val: int) -> String:
	if val >= 1_000_000_000:
		return "%.1fB" % (val / 1_000_000_000.0)
	if val >= 1_000_000:
		return "%.1fM" % (val / 1_000_000.0)
	if val >= 1_000:
		return "%.1fK" % (val / 1_000.0)
	return str(val)

func _update_progression_card() -> void:
	if not is_instance_valid(progression_card):
		return
	var ac := _get_app_controller()
	if ac == null:
		progression_card.visible = false
		return
	# Show card when player has no active missions yet — tutorial prompt
	progression_card.visible = true
	if is_instance_valid(card_eyebrow):
		card_eyebrow.text = "NEXT STEP"
	if is_instance_valid(card_title):
		card_title.text = "Start your first mission"
	if is_instance_valid(cta_label):
		cta_label.text = "Go →"

func _on_hub_pressed() -> void:
	_radial_open = !_radial_open
	_set_radial_visible(_radial_open)

func _set_radial_visible(open: bool) -> void:
	base_btn.visible = open
	atlas_btn.visible = open
	build_btn.visible = open
	missions_btn.visible = open

func _navigate(screen: String) -> void:
	_radial_open = false
	_set_radial_visible(false)
	var ac := _get_app_controller()
	if ac == null:
		return
	match screen:
		"missions":
			if ac.has_method("show_missions"):
				ac.show_missions()
		"market":
			if ac.has_method("show_market"):
				ac.show_market()
		"build":
			if ac.has_method("show_build"):
				ac.show_build()
		"atlas":
			if ac.has_method("show_atlas"):
				ac.show_atlas()
		"base":
			if ac.has_method("show_base"):
				ac.show_base()

func _on_building_tapped(building: String) -> void:
	if not _first_tap_done:
		_first_tap_done = true
		if is_instance_valid(tap_hint):
			tap_hint.visible = false
	var ac := _get_app_controller()
	if ac == null:
		return
	match building:
		"satellite":
			if ac.has_method("show_satellite_station"):
				ac.show_satellite_station()
		"launchpad":
			if ac.has_method("show_launchpad"):
				ac.show_launchpad()
		"control":
			if ac.has_method("show_control_station"):
				ac.show_control_station()

func _on_franc_balance_updated(new_value: int) -> void:
	_set_balance(new_value)
